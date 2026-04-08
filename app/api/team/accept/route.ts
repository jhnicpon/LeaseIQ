import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  const { token } = await req.json() as { token: string };
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const session = await getServerSession();
  if (!session?.user?.email) {
    // Not logged in — redirect to sign-in preserving the token
    return NextResponse.json({ error: 'Please sign in or create an account to accept this invitation.', requiresAuth: true }, { status: 401 });
  }

  const db = getDb();
  const member = db.prepare('SELECT * FROM team_members WHERE inviteToken = ?').get(token) as any;
  if (!member) return NextResponse.json({ error: 'Invalid or expired invitation token.' }, { status: 404 });
  if (member.acceptedAt) return NextResponse.json({ error: 'This invitation has already been accepted.' }, { status: 409 });

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as { id: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const now = new Date().toISOString();
  db.prepare('UPDATE team_members SET userId = ?, acceptedAt = ?, inviteToken = NULL WHERE id = ?')
    .run(user.id, now, member.id);

  return NextResponse.json({ success: true });
}
