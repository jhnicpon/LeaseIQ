import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { parseFileFromUrl } from '@/lib/fileParser';
import { extractLeaseDataFromContent } from '@/lib/claude';
import { generateAlertDates } from '@/lib/dateUtils';

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

  if (!lease.blobUrl) {
    return NextResponse.json({ error: 'No file stored for this lease. The original upload may predate blob storage.' }, { status: 404 });
  }

  await sql`UPDATE leases SET status = 'processing' WHERE id = ${id}`;
  await sql`DELETE FROM alerts WHERE "leaseId" = ${id}`;

  try {
    const parsed = await parseFileFromUrl(lease.blobUrl, lease.fileName);
    const extracted = await extractLeaseDataFromContent(parsed);

    const originalText = parsed.type === 'text' ? parsed.text.substring(0, 100000) : '';

    await sql`
      UPDATE leases SET
        status = 'completed',
        "processedAt" = NOW(),
        "extractedData" = ${JSON.stringify(extracted)},
        "originalText" = ${originalText},
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
