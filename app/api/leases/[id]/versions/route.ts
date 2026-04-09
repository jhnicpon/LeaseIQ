import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

// GET — list versions for a lease
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

  const versions = await sql`
    SELECT id, version, "changeDescription", "changedBy", "createdAt"
    FROM lease_versions
    WHERE "leaseId" = ${id}
    ORDER BY version DESC
  `;

  return NextResponse.json({ versions });
}

// POST — revert to a specific version
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { versionId } = await req.json() as { versionId: string };

  const sql = getDb();
  const userRows = await sql`SELECT id, email FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leaseRows = await sql`SELECT * FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  const lease = leaseRows[0] as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const versionRows = await sql`SELECT * FROM lease_versions WHERE id = ${versionId} AND "leaseId" = ${id}`;
  const version = versionRows[0] as any;
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  const { v4: uuidv4 } = await import('uuid');
  const maxVRows = await sql`SELECT MAX(version) as v FROM lease_versions WHERE "leaseId" = ${id}`;
  const maxVersion = (maxVRows[0] as any)?.v ?? 0;

  await sql`
    INSERT INTO lease_versions (id, "leaseId", "userId", version, "extractedData", "changeDescription", "changedBy")
    VALUES (${uuidv4()}, ${id}, ${user.id}, ${maxVersion + 1}, ${lease.extractedData}, ${'Auto-save before revert'}, ${user.email})
  `;

  const reverted = JSON.parse(version.extractedData);
  await sql`
    UPDATE leases SET
      "extractedData" = ${version.extractedData},
      "propertyAddress" = ${reverted.propertyAddress || lease.propertyAddress},
      "tenantName" = ${reverted.tenantName || lease.tenantName},
      "expirationDate" = ${reverted.leaseExpirationDate || lease.expirationDate},
      "monthlyRent" = ${reverted.baseRentMonthly || lease.monthlyRent}
    WHERE id = ${id}
  `;

  return NextResponse.json({ success: true });
}
