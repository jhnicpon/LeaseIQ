import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { stripe, PLANS, PlanKey } from '@/lib/stripe';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { plan } = await req.json() as { plan: PlanKey };
  const planConfig = PLANS[plan];
  if (!planConfig || !planConfig.priceId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const sql = getDb();
  const userRows = await sql`SELECT id, "stripeCustomerId" FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as { id: string; stripeCustomerId: string | null } | undefined;

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: session.user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await sql`UPDATE users SET "stripeCustomerId" = ${customerId} WHERE id = ${user.id}`;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?upgraded=true`,
    cancel_url: `${baseUrl}/settings?canceled=true`,
    metadata: { userId: user.id, plan },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
