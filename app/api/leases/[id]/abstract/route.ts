import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { calculateRiskScore, getRiskBadgeClasses } from '@/lib/riskScore';
import { formatDate, formatCurrency } from '@/lib/dateUtils';
import { differenceInDays, parseISO } from 'date-fns';
// jsPDF runs server-side fine as a CommonJS module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { jsPDF } = require('jspdf');
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('jspdf-autotable');

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as { id: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leaseRows = await sql`SELECT * FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  const lease = leaseRows[0] as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const d = lease.extractedData ? JSON.parse(lease.extractedData) : {};
  const risk = calculateRiskScore(d);
  const today = new Date();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W = 215.9;
  const BLUE = [29, 78, 216] as const;
  const DARK = [17, 24, 39] as const;
  const GRAY = [107, 114, 128] as const;
  const WHITE = [255, 255, 255] as const;
  const riskColor = risk.color === 'red' ? ([239, 68, 68] as const) : risk.color === 'yellow' ? ([245, 158, 11] as const) : ([16, 185, 129] as const);

  const addFooter = (pageNum: number, total: number) => {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('CONFIDENTIAL — Prepared by LeaseIQ', 20, 272);
    doc.text(`Page ${pageNum} of ${total}`, W - 20, 272, { align: 'right' });
    doc.setDrawColor(...GRAY);
    doc.setLineWidth(0.3);
    doc.line(20, 268, W - 20, 268);
  };

  // ─── PAGE 1: COVER ────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 80, 'F');

  doc.setFontSize(28);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('LEASE ABSTRACT', 20, 40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Prepared by LeaseIQ — Commercial Real Estate Intelligence', 20, 52);

  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text(`Generated: ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, 62);

  // Risk badge on cover
  doc.setFillColor(...riskColor);
  doc.roundedRect(W - 70, 30, 50, 18, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(`${risk.score} · ${risk.label}`, W - 45, 41, { align: 'center' });

  // Property details below header
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(d.propertyAddress || 'Property Address Not Specified', 20, 110);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  if (d.tenantName) doc.text(`Tenant: ${d.tenantName}`, 20, 122);
  if (d.landlordName) doc.text(`Landlord: ${d.landlordName}`, 20, 130);
  if (d.propertyType) doc.text(`Property Type: ${d.propertyType}`, 20, 138);

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  if (d.leaseCommencementDate) doc.text(`Lease Commencement: ${formatDate(d.leaseCommencementDate)}`, 20, 155);
  if (d.leaseExpirationDate) {
    doc.text(`Lease Expiration: ${formatDate(d.leaseExpirationDate)}`, 20, 163);
    try {
      const days = differenceInDays(parseISO(d.leaseExpirationDate), today);
      const daysStr = days < 0 ? 'EXPIRED' : `${days} days remaining`;
      doc.setTextColor(...riskColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`(${daysStr})`, 20 + doc.getTextWidth(`Lease Expiration: ${formatDate(d.leaseExpirationDate)}`) + 3, 163);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
    } catch { /* skip */ }
  }

  addFooter(1, 7);

  // ─── PAGE 2: EXECUTIVE SUMMARY ───────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 18, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('EXECUTIVE SUMMARY', 20, 13);

  const summaryRows = [
    ['Tenant', d.tenantName || 'N/A'],
    ['Landlord', d.landlordName || 'N/A'],
    ['Property Address', d.propertyAddress || 'N/A'],
    ['Property Type', d.propertyType || 'N/A'],
    ['Lease Term', d.leaseTermMonths ? `${d.leaseTermMonths} months` : 'N/A'],
    ['Commencement Date', formatDate(d.leaseCommencementDate) || 'N/A'],
    ['Expiration Date', formatDate(d.leaseExpirationDate) || 'N/A'],
    ['Monthly Base Rent', d.baseRentMonthly ? formatCurrency(d.baseRentMonthly) : 'N/A'],
    ['Annual Base Rent', d.baseRentAnnual ? formatCurrency(d.baseRentAnnual) : 'N/A'],
    ['Renewal Options', d.renewalOptions || 'None'],
    ['Permitted Use', d.permittedUse || 'N/A'],
    ['Risk Score', `${risk.score} — ${risk.label}`],
  ];

  (doc as any).autoTable({
    startY: 26,
    head: [['Field', 'Value']],
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { cellWidth: 'auto' } },
    margin: { left: 20, right: 20 },
  });

  addFooter(2, 7);

  // ─── PAGE 3: FINANCIAL TERMS ─────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 18, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('FINANCIAL TERMS', 20, 13);

  const financialRows = [
    ['Base Rent (Monthly)', d.baseRentMonthly ? formatCurrency(d.baseRentMonthly) : 'N/A'],
    ['Base Rent (Annual)', d.baseRentAnnual ? formatCurrency(d.baseRentAnnual) : 'N/A'],
    ['Rent Escalation', d.rentEscalationDescription || 'N/A'],
    ['Escalation %', d.rentEscalationPercentage ? `${d.rentEscalationPercentage}%` : 'N/A'],
    ['CAM Charges', d.camCharges || 'N/A'],
    ['Operating Expenses', d.operatingExpenses || 'N/A'],
    ['Security Deposit', d.securityDeposit ? formatCurrency(d.securityDeposit) : 'N/A'],
    ['TI Allowance', d.tenantImprovementAllowance ? formatCurrency(d.tenantImprovementAllowance) : 'N/A'],
    ['Free Rent Period', d.freeRentPeriod || 'N/A'],
    ['Parking Cost', d.parkingCost || 'N/A'],
  ];

  (doc as any).autoTable({
    startY: 26,
    head: [['Term', 'Details']],
    body: financialRows,
    theme: 'striped',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    margin: { left: 20, right: 20 },
  });

  addFooter(3, 7);

  // ─── PAGE 4: CRITICAL DATES ──────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 18, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('CRITICAL DATES', 20, 13);

  const dateItems = [
    { label: 'Lease Commencement', date: d.leaseCommencementDate },
    { label: 'Lease Expiration', date: d.leaseExpirationDate },
    { label: 'Renewal Option Deadline', date: d.renewalOptionDeadline },
    { label: 'Termination Option Date', date: d.terminationOptionDate },
  ].filter(x => x.date);

  const dateRows = dateItems.map(({ label, date }) => {
    let daysStr = 'N/A';
    try {
      const days = differenceInDays(parseISO(date), today);
      daysStr = days < 0 ? `${Math.abs(days)} days ago` : `${days} days`;
    } catch { /* skip */ }
    return [label, formatDate(date), daysStr];
  });

  (doc as any).autoTable({
    startY: 26,
    head: [['Date Type', 'Date', 'Days Remaining']],
    body: dateRows,
    theme: 'striped',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 } },
    margin: { left: 20, right: 20 },
  });

  addFooter(4, 7);

  // ─── PAGE 5: RIGHTS & OPTIONS ────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 18, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('RIGHTS & OPTIONS', 20, 13);

  const rightsRows = [
    ['Renewal Options', d.renewalOptions || 'None'],
    ['Renewal Deadline', formatDate(d.renewalOptionDeadline) || 'N/A'],
    ['Termination Option', d.terminationOption || 'None'],
    ['Termination Date', formatDate(d.terminationOptionDate) || 'N/A'],
    ['Expansion Rights', d.expansionRights || 'None'],
    ['Right of First Refusal', d.rightOfFirstRefusal || 'None'],
    ['Sublease Rights', d.subleaseRights || 'None'],
    ['Assignment Rights', d.assignmentRights || 'None'],
    ['Exclusivity Clause', d.exclusivityClause || 'None'],
  ];

  (doc as any).autoTable({
    startY: 26,
    head: [['Right / Option', 'Terms']],
    body: rightsRows,
    theme: 'striped',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    margin: { left: 20, right: 20 },
  });

  addFooter(5, 7);

  // ─── PAGE 6: PARTIES & NOTICES ───────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 18, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('PARTIES & NOTICES', 20, 13);

  const partiesRows = [
    ['Tenant (Legal Name)', d.tenantName || 'N/A'],
    ['Landlord (Legal Name)', d.landlordName || 'N/A'],
    ['Guarantor', d.guarantor || 'None'],
    ['Personal Guaranty', d.personalGuaranty || 'None'],
    ['Tenant Notice Address', d.tenantNoticeAddress || 'N/A'],
    ['Landlord Notice Address', d.landlordNoticeAddress || 'N/A'],
    ['Parking Spaces', d.parkingSpaces ? String(d.parkingSpaces) : 'N/A'],
    ['Parking Cost', d.parkingCost || 'N/A'],
  ];

  (doc as any).autoTable({
    startY: 26,
    head: [['Party / Notice', 'Details']],
    body: partiesRows,
    theme: 'striped',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    margin: { left: 20, right: 20 },
  });

  addFooter(6, 7);

  // ─── PAGE 7: FLAGGED ITEMS & RISK ────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 18, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('FLAGGED ITEMS & RISK ANALYSIS', 20, 13);

  let y = 26;

  // Risk score summary
  doc.setFillColor(...riskColor);
  doc.roundedRect(20, y, W - 40, 14, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(`Risk Score: ${risk.score} — ${risk.label}`, 25, y + 9);
  y += 20;

  // Risk factors table
  const riskRows = risk.factors.map(f => [
    f.category.charAt(0).toUpperCase() + f.category.slice(1),
    f.label,
    (f.points > 0 ? '+' : '') + f.points,
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [['Category', 'Factor', 'Points']],
    body: riskRows,
    theme: 'striped',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data: any) => {
      if (data.column.index === 2 && data.section === 'body') {
        const val = parseFloat(data.cell.text[0]);
        data.cell.styles.textColor = val > 0 ? [16, 185, 129] : [239, 68, 68];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Flagged fields from AI
  if (d.flaggedFields?.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Fields Requiring Manual Review:', 20, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(d.flaggedFields.join(', '), 20, finalY + 6, { maxWidth: W - 40 });

    if (d.extractionNotes) {
      doc.text(`Note: ${d.extractionNotes}`, 20, finalY + 16, { maxWidth: W - 40 });
    }
  }

  addFooter(7, 7);

  const pdfBytes = doc.output('arraybuffer');
  const filename = `LeaseAbstract-${(d.propertyAddress || lease.fileName || 'lease').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.pdf`;

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
