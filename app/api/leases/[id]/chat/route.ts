import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import getDb from '@/lib/db';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const body = await req.json();
  const { messages } = body as { messages: { role: 'user' | 'assistant'; content: string }[] };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
  }

  const extractedData = lease.extractedData ? JSON.parse(lease.extractedData) : {};
  const originalText = (lease.originalText || '').substring(0, 50000);

  const systemPrompt = `You are a commercial real estate attorney with 25 years of experience representing tenants. You are answering questions about a specific commercial lease. Use only the information from this lease to answer questions — do not guess or make up information not in the lease.

LEASE SUMMARY:
- Tenant: ${extractedData.tenantName || 'Unknown'}
- Landlord: ${extractedData.landlordName || 'Unknown'}
- Property: ${extractedData.propertyAddress || 'Unknown'}
- Lease Term: ${extractedData.leaseCommencementDate || 'Unknown'} to ${extractedData.leaseExpirationDate || 'Unknown'}
- Monthly Rent: ${extractedData.baseRentMonthly ? '$' + extractedData.baseRentMonthly.toLocaleString() : 'Unknown'}
- Renewal Options: ${extractedData.renewalOptions || 'None specified'}
- Termination Option: ${extractedData.terminationOption || 'None specified'}
- Sublease Rights: ${extractedData.subleaseRights || 'Not specified'}
- Assignment Rights: ${extractedData.assignmentRights || 'Not specified'}
- Personal Guaranty: ${extractedData.personalGuaranty || 'None specified'}
- CAM Charges: ${extractedData.camCharges || 'Not specified'}

FULL LEASE TEXT:
${originalText}

When answering:
1. Answer in plain English — no legal jargon
2. Cite the exact lease language that supports your answer
3. Be specific about what the lease says — do not generalize
4. If the lease is silent on a topic, say so clearly
5. Format your answer as JSON: {"answer": "your plain English answer", "citations": [{"clauseTitle": "name of clause", "clauseText": "exact quote from lease"}]}
6. If you cannot find specific lease language, include an empty citations array
7. Be direct and helpful — tenants need actionable guidance`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ answer: parsed.answer || content.text, citations: parsed.citations || [] });
      }
    } catch { /* fall through */ }

    return NextResponse.json({ answer: content.text, citations: [] });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Chat failed. Please try again.' }, { status: 500 });
  }
}
