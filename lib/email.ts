import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.EMAIL_FROM ?? 'LeaseIQ <noreply@leaseiq.com>';

// ─── Shared layout ────────────────────────────────────────────────────────────

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LeaseIQ</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e5e7eb; }
    .container { max-width: 600px; margin: 40px auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
    .header { background: #1d4ed8; padding: 28px 32px; display: flex; align-items: center; gap: 12px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #fff; }
    .body { padding: 32px; }
    .footer { padding: 20px 32px; border-top: 1px solid #1f2937; font-size: 12px; color: #6b7280; text-align: center; }
    h2 { margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #fff; }
    p { margin: 0 0 14px; line-height: 1.6; color: #9ca3af; font-size: 14px; }
    .btn { display: inline-block; background: #2563eb; color: #fff; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 8px 0 16px; }
    .alert-card { background: #1f2937; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .alert-card.warning { border-left-color: #f59e0b; }
    .alert-card.info { border-left-color: #3b82f6; }
    .stat { display: inline-block; background: #1f2937; border-radius: 8px; padding: 16px 24px; margin: 8px; text-align: center; }
    .stat-val { font-size: 28px; font-weight: 700; color: #fff; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .checklist-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #1f2937; }
    .check { color: #10b981; font-size: 16px; flex-shrink: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏢 LeaseIQ</h1>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      LeaseIQ — Commercial Real Estate Intelligence<br/>
      You received this email because you have an account at LeaseIQ.
    </div>
  </div>
</body>
</html>`;
}

// ─── Welcome email ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  if (!process.env.SMTP_USER) return; // skip if SMTP not configured

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const html = wrap(`
    <h2>Welcome to LeaseIQ, ${name}!</h2>
    <p>You're all set. Start by uploading your first lease — our AI will extract all critical terms in under a minute.</p>
    <a href="${baseUrl}/leases/upload" class="btn">Upload your first lease →</a>
    <p>Here's what you can do with LeaseIQ:</p>
    <div class="checklist-item"><span class="check">✓</span><span><strong>AI extraction</strong> — rent, dates, options, obligations pulled automatically</span></div>
    <div class="checklist-item"><span class="check">✓</span><span><strong>Deadline alerts</strong> — email reminders before critical dates expire</span></div>
    <div class="checklist-item"><span class="check">✓</span><span><strong>Portfolio analytics</strong> — full rent roll and exposure in one dashboard</span></div>
    <p style="margin-top:20px;">If you have any questions, just reply to this email.</p>
    <p>— The LeaseIQ Team</p>
  `);

  await createTransport().sendMail({
    from: FROM,
    to,
    subject: 'Welcome to LeaseIQ — Upload your first lease',
    html,
  });
}

// ─── Deadline alert email ──────────────────────────────────────────────────────

export async function sendDeadlineAlertEmail(params: {
  to: string;
  name: string;
  leases: Array<{
    propertyAddress: string;
    tenantName: string;
    expirationDate: string;
    daysRemaining: number;
    alertType: string;
    leaseId: string;
  }>;
}) {
  if (!process.env.SMTP_USER) return;

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const urgency = params.leases.some(l => l.daysRemaining <= 7)
    ? 'critical'
    : params.leases.some(l => l.daysRemaining <= 30)
    ? 'warning'
    : 'info';

  const urgencyLabel =
    urgency === 'critical' ? '🚨 Critical' : urgency === 'warning' ? '⚠️ Upcoming' : '📅 Reminder';

  const cards = params.leases
    .map(l => {
      const cls = l.daysRemaining <= 7 ? '' : l.daysRemaining <= 30 ? ' warning' : ' info';
      return `
      <div class="alert-card${cls}">
        <strong style="color:#fff">${l.propertyAddress || 'Unknown property'}</strong><br/>
        <span style="font-size:13px;color:#9ca3af;">Tenant: ${l.tenantName || 'N/A'}</span><br/>
        <span style="font-size:13px;color:#9ca3af;">Expires: ${l.expirationDate} — <strong style="color:#ef4444">${l.daysRemaining} days remaining</strong></span><br/>
        <a href="${baseUrl}/leases/${l.leaseId}" style="font-size:12px;color:#60a5fa;">View lease →</a>
      </div>`;
    })
    .join('');

  const html = wrap(`
    <h2>${urgencyLabel}: Lease deadline${params.leases.length > 1 ? 's' : ''} approaching</h2>
    <p>Hi ${params.name}, the following lease${params.leases.length > 1 ? 's require' : ' requires'} your attention:</p>
    ${cards}
    <a href="${baseUrl}/alerts" class="btn">View all alerts →</a>
  `);

  await createTransport().sendMail({
    from: FROM,
    to: params.to,
    subject: `${urgencyLabel}: ${params.leases.length} lease deadline${params.leases.length > 1 ? 's' : ''} approaching`,
    html,
  });
}

// ─── Weekly portfolio summary ──────────────────────────────────────────────────

export async function sendWeeklyDigestEmail(params: {
  to: string;
  name: string;
  totalLeases: number;
  monthlyRent: number;
  expiringIn90Days: number;
  criticalAlerts: number;
  topLeases: Array<{ propertyAddress: string; expirationDate: string; monthlyRent: number }>;
}) {
  if (!process.env.SMTP_USER) return;

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  const topRows = params.topLeases
    .map(
      l => `<tr>
        <td style="padding:8px;color:#e5e7eb;font-size:13px;">${l.propertyAddress || '—'}</td>
        <td style="padding:8px;color:#9ca3af;font-size:13px;">${l.expirationDate || '—'}</td>
        <td style="padding:8px;color:#9ca3af;font-size:13px;">${l.monthlyRent ? fmt(l.monthlyRent) : '—'}</td>
      </tr>`
    )
    .join('');

  const html = wrap(`
    <h2>Your weekly portfolio summary</h2>
    <p>Hi ${params.name}, here's how your portfolio looks this week.</p>
    <div style="text-align:center;margin:24px 0;">
      <div class="stat"><div class="stat-val">${params.totalLeases}</div><div class="stat-label">Total Leases</div></div>
      <div class="stat"><div class="stat-val">${fmt(params.monthlyRent)}</div><div class="stat-label">Monthly Rent</div></div>
      <div class="stat"><div class="stat-val">${params.expiringIn90Days}</div><div class="stat-label">Expiring in 90d</div></div>
      <div class="stat"><div class="stat-val" style="color:${params.criticalAlerts > 0 ? '#ef4444' : '#10b981'}">${params.criticalAlerts}</div><div class="stat-label">Critical Alerts</div></div>
    </div>
    ${
      params.topLeases.length > 0
        ? `<p><strong style="color:#fff">Leases expiring soonest:</strong></p>
      <table width="100%" style="border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="border-bottom:1px solid #1f2937;">
            <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;">Property</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;">Expires</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;">Rent/mo</th>
          </tr>
        </thead>
        <tbody>${topRows}</tbody>
      </table>`
        : ''
    }
    <a href="${baseUrl}/dashboard" class="btn">View full dashboard →</a>
  `);

  await createTransport().sendMail({
    from: FROM,
    to: params.to,
    subject: `LeaseIQ weekly digest — ${params.totalLeases} leases, ${fmt(params.monthlyRent)}/mo`,
    html,
  });
}
