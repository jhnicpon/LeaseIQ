import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import getDb from '@/lib/db';
import { parsePdf } from '@/lib/pdfParser';
import { extractLeaseData } from '@/lib/claude';
import { generateAlertDates } from '@/lib/dateUtils';
import { calculateRiskScore } from '@/lib/riskScore';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!file.name.toLowerCase().endsWith('.pdf')) return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });

  const leaseId = uuidv4();
  const fileName = `${leaseId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  // Save file
  const bytes = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(bytes));

  // Create lease record
  await sql`
    INSERT INTO leases (id, "userId", "fileName", "fileSize", status)
    VALUES (${leaseId}, ${user.id}, ${file.name}, ${file.size}, 'processing')
  `;

  // Process async (fire-and-forget)
  processLease(leaseId, filePath, user.id).catch(async err => {
    console.error('Lease processing error:', err);
    const s = getDb();
    await s`UPDATE leases SET status = 'error' WHERE id = ${leaseId}`.catch(() => {});
  });

  return NextResponse.json({ leaseId, status: 'processing' });
}

async function processLease(leaseId: string, filePath: string, userId: string) {
  const sql = getDb();
  try {
    const text = await parsePdf(filePath);
    const extracted = await extractLeaseData(text);
    const risk = calculateRiskScore(extracted);

    await sql`
      UPDATE leases SET
        status = 'completed',
        "processedAt" = NOW(),
        "extractedData" = ${JSON.stringify(extracted)},
        "originalText" = ${text.substring(0, 100000)},
        "propertyAddress" = ${extracted.propertyAddress},
        "tenantName" = ${extracted.tenantName},
        "expirationDate" = ${extracted.leaseExpirationDate},
        "monthlyRent" = ${extracted.baseRentMonthly},
        "riskScore" = ${risk.score},
        "riskFactors" = ${JSON.stringify(risk.factors)}
      WHERE id = ${leaseId}
    `;

    // Create version 1
    await sql`
      INSERT INTO lease_versions (id, "leaseId", "userId", version, "extractedData", "changeDescription", "changedBy")
      VALUES (${uuidv4()}, ${leaseId}, ${userId}, ${1}, ${JSON.stringify(extracted)}, ${'Initial extraction'}, ${'AI'})
    `;

    // Generate alerts for critical dates
    const criticalDates = [
      { date: extracted.leaseExpirationDate, type: 'Lease Expiration' },
      { date: extracted.renewalOptionDeadline, type: 'Renewal Option Deadline' },
      { date: extracted.terminationOptionDate, type: 'Termination Option' },
    ];

    for (const { date, type } of criticalDates) {
      if (date) {
        const alertDates = generateAlertDates(date);
        for (const { daysBeforeDate, triggerDate } of alertDates) {
          await sql`
            INSERT INTO alerts (id, "leaseId", "userId", "alertType", "triggerDate")
            VALUES (${uuidv4()}, ${leaseId}, ${userId}, ${`${type} - ${daysBeforeDate} days`}, ${triggerDate})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }
  } catch (error) {
    await sql`UPDATE leases SET status = 'error' WHERE id = ${leaseId}`;
    throw error;
  }
}
