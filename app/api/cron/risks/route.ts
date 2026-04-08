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

  const db = getDb();
  const leases = db.prepare("SELECT id, extractedData FROM leases WHERE status = 'completed' AND extractedData IS NOT NULL").all() as { id: string; extractedData: string }[];

  let updated = 0;
  for (const lease of leases) {
    try {
      const data = JSON.parse(lease.extractedData);
      const risk = calculateRiskScore(data);
      db.prepare('UPDATE leases SET riskScore = ?, riskFactors = ? WHERE id = ?')
        .run(risk.score, JSON.stringify(risk.factors), lease.id);
      updated++;
    } catch { /* skip malformed */ }
  }

  return NextResponse.json({ ok: true, updated });
}
