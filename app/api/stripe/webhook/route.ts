import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import getDb from '@/lib/db';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const sql = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const cs = event.data.object as Stripe.Checkout.Session;
      const { userId, plan } = cs.metadata ?? {};
      if (userId && plan && cs.subscription) {
        await sql`
          UPDATE users SET plan = ${plan}, "stripeSubscriptionId" = ${cs.subscription as string}, "subscriptionStatus" = 'active'
          WHERE id = ${userId}
        `;
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await sql`UPDATE users SET "subscriptionStatus" = ${sub.status} WHERE "stripeCustomerId" = ${customerId}`;
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await sql`
        UPDATE users SET plan = 'free', "stripeSubscriptionId" = NULL, "subscriptionStatus" = 'canceled'
        WHERE "stripeCustomerId" = ${customerId}
      `;
      break;
    }
  }

  return NextResponse.json({ received: true });
}
