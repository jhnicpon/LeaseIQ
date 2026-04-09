import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const FROM = process.env.EMAIL_FROM ?? 'LeaseIQ <noreply@leaseiq.com>';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const ownerRows = await sql`SELECT id, name, plan FROM users WHERE email = ${session.user.email}`;
  const owner = ownerRows[0] as { id: string; name: string; plan: string } | undefined;
  if (!owner) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (owner.plan === 'free') {
    return NextResponse.json({ error: 'Team collaboration requires a paid plan. Please upgrade to Starter or Professional.' }, { status: 403 });
  }

  const { email, role = 'viewer' } = await req.json() as { email: string; role?: string };
  const validRoles = ['admin', 'editor', 'viewer'];
  if (!email || !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid email or role' }, { status: 400 });
  }

  const existingRows = await sql`SELECT id FROM team_members WHERE "accountId" = ${owner.id} AND "invitedEmail" = ${email}`;
  if (existingRows[0]) return NextResponse.json({ error: 'This email has already been invited' }, { status: 409 });

  const inviteToken = uuidv4();
  const memberId = uuidv4();
  await sql`
    INSERT INTO team_members (id, "accountId", role, "invitedEmail", "inviteToken")
    VALUES (${memberId}, ${owner.id}, ${role}, ${email}, ${inviteToken})
  `;

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const acceptUrl = `${baseUrl}/team/accept?token=${inviteToken}`;

  if (process.env.SMTP_USER) {
    await createTransport().sendMail({
      from: FROM,
      to: email,
      subject: `${owner.name} invited you to LeaseIQ`,
      html: `<!DOCTYPE html><html><body style="background:#0a0a0f;font-family:sans-serif;color:#e5e7eb;padding:40px">
        <h2 style="color:#fff">${owner.name} invited you to join their LeaseIQ workspace</h2>
        <p style="color:#9ca3af">You've been invited as a <strong style="color:#fff">${role}</strong>.</p>
        <a href="${acceptUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          Accept Invitation →
        </a>
        <p style="color:#6b7280;font-size:12px">This link expires in 7 days. If you didn't expect this, you can ignore this email.</p>
      </body></html>`,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, memberId });
}
