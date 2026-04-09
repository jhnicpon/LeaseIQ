import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { stripe } from '@/lib/stripe';
import getDb from '@/lib/db';

export async function POST() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  const userRows = await sql`SELECT "stripeCustomerId" FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as { stripeCustomerId: string | null } | undefined;

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
