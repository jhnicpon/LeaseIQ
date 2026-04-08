import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const user = db.prepare('SELECT onboardingStep FROM users WHERE email = ?').get(session.user.email) as
    | { onboardingStep: number }
    | undefined;

  return NextResponse.json({ step: user?.onboardingStep ?? 0 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { step } = await req.json() as { step: number };
  if (typeof step !== 'number' || step < 0 || step > 4) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  }

  const db = getDb();
  db.prepare('UPDATE users SET onboardingStep = ? WHERE email = ?').run(step, session.user.email);

  return NextResponse.json({ step });
}
