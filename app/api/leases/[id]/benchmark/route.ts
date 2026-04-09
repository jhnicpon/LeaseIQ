import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

/** Extract city from a full address string like "123 Main St, Dallas, TX 75201" */
export function extractCity(address: string): string | null {
  if (!address) return null;
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 2]; // "Dallas" from "..., Dallas, TX 75201"
  if (parts.length === 2) return parts[0]; // "Dallas" from "Dallas, TX"
  return null;
}

/** Parse a numeric value from strings like "$5,000", "5.5%", "5000", etc. */
function parseNum(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).replace(/[$,%\s,]/g, '');
  const n = parseFloat(s);
  return isNaN(n) || !isFinite(n) ? null : n;
}

/** Compute what percentile `subject` is in among `values` (0–100).
 *  Returns the % of values strictly below the subject. */
function pctile(values: number[], subject: number): number {
  if (values.length === 0) return 50;
  const below = values.filter(v => v < subject).length;
  return Math.round((below / values.length) * 100);
}

function avg(values: number[]): number | null {
  const valid = values.filter(v => v != null && isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** Favorability: higher percentile = less favorable for tenant (paying more / less favorable terms). */
function tenantFavorability(
  pct: number,
  higherIsBetter: boolean  // true = higher value favors tenant (e.g. TI allowance)
): 'favorable' | 'neutral' | 'unfavorable' {
  const adjusted = higherIsBetter ? pct : 100 - pct;
  if (adjusted >= 60) return 'favorable';
  if (adjusted >= 35) return 'neutral';
  return 'unfavorable';
}

const MIN_LEASES_FOR_BENCHMARK = 3;

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

  const data = lease.extractedData ? JSON.parse(lease.extractedData) : {};

  const address: string = data.propertyAddress || lease.propertyAddress || '';
  const city = extractCity(address);

  if (!city) {
    return NextResponse.json({ insufficient: true, reason: 'no_city', city: null });
  }

  // Fetch all leases for this city (ILIKE match on propertyAddress column)
  // Anonymized: we only read extractedData and denormalized columns
  const cityLeases = await sql`
    SELECT id, "extractedData", "propertyAddress", "monthlyRent"
    FROM leases
    WHERE "propertyAddress" ILIKE ${`%${city}%`}
      AND status = 'completed'
      AND "extractedData" IS NOT NULL
  `;

  const peers = (cityLeases as any[]).filter(l => l.id !== id);

  if (peers.length < MIN_LEASES_FOR_BENCHMARK) {
    return NextResponse.json({
      insufficient: true,
      reason: 'not_enough_data',
      city,
      peerCount: peers.length,
    });
  }

  // Parse fields from each peer
  type PeerMetrics = {
    monthlyRent: number | null;
    rentPerSqft: number | null;
    securityDeposit: number | null;
    leaseTermMonths: number | null;
    rentEscalationPct: number | null;
    tiAllowance: number | null;
    tiPerSqft: number | null;
  };

  const parse = (l: any): PeerMetrics => {
    const d = l.extractedData ? JSON.parse(l.extractedData) : {};
    const rent = parseNum(d.baseRentMonthly) ?? parseNum(l.monthlyRent);
    const sqft = parseNum(d.squareFootage) ?? parseNum(d.premisesSize);
    const annualRent = rent != null ? rent * 12 : null;
    const rentPerSqft = annualRent != null && sqft && sqft > 0 ? annualRent / sqft : null;
    const tiTotal = parseNum(d.tenantImprovementAllowance);
    const tiPerSqft = tiTotal != null && sqft && sqft > 0 ? tiTotal / sqft : null;
    return {
      monthlyRent: rent,
      rentPerSqft,
      securityDeposit: parseNum(d.securityDeposit),
      leaseTermMonths: parseNum(d.leaseTermMonths),
      rentEscalationPct: parseNum(d.rentEscalationPercentage),
      tiAllowance: tiTotal,
      tiPerSqft,
    };
  };

  const peerMetrics = peers.map(parse);
  const subjectMetrics = parse({ extractedData: lease.extractedData, monthlyRent: lease.monthlyRent });

  const collect = (field: keyof PeerMetrics): number[] =>
    peerMetrics.map(m => m[field] as number | null).filter((v): v is number => v != null);

  type BenchmarkField = {
    label: string;
    thisLease: string;
    cityAvg: string;
    percentile: number | null;
    favorability: 'favorable' | 'neutral' | 'unfavorable' | 'n/a';
    hasData: boolean;
  };

  const buildField = (
    label: string,
    subjectVal: number | null,
    peers: number[],
    higherIsBetter: boolean,
    format: (n: number) => string
  ): BenchmarkField => {
    const cityAvgVal = avg(peers);
    if (subjectVal == null || peers.length < 3) {
      return {
        label,
        thisLease: subjectVal != null ? format(subjectVal) : 'N/A',
        cityAvg: cityAvgVal != null ? format(cityAvgVal) : 'N/A',
        percentile: null,
        favorability: 'n/a',
        hasData: false,
      };
    }
    const allVals = [...peers, subjectVal];
    const pct = pctile(allVals, subjectVal);
    return {
      label,
      thisLease: format(subjectVal),
      cityAvg: cityAvgVal != null ? format(cityAvgVal) : 'N/A',
      percentile: pct,
      favorability: tenantFavorability(pct, higherIsBetter),
      hasData: true,
    };
  };

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const fmtPsf = (n: number) => `$${n.toFixed(2)}/sqft/yr`;
  const fmtMo = (n: number) => `${Math.round(n)} mo`;
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;
  const fmtTiPsf = (n: number) => `$${n.toFixed(2)}/sqft`;

  const fields: BenchmarkField[] = [
    buildField('Monthly Rent', subjectMetrics.monthlyRent, collect('monthlyRent'), false, fmtCurrency),
    buildField('Rent / Sq Ft / Yr', subjectMetrics.rentPerSqft, collect('rentPerSqft'), false, fmtPsf),
    buildField('Security Deposit', subjectMetrics.securityDeposit, collect('securityDeposit'), false, fmtCurrency),
    buildField('Lease Term', subjectMetrics.leaseTermMonths, collect('leaseTermMonths'), false, fmtMo),
    buildField('Rent Escalation', subjectMetrics.rentEscalationPct, collect('rentEscalationPct'), false, fmtPct),
    buildField('TI Allowance / Sq Ft', subjectMetrics.tiPerSqft, collect('tiPerSqft'), true, fmtTiPsf),
  ].filter(f => f.thisLease !== 'N/A' || f.cityAvg !== 'N/A');

  // Overall tenant score = avg of per-field tenant-friendliness (favorable=100, neutral=50, unfavorable=0)
  const scoreFields = fields.filter(f => f.hasData && f.favorability !== 'n/a');
  const scoreMap = { favorable: 100, neutral: 50, unfavorable: 0 } as const;
  const overallScore =
    scoreFields.length > 0
      ? Math.round(scoreFields.reduce((sum, f) => sum + scoreMap[f.favorability as keyof typeof scoreMap], 0) / scoreFields.length)
      : null;

  const overallPercentile =
    fields.filter(f => f.hasData).length > 0
      ? Math.round(
          fields
            .filter(f => f.hasData && f.percentile != null)
            .reduce((sum, f) => sum + (f.favorability === 'favorable' ? 100 - f.percentile! : f.percentile!), 0) /
          Math.max(1, fields.filter(f => f.hasData && f.percentile != null).length)
        )
      : null;

  // Summary text
  const unfavorable = fields.filter(f => f.favorability === 'unfavorable').map(f => f.label);
  const favorable = fields.filter(f => f.favorability === 'favorable').map(f => f.label);
  let summary = '';
  if (overallScore != null) {
    const quartileLabel =
      overallScore >= 75 ? 'top 25% for tenant friendliness'
      : overallScore >= 50 ? 'middle 50% for tenant friendliness'
      : 'bottom 25% for tenant friendliness';
    summary = `This lease is in the ${quartileLabel} compared to other ${city} leases in our database.`;
    if (unfavorable.length > 0) {
      summary += ` ${unfavorable.join(' and ')} ${unfavorable.length === 1 ? 'is' : 'are'} above average.`;
    }
    if (favorable.length > 0) {
      summary += ` ${favorable.join(' and ')} ${favorable.length === 1 ? 'is' : 'are'} favorable for the tenant.`;
    }
  }

  return NextResponse.json({
    insufficient: false,
    city,
    peerCount: peers.length,
    fields,
    overallScore,
    overallPercentile,
    summary,
  });
}
