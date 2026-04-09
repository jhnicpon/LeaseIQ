import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { addDays, format } from 'date-fns';
import getDb from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

// Hardcoded valid promo codes — validation never depends on the database
const VALID_CODES: Record<string, { plan: string; type: string }> = {
  'mustanges2028': { plan: 'professional', type: 'free_month' },
};

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, promoCode } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const sql = getDb();

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing[0]) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Validate promo code against hardcoded list — no DB lookup required
    let promoInfo: { plan: string; type: string } | undefined;
    let normalizedCode: string | undefined;
    if (promoCode) {
      normalizedCode = (promoCode as string).trim().toLowerCase();
      promoInfo = VALID_CODES[normalizedCode];
      if (!promoInfo) {
        return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const trialEnd = promoInfo ? format(addDays(new Date(), 30), 'yyyy-MM-dd') : null;

    await sql`
      INSERT INTO users (id, name, email, "passwordHash", plan, "promoCode", "promoTrialEnd")
      VALUES (
        ${id}, ${name}, ${email}, ${passwordHash},
        ${promoInfo ? promoInfo.plan : 'free'},
        ${normalizedCode ?? null},
        ${trialEnd}
      )
    `;

    // Best-effort: record usage in promo_codes table if the row exists
    if (promoInfo && normalizedCode) {
      try {
        const promoRows = await sql`SELECT id FROM promo_codes WHERE code = ${normalizedCode}`;
        if (promoRows[0]) {
          await sql`
            INSERT INTO promo_code_uses (id, promo_code_id, user_id)
            VALUES (${uuidv4()}, ${(promoRows[0] as any).id}, ${id})
          `;
        }
      } catch {
        // Non-critical — don't fail signup if tracking insert fails
      }
    }

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name).catch(() => {});

    return NextResponse.json({
      success: true,
      promoApplied: !!promoInfo,
      message: promoInfo
        ? 'Promo code applied! You get 1 month of Professional free.'
        : undefined,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
