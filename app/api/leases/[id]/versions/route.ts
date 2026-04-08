import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

// GET — list versions for a lease
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as { id: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lease = db.prepare('SELECT id FROM leases WHERE id = ? AND userId = ?').get(id, user.id);
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const versions = db.prepare(
    'SELECT id, version, changeDescription, changedBy, createdAt FROM lease_versions WHERE leaseId = ? ORDER BY version DESC'
  ).all(id);

  return NextResponse.json({ versions });
}

// POST — revert to a specific version
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { versionId } = await req.json() as { versionId: string };

  const db = getDb();
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(session.user.email) as { id: string; email: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lease = db.prepare('SELECT * FROM leases WHERE id = ? AND userId = ?').get(id, user.id) as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const version = db.prepare('SELECT * FROM lease_versions WHERE id = ? AND leaseId = ?').get(versionId, id) as any;
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  // Save current as a new version before reverting
  const { v4: uuidv4 } = await import('uuid');
  const maxVersion = (db.prepare('SELECT MAX(version) as v FROM lease_versions WHERE leaseId = ?').get(id) as any)?.v ?? 0;

  db.prepare(`
    INSERT INTO lease_versions (id, leaseId, userId, version, extractedData, changeDescription, changedBy)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), id, user.id, maxVersion + 1, lease.extractedData, 'Auto-save before revert', user.email);

  // Apply the reverted data
  const reverted = JSON.parse(version.extractedData);
  db.prepare(`
    UPDATE leases SET extractedData = ?, propertyAddress = ?, tenantName = ?, expirationDate = ?, monthlyRent = ?
    WHERE id = ?
  `).run(
    version.extractedData,
    reverted.propertyAddress || lease.propertyAddress,
    reverted.tenantName || lease.tenantName,
    reverted.leaseExpirationDate || lease.expirationDate,
    reverted.baseRentMonthly || lease.monthlyRent,
    id
  );

  return NextResponse.json({ success: true });
}
