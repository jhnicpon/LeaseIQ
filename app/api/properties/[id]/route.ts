import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { normalizeAddress, extractCity, extractState } from '@/lib/propertyMatcher';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const propRows = await sql`SELECT * FROM properties WHERE id = ${id} AND user_id = ${user.id}`;
  if (!propRows[0]) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const leases = await sql`
    SELECT id, "fileName", "propertyAddress", "tenantName", "expirationDate", "monthlyRent", status, "riskScore"
    FROM leases
    WHERE property_id = ${id} AND "userId" = ${user.id}
    ORDER BY "expirationDate" ASC NULLS LAST
  `;

  return NextResponse.json({ property: propRows[0], leases });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const propRows = await sql`SELECT * FROM properties WHERE id = ${id} AND user_id = ${user.id}`;
  if (!propRows[0]) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const body = await req.json();
  const { name, address, propertyType } = body;

  const newName = name ?? propRows[0].name;
  const newAddress = address ?? propRows[0].address;
  const newType = propertyType ?? propRows[0].property_type;
  const normAddr = address ? normalizeAddress(newAddress) : propRows[0].normalized_address;

  await sql`
    UPDATE properties SET
      name = ${newName},
      address = ${newAddress},
      normalized_address = ${normAddr},
      city = ${extractCity(newAddress)},
      state = ${extractState(newAddress)},
      property_type = ${newType},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  const updated = await sql`SELECT * FROM properties WHERE id = ${id}`;
  return NextResponse.json({ property: updated[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Unlink leases first (set property_id = null)
  await sql`UPDATE leases SET property_id = NULL WHERE property_id = ${id} AND "userId" = ${user.id}`;
  await sql`DELETE FROM properties WHERE id = ${id} AND user_id = ${user.id}`;

  return NextResponse.json({ success: true });
}
