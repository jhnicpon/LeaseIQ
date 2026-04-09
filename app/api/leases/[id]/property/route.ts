/**
 * PATCH /api/leases/[id]/property
 * Body: { propertyId: string | null }
 *
 * Reassigns a lease to a different property, or unlinks it (null).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leaseRows = await sql`SELECT id FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  if (!leaseRows[0]) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const body = await req.json();
  const newPropertyId: string | null = body.propertyId ?? null;

  // Verify the target property belongs to this user (if not null)
  if (newPropertyId) {
    const propRows = await sql`SELECT id FROM properties WHERE id = ${newPropertyId} AND user_id = ${user.id}`;
    if (!propRows[0]) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  await sql`UPDATE leases SET property_id = ${newPropertyId} WHERE id = ${id}`;
  return NextResponse.json({ success: true, propertyId: newPropertyId });
}
