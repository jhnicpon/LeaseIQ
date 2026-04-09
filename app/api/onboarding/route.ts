import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const rows = await sql`SELECT "onboardingStep" FROM users WHERE email = ${session.user.email}`;
  return NextResponse.json({ step: (rows[0] as any)?.onboardingStep ?? 0 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { step } = await req.json() as { step: number };
  if (typeof step !== 'number' || step < 0 || step > 4) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  }

  const sql = getDb();
  await sql`UPDATE users SET "onboardingStep" = ${step} WHERE email = ${session.user.email}`;

  return NextResponse.json({ step });
}
