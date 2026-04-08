import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { exportToExcel } from '@/lib/exportUtils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lease = db.prepare('SELECT * FROM leases WHERE id = ? AND userId = ?').get(id, user.id);
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const buffer = exportToExcel([lease]);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="lease-abstract.xlsx"`,
    },
  });
}
