import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { analyzeMarketRent, extractSquareFootage } from '@/lib/marketAnalysis';

const CACHE_DAYS = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();

  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leaseRows = await sql`SELECT id FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  if (!leaseRows[0]) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const analysisRows = await sql`
    SELECT * FROM market_analyses
    WHERE "leaseId" = ${id}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  const cached = analysisRows[0] as any;
  if (!cached) return NextResponse.json({ analysis: null });

  const expiresAt = new Date(cached.expiresAt);
  if (expiresAt < new Date()) return NextResponse.json({ analysis: null, expired: true });

  return NextResponse.json({
    analysis: JSON.parse(cached.analysisData),
    cachedAt: cached.createdAt,
    expiresAt: cached.expiresAt,
  });
}

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

  const extracted = lease.extractedData ? JSON.parse(lease.extractedData) : {};

  const propertyAddress: string = extracted.propertyAddress || lease.propertyAddress || '';
  const propertyType: string = extracted.propertyType || '';
  const monthlyRent: number = Number(extracted.baseRentMonthly) || Number(lease.monthlyRent) || 0;

  if (!propertyAddress || !monthlyRent) {
    return NextResponse.json(
      { error: 'Insufficient lease data: property address and rent are required' },
      { status: 400 }
    );
  }

  const squareFootage = extractSquareFootage(extracted);

  const analysis = await analyzeMarketRent({
    propertyAddress,
    propertyType,
    monthlyRent,
    squareFootage,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_DAYS);

  await sql`
    INSERT INTO market_analyses (id, "leaseId", "userId", "analysisData", "createdAt", "expiresAt")
    VALUES (
      ${uuidv4()},
      ${id},
      ${user.id},
      ${JSON.stringify(analysis)},
      NOW(),
      ${expiresAt.toISOString()}
    )
  `;

  // Cache market position on the lease row for list-page badges
  await sql`
    UPDATE leases SET "marketPosition" = ${analysis.position}
    WHERE id = ${id}
  `;

  return NextResponse.json({
    analysis,
    cachedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
}
