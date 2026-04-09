import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import path from 'path';
import fs from 'fs';
import getDb from '@/lib/db';
import { parsePdf } from '@/lib/pdfParser';
import { extractLeaseData } from '@/lib/claude';
import { generateAlertDates } from '@/lib/dateUtils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leaseRows = await sql`SELECT * FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  const lease = leaseRows[0] as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  // Find the uploaded file
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const files = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir).filter((f: string) => f.startsWith(id))
    : [];
  if (!files.length) return NextResponse.json({ error: 'Original file not found' }, { status: 404 });

  const filePath = path.join(uploadsDir, files[0]);

  await sql`UPDATE leases SET status = 'processing' WHERE id = ${id}`;
  await sql`DELETE FROM alerts WHERE "leaseId" = ${id}`;

  try {
    const text = await parsePdf(filePath);
    const extracted = await extractLeaseData(text);

    await sql`
      UPDATE leases SET
        status = 'completed',
        "processedAt" = NOW(),
        "extractedData" = ${JSON.stringify(extracted)},
        "originalText" = ${text.substring(0, 100000)},
        "propertyAddress" = ${extracted.propertyAddress},
        "tenantName" = ${extracted.tenantName},
        "expirationDate" = ${extracted.leaseExpirationDate},
        "monthlyRent" = ${extracted.baseRentMonthly}
      WHERE id = ${id}
    `;

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
            VALUES (${uuidv4()}, ${id}, ${user.id}, ${`${type} - ${daysBeforeDate} days`}, ${triggerDate})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    await sql`UPDATE leases SET status = 'error' WHERE id = ${id}`;
    return NextResponse.json({ error: 'Reprocessing failed' }, { status: 500 });
  }
}
