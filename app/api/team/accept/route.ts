import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  const { token } = await req.json() as { token: string };
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Please sign in or create an account to accept this invitation.', requiresAuth: true }, { status: 401 });
  }

  const sql = getDb();
  const memberRows = await sql`SELECT * FROM team_members WHERE "inviteToken" = ${token}`;
  const member = memberRows[0] as any;
  if (!member) return NextResponse.json({ error: 'Invalid or expired invitation token.' }, { status: 404 });
  if (member.acceptedAt) return NextResponse.json({ error: 'This invitation has already been accepted.' }, { status: 409 });

  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as { id: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const now = new Date().toISOString();
  await sql`UPDATE team_members SET "userId" = ${user.id}, "acceptedAt" = ${now}, "inviteToken" = NULL WHERE id = ${member.id}`;

  return NextResponse.json({ success: true });
}
