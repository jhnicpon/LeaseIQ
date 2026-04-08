import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const user = db.prepare('SELECT id, name, email, createdAt FROM users WHERE email = ?').get(session.user.email);
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();

  if (body.name !== undefined) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(body.name, user.id);
  }

  if (body.email !== undefined && body.email !== user.email) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(body.email, user.id);
    if (exists) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(body.email, user.id);
  }

  if (body.currentPassword && body.newPassword) {
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    const newHash = await bcrypt.hash(body.newPassword, 12);
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(newHash, user.id);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  return NextResponse.json({ success: true });
}
