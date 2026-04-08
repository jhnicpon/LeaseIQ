import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import getDb from '@/lib/db';
import { parsePdf } from '@/lib/pdfParser';
import { calculateRiskScore } from '@/lib/riskScore';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(session.user.email) as { id: string; email: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lease = db.prepare('SELECT * FROM leases WHERE id = ? AND userId = ?').get(id, user.id) as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const tmpName = `amendment-${uuidv4()}.pdf`;
  const tmpPath = path.join(UPLOADS_DIR, tmpName);
  fs.writeFileSync(tmpPath, Buffer.from(await file.arrayBuffer()));

  let amendmentText = '';
  try {
    amendmentText = await parsePdf(tmpPath);
  } finally {
    fs.unlinkSync(tmpPath);
  }

  const currentData = lease.extractedData ? JSON.parse(lease.extractedData) : {};

  const prompt = `You are a commercial real estate lease attorney. The following is an AMENDMENT to an existing lease. Read the amendment and determine ONLY which fields changed. Return a JSON object with ONLY the fields that the amendment modifies (using the same field names as the original extraction). Do not include unchanged fields.

CURRENT LEASE DATA:
${JSON.stringify(currentData, null, 2)}

AMENDMENT TEXT:
${amendmentText.substring(0, 50000)}

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

  // Save current as a version before applying amendment
  const maxVersion = (db.prepare('SELECT MAX(version) as v FROM lease_versions WHERE leaseId = ?').get(id) as any)?.v ?? 0;
  db.prepare(`
    INSERT INTO lease_versions (id, leaseId, userId, version, extractedData, changeDescription, changedBy)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(), id, user.id, maxVersion + 1, lease.extractedData,
    `Before amendment: ${file.name}`, user.email
  );

  // Apply changes
  const updated = { ...currentData, ...changes };
  const risk = calculateRiskScore(updated);

  db.prepare(`
    UPDATE leases SET
      extractedData = ?, propertyAddress = ?, tenantName = ?,
      expirationDate = ?, monthlyRent = ?, riskScore = ?, riskFactors = ?
    WHERE id = ?
  `).run(
    JSON.stringify(updated),
    updated.propertyAddress || lease.propertyAddress,
    updated.tenantName || lease.tenantName,
    updated.leaseExpirationDate || lease.expirationDate,
    updated.baseRentMonthly || lease.monthlyRent,
    risk.score, JSON.stringify(risk.factors),
    id
  );

  return NextResponse.json({ success: true, changedFields, changes });
}
