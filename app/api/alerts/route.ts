import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const showAcknowledged = searchParams.get('acknowledged') === 'true';
  const today = format(new Date(), 'yyyy-MM-dd');

  const alerts = showAcknowledged
    ? await sql`
        SELECT a.*, l."propertyAddress", l."tenantName", l."fileName"
        FROM alerts a
        JOIN leases l ON a."leaseId" = l.id
        WHERE a."userId" = ${user.id}
          AND a."triggerDate" <= ${today}
        ORDER BY a."triggerDate" DESC
      `
    : await sql`
        SELECT a.*, l."propertyAddress", l."tenantName", l."fileName"
        FROM alerts a
        JOIN leases l ON a."leaseId" = l.id
        WHERE a."userId" = ${user.id}
          AND a."acknowledgedAt" IS NULL
          AND a."triggerDate" <= ${today}
        ORDER BY a."triggerDate" DESC
      `;

  const countRows = await sql`
    SELECT COUNT(*) as count FROM alerts a
    JOIN leases l ON a."leaseId" = l.id
    WHERE a."userId" = ${user.id}
      AND a."acknowledgedAt" IS NULL
      AND a."triggerDate" <= ${today}
  `;

  return NextResponse.json({
    alerts,
    unreadCount: Number((countRows[0] as any)?.count ?? 0),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { alertId, acknowledgeAll } = await req.json();
  const now = new Date().toISOString();

  if (acknowledgeAll) {
    await sql`UPDATE alerts SET "acknowledgedAt" = ${now} WHERE "userId" = ${user.id} AND "acknowledgedAt" IS NULL`;
  } else if (alertId) {
    await sql`UPDATE alerts SET "acknowledgedAt" = ${now} WHERE id = ${alertId} AND "userId" = ${user.id}`;
  }

  return NextResponse.json({ success: true });
}
