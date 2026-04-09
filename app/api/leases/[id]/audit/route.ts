import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import getDb from '@/lib/db';

const SKIP_DIFF_KEYS = new Set([
  'flaggedFields', 'extractionNotes', 'confidenceScore',
]);

function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

  for (const key of allKeys) {
    if (SKIP_DIFF_KEYS.has(key)) continue;
    const oldVal = before[key] ?? null;
    const newVal = after[key] ?? null;
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal, newValue: newVal });
    }
  }
  return changes;
}

export function inferChangeType(desc: string): string {
  const d = desc.toLowerCase();
  if (d.startsWith('manual edit:')) return 'manual_edit';
  if (d.startsWith('before amendment:')) return 'amendment_uploaded';
  if (d === 'auto-save before revert') return 'reverted';
  if (d.includes('initial extraction') || d.includes('initial extract')) return 'initial_extraction';
  if (d.includes('reprocess')) return 'reprocessed';
  return 'manual_edit';
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sql = getDb();

  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const leaseRows = await sql`SELECT * FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  const lease = leaseRows[0] as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const versionRows = await sql`
    SELECT lv.id, lv.version, lv."extractedData", lv."changeDescription", lv."changedBy", lv."createdAt",
           u.name AS "userName", u.email AS "userEmail"
    FROM lease_versions lv
    LEFT JOIN users u ON u.id = lv."userId"
    WHERE lv."leaseId" = ${id}
    ORDER BY lv.version ASC
  `;

  const versions = versionRows as any[];
  const currentData: Record<string, unknown> = lease.extractedData ? JSON.parse(lease.extractedData) : {};

  const entries = versions.map((v, i) => {
    const snapshotBefore: Record<string, unknown> = v.extractedData ? JSON.parse(v.extractedData) : {};
    const snapshotAfter: Record<string, unknown> =
      i + 1 < versions.length
        ? (versions[i + 1].extractedData ? JSON.parse(versions[i + 1].extractedData) : {})
        : currentData;

    const changedFields = computeDiff(snapshotBefore, snapshotAfter);
    const changeType = inferChangeType(v.changeDescription);

    return {
      id: v.id,
      version: v.version,
      changeType,
      changeDescription: v.changeDescription,
      changedBy: v.changedBy,
      userName: v.userName ?? null,
      userEmail: v.userEmail ?? null,
      createdAt: v.createdAt,
      changedFields,
      snapshotBefore,
      snapshotAfter,
    };
  });

  return NextResponse.json({
    entries,
    lease: {
      fileName: lease.fileName,
      propertyAddress: lease.propertyAddress,
    },
  });
}
