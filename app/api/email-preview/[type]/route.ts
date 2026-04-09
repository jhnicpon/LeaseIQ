/**
 * GET /api/email-preview/[type]?secret=CRON_SECRET
 *
 * Returns a raw HTML preview of each email template so you can visually
 * verify exactly what recipients see before emails go to real users.
 *
 * Valid types:
 *   welcome | password-reset | team-invite | deadline-alert
 *   promo-trial-ending | weekly-digest
 *
 * Secured with CRON_SECRET (same as other internal endpoints).
 * If CRON_SECRET is not set the endpoint is open — lock it in production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { wrap } from '@/lib/email';

const BASE = process.env.NEXTAUTH_URL ?? 'https://leaseiq.com';

function notFound(type: string) {
  return new NextResponse(
    `<p style="font-family:sans-serif;color:#f00">Unknown email type: <strong>${type}</strong>.<br/>
    Valid types: welcome, password-reset, team-invite, deadline-alert, promo-trial-ending, weekly-digest</p>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

// ─── Templates (same HTML used by lib/email.ts) ───────────────────────────────

function welcome(): string {
  return wrap(`
    <h2>Welcome to LeaseIQ, Jane Smith!</h2>
    <p>You're all set. Start by uploading your first lease — our AI will extract all critical terms in under a minute.</p>
    <a href="${BASE}/leases/upload" class="btn">Upload your first lease →</a>
    <p>Here's what you can do with LeaseIQ:</p>
    <div class="checklist-item"><span class="check">✓</span><span><strong style="color:#fff">AI extraction</strong> — rent, dates, options, obligations pulled automatically</span></div>
    <div class="checklist-item"><span class="check">✓</span><span><strong style="color:#fff">Deadline alerts</strong> — email reminders before critical dates expire</span></div>
    <div class="checklist-item"><span class="check">✓</span><span><strong style="color:#fff">Portfolio analytics</strong> — full rent roll and exposure in one dashboard</span></div>
    <p style="margin-top:20px;">If you have any questions, just reply to this email.</p>
    <p>— The LeaseIQ Team</p>
  `);
}

function passwordReset(): string {
  const resetUrl = `${BASE}/auth/reset-password?token=preview-token-abc123`;
  return wrap(`
    <h2>Reset your password</h2>
    <p>Hi Jane,</p>
    <p>We received a request to reset your LeaseIQ password. Click the button below to set a new password. This link expires in <strong style="color:#fff">1 hour</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset Password →</a>
    <p>If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
    <div class="alert-card info" style="margin-top:20px;">
      <span style="font-size:13px;color:#9ca3af;">If the button doesn't work, copy and paste this link into your browser:<br/>
      <span style="color:#60a5fa;word-break:break-all;">${resetUrl}</span></span>
    </div>
    <p style="margin-top:16px;">— The LeaseIQ Team</p>
  `);
}

function teamInvite(): string {
  const acceptUrl = `${BASE}/team/accept?token=preview-token-abc123`;
  return wrap(`
    <h2>John Nicpon invited you to LeaseIQ</h2>
    <p>You've been invited to join <strong style="color:#fff">John Nicpon's</strong> LeaseIQ workspace as a <strong style="color:#fff">editor</strong>.</p>
    <a href="${acceptUrl}" class="btn">Accept Invitation →</a>
    <p>LeaseIQ is a commercial real estate intelligence platform for tracking lease deadlines, rent rolls, and critical dates.</p>
    <div class="alert-card info" style="margin-top:20px;">
      <span style="font-size:13px;color:#9ca3af;">This invitation link expires in 7 days. If you didn't expect this, you can safely ignore this email.</span>
    </div>
  `);
}

function deadlineAlert(): string {
  return wrap(`
    <h2>🚨 Critical: 2 lease deadlines approaching</h2>
    <p>Hi Jane, the following leases require your attention:</p>
    <div class="alert-card">
      <strong style="color:#fff">123 Main Street, Dallas TX 75201</strong><br/>
      <span style="font-size:13px;color:#9ca3af;">Tenant: Acme Corp</span><br/>
      <span style="font-size:13px;color:#9ca3af;">Expires: 2026-04-16 — <strong style="color:#ef4444">7 days remaining</strong></span><br/>
      <a href="${BASE}/leases/abc123" style="font-size:12px;color:#60a5fa;">View lease →</a>
    </div>
    <div class="alert-card warning">
      <strong style="color:#fff">456 Commerce Blvd, Suite 200, Austin TX 78701</strong><br/>
      <span style="font-size:13px;color:#9ca3af;">Tenant: Beta Industries LLC</span><br/>
      <span style="font-size:13px;color:#9ca3af;">Expires: 2026-05-09 — <strong style="color:#ef4444">30 days remaining</strong></span><br/>
      <a href="${BASE}/leases/def456" style="font-size:12px;color:#60a5fa;">View lease →</a>
    </div>
    <a href="${BASE}/alerts" class="btn">View all alerts →</a>
  `);
}

function promoTrialEnding(): string {
  return wrap(`
    <h2>Your free Professional trial ends in 7 days</h2>
    <p>Hi Jane,</p>
    <p>Your free promotional trial of the LeaseIQ <strong style="color:#fff">Professional plan</strong> ends on <strong style="color:#fff">April 16, 2026</strong>.</p>
    <p>After your trial ends, your account will be moved to the Free plan unless you add a payment method to continue.</p>
    <div class="alert-card warning" style="margin:24px 0;">
      <strong style="color:#fff">What happens after your trial:</strong><br/>
      <span style="font-size:13px;color:#9ca3af;">Without a payment method, you will lose access to unlimited lease uploads, AI Analyst, Bulk Upload, and Team Collaboration features.</span>
    </div>
    <a href="${BASE}/settings" class="btn">Add Payment Method →</a>
    <p>If you have any questions, reply to this email and we will help.</p>
    <p>— The LeaseIQ Team</p>
  `);
}

function weeklyDigest(): string {
  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const topRows = [
    { addr: '123 Main Street, Dallas TX', exp: '2026-04-16', rent: 8500 },
    { addr: '456 Commerce Blvd, Austin TX', exp: '2026-05-09', rent: 12000 },
    { addr: '789 Office Park Dr, Houston TX', exp: '2026-07-31', rent: 5200 },
  ].map(l => `
    <tr>
      <td style="padding:8px;color:#e5e7eb;font-size:13px;">${l.addr}</td>
      <td style="padding:8px;color:#9ca3af;font-size:13px;">${l.exp}</td>
      <td style="padding:8px;color:#9ca3af;font-size:13px;">${fmt(l.rent)}</td>
    </tr>`).join('');

  return wrap(`
    <h2>Your weekly portfolio summary</h2>
    <p>Hi Jane, here's how your portfolio looks this week.</p>
    <div style="text-align:center;margin:24px 0;">
      <div class="stat"><div class="stat-val">12</div><div class="stat-label">Total Leases</div></div>
      <div class="stat"><div class="stat-val">${fmt(87400)}</div><div class="stat-label">Monthly Rent</div></div>
      <div class="stat"><div class="stat-val">3</div><div class="stat-label">Expiring in 90d</div></div>
      <div class="stat"><div class="stat-val" style="color:#ef4444">1</div><div class="stat-label">Critical Alerts</div></div>
    </div>
    <p><strong style="color:#fff">Leases expiring soonest:</strong></p>
    <table width="100%" style="border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="border-bottom:1px solid #1f2937;">
          <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;">Property</th>
          <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;">Expires</th>
          <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;">Rent/mo</th>
        </tr>
      </thead>
      <tbody>${topRows}</tbody>
    </table>
    <a href="${BASE}/dashboard" class="btn">View full dashboard →</a>
  `);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const secret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-preview-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type } = await params;

  let html: string;
  switch (type) {
    case 'welcome':             html = welcome(); break;
    case 'password-reset':      html = passwordReset(); break;
    case 'team-invite':         html = teamInvite(); break;
    case 'deadline-alert':      html = deadlineAlert(); break;
    case 'promo-trial-ending':  html = promoTrialEnding(); break;
    case 'weekly-digest':       html = weeklyDigest(); break;
    default:                    return notFound(type);
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
