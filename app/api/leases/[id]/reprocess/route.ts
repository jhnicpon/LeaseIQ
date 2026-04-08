import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import path from 'path';
import fs from 'fs';
import getDb from '@/lib/db';
import { parsePdf } from '@/lib/pdfParser';
import { extractLeaseData } from '@/lib/claude';
import { generateAlertDates } from '@/lib/dateUtils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lease = db.prepare('SELECT * FROM leases WHERE id = ? AND userId = ?').get(id, user.id) as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  // Find the uploaded file
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const files = fs.readdirSync(uploadsDir).filter((f: string) => f.startsWith(id));
  if (!files.length) return NextResponse.json({ error: 'Original file not found' }, { status: 404 });

  const filePath = path.join(uploadsDir, files[0]);

  db.prepare("UPDATE leases SET status = 'processing' WHERE id = ?").run(id);

  // Delete old alerts
  db.prepare('DELETE FROM alerts WHERE leaseId = ?').run(id);

  // Reprocess
  try {
    const text = await parsePdf(filePath);
    const extracted = await extractLeaseData(text);

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE leases SET
        status = 'completed',
        processedAt = ?,
        extractedData = ?,
        originalText = ?,
        propertyAddress = ?,
        tenantName = ?,
        expirationDate = ?,
        monthlyRent = ?
      WHERE id = ?
    `).run(
      now,
      JSON.stringify(extracted),
      text.substring(0, 100000),
      extracted.propertyAddress,
      extracted.tenantName,
      extracted.leaseExpirationDate,
      extracted.baseRentMonthly,
      id
    );

    const criticalDates = [
      { date: extracted.leaseExpirationDate, type: 'Lease Expiration' },
      { date: extracted.renewalOptionDeadline, type: 'Renewal Option Deadline' },
      { date: extracted.terminationOptionDate, type: 'Termination Option' },
    ];

    for (const { date, type } of criticalDates) {
      if (date) {
        const alertDates = generateAlertDates(date);
        for (const { daysBeforeDate, triggerDate } of alertDates) {
          const alertId = uuidv4();
          db.prepare(`INSERT OR IGNORE INTO alerts (id, leaseId, userId, alertType, triggerDate) VALUES (?, ?, ?, ?, ?)`)
            .run(alertId, id, user.id, `${type} - ${daysBeforeDate} days`, triggerDate);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    db.prepare("UPDATE leases SET status = 'error' WHERE id = ?").run(id);
    return NextResponse.json({ error: 'Reprocessing failed' }, { status: 500 });
  }
}
