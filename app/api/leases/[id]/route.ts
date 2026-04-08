import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { calculateRiskScore } from '@/lib/riskScore';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lease = db.prepare('SELECT * FROM leases WHERE id = ? AND userId = ?').get(id, user.id);
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  return NextResponse.json({ lease });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lease = db.prepare('SELECT * FROM leases WHERE id = ? AND userId = ?').get(id, user.id) as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const body = await req.json();

  // Update extracted data fields
  if (body.extractedData) {
    const current = lease.extractedData ? JSON.parse(lease.extractedData) : {};
    const updated = { ...current, ...body.extractedData };
    const updatedStr = JSON.stringify(updated);
    const risk = calculateRiskScore(updated);

    // Save a version snapshot before manual edit
    const maxV = (db.prepare('SELECT MAX(version) as v FROM lease_versions WHERE leaseId = ?').get(id) as any)?.v ?? 0;
    const changedKeys = Object.keys(body.extractedData).join(', ');
    db.prepare(`
      INSERT INTO lease_versions (id, leaseId, userId, version, extractedData, changeDescription, changedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), id, user.id, maxV + 1, lease.extractedData, `Manual edit: ${changedKeys}`, session.user.email!);

    db.prepare(`
      UPDATE leases SET
        extractedData = ?,
        propertyAddress = ?,
        tenantName = ?,
        expirationDate = ?,
        monthlyRent = ?,
        riskScore = ?,
        riskFactors = ?
      WHERE id = ? AND userId = ?
    `).run(
      updatedStr,
      updated.propertyAddress || lease.propertyAddress,
      updated.tenantName || lease.tenantName,
      updated.leaseExpirationDate || lease.expirationDate,
      updated.baseRentMonthly || lease.monthlyRent,
      risk.score,
      JSON.stringify(risk.factors),
      id,
      user.id
    );
  }

  const updatedLease = db.prepare('SELECT * FROM leases WHERE id = ?').get(id);
  return NextResponse.json({ lease: updatedLease });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  db.prepare('DELETE FROM leases WHERE id = ? AND userId = ?').run(id, user.id);
  return NextResponse.json({ success: true });
}
