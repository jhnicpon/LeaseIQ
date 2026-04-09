import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

// GET — list team members for this account
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id, plan FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as { id: string; plan: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const members = await sql`
    SELECT tm.*, u.name as "memberName", u.email as "memberEmail"
    FROM team_members tm
    LEFT JOIN users u ON u.id = tm."userId"
    WHERE tm."accountId" = ${user.id}
    ORDER BY tm."invitedAt" ASC
  `;

  return NextResponse.json({ members });
}

// DELETE — remove a team member
export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id, plan FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as { id: string; plan: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { memberId } = await req.json() as { memberId: string };

  const memberRows = await sql`SELECT * FROM team_members WHERE id = ${memberId} AND "accountId" = ${user.id}`;
  if (!memberRows[0]) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  await sql`DELETE FROM team_members WHERE id = ${memberId}`;
  return NextResponse.json({ success: true });
}
