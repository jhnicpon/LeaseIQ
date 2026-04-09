import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { addDays, format } from 'date-fns';
import getDb from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, promoCode } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Validate promo code if provided
    let promoRecord: { id: string; plan: string } | undefined;
    if (promoCode) {
      const normalized = promoCode.trim().toLowerCase();
      promoRecord = db.prepare(
        'SELECT id, plan FROM promo_codes WHERE code = ? AND is_active = 1'
      ).get(normalized) as { id: string; plan: string } | undefined;

      if (!promoRecord) {
        return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();

    if (promoRecord) {
      // Promo user: set plan to professional, set trial end date 30 days from now
      const trialEnd = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      const normalizedCode = promoCode!.trim().toLowerCase();
      db.prepare(
        'INSERT INTO users (id, name, email, passwordHash, plan, promoCode, promoTrialEnd) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, name, email, passwordHash, promoRecord.plan, normalizedCode, trialEnd);

      // Record the promo code usage
      db.prepare(
        'INSERT INTO promo_code_uses (id, promo_code_id, user_id) VALUES (?, ?, ?)'
      ).run(uuidv4(), promoRecord.id, id);
    } else {
      db.prepare('INSERT INTO users (id, name, email, passwordHash) VALUES (?, ?, ?, ?)').run(id, name, email, passwordHash);
    }

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name).catch(() => {});

    return NextResponse.json({
      success: true,
      promoApplied: !!promoRecord,
      message: promoRecord
        ? 'Promo code applied! You get 1 month of Professional free.'
        : undefined,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
