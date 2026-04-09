/**
 * GET /api/leases/[id]/extract-stream
 *
 * Server-Sent Events endpoint that streams Claude's extraction progress in real time.
 * The client opens this connection immediately after the upload API returns a leaseId.
 * Fields are emitted as they are extracted; a final "done" event carries the lease record.
 *
 * Event types:
 *   field   — { field: string, value: string }
 *   status  — { message: string }
 *   done    — { lease: LeaseRecord }
 *   error   — { error: string }
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';
import { parseFileFromUrl } from '@/lib/fileParser';
import { extractLeaseDataStreaming } from '@/lib/claude';
import { calculateRiskScore } from '@/lib/riskScore';
import { generateAlertDates } from '@/lib/dateUtils';
import {
  normalizeAddress, extractCity, extractState, findMatchingProperty,
} from '@/lib/propertyMatcher';

export const dynamic = 'force-dynamic';
// Allow up to 5 minutes for long extractions on Vercel Pro
export const maxDuration = 300;

function sseEvent(type: string, data: object): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return new Response(sseEvent('error', { error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const { id } = await params;
  const sql = getDb();
  const userRows = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  const user = userRows[0] as any;
  if (!user) {
    return new Response(sseEvent('error', { error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const leaseRows = await sql`SELECT * FROM leases WHERE id = ${id} AND "userId" = ${user.id}`;
  const lease = leaseRows[0] as any;
  if (!lease) {
    return new Response(sseEvent('error', { error: 'Lease not found' }), {
      status: 404,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  if (!lease.blobUrl) {
    return new Response(sseEvent('error', { error: 'No file stored for this lease' }), {
      status: 404,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: object) => {
        controller.enqueue(new TextEncoder().encode(sseEvent(type, data)));
      };

      try {
        send('status', { message: 'Downloading file…' });
        const parsed = await parseFileFromUrl(lease.blobUrl, lease.fileName);

        send('status', { message: 'Sending to Claude AI for extraction…' });

        const extracted = await extractLeaseDataStreaming(
          parsed,
          (field, value) => send('field', { field, value }),
          // onProgress is intentionally unused — field events are sufficient
        );

        send('status', { message: 'Saving results…' });

        const risk = calculateRiskScore(extracted);
        const originalText = parsed.type === 'text' ? parsed.text.substring(0, 100000) : '';
        const db = getDb();

        // ── Auto-group into a property ────────────────────────────────────────
        let propertyId: string | null = null;
        if (extracted.propertyAddress) {
          const normAddr = normalizeAddress(extracted.propertyAddress);
          const existingProps = await db`
            SELECT id, normalized_address FROM properties WHERE user_id = ${user.id}
          ` as { id: string; normalized_address: string }[];

          propertyId = findMatchingProperty(normAddr, existingProps);

          if (!propertyId) {
            // DB generates UUID
            const newProp = await db`
              INSERT INTO properties (user_id, name, address, normalized_address, city, state, property_type)
              VALUES (
                ${user.id},
                ${extracted.propertyAddress},
                ${extracted.propertyAddress},
                ${normAddr},
                ${extractCity(extracted.propertyAddress)},
                ${extractState(extracted.propertyAddress)},
                ${extracted.propertyType || null}
              )
              RETURNING id
            `;
            propertyId = newProp[0].id;
          }
        }

        await db`
          UPDATE leases SET
            status = 'completed',
            "processedAt" = NOW(),
            "extractedData" = ${JSON.stringify(extracted)},
            "originalText" = ${originalText},
            "propertyAddress" = ${extracted.propertyAddress},
            "tenantName" = ${extracted.tenantName},
            "expirationDate" = ${extracted.leaseExpirationDate},
            "monthlyRent" = ${extracted.baseRentMonthly},
            "riskScore" = ${risk.score},
            "riskFactors" = ${JSON.stringify(risk.factors)},
            property_id = ${propertyId}
          WHERE id = ${id}
        `;

        // Version 1 — only insert if not already present (in case fire-and-forget also ran)
        await db`
          INSERT INTO lease_versions (id, "leaseId", "userId", version, "extractedData", "changeDescription", "changedBy")
          VALUES (${uuidv4()}, ${id}, ${user.id}, ${1}, ${JSON.stringify(extracted)}, ${'Initial extraction'}, ${'AI'})
          ON CONFLICT DO NOTHING
        `.catch(() => {});

        const criticalDates = [
          { date: extracted.leaseExpirationDate, type: 'Lease Expiration' },
          { date: extracted.renewalOptionDeadline, type: 'Renewal Option Deadline' },
          { date: extracted.terminationOptionDate, type: 'Termination Option' },
        ];
        for (const { date, type } of criticalDates) {
          if (date) {
            for (const { daysBeforeDate, triggerDate } of generateAlertDates(date)) {
              await db`
                INSERT INTO alerts (id, "leaseId", "userId", "alertType", "triggerDate")
                VALUES (${uuidv4()}, ${id}, ${user.id}, ${`${type} - ${daysBeforeDate} days`}, ${triggerDate})
                ON CONFLICT DO NOTHING
              `.catch(() => {});
            }
          }
        }

        const updatedRows = await db`SELECT * FROM leases WHERE id = ${id}`;
        send('done', { lease: updatedRows[0] });
      } catch (err: any) {
        const db = getDb();
        await db`UPDATE leases SET status = 'error' WHERE id = ${id}`.catch(() => {});
        send('error', { error: err?.message ?? 'Extraction failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
