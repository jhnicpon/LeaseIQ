/**
 * GET /api/test-email?email=you@example.com&secret=YOUR_CRON_SECRET
 *
 * Sends one of every email template to the specified address and reports
 * exactly what succeeded or failed. Use this to verify Resend is wired up
 * correctly on the live site.
 *
 * Secured with CRON_SECRET — same secret used by other internal endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendDeadlineAlertEmail,
  sendTeamInviteEmail,
  sendPromoTrialEndingEmail,
  sendWeeklyDigestEmail,
} from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-test-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized — pass ?secret=YOUR_CRON_SECRET' }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get('email');
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Pass ?email=your@email.com' }, { status: 400 });
  }

  // ── Config check ─────────────────────────────────────────────────────────────
  const config = {
    RESEND_API_KEY: process.env.RESEND_API_KEY ? `set (${process.env.RESEND_API_KEY.slice(0, 8)}...)` : 'MISSING ❌',
    EMAIL_FROM: process.env.EMAIL_FROM ?? '(not set — will use default noreply@leaseiq.com)',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? '(not set — links will use http://localhost:3000)',
  };

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      error: 'RESEND_API_KEY is not set. Add it to Vercel → Settings → Environment Variables.',
      config,
    }, { status: 500 });
  }

  // ── Send each template ───────────────────────────────────────────────────────
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  type Result = { template: string; status: 'ok' | 'error'; error?: string };
  const results: Result[] = [];

  const run = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ template: name, status: 'ok' });
    } catch (e: any) {
      results.push({ template: name, status: 'error', error: e?.message ?? String(e) });
    }
  };

  await run('welcome', () => sendWelcomeEmail(email, 'Test User'));

  await run('password-reset', () =>
    sendPasswordResetEmail(email, 'Test User', `${baseUrl}/auth/reset-password?token=test-token-preview`)
  );

  await run('deadline-alert', () =>
    sendDeadlineAlertEmail({
      to: email,
      name: 'Test User',
      leases: [
        {
          propertyAddress: '123 Main Street, Dallas TX 75201',
          tenantName: 'Acme Corp',
          expirationDate: '2026-04-16',
          daysRemaining: 7,
          alertType: 'Expiration - 7 days',
          leaseId: 'test-lease-id',
        },
        {
          propertyAddress: '456 Commerce Blvd, Suite 200, Austin TX 78701',
          tenantName: 'Beta Industries LLC',
          expirationDate: '2026-05-09',
          daysRemaining: 30,
          alertType: 'Expiration - 30 days',
          leaseId: 'test-lease-id-2',
        },
      ],
    })
  );

  await run('team-invite', () =>
    sendTeamInviteEmail({
      to: email,
      inviterName: 'John Nicpon',
      role: 'editor',
      acceptUrl: `${baseUrl}/team/accept?token=test-invite-token`,
    })
  );

  await run('promo-trial-ending', () =>
    sendPromoTrialEndingEmail(email, 'Test User', 7, '2026-04-16')
  );

  await run('weekly-digest', () =>
    sendWeeklyDigestEmail({
      to: email,
      name: 'Test User',
      totalLeases: 12,
      monthlyRent: 87400,
      expiringIn90Days: 3,
      criticalAlerts: 1,
      topLeases: [
        { propertyAddress: '123 Main Street, Dallas TX', expirationDate: '2026-04-16', monthlyRent: 8500 },
        { propertyAddress: '456 Commerce Blvd, Austin TX', expirationDate: '2026-05-09', monthlyRent: 12000 },
      ],
    })
  );

  const allOk = results.every(r => r.status === 'ok');
  const failedCount = results.filter(r => r.status === 'error').length;

  return NextResponse.json({
    ok: allOk,
    sentTo: email,
    summary: allOk
      ? `All ${results.length} emails sent successfully ✓`
      : `${results.length - failedCount}/${results.length} emails sent — ${failedCount} failed`,
    config,
    results,
  }, { status: allOk ? 200 : 207 });
}
