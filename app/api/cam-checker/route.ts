import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { parsePdf } from '@/lib/pdfParser';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import fs from 'fs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CamLineItem {
  description: string;
  amount: number;
  status: 'ALLOWED' | 'QUESTIONABLE' | 'DISALLOWED';
  reason: string;
  estimatedOvercharge: number;
  recommendation: string;
}

export interface CamAuditResult {
  leaseId: string;
  propertyAddress: string;
  totalBilled: number;
  totalAllowed: number;
  totalQuestionable: number;
  totalDisallowed: number;
  potentialRecovery: number;
  lineItems: CamLineItem[];
  disputeLetter: string;
  summary: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const leaseId = formData.get('leaseId') as string;
  const camFile = formData.get('camStatement') as File | null;

  if (!leaseId || !camFile) {
    return NextResponse.json({ error: 'leaseId and camStatement are required' }, { status: 400 });
  }

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as { id: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leaseRows = await sql`SELECT * FROM leases WHERE id = ${leaseId} AND "userId" = ${user.id}`;
  const lease = leaseRows[0] as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const leaseData = lease.extractedData ? JSON.parse(lease.extractedData) : {};

  // Parse the CAM statement PDF
  const tmpDir = path.join(process.cwd(), 'uploads', 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `cam-${Date.now()}.pdf`);
  fs.writeFileSync(tmpPath, Buffer.from(await camFile.arrayBuffer()));

  let camText = '';
  try {
    camText = await parsePdf(tmpPath);
  } finally {
    fs.unlinkSync(tmpPath);
  }

  const leaseText = lease.originalText || JSON.stringify(leaseData);

  const prompt = `You are a commercial real estate attorney specializing in CAM (Common Area Maintenance) audits.

LEASE CAM PROVISIONS:
${leaseText.substring(0, 30000)}

CAM RECONCILIATION STATEMENT:
${camText.substring(0, 20000)}

Audit every line item in the CAM statement against what the lease allows. Return ONLY valid JSON with this structure:

{
  "totalBilled": number,
  "totalAllowed": number,
  "totalQuestionable": number,
  "totalDisallowed": number,
  "potentialRecovery": number,
  "lineItems": [
    {
      "description": "string — charge description from statement",
      "amount": number,
      "status": "ALLOWED" | "QUESTIONABLE" | "DISALLOWED",
      "reason": "string — why this status per lease terms",
      "estimatedOvercharge": number,
      "recommendation": "string — what tenant should do"
    }
  ],
  "summary": "string — 2-3 sentence audit summary",
  "disputeLetter": "string — complete formal dispute letter if overcharges found, otherwise empty string"
}

Check specifically for:
- Excluded items (capital expenditures, management fees exceeding lease cap, non-CAM costs)
- Gross-up calculations correctness
- Base year adjustments
- Administrative fee caps
- Insurance allocation
- Janitorial and utility allocations
- Any charges not contemplated by the lease

For disputeLetter, write a complete formal letter from tenant to landlord disputing overcharges with specific line items cited.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response');

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');

  const result = JSON.parse(jsonMatch[0]);
  result.leaseId = leaseId;
  result.propertyAddress = leaseData.propertyAddress || 'N/A';

  return NextResponse.json(result);
}
