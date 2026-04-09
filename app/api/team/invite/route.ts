import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { sendTeamInviteEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const ownerRows = await sql`SELECT id, name, plan FROM users WHERE email = ${session.user.email}`;
  const owner = ownerRows[0] as { id: string; name: string; plan: string } | undefined;
  if (!owner) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (owner.plan === 'free') {
    return NextResponse.json(
      { error: 'Team collaboration requires a paid plan. Please upgrade to Starter or Professional.' },
      { status: 403 }
    );
  }

  const { email, role = 'viewer' } = await req.json() as { email: string; role?: string };
  const validRoles = ['admin', 'editor', 'viewer'];
  if (!email || !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid email or role' }, { status: 400 });
  }

  const existingRows = await sql`
    SELECT id FROM team_members WHERE "accountId" = ${owner.id} AND "invitedEmail" = ${email}
  `;
  if (existingRows[0]) return NextResponse.json({ error: 'This email has already been invited' }, { status: 409 });

  const inviteToken = uuidv4();
  const memberId = uuidv4();
  await sql`
    INSERT INTO team_members (id, "accountId", role, "invitedEmail", "inviteToken")
    VALUES (${memberId}, ${owner.id}, ${role}, ${email}, ${inviteToken})
  `;

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const acceptUrl = `${baseUrl}/team/accept?token=${inviteToken}`;

  await sendTeamInviteEmail({
    to: email,
    inviterName: owner.name,
    role,
    acceptUrl,
  }).catch(() => {});

  return NextResponse.json({ success: true, memberId });
}
