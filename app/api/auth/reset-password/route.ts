import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json() as { token?: string; password?: string };

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const sql = getDb();

  const rows = await sql`
    SELECT pr.id, pr."userId", pr."expiresAt", pr."usedAt"
    FROM password_resets pr
    WHERE pr.token = ${token}
    LIMIT 1
  `;
  const reset = rows[0] as { id: string; userId: string; expiresAt: string; usedAt: string | null } | undefined;

  if (!reset) {
    return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }
  if (reset.usedAt) {
    return NextResponse.json({ error: 'This reset link has already been used' }, { status: 400 });
  }
  if (new Date(reset.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await sql`UPDATE users SET "passwordHash" = ${passwordHash} WHERE id = ${reset.userId}`;
  await sql`UPDATE password_resets SET "usedAt" = NOW() WHERE id = ${reset.id}`;

  return NextResponse.json({ ok: true });
}
