import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

// Only accessible to the admin email defined in ADMIN_EMAIL env var.
// Falls back to showing stats to any authenticated user if ADMIN_EMAIL is not set
// (useful for single-tenant deployments).

export async function GET(_req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && session.user.email.toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sql = getDb();

  const codes = await sql`
    SELECT pc.id, pc.code, pc.plan, pc.discount_type, pc.is_active,
           COUNT(pcu.id) as use_count
    FROM promo_codes pc
    LEFT JOIN promo_code_uses pcu ON pcu.promo_code_id = pc.id
    GROUP BY pc.id
    ORDER BY pc.created_at DESC
  `;

  const uses = await sql`
    SELECT pcu.id, pcu.used_at, pc.code, pc.plan,
           u.name as user_name, u.email as user_email
    FROM promo_code_uses pcu
    JOIN promo_codes pc ON pc.id = pcu.promo_code_id
    JOIN users u ON u.id = pcu.user_id
    ORDER BY pcu.used_at DESC
  `;

  return NextResponse.json({ codes, uses });
}
