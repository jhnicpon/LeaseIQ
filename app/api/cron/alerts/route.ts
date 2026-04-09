/**
 * GET /api/cron/alerts
 * Sends deadline alert emails (90d, 30d, 7d) to users with upcoming lease expirations.
 * Call this daily via a cron job or scheduled task.
 * Secured with CRON_SECRET in the Authorization header.
 */
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { sendDeadlineAlertEmail } from '@/lib/email';
import { differenceInDays, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

const ALERT_THRESHOLDS = [90, 30, 7];

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type LeaseRow = {
    leaseId: string;
    userId: string;
    email: string;
    name: string;
    expirationDate: string;
    propertyAddress: string | null;
    tenantName: string | null;
  };

  const leases = await sql`
    SELECT l.id as "leaseId", l."userId", u.email, u.name, l."expirationDate", l."propertyAddress", l."tenantName"
    FROM leases l
    JOIN users u ON u.id = l."userId"
    WHERE l."expirationDate" IS NOT NULL AND l.status = 'completed'
  ` as LeaseRow[];

  const userAlerts = new Map<string, Map<number, LeaseRow[]>>();

  for (const lease of leases) {
    const expDate = parseISO(lease.expirationDate);
    const days = differenceInDays(expDate, today);

    for (const threshold of ALERT_THRESHOLDS) {
      if (days === threshold) {
        if (!userAlerts.has(lease.userId)) userAlerts.set(lease.userId, new Map());
        const byThreshold = userAlerts.get(lease.userId)!;
        if (!byThreshold.has(threshold)) byThreshold.set(threshold, []);
        byThreshold.get(threshold)!.push(lease);
      }
    }
  }

  let sent = 0;
  for (const [, byThreshold] of userAlerts) {
    for (const [threshold, thresholdLeases] of byThreshold) {
      const first = thresholdLeases[0];
      await sendDeadlineAlertEmail({
        to: first.email,
        name: first.name,
        leases: thresholdLeases.map(l => ({
          propertyAddress: l.propertyAddress ?? 'Unknown property',
          tenantName: l.tenantName ?? 'N/A',
          expirationDate: l.expirationDate,
          daysRemaining: threshold,
          alertType: `Expiration - ${threshold} days`,
          leaseId: l.leaseId,
        })),
      }).catch(() => {});
      sent++;
    }
  }

  return NextResponse.json({ ok: true, emailsSent: sent });
}
