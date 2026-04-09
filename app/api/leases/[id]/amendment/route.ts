import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { parseFile } from '@/lib/fileParser';
import { calculateRiskScore } from '@/lib/riskScore';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id, email FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as { id: string; email: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leaseRows = await sql`SELECT * FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  const lease = leaseRows[0] as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseFile(buffer, file.name);

  // For amendments, we need text content — images are supported via OCR description
  let amendmentText: string;
  if (parsed.type === 'text') {
    amendmentText = parsed.text.substring(0, 50000);
  } else {
    // Ask Claude to describe the image content for amendment extraction
    const visionMsg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: parsed.mediaType, data: parsed.base64 } },
          { type: 'text', text: 'Transcribe all text from this lease amendment image verbatim.' },
        ],
      }],
    });
    const visionContent = visionMsg.content[0];
    amendmentText = visionContent.type === 'text' ? visionContent.text : '';
  }

  const currentData = lease.extractedData ? JSON.parse(lease.extractedData) : {};

  const prompt = `You are a commercial real estate lease attorney. The following is an AMENDMENT to an existing lease. Read the amendment and determine ONLY which fields changed. Return a JSON object with ONLY the fields that the amendment modifies (using the same field names as the original extraction). Do not include unchanged fields.

CURRENT LEASE DATA:
${JSON.stringify(currentData, null, 2)}

AMENDMENT TEXT:
${amendmentText}

Return ONLY a JSON object with the changed fields. Example: {"baseRentMonthly": 8500, "renewalOptions": "Updated: two additional 5-year options"}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') return NextResponse.json({ error: 'AI error' }, { status: 500 });

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: 'Could not parse amendment changes' }, { status: 500 });

  const changes = JSON.parse(jsonMatch[0]);
  const changedFields = Object.keys(changes);

  const maxVRows = await sql`SELECT MAX(version) as v FROM lease_versions WHERE "leaseId" = ${id}`;
  const maxVersion = (maxVRows[0] as any)?.v ?? 0;

  await sql`
    INSERT INTO lease_versions (id, "leaseId", "userId", version, "extractedData", "changeDescription", "changedBy")
    VALUES (
      ${uuidv4()}, ${id}, ${user.id}, ${maxVersion + 1},
      ${lease.extractedData}, ${`Before amendment: ${file.name}`}, ${user.email}
    )
  `;

  const updated = { ...currentData, ...changes };
  const risk = calculateRiskScore(updated);

  await sql`
    UPDATE leases SET
      "extractedData" = ${JSON.stringify(updated)},
      "propertyAddress" = ${updated.propertyAddress || lease.propertyAddress},
      "tenantName" = ${updated.tenantName || lease.tenantName},
      "expirationDate" = ${updated.leaseExpirationDate || lease.expirationDate},
      "monthlyRent" = ${updated.baseRentMonthly || lease.monthlyRent},
      "riskScore" = ${risk.score},
      "riskFactors" = ${JSON.stringify(risk.factors)}
    WHERE id = ${id}
  `;

  return NextResponse.json({ success: true, changedFields, changes });
}
