import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { getDaysUntil } from '@/lib/dateUtils';
import { format, addDays } from 'date-fns';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leases = db.prepare("SELECT * FROM leases WHERE userId = ? AND status = 'completed'").all(user.id) as any[];

  const totalLeases = leases.length;
  const totalMonthlyRent = leases.reduce((sum, l) => sum + (l.monthlyRent || 0), 0);

  const now = new Date();
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const in90Days = addDays(now, 90);

  let criticalDeadlines = 0;
  let expiringThisYear = 0;

  for (const lease of leases) {
    const days = getDaysUntil(lease.expirationDate);
    if (days <= 90 && days >= 0) criticalDeadlines++;
    if (lease.expirationDate) {
      const expDate = new Date(lease.expirationDate);
      if (expDate <= endOfYear && expDate >= now) expiringThisYear++;
    }
  }

  // Urgent alerts
  const in90DaysStr = format(in90Days, 'yyyy-MM-dd');

  const urgentAlerts = db.prepare(`
    SELECT a.*, l.propertyAddress, l.tenantName, l.fileName
    FROM alerts a
    JOIN leases l ON a.leaseId = l.id
    WHERE a.userId = ? AND a.acknowledgedAt IS NULL
      AND a.triggerDate <= ?
    ORDER BY a.triggerDate ASC
    LIMIT 5
  `).all(user.id, in90DaysStr) as any[];

  const recentLeases = db.prepare(`
    SELECT * FROM leases WHERE userId = ?
    ORDER BY uploadedAt DESC LIMIT 5
  `).all(user.id) as any[];

  return NextResponse.json({
    totalLeases,
    totalMonthlyRent,
    criticalDeadlines,
    expiringThisYear,
    urgentAlerts,
    recentLeases,
  });
}
