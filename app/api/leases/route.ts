import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { exportToExcel, exportToCsv } from '@/lib/exportUtils';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'uploadedAt';
  const order = searchParams.get('order') || 'desc';

  const allowedSorts = ['uploadedAt', 'propertyAddress', 'tenantName', 'expirationDate', 'monthlyRent'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'uploadedAt';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  let leases: any[];
  if (search) {
    const like = `%${search}%`;
    leases = await sql.query(
      `SELECT * FROM leases WHERE "userId" = $1 AND ("propertyAddress" ILIKE $2 OR "tenantName" ILIKE $2 OR "extractedData" ILIKE $2) ORDER BY "${sortCol}" ${sortOrder}`,
      [user.id, like]
    );
  } else {
    leases = await sql.query(
      `SELECT * FROM leases WHERE "userId" = $1 ORDER BY "${sortCol}" ${sortOrder}`,
      [user.id]
    );
  }

  if (format === 'excel') {
    const buffer = exportToExcel(leases as any[]);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="leases.xlsx"',
      },
    });
  }

  if (format === 'csv') {
    const csv = exportToCsv(leases as any[]);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="leases.csv"',
      },
    });
  }

  return NextResponse.json({ leases });
}
