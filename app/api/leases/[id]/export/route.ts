import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { exportToExcel } from '@/lib/exportUtils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leaseRows = await sql`SELECT * FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  const lease = leaseRows[0];
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const buffer = exportToExcel([lease]);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="lease-abstract.xlsx"`,
    },
  });
}
