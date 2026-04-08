import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

function getUser(email: string) {
  return getDb().prepare('SELECT id, plan FROM users WHERE email = ?').get(email) as { id: string; plan: string } | undefined;
}

// GET — list team members for this account
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = getUser(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const db = getDb();
  const members = db.prepare(`
    SELECT tm.*, u.name as memberName, u.email as memberEmail
    FROM team_members tm
    LEFT JOIN users u ON u.id = tm.userId
    WHERE tm.accountId = ?
    ORDER BY tm.invitedAt ASC
  `).all(user.id);

  return NextResponse.json({ members });
}

// DELETE — remove a team member
export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = getUser(session.user.email);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { memberId } = await req.json() as { memberId: string };
  const db = getDb();

  const member = db.prepare('SELECT * FROM team_members WHERE id = ? AND accountId = ?').get(memberId, user.id);
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  db.prepare('DELETE FROM team_members WHERE id = ?').run(memberId);
  return NextResponse.json({ success: true });
}
