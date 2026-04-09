import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

// GET /api/promo?code=xxx  — validate without applying
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toLowerCase();
  if (!code) return NextResponse.json({ valid: false, error: 'No code provided' });

  const db = getDb();
  const promo = db.prepare(
    'SELECT id, code, discount_type, plan, is_active FROM promo_codes WHERE code = ?'
  ).get(code) as { id: string; code: string; discount_type: string; plan: string; is_active: number } | undefined;

  if (!promo || !promo.is_active) {
    return NextResponse.json({ valid: false, error: 'Invalid promo code' });
  }

  return NextResponse.json({
    valid: true,
    plan: promo.plan,
    discount_type: promo.discount_type,
    message: 'Promo code applied! You get 1 month of Professional free.',
  });
}
