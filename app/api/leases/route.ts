import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';
import { exportToExcel, exportToCsv } from '@/lib/exportUtils';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'uploadedAt';
  const order = searchParams.get('order') || 'desc';

  let query = 'SELECT * FROM leases WHERE userId = ?';
  const params: any[] = [user.id];

  if (search) {
    query += ` AND (propertyAddress LIKE ? OR tenantName LIKE ? OR extractedData LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  const allowedSorts = ['uploadedAt', 'propertyAddress', 'tenantName', 'expirationDate', 'monthlyRent'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'uploadedAt';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortCol} ${sortOrder}`;

  const leases = db.prepare(query).all(...params);

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
