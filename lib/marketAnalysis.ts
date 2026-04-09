import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type MarketPosition = 'below_market' | 'at_market' | 'above_market' | 'unknown';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type RenewalLeverage = 'strong' | 'moderate' | 'weak';

export interface MarketAnalysis {
  marketRentLow: number;
  marketRentHigh: number;
  marketRentMid: number;
  currentRentMonthly: number;
  currentRentPerSqft: number | null;
  squareFootage: number | null;
  position: MarketPosition;
  positionPercentage: number;
  confidenceLevel: ConfidenceLevel;
  summary: string;
  sources: string[];
  renewalLeverage: RenewalLeverage;
  recommendedAction: string;
  analyzedAt: string;
}

export async function analyzeMarketRent(params: {
  propertyAddress: string;
  propertyType: string;
  monthlyRent: number;
  squareFootage?: number | null;
}): Promise<MarketAnalysis> {
  const { propertyAddress, propertyType, monthlyRent, squareFootage } = params;

  const annualRent = monthlyRent * 12;
  const rentPerSqft =
    squareFootage && squareFootage > 0 ? annualRent / squareFootage : null;

  const sqftLine = squareFootage
    ? `Square Footage: ${squareFootage.toLocaleString()} sqft`
    : '';
  const rentPerSqftLine = rentPerSqft
    ? ` ($${rentPerSqft.toFixed(2)}/sqft/year)`
    : '';

  const prompt = `You are a commercial real estate market analyst. Research current market rents for the following lease using web search.

Property Address: ${propertyAddress}
Property Type: ${propertyType || 'commercial'}
Current Monthly Rent: $${monthlyRent.toLocaleString()}${rentPerSqftLine}
${sqftLine}

Search for:
1. Current asking rents for ${propertyType || 'commercial'} space near ${propertyAddress}
2. Recent comparable lease transactions in the area
3. Market rate data from CoStar, LoopNet, CBRE, JLL, or Cushman & Wakefield for this city and property type
4. Average asking rents per square foot annually for this property type and market

After researching, return ONLY a valid JSON object with exactly these fields:
{
  "marketRentLow": number,
  "marketRentHigh": number,
  "marketRentMid": number,
  "position": "below_market" | "at_market" | "above_market" | "unknown",
  "positionPercentage": number,
  "confidenceLevel": "high" | "medium" | "low",
  "summary": string,
  "sources": string[],
  "renewalLeverage": "strong" | "moderate" | "weak",
  "recommendedAction": string
}

Rules:
- marketRentLow/High/Mid are annual $/sqft values (if no sqft data use monthly equivalent)
- positionPercentage: positive = above market, negative = below market (e.g. 15 = 15% above)
- position: "below_market" if >10% below mid, "above_market" if >10% above mid, "at_market" if within ±10%, "unknown" if insufficient data
- confidenceLevel: "high" if 3+ real data sources found, "medium" if 1-2 found, "low" if mostly estimated
- summary: 2-3 sentences plain English, mention the location, property type, market range, current rent position, and renewal leverage
- renewalLeverage: "strong" = well below market (tenant has leverage), "moderate" = near market, "weak" = above market (landlord has leverage)
- recommendedAction: one actionable sentence for the tenant at renewal
- sources: up to 5 source names or URLs found during research

Example summary: "Based on current listings in Dallas TX 75206 for retail space, market rents are approximately $28-35 per square foot annually. Your current rent of $32/sqft puts you at market rate. At renewal you have moderate negotiating leverage."

Return ONLY the JSON object, no other text.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }],
  });

  // Find the final text block (after any tool use)
  let analysisText = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      analysisText = block.text;
    }
  }

  const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in market analysis response');
  }

  const result = JSON.parse(jsonMatch[0]);

  return {
    marketRentLow: Number(result.marketRentLow) || 0,
    marketRentHigh: Number(result.marketRentHigh) || 0,
    marketRentMid: Number(result.marketRentMid) || 0,
    currentRentMonthly: monthlyRent,
    currentRentPerSqft: rentPerSqft,
    squareFootage: squareFootage ?? null,
    position: result.position || 'unknown',
    positionPercentage: Number(result.positionPercentage) || 0,
    confidenceLevel: result.confidenceLevel || 'low',
    summary: result.summary || '',
    sources: Array.isArray(result.sources) ? result.sources : [],
    renewalLeverage: result.renewalLeverage || 'moderate',
    recommendedAction: result.recommendedAction || '',
    analyzedAt: new Date().toISOString(),
  };
}

/** Extract square footage from extracted lease JSON by scanning common fields. */
export function extractSquareFootage(extractedData: Record<string, unknown>): number | null {
  const searchText = JSON.stringify(extractedData);
  const match = searchText.match(/(\d[\d,]+)\s*(?:sq\.?\s*ft\.?|square\s*feet|SF\b)/i);
  if (match) {
    const n = parseInt(match[1].replace(/,/g, ''), 10);
    return n > 0 ? n : null;
  }
  return null;
}
