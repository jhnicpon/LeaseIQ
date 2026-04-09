import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { calculateRiskScore } from '@/lib/riskScore';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leaseRows = await sql`SELECT * FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  const lease = leaseRows[0];
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  return NextResponse.json({ lease });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const body = await req.json();

  if (body.extractedData) {
    const current = lease.extractedData ? JSON.parse(lease.extractedData) : {};
    const updated = { ...current, ...body.extractedData };
    const updatedStr = JSON.stringify(updated);
    const risk = calculateRiskScore(updated);

    const maxVRows = await sql`SELECT MAX(version) as v FROM lease_versions WHERE "leaseId" = ${id}`;
    const maxV = (maxVRows[0] as any)?.v ?? 0;
    const changedKeys = Object.keys(body.extractedData).join(', ');

    await sql`
      INSERT INTO lease_versions (id, "leaseId", "userId", version, "extractedData", "changeDescription", "changedBy")
      VALUES (
        ${uuidv4()}, ${id}, ${user.id}, ${maxV + 1},
        ${lease.extractedData}, ${`Manual edit: ${changedKeys}`}, ${session.user.email!}
      )
    `;

    await sql`
      UPDATE leases SET
        "extractedData" = ${updatedStr},
        "propertyAddress" = ${updated.propertyAddress || lease.propertyAddress},
        "tenantName" = ${updated.tenantName || lease.tenantName},
        "expirationDate" = ${updated.leaseExpirationDate || lease.expirationDate},
        "monthlyRent" = ${updated.baseRentMonthly || lease.monthlyRent},
        "riskScore" = ${risk.score},
        "riskFactors" = ${JSON.stringify(risk.factors)}
      WHERE id = ${id} AND "userId" = ${user.id}
    `;
  }

  const updatedRows = await sql`SELECT * FROM leases WHERE id = ${id}`;
  return NextResponse.json({ lease: updatedRows[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await sql`DELETE FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  return NextResponse.json({ success: true });
}
