import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

function parseNum(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).replace(/[$,%\s,]/g, '');
  const n = parseFloat(s);
  return isNaN(n) || !isFinite(n) ? null : n;
}

function avg(values: number[]): number | null {
  const valid = values.filter((v): v is number => v != null && isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ city: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { city } = await params;
  const cityDecoded = decodeURIComponent(city);

  const sql = getDb();

  const rows = await sql`
    SELECT id, "extractedData", "propertyAddress", "monthlyRent"
    FROM leases
    WHERE "propertyAddress" ILIKE ${`%${cityDecoded}%`}
      AND status = 'completed'
      AND "extractedData" IS NOT NULL
  `;

  const leases = rows as any[];

  if (leases.length === 0) {
    return NextResponse.json({ city: cityDecoded, leaseCount: 0, insufficient: true });
  }

  type Parsed = {
    propertyType: string;
    monthlyRent: number | null;
    leaseTermMonths: number | null;
    securityDeposit: number | null;
    rentEscalationPct: number | null;
    camChargesNum: number | null;
  };

  const parsed: Parsed[] = leases.map(l => {
    const d = l.extractedData ? JSON.parse(l.extractedData) : {};
    return {
      propertyType: String(d.propertyType || 'Unknown').trim(),
      monthlyRent: parseNum(d.baseRentMonthly) ?? parseNum(l.monthlyRent),
      leaseTermMonths: parseNum(d.leaseTermMonths),
      securityDeposit: parseNum(d.securityDeposit),
      rentEscalationPct: parseNum(d.rentEscalationPercentage),
      camChargesNum: parseNum(d.camCharges),
    };
  });

  // Aggregate by property type
  const typeMap: Record<string, number[]> = {};
  for (const p of parsed) {
    const t = p.propertyType || 'Unknown';
    if (p.monthlyRent != null) {
      if (!typeMap[t]) typeMap[t] = [];
      typeMap[t].push(p.monthlyRent);
    }
  }
  const avgRentByType: Record<string, number> = {};
  for (const [type, rents] of Object.entries(typeMap)) {
    const a = avg(rents);
    if (a != null) avgRentByType[type] = Math.round(a);
  }

  const rents = parsed.map(p => p.monthlyRent).filter((v): v is number => v != null);
  const terms = parsed.map(p => p.leaseTermMonths).filter((v): v is number => v != null);
  const deposits = parsed.map(p => p.securityDeposit).filter((v): v is number => v != null);
  const escalations = parsed.map(p => p.rentEscalationPct).filter((v): v is number => v != null);
  const camCharges = parsed.map(p => p.camChargesNum).filter((v): v is number => v != null);

  const avgRent = avg(rents);
  const avgTerm = avg(terms);
  const avgDeposit = avg(deposits);
  const avgEscalation = avg(escalations);
  const avgCam = avg(camCharges);

  return NextResponse.json({
    city: cityDecoded,
    leaseCount: leases.length,
    insufficient: false,
    avgMonthlyRent: avgRent != null ? Math.round(avgRent) : null,
    avgLeaseTermMonths: avgTerm != null ? Math.round(avgTerm) : null,
    avgSecurityDeposit: avgDeposit != null ? Math.round(avgDeposit) : null,
    avgRentEscalationPct: avgEscalation != null ? +avgEscalation.toFixed(1) : null,
    avgCamCharges: avgCam != null ? Math.round(avgCam) : null,
    avgRentByPropertyType: avgRentByType,
  });
}
