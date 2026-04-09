import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { normalizeAddress, extractCity, extractState } from '@/lib/propertyMatcher';

export async function GET(_req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Return properties with their leases (for grouping display)
  const properties = await sql`
    SELECT
      p.id,
      p.name,
      p.address,
      p.city,
      p.state,
      p.zip,
      p.property_type AS "propertyType",
      p.created_at AS "createdAt",
      COUNT(l.id)::int AS "leaseCount",
      COALESCE(SUM(l."monthlyRent"), 0)::real AS "totalMonthlyRent",
      MIN(l."expirationDate") AS "earliestExpiration"
    FROM properties p
    LEFT JOIN leases l ON l.property_id = p.id AND l.status = 'completed'
    WHERE p.user_id = ${user.id}
    GROUP BY p.id
    ORDER BY p.name ASC
  `;

  return NextResponse.json({ properties });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();
  const { name, address, propertyType } = body;
  if (!name || !address) return NextResponse.json({ error: 'name and address are required' }, { status: 400 });

  const normAddr = normalizeAddress(address);

  const rows = await sql`
    INSERT INTO properties (user_id, name, address, normalized_address, city, state, property_type)
    VALUES (
      ${user.id}, ${name}, ${address}, ${normAddr},
      ${extractCity(address)}, ${extractState(address)}, ${propertyType ?? null}
    )
    RETURNING *
  `;

  return NextResponse.json({ property: rows[0] }, { status: 201 });
}
