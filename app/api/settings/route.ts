import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';

export async function GET(_req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const rows = await sql`SELECT id, name, email, "createdAt" FROM users WHERE email = ${session.user.email}`;
  return NextResponse.json({ user: rows[0] ?? null });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT * FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();

  if (body.name !== undefined) {
    await sql`UPDATE users SET name = ${body.name} WHERE id = ${user.id}`;
  }

  if (body.email !== undefined && body.email !== user.email) {
    const existing = await sql`SELECT id FROM users WHERE email = ${body.email} AND id != ${user.id}`;
    if (existing[0]) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    await sql`UPDATE users SET email = ${body.email} WHERE id = ${user.id}`;
  }

  if (body.currentPassword && body.newPassword) {
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    const newHash = await bcrypt.hash(body.newPassword, 12);
    await sql`UPDATE users SET "passwordHash" = ${newHash} WHERE id = ${user.id}`;
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const rows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = rows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await sql`DELETE FROM users WHERE id = ${user.id}`;
  return NextResponse.json({ success: true });
}
