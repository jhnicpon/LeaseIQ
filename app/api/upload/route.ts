import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import { put } from '@vercel/blob';
import getDb from '@/lib/db';
import { parseFile, SUPPORTED_EXTENSIONS } from '@/lib/fileParser';
import { extractLeaseDataFromContent } from '@/lib/claude';
import { generateAlertDates } from '@/lib/dateUtils';
import { calculateRiskScore } from '@/lib/riskScore';
import {
  normalizeAddress, extractCity, extractState, findMatchingProperty,
} from '@/lib/propertyMatcher';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type .${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}` },
      { status: 400 },
    );
  }
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });

  const leaseId = uuidv4();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const blobPath = `leases/${leaseId}/${safeName}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Determine content type for blob storage
  const contentTypeMap: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };

  const blob = await put(blobPath, buffer, {
    access: 'private',
    contentType: contentTypeMap[ext] ?? 'application/octet-stream',
  });

  await sql`
    INSERT INTO leases (id, "userId", "fileName", "fileSize", status, "blobUrl")
    VALUES (${leaseId}, ${user.id}, ${file.name}, ${file.size}, 'processing', ${blob.url})
  `;

  // Fire-and-forget processing (non-streaming path — kept for reprocess compatibility)
  processLease(leaseId, buffer, file.name, user.id).catch(async err => {
    console.error('Lease processing error:', err);
    const s = getDb();
    await s`UPDATE leases SET status = 'error' WHERE id = ${leaseId}`.catch(() => {});
  });

  return NextResponse.json({ leaseId, status: 'processing', blobUrl: blob.url });
}

async function processLease(leaseId: string, buffer: Buffer, fileName: string, userId: string) {
  const sql = getDb();
  try {
    const parsed = await parseFile(buffer, fileName);
    const extracted = await extractLeaseDataFromContent(parsed);
    const risk = calculateRiskScore(extracted);

    // For image leases we don't store originalText (it's an image, not text)
    const originalText = parsed.type === 'text' ? parsed.text.substring(0, 100000) : '';

    // ── Auto-group into a property ─────────────────────────────────────────────
    let propertyId: string | null = null;
    if (extracted.propertyAddress) {
      const normAddr = normalizeAddress(extracted.propertyAddress);
      const existingProps = await sql`
        SELECT id, normalized_address FROM properties WHERE user_id = ${userId}
      ` as { id: string; normalized_address: string }[];

      propertyId = findMatchingProperty(normAddr, existingProps);

      if (!propertyId) {
        // Create a new property record (DB generates UUID)
        const newProp = await sql`
          INSERT INTO properties (user_id, name, address, normalized_address, city, state, property_type)
          VALUES (
            ${userId},
            ${extracted.propertyAddress},
            ${extracted.propertyAddress},
            ${normAddr},
            ${extractCity(extracted.propertyAddress)},
            ${extractState(extracted.propertyAddress)},
            ${extracted.propertyType || null}
          )
          RETURNING id
        `;
        propertyId = newProp[0].id;
      }
    }

    await sql`
      UPDATE leases SET
        status = 'completed',
        "processedAt" = NOW(),
        "extractedData" = ${JSON.stringify(extracted)},
        "originalText" = ${originalText},
        "propertyAddress" = ${extracted.propertyAddress},
        "tenantName" = ${extracted.tenantName},
        "expirationDate" = ${extracted.leaseExpirationDate},
        "monthlyRent" = ${extracted.baseRentMonthly},
        "riskScore" = ${risk.score},
        "riskFactors" = ${JSON.stringify(risk.factors)},
        property_id = ${propertyId}
      WHERE id = ${leaseId}
    `;

    await sql`
      INSERT INTO lease_versions (id, "leaseId", "userId", version, "extractedData", "changeDescription", "changedBy")
      VALUES (${uuidv4()}, ${leaseId}, ${userId}, ${1}, ${JSON.stringify(extracted)}, ${'Initial extraction'}, ${'AI'})
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
