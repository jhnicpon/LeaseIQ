import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const showAcknowledged = searchParams.get('acknowledged') === 'true';

  const today = format(new Date(), 'yyyy-MM-dd');

  let query = `
    SELECT a.*, l.propertyAddress, l.tenantName, l.fileName
    FROM alerts a
    JOIN leases l ON a.leaseId = l.id
    WHERE a.userId = ?
  `;

  if (!showAcknowledged) {
    query += ` AND a.acknowledgedAt IS NULL`;
  }

  query += ` AND a.triggerDate <= '${today}'`;
  query += ` ORDER BY a.triggerDate DESC`;

  const alerts = db.prepare(query).all(user.id);
  const unreadCount = db.prepare("SELECT COUNT(*) as count FROM alerts a JOIN leases l ON a.leaseId = l.id WHERE a.userId = ? AND a.acknowledgedAt IS NULL AND a.triggerDate <= ?").get(user.id, today) as any;

  return NextResponse.json({ alerts, unreadCount: unreadCount?.count || 0 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { alertId, acknowledgeAll } = await req.json();
  const now = new Date().toISOString();

  if (acknowledgeAll) {
    db.prepare("UPDATE alerts SET acknowledgedAt = ? WHERE userId = ? AND acknowledgedAt IS NULL").run(now, user.id);
  } else if (alertId) {
    db.prepare("UPDATE alerts SET acknowledgedAt = ? WHERE id = ? AND userId = ?").run(now, alertId, user.id);
  }

  return NextResponse.json({ success: true });
}
