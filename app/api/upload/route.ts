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

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
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
  db.prepare(`
    INSERT INTO leases (id, userId, fileName, fileSize, status)
    VALUES (?, ?, ?, ?, 'processing')
  `).run(leaseId, user.id, file.name, file.size);

  // Process async
  processLease(leaseId, filePath, user.id, db).catch(err => {
    console.error('Lease processing error:', err);
    db.prepare("UPDATE leases SET status = 'error' WHERE id = ?").run(leaseId);
  });

  return NextResponse.json({ leaseId, status: 'processing' });
}

async function processLease(leaseId: string, filePath: string, userId: string, db: any) {
  try {
    const text = await parsePdf(filePath);
    const extracted = await extractLeaseData(text);

    const now = new Date().toISOString();
    const risk = calculateRiskScore(extracted);

    db.prepare(`
      UPDATE leases SET
        status = 'completed',
        processedAt = ?,
        extractedData = ?,
        originalText = ?,
        propertyAddress = ?,
        tenantName = ?,
        expirationDate = ?,
        monthlyRent = ?,
        riskScore = ?,
        riskFactors = ?
      WHERE id = ?
    `).run(
      now,
      JSON.stringify(extracted),
      text.substring(0, 100000),
      extracted.propertyAddress,
      extracted.tenantName,
      extracted.leaseExpirationDate,
      extracted.baseRentMonthly,
      risk.score,
      JSON.stringify(risk.factors),
      leaseId
    );

    // Create version 1
    const { v4: uuidv4ver } = await import('uuid');
    db.prepare(`
      INSERT INTO lease_versions (id, leaseId, userId, version, extractedData, changeDescription, changedBy)
      VALUES (?, ?, ?, 1, ?, 'Initial extraction', 'AI')
    `).run(uuidv4ver(), leaseId, userId, JSON.stringify(extracted));

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
          const alertId = uuidv4();
          db.prepare(`
            INSERT OR IGNORE INTO alerts (id, leaseId, userId, alertType, triggerDate)
            VALUES (?, ?, ?, ?, ?)
          `).run(alertId, leaseId, userId, `${type} - ${daysBeforeDate} days`, triggerDate);
        }
      }
    }
  } catch (error) {
    throw error;
  }
}
