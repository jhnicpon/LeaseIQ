import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import getDb from '@/lib/db';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildAnalysisPrompt(extractedData: Record<string, unknown>, originalText: string): string {
  const leaseText = originalText.substring(0, 60000);

  return `You are a senior commercial real estate attorney with 25 years of experience representing tenants. You have carefully reviewed the following lease and must provide a comprehensive, honest analysis. Be specific — cite actual lease language. If something is bad for the tenant, say so clearly.

EXTRACTED LEASE DATA:
${JSON.stringify(extractedData, null, 2)}

ORIGINAL LEASE TEXT:
${leaseText}

Return ONLY a valid JSON object with exactly this structure (no markdown, no explanation — just JSON):

{
  "executiveSummary": {
    "summary": "One thorough paragraph summarizing the entire lease in plain English — parties, property, key financial terms, key rights, overall character of the deal",
    "assessment": "good deal|fair deal|bad deal",
    "topThings": ["Most important thing tenant should know", "Second most important thing", "Third most important thing"],
    "grade": "A|B|C|D|F",
    "gradeExplanation": "2-3 sentences explaining the grade, citing specific strengths and weaknesses"
  },
  "financialAnalysis": {
    "marketComparison": "above market|at market|below market",
    "marketComparisonDetail": "Detailed explanation of how rent compares to market based on property type, location, and lease terms",
    "totalCostOfOccupancy": 0,
    "totalCostWithEscalations": 0,
    "camAnalysis": "Detailed analysis of CAM charges — what is included, whether there are caps, gross-up provisions, audit rights, and whether charges appear reasonable",
    "camVerdict": "reasonable|excessive|unknown",
    "hiddenCosts": ["Hidden cost the tenant may have missed — be specific", "Another hidden cost"],
    "effectiveRent": 0,
    "effectiveRentExplanation": "Explain how free rent periods or TI allowances change the true effective rent during the term"
  },
  "riskAnalysis": {
    "risks": [
      {
        "title": "Short descriptive risk title",
        "severity": "critical|high|medium|low",
        "description": "Plain English explanation of what this risk means and what could happen to the tenant",
        "leaseLanguage": "Exact quote from the lease supporting this risk, or 'Not specified in lease'"
      }
    ],
    "overallRiskScore": 0,
    "overallRiskLabel": "Critical|High|Medium|Low"
  },
  "missingProtections": [
    {
      "clause": "Name of the missing clause",
      "description": "What protection this clause would have given the tenant and why its absence is a problem",
      "importance": "Critical|High|Medium|Low"
    }
  ],
  "landlordFriendlyClauses": [
    {
      "clause": "Clause title",
      "leaseLanguage": "Exact language from the lease",
      "explanation": "Clear explanation of why this clause strongly favors the landlord and what the tenant is giving up"
    }
  ],
  "unusualClauses": [
    {
      "clause": "Clause title",
      "leaseLanguage": "Exact language from the lease",
      "explanation": "Why this is non-standard or unusual compared to typical commercial leases",
      "concern": "Specific concern the tenant should understand"
    }
  ],
  "clauseExplainer": [
    {
      "title": "Clause name (e.g., Base Rent, CAM Charges, Renewal Options)",
      "leaseLanguage": "Actual language from the lease for this clause",
      "plainEnglish": "What this clause actually means in plain English — as if explaining to someone with no legal background",
      "isStandard": true,
      "tenantRating": "favorable|neutral|unfavorable",
      "practicalMeaning": "What this means day-to-day for the tenant in practical terms"
    }
  ],
  "scenarioAnalysis": [
    {
      "scenario": "What if I need to break this lease early?",
      "leaseProvision": "What the lease says about this specific situation — cite relevant language",
      "outcome": "Exactly what would happen to the tenant under the lease",
      "financialExposure": "Estimated financial exposure or liability in dollars, or explain the formula"
    },
    {
      "scenario": "What if my business doubles and I need more space?",
      "leaseProvision": "What the lease says about expansion rights, assignment, or subletting",
      "outcome": "What options the tenant has and what obstacles exist",
      "financialExposure": "Any costs or penalties involved"
    },
    {
      "scenario": "What if I want to sell my business?",
      "leaseProvision": "What the lease says about assignment in the context of a business sale",
      "outcome": "Whether and how the tenant can transfer the lease when selling",
      "financialExposure": "Any landlord consent fees, profit sharing, or other costs"
    },
    {
      "scenario": "What if the landlord sells the building?",
      "leaseProvision": "What the lease says about lease continuity if the building is sold",
      "outcome": "Whether the tenant is protected and whether a new landlord must honor the lease",
      "financialExposure": "Any risks to the tenant in a building sale scenario"
    },
    {
      "scenario": "What if there is a fire or natural disaster?",
      "leaseProvision": "What the lease says about damage, destruction, and restoration obligations",
      "outcome": "Who pays for repairs, whether rent is abated, and when tenant can terminate",
      "financialExposure": "Tenant's financial exposure during the repair period"
    },
    {
      "scenario": "What if I cannot pay rent for 3 months?",
      "leaseProvision": "What the lease says about default, cure periods, and landlord remedies",
      "outcome": "Exactly what happens if the tenant misses 3 months of rent — step by step",
      "financialExposure": "Total financial exposure including back rent, penalties, and early termination damages"
    }
  ],
  "marketComparison": [
    {
      "term": "Lease Term Length",
      "leaseValue": "Value as stated in this lease",
      "marketStandard": "Typical market standard for this type of space",
      "rating": "below_market|at_market|above_market|tenant_favorable|landlord_favorable",
      "explanation": "Brief explanation of how this compares to market"
    },
    {
      "term": "Rent Escalation",
      "leaseValue": "How rent escalates in this lease",
      "marketStandard": "Typical escalation (usually 3% annually or CPI)",
      "rating": "below_market|at_market|above_market|tenant_favorable|landlord_favorable",
      "explanation": "Brief explanation"
    },
    {
      "term": "CAM / Operating Expenses",
      "leaseValue": "CAM structure in this lease",
      "marketStandard": "Market standard CAM structure with caps and audit rights",
      "rating": "below_market|at_market|above_market|tenant_favorable|landlord_favorable",
      "explanation": "Brief explanation"
    },
    {
      "term": "Security Deposit",
      "leaseValue": "Security deposit amount",
      "marketStandard": "Typically 2-3 months rent",
      "rating": "below_market|at_market|above_market|tenant_favorable|landlord_favorable",
      "explanation": "Brief explanation"
    },
    {
      "term": "Tenant Improvement Allowance",
      "leaseValue": "TI allowance in this lease",
      "marketStandard": "Market standard varies by space type and condition",
      "rating": "below_market|at_market|above_market|tenant_favorable|landlord_favorable",
      "explanation": "Brief explanation"
    },
    {
      "term": "Renewal Options",
      "leaseValue": "Renewal options in this lease",
      "marketStandard": "Typically 1-2 options of 3-5 years each",
      "rating": "below_market|at_market|above_market|tenant_favorable|landlord_favorable",
      "explanation": "Brief explanation"
    },
    {
      "term": "Termination Rights",
      "leaseValue": "Termination rights in this lease",
      "marketStandard": "Termination options are not standard — they favor the tenant",
      "rating": "below_market|at_market|above_market|tenant_favorable|landlord_favorable",
      "explanation": "Brief explanation"
    },
    {
      "term": "Assignment & Sublease Rights",
      "leaseValue": "Assignment rights in this lease",
      "marketStandard": "Market standard: landlord consent required, not to be unreasonably withheld",
      "rating": "below_market|at_market|above_market|tenant_favorable|landlord_favorable",
      "explanation": "Brief explanation"
    }
  ],
  "actionItems": {
    "beforeSigning": [
      {
        "action": "Specific action the tenant should take or clarify before signing",
        "priority": "Critical|High|Medium|Low",
        "reason": "Why this is important"
      }
    ],
    "afterSigning": [
      {
        "action": "Specific action or deadline to track after signing",
        "date": "Specific date if known from the lease, or timeframe like '12 months before lease expiration'",
        "notes": "Additional context or instructions"
      }
    ],
    "ongoingMonitoring": [
      {
        "item": "What to monitor during the lease term",
        "frequency": "How often to check — Monthly, Annually, etc.",
        "notes": "What to look for and why it matters"
      }
    ]
  }
}

IMPORTANT INSTRUCTIONS:
- For totalCostOfOccupancy: calculate base rent × lease term months (use 0 if data unavailable)
- For totalCostWithEscalations: estimate total with rent increases over the full term (use 0 if data unavailable)
- For effectiveRent: calculate monthly after accounting for free rent periods spread over the full term
- Include at least 5 risks in riskAnalysis
- Include at least 8 clauses in clauseExplainer — cover: base rent, CAM/operating expenses, renewal options, termination, assignment/sublease, personal guaranty, holdover, repairs/maintenance
- Include all 6 scenario analyses exactly as specified above
- Be honest and direct — if this is a bad deal for the tenant, say so`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as { id: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lease = db.prepare('SELECT id, status, aiAnalysis FROM leases WHERE id = ? AND userId = ?').get(id, user.id) as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  if (!lease.aiAnalysis) return NextResponse.json({ analysis: null });

  try {
    const analysis = JSON.parse(lease.aiAnalysis);
    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json({ analysis: null });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(session.user.email) as { id: string } | undefined;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const lease = db.prepare('SELECT * FROM leases WHERE id = ? AND userId = ?').get(id, user.id) as any;
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  if (lease.status !== 'completed') {
    return NextResponse.json({ error: 'Lease must be fully processed before analysis' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const forceRefresh = body.refresh === true;

  if (lease.aiAnalysis && !forceRefresh) {
    return NextResponse.json({ analysis: JSON.parse(lease.aiAnalysis) });
  }

  const extractedData = lease.extractedData ? JSON.parse(lease.extractedData) : {};
  const originalText = lease.originalText || '';

  try {
    const prompt = buildAnalysisPrompt(extractedData, originalText);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

    const text = content.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Claude response');

    const analysis = JSON.parse(jsonMatch[0]);

    db.prepare('UPDATE leases SET aiAnalysis = ? WHERE id = ?').run(JSON.stringify(analysis), id);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('AI analysis error:', err);
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}
