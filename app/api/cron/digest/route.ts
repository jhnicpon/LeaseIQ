/**
 * GET /api/cron/digest
 * Sends weekly portfolio digest every Monday.
 * Secured with CRON_SECRET header.
 */
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { sendWeeklyDigestEmail } from '@/lib/email';
import { differenceInDays, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only run on Mondays (day 1) unless forced
  const force = req.nextUrl.searchParams.get('force') === 'true';
  const dayOfWeek = new Date().getDay();
  if (!force && dayOfWeek !== 1) {
    return NextResponse.json({ ok: true, skipped: 'Not Monday' });
  }

  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type UserRow = { id: string; email: string; name: string };
  const users = db.prepare('SELECT id, email, name FROM users').all() as UserRow[];

  let sent = 0;
  for (const user of users) {
    type LeaseRow = {
      id: string;
      propertyAddress: string | null;
      expirationDate: string | null;
      monthlyRent: number | null;
    };

    const userLeases = db.prepare(
      "SELECT id, propertyAddress, expirationDate, monthlyRent FROM leases WHERE userId = ? AND status = 'completed'"
    ).all(user.id) as LeaseRow[];

    if (userLeases.length === 0) continue;

    const monthlyRent = userLeases.reduce((sum, l) => sum + (l.monthlyRent ?? 0), 0);
    const expiringIn90Days = userLeases.filter(l => {
      if (!l.expirationDate) return false;
      const days = differenceInDays(parseISO(l.expirationDate), today);
      return days >= 0 && days <= 90;
    }).length;
    const criticalAlerts = userLeases.filter(l => {
      if (!l.expirationDate) return false;
      const days = differenceInDays(parseISO(l.expirationDate), today);
      return days >= 0 && days <= 7;
    }).length;

    const topLeases = [...userLeases]
      .filter(l => l.expirationDate)
      .sort((a, b) => {
        const da = differenceInDays(parseISO(a.expirationDate!), today);
        const db2 = differenceInDays(parseISO(b.expirationDate!), today);
        return da - db2;
      })
      .slice(0, 5)
      .map(l => ({
        propertyAddress: l.propertyAddress ?? '',
        expirationDate: l.expirationDate ?? '',
        monthlyRent: l.monthlyRent ?? 0,
      }));

    await sendWeeklyDigestEmail({
      to: user.email,
      name: user.name,
      totalLeases: userLeases.length,
      monthlyRent,
      expiringIn90Days,
      criticalAlerts,
      topLeases,
    }).catch(() => {});
    sent++;
  }

  return NextResponse.json({ ok: true, digestsSent: sent });
}
