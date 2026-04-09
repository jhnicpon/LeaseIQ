import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { formatDate, formatCurrency } from '@/lib/dateUtils';
import { calculateRiskScore } from '@/lib/riskScore';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { jsPDF } = require('jspdf');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('jspdf-autotable');

const COMPARE_SECTIONS = [
  {
    label: 'Financial Terms',
    fields: [
      { key: 'baseRentMonthly', label: 'Monthly Rent', type: 'currency' },
      { key: 'baseRentAnnual', label: 'Annual Rent', type: 'currency' },
      { key: 'rentEscalationDescription', label: 'Rent Escalation' },
      { key: 'rentEscalationPercentage', label: 'Escalation %' },
      { key: 'securityDeposit', label: 'Security Deposit', type: 'currency' },
      { key: 'tenantImprovementAllowance', label: 'TI Allowance', type: 'currency' },
      { key: 'camCharges', label: 'CAM Charges' },
      { key: 'freeRentPeriod', label: 'Free Rent Period' },
    ],
  },
  {
    label: 'Critical Dates',
    fields: [
      { key: 'leaseCommencementDate', label: 'Commencement', type: 'date' },
      { key: 'leaseExpirationDate', label: 'Expiration', type: 'date' },
      { key: 'leaseTermMonths', label: 'Term (Months)' },
      { key: 'renewalOptionDeadline', label: 'Renewal Deadline', type: 'date' },
      { key: 'terminationOptionDate', label: 'Termination Date', type: 'date' },
    ],
  },
  {
    label: 'Rights & Options',
    fields: [
      { key: 'renewalOptions', label: 'Renewal Options' },
      { key: 'terminationOption', label: 'Termination Option' },
      { key: 'expansionRights', label: 'Expansion Rights' },
      { key: 'rightOfFirstRefusal', label: 'Right of First Refusal' },
      { key: 'subleaseRights', label: 'Sublease Rights' },
      { key: 'assignmentRights', label: 'Assignment Rights' },
    ],
  },
  {
    label: 'Parties',
    fields: [
      { key: 'tenantName', label: 'Tenant' },
      { key: 'landlordName', label: 'Landlord' },
      { key: 'guarantor', label: 'Guarantor' },
      { key: 'personalGuaranty', label: 'Personal Guaranty' },
    ],
  },
  {
    label: 'Property',
    fields: [
      { key: 'propertyAddress', label: 'Property Address' },
      { key: 'propertyType', label: 'Property Type' },
      { key: 'permittedUse', label: 'Permitted Use' },
      { key: 'exclusivityClause', label: 'Exclusivity' },
      { key: 'parkingSpaces', label: 'Parking Spaces' },
    ],
  },
];

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
  if (ids.length < 2) return NextResponse.json({ error: 'Need at least 2 lease IDs' }, { status: 400 });

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as { id: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leasesRaw = await Promise.all(
    ids.map(lid => sql`SELECT * FROM leases WHERE id = ${lid} AND "userId" = ${user.id}`)
  );
  const leases: any[] = leasesRaw.map(r => r[0]).filter(Boolean);
  if (leases.length < 2) return NextResponse.json({ error: 'Leases not found' }, { status: 404 });

  const datas = leases.map(l => l.extractedData ? JSON.parse(l.extractedData) : {});
  const risks = datas.map(d => calculateRiskScore(d));

  const getValue = (d: any, key: string, type?: string) => {
    const val = d[key];
    if (!val && val !== 0) return 'N/A';
    if (type === 'currency') return formatCurrency(Number(val));
    if (type === 'date') return formatDate(String(val));
    return String(val);
  };

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const W = 279.4;
  const BLUE = [29, 78, 216] as const;
  const WHITE = [255, 255, 255] as const;
  const GRAY = [107, 114, 128] as const;

  const addFooter = (p: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('CONFIDENTIAL — Prepared by LeaseIQ', 20, 203);
    doc.text(`Page ${p}`, W - 20, 203, { align: 'right' });
    doc.setDrawColor(...GRAY);
    doc.line(20, 199, W - 20, 199);
  };

  // Cover
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 50, 'F');
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('LEASE COMPARISON REPORT', 20, 28);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Comparing ${leases.length} leases — Generated ${new Date().toLocaleDateString()}`, 20, 38);

  // Summary table: property + risk per lease
  const summaryHead = ['', ...leases.map(l => datas[leases.indexOf(l)].propertyAddress || l.fileName)];
  const summaryRows = [
    ['Tenant', ...datas.map(d => d.tenantName || 'N/A')],
    ['Expiration', ...datas.map(d => formatDate(d.leaseExpirationDate) || 'N/A')],
    ['Monthly Rent', ...datas.map(d => d.baseRentMonthly ? formatCurrency(d.baseRentMonthly) : 'N/A')],
    ['Risk Score', ...risks.map(r => `${r.score} — ${r.label}`)],
  ];

  (doc as any).autoTable({
    startY: 60,
    head: [summaryHead],
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } },
    margin: { left: 20, right: 20 },
  });

  addFooter(1);

  // One page per section
  let pageNum = 2;
  for (const section of COMPARE_SECTIONS) {
    doc.addPage();
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, W, 18, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(section.label.toUpperCase(), 20, 13);

    const colWidth = (W - 40 - 45) / leases.length;
    const head = ['Field', ...leases.map(l => (datas[leases.indexOf(l)].propertyAddress || l.fileName || 'Lease').slice(0, 30))];
    const rows = section.fields.map(f => {
      const values = datas.map(d => getValue(d, f.key, f.type));
      const diff = new Set(values).size > 1;
      return { values: [f.label, ...values], diff };
    });

    const sectionColStyles = Object.fromEntries([
      ['0', { fontStyle: 'bold', cellWidth: 45 }],
      ...leases.map((_, i) => [String(i + 1), { cellWidth: colWidth }]),
    ]);

    (doc as any).autoTable({
      startY: 24,
      head: [head],
      body: rows.map(r => r.values),
      theme: 'striped',
      headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: sectionColStyles,
      margin: { left: 20, right: 20 },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          const row = rows[data.row.index];
          if (row?.diff && data.column.index > 0) {
            data.cell.styles.fillColor = [254, 252, 232];
            data.cell.styles.textColor = [133, 77, 14];
          }
        }
      },
    });

    addFooter(pageNum++);
  }

  const pdfBytes = doc.output('arraybuffer');
  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="LeaseComparison.pdf"',
    },
  });
}
