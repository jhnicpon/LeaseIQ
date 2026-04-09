/**
 * GET /api/init?secret=YOUR_CRON_SECRET
 *
 * Creates all PostgreSQL tables if they do not exist.
 * Run this ONCE after deploying to Vercel or after provisioning a new Neon database.
 *
 * Secured with the CRON_SECRET environment variable (same one used by cron jobs).
 * If CRON_SECRET is not set, the endpoint is open — set it in production.
 */

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-init-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();

  try {
    // ── users ─────────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        plan TEXT NOT NULL DEFAULT 'free',
        "stripeCustomerId" TEXT,
        "stripeSubscriptionId" TEXT,
        "subscriptionStatus" TEXT,
        "onboardingStep" INTEGER NOT NULL DEFAULT 0,
        "promoCode" TEXT,
        "promoTrialEnd" DATE
      )
    `;

    // ── leases ────────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS leases (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "fileName" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL,
        "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "processedAt" TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending',
        "extractedData" TEXT,
        "originalText" TEXT,
        "propertyAddress" TEXT,
        "tenantName" TEXT,
        "expirationDate" TEXT,
        "monthlyRent" REAL,
        "riskScore" INTEGER,
        "riskFactors" TEXT,
        "aiAnalysis" TEXT
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_leases_userId ON leases("userId")`;

    // ── alerts ────────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        "leaseId" TEXT NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "alertType" TEXT NOT NULL,
        "triggerDate" TEXT NOT NULL,
        "acknowledgedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("leaseId", "alertType", "triggerDate")
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_alerts_userId ON alerts("userId")`;
    await sql`CREATE INDEX IF NOT EXISTS idx_alerts_leaseId ON alerts("leaseId")`;

    // ── lease_versions ────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS lease_versions (
        id TEXT PRIMARY KEY,
        "leaseId" TEXT NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        "extractedData" TEXT,
        "changeDescription" TEXT NOT NULL,
        "changedBy" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_lease_versions_leaseId ON lease_versions("leaseId")`;

    // ── team_members ──────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "userId" TEXT REFERENCES users(id) ON DELETE SET NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        "invitedEmail" TEXT NOT NULL,
        "inviteToken" TEXT UNIQUE,
        "invitedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "acceptedAt" TIMESTAMPTZ
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_team_members_accountId ON team_members("accountId")`;

    // ── promo_codes ───────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        discount_type TEXT NOT NULL DEFAULT 'free_month',
        plan TEXT NOT NULL DEFAULT 'professional',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // ── promo_code_uses ───────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS promo_code_uses (
        id TEXT PRIMARY KEY,
        promo_code_id TEXT NOT NULL REFERENCES promo_codes(id),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_promo_uses_user ON promo_code_uses(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_promo_uses_code ON promo_code_uses(promo_code_id)`;

    // Seed the Mustanges2028 promo code if not already present
    await sql`
      INSERT INTO promo_codes (id, code, discount_type, plan, is_active)
      VALUES (gen_random_uuid()::text, 'mustanges2028', 'free_month', 'professional', 1)
      ON CONFLICT (code) DO NOTHING
    `;

    return NextResponse.json({
      ok: true,
      message: 'All tables created successfully.',
    });
  } catch (err: any) {
    console.error('Init error:', err);
    return NextResponse.json({ error: err.message ?? 'Init failed' }, { status: 500 });
  }
}
