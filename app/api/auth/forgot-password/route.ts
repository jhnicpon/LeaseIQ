import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addHours, format } from 'date-fns';
import getDb from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email?: string };
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const sql = getDb();
  const userRows = await sql`SELECT id, name FROM users WHERE email = ${email.toLowerCase().trim()}`;
  const user = userRows[0] as { id: string; name: string } | undefined;

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = uuidv4();
  const expiresAt = format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss'Z'");

  // Invalidate any existing tokens for this user then insert new one
  await sql`UPDATE password_resets SET "usedAt" = NOW() WHERE "userId" = ${user.id} AND "usedAt" IS NULL`;
  await sql`
    INSERT INTO password_resets (id, "userId", token, "expiresAt")
    VALUES (${uuidv4()}, ${user.id}, ${token}, ${expiresAt})
  `;

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

  await sendPasswordResetEmail(email, user.name, resetUrl).catch(() => {});

  return NextResponse.json({ ok: true });
}
