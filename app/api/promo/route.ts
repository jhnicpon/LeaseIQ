import { NextRequest, NextResponse } from 'next/server';

// Hardcoded valid promo codes — validation never depends on the database
const VALID_CODES: Record<string, { plan: string; type: string; discount: string; message: string }> = {
  'mustanges2028': {
    plan: 'professional',
    type: 'free_month',
    discount: '1 month free',
    message: 'Promo code applied! You get 1 month of Professional free.',
  },
};

// GET /api/promo?code=xxx  — validate without applying
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('code')?.trim();
  if (!raw) return NextResponse.json({ valid: false, error: 'No code provided' });

  const normalized = raw.toLowerCase();
  const promo = VALID_CODES[normalized];

  if (!promo) {
    return NextResponse.json({ valid: false, error: 'Invalid promo code' });
  }

  return NextResponse.json({
    valid: true,
    plan: promo.plan,
    discount_type: promo.type,
    message: promo.message,
  });
}
