import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { getDaysUntil } from '@/lib/dateUtils';
import { format, addDays } from 'date-fns';

export async function GET(_req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id, plan, "promoCode", "promoTrialEnd" FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leases = await sql`SELECT * FROM leases WHERE "userId" = ${user.id} AND status = 'completed'`;

  const totalLeases = leases.length;
  const totalMonthlyRent = (leases as any[]).reduce((sum, l) => sum + (l.monthlyRent || 0), 0);

  const now = new Date();
  const endOfYear = new Date(now.getFullYear(), 11, 31);

  let criticalDeadlines = 0;
  let expiringThisYear = 0;

  for (const lease of leases as any[]) {
    const days = getDaysUntil(lease.expirationDate);
    if (days <= 90 && days >= 0) criticalDeadlines++;
    if (lease.expirationDate) {
      const expDate = new Date(lease.expirationDate);
      if (expDate <= endOfYear && expDate >= now) expiringThisYear++;
    }
  }

  const in90Days = addDays(now, 90);
  const in90DaysStr = format(in90Days, 'yyyy-MM-dd');

  const urgentAlerts = await sql`
    SELECT a.*, l."propertyAddress", l."tenantName", l."fileName"
    FROM alerts a
    JOIN leases l ON a."leaseId" = l.id
    WHERE a."userId" = ${user.id} AND a."acknowledgedAt" IS NULL
      AND a."triggerDate" <= ${in90DaysStr}
    ORDER BY a."triggerDate" ASC
    LIMIT 5
  `;

  const recentLeases = await sql`
    SELECT * FROM leases WHERE "userId" = ${user.id}
    ORDER BY "uploadedAt" DESC LIMIT 5
  `;

  let promoTrial: { active: boolean; daysLeft: number; trialEnd: string } | null = null;
  if (user.promoCode && user.promoTrialEnd) {
    const trialEndDate = new Date(user.promoTrialEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      promoTrial = { active: true, daysLeft, trialEnd: user.promoTrialEnd };
    }
  }

  return NextResponse.json({
    totalLeases,
    totalMonthlyRent,
    criticalDeadlines,
    expiringThisYear,
    urgentAlerts,
    recentLeases,
    promoTrial,
  });
}
