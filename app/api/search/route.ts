import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const leases = await sql`
    SELECT id, "fileName", "propertyAddress", "tenantName", "extractedData", "originalText"
    FROM leases
    WHERE "userId" = ${user.id} AND status = 'completed'
      AND (
        "propertyAddress" ILIKE ${'%' + q + '%'} OR
        "tenantName" ILIKE ${'%' + q + '%'} OR
        "extractedData" ILIKE ${'%' + q + '%'} OR
        "originalText" ILIKE ${'%' + q + '%'}
      )
    LIMIT 20
  `;

  const results = (leases as any[]).map(l => {
    let snippet = '';
    if (l.originalText) {
      const idx = l.originalText.toLowerCase().indexOf(q.toLowerCase());
      if (idx !== -1) {
        const start = Math.max(0, idx - 100);
        const end = Math.min(l.originalText.length, idx + 200);
        snippet = l.originalText.substring(start, end);
      }
    }
    return {
      id: l.id,
      propertyAddress: l.propertyAddress,
      tenantName: l.tenantName,
      fileName: l.fileName,
      snippet,
    };
  });

  return NextResponse.json({ results });
}
