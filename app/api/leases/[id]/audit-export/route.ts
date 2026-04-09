import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { inferChangeType } from '@/app/api/leases/[id]/audit/route';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { jsPDF } = require('jspdf');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('jspdf-autotable');

const SKIP_DIFF_KEYS = new Set(['flaggedFields', 'extractionNotes', 'confidenceScore']);

function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  for (const key of allKeys) {
    if (SKIP_DIFF_KEYS.has(key)) continue;
    const oldVal = before[key] ?? null;
    const newVal = after[key] ?? null;
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal, newValue: newVal });
    }
  }
  return changes;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'N/A';
  return String(v);
}

function changeTypeLabel(t: string): string {
  switch (t) {
    case 'initial_extraction': return 'Initial Extraction';
    case 'manual_edit': return 'Manual Edit';
    case 'amendment_uploaded': return 'Amendment Uploaded';
    case 'reprocessed': return 'Reprocessed';
    case 'reverted': return 'Reverted';
    default: return 'Change';
  }
}

function camelToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase());
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const versionRows = await sql`
    SELECT lv.id, lv.version, lv."extractedData", lv."changeDescription", lv."changedBy", lv."createdAt",
           u.name AS "userName"
    FROM lease_versions lv
    LEFT JOIN users u ON u.id = lv."userId"
    WHERE lv."leaseId" = ${id}
    ORDER BY lv.version DESC
  `;

  const versions = versionRows as any[];
  const currentData: Record<string, unknown> = lease.extractedData ? JSON.parse(lease.extractedData) : {};
  const allVersionsAsc = [...versions].reverse();

  type Entry = {
    version: number;
    changeType: string;
    changeDescription: string;
    changedBy: string;
    userName: string | null;
    createdAt: string;
    changedFields: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  };

  const entries: Entry[] = allVersionsAsc.map((v, i) => {
    const snapshotBefore: Record<string, unknown> = v.extractedData ? JSON.parse(v.extractedData) : {};
    const snapshotAfter: Record<string, unknown> =
      i + 1 < allVersionsAsc.length
        ? (allVersionsAsc[i + 1].extractedData ? JSON.parse(allVersionsAsc[i + 1].extractedData) : {})
        : currentData;
    return {
      version: v.version,
      changeType: inferChangeType(v.changeDescription),
      changeDescription: v.changeDescription,
      changedBy: v.changedBy,
      userName: v.userName ?? null,
      createdAt: v.createdAt,
      changedFields: computeDiff(snapshotBefore, snapshotAfter),
    };
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W = 215.9;
  const BLUE = [29, 78, 216] as const;
  const DARK = [17, 24, 39] as const;
  const GRAY = [107, 114, 128] as const;
  const WHITE = [255, 255, 255] as const;
  const today = new Date();

  const propertyTitle = lease.propertyAddress || lease.fileName || 'Lease';

  const addFooter = (pageNum: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('CONFIDENTIAL — Prepared by LeaseIQ · Lease Audit Trail', 20, 272);
    doc.text(`Page ${pageNum}`, W - 20, 272, { align: 'right' });
    doc.setDrawColor(...GRAY);
    doc.setLineWidth(0.3);
    doc.line(20, 268, W - 20, 268);
  };

  // ─── COVER PAGE ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 80, 'F');

  doc.setFontSize(28);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('LEASE AUDIT TRAIL', 20, 38);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Change Log — Prepared by LeaseIQ', 20, 50);

  doc.setFontSize(9);
  doc.text(`Generated: ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, 60);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(propertyTitle, 20, 105, { maxWidth: W - 40 });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`Total recorded changes: ${entries.length}`, 20, 118);

  addFooter(1);

  // ─── SUMMARY TABLE ───────────────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 18, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('CHANGE SUMMARY', 20, 13);

  const summaryBody = [...entries].reverse().map(e => [
    `v${e.version}`,
    changeTypeLabel(e.changeType),
    e.userName || e.changedBy,
    new Date(e.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
    `${e.changedFields.length} field${e.changedFields.length !== 1 ? 's' : ''}`,
  ]);

  (doc as any).autoTable({
    startY: 26,
    head: [['Version', 'Type', 'Changed By', 'Date', 'Fields Changed']],
    body: summaryBody,
    theme: 'striped',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 42 },
      2: { cellWidth: 50 },
      3: { cellWidth: 42 },
      4: { cellWidth: 26 },
    },
    margin: { left: 20, right: 20 },
  });

  addFooter(2);

  // ─── DETAIL PAGES ────────────────────────────────────────────────────────────
  const entriesDesc = [...entries].reverse();
  for (let i = 0; i < entriesDesc.length; i++) {
    const e = entriesDesc[i];
    doc.addPage();

    doc.setFillColor(...BLUE);
    doc.rect(0, 0, W, 18, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(`Version ${e.version} — ${changeTypeLabel(e.changeType)}`, 20, 13);

    let y = 26;

    // Metadata block
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(`Date: ${new Date(e.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`, 20, y); y += 7;
    doc.text(`Changed by: ${e.userName ? `${e.userName} <${e.changedBy}>` : e.changedBy}`, 20, y); y += 7;
    doc.text(`Description: ${e.changeDescription}`, 20, y, { maxWidth: W - 40 }); y += 10;

    if (e.changedFields.length === 0) {
      doc.setTextColor(...GRAY);
      doc.text('No field-level changes detected for this entry.', 20, y);
    } else {
      const diffRows = e.changedFields.map(f => [
        camelToLabel(f.field),
        formatValue(f.oldValue),
        formatValue(f.newValue),
      ]);

      (doc as any).autoTable({
        startY: y,
        head: [['Field', 'Previous Value', 'New Value']],
        body: diffRows,
        theme: 'striped',
        headStyles: { fillColor: [55, 65, 81], textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: DARK },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 52 },
          1: { cellWidth: 74 },
          2: { cellWidth: 74 },
        },
        margin: { left: 20, right: 20 },
      });
    }

    addFooter(i + 3);
  }

  const pdfBytes = doc.output('arraybuffer');
  const slug = propertyTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  const filename = `AuditTrail-${slug}.pdf`;

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
