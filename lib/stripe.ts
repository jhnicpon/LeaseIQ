import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export const PLANS = {
  free: {
    name: 'Free Trial',
    leaseLimit: 2,
    price: 0,
    priceId: null,
  },
  starter: {
    name: 'Starter',
    leaseLimit: 10,
    price: 99,
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? null,
  },
  professional: {
    name: 'Professional',
    leaseLimit: Infinity,
    price: 299,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID ?? null,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getLeaseLimitForPlan(plan: string): number {
  const key = plan as PlanKey;
  return PLANS[key]?.leaseLimit ?? PLANS.free.leaseLimit;
}
