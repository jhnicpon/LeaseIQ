import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

export async function GET(_req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leases = await sql`SELECT * FROM leases WHERE "userId" = ${user.id} AND status = 'completed'`;

  const events: any[] = [];

  for (const lease of leases as any[]) {
    if (!lease.extractedData) continue;
    const data = JSON.parse(lease.extractedData);

    const dateFields = [
      { date: data.leaseExpirationDate, label: 'Lease Expiration', type: 'expiration' },
      { date: data.renewalOptionDeadline, label: 'Renewal Option Deadline', type: 'renewal' },
      { date: data.terminationOptionDate, label: 'Termination Option', type: 'termination' },
      { date: data.leaseCommencementDate, label: 'Lease Commencement', type: 'commencement' },
    ];

    for (const { date, label, type } of dateFields) {
      if (date) {
        events.push({
          id: `${lease.id}-${type}`,
          leaseId: lease.id,
          propertyAddress: data.propertyAddress || lease.propertyAddress,
          tenantName: data.tenantName || lease.tenantName,
          date,
          label,
          type,
        });
      }
    }
  }

  return NextResponse.json({ events });
}
