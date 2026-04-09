/**
 * GET /api/cron/risks
 * Recalculates risk scores for all completed leases daily (urgency dates change).
 */
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { calculateRiskScore } from '@/lib/riskScore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  const leases = await sql`
    SELECT id, "extractedData" FROM leases
    WHERE status = 'completed' AND "extractedData" IS NOT NULL
  ` as { id: string; extractedData: string }[];

  let updated = 0;
  for (const lease of leases) {
    try {
      const data = JSON.parse(lease.extractedData);
      const risk = calculateRiskScore(data);
      await sql`
        UPDATE leases SET "riskScore" = ${risk.score}, "riskFactors" = ${JSON.stringify(risk.factors)}
        WHERE id = ${lease.id}
      `;
      updated++;
    } catch { /* skip malformed */ }
  }

  return NextResponse.json({ ok: true, updated });
}
