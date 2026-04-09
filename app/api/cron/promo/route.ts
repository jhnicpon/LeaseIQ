import { NextRequest, NextResponse } from 'next/server';
import { format, addDays } from 'date-fns';
import getDb from '@/lib/db';
import { sendPromoTrialEndingEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Called daily by an external cron scheduler (e.g. Vercel Cron).
// Checks promo trials and:
//   1. Sends a reminder email 7 days before trial ends
//   2. Downgrades users to 'free' when their trial has expired

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  const today = format(new Date(), 'yyyy-MM-dd');
  const in7Days = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  // ── 1. Downgrade expired trials ───────────────────────────────────────────
  const expired = await sql`
    SELECT id, name, email, "promoTrialEnd" FROM users
    WHERE "promoCode" IS NOT NULL
      AND "promoTrialEnd" IS NOT NULL
      AND "promoTrialEnd" < ${today}
      AND plan != 'free'
      AND ("stripeSubscriptionId" IS NULL OR "subscriptionStatus" != 'active')
  ` as { id: string; name: string; email: string; promoTrialEnd: string }[];

  for (const user of expired) {
    await sql`UPDATE users SET plan = 'free' WHERE id = ${user.id}`;
  }

  // ── 2. Send 7-day warning emails ─────────────────────────────────────────
  const endingSoon = await sql`
    SELECT id, name, email, "promoTrialEnd" FROM users
    WHERE "promoCode" IS NOT NULL
      AND "promoTrialEnd" IS NOT NULL
      AND "promoTrialEnd" = ${in7Days}
      AND plan != 'free'
  ` as { id: string; name: string; email: string; promoTrialEnd: string }[];

  let emailsSent = 0;
  for (const user of endingSoon) {
    try {
      await sendPromoTrialEndingEmail(user.email, user.name, 7, user.promoTrialEnd);
      emailsSent++;
    } catch {
      // Non-blocking — log but continue
    }
  }

  return NextResponse.json({
    downgradedCount: expired.length,
    emailsSent,
    today,
  });
}
