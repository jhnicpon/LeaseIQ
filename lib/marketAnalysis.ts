import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type MarketPosition = 'below_market' | 'at_market' | 'above_market' | 'unknown';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type RenewalLeverage = 'strong' | 'moderate' | 'weak';

export type PropertyCategory =
  | 'residential_single_family'
  | 'residential_apartment'
  | 'residential_condo'
  | 'residential_multifamily'
  | 'residential_townhouse'
  | 'commercial_office'
  | 'commercial_retail'
  | 'commercial_industrial'
  | 'commercial_medical'
  | 'commercial_restaurant'
  | 'mixed_use'
  | 'land_ground'
  | 'land_agricultural'
  | 'unknown';

export interface MarketAnalysis {
  propertyCategory: PropertyCategory;
  propertyCategoryLabel: string;
  marketRentLow: number;
  marketRentHigh: number;
  marketRentMid: number;
  rentUnit: string; // e.g. '/mo', '/sqft/yr', '/acre/yr'
  currentRentMonthly: number;
  currentRentPerSqft: number | null;
  squareFootage: number | null;
  position: MarketPosition;
  positionPercentage: number;
  confidenceLevel: ConfidenceLevel;
  summary: string;
  propertyTypeInsight: string; // type-specific market advice
  sources: string[];
  renewalLeverage: RenewalLeverage;
  recommendedAction: string;
  analyzedAt: string;
}

// ─── Property type detection ──────────────────────────────────────────────────

const RESIDENTIAL_PATTERNS: [RegExp, PropertyCategory][] = [
  [/\b(single.?family|house|home|sfr|sfh)\b/i, 'residential_single_family'],
  [/\b(apartment|apt|flat|studio|unit \d+)\b/i, 'residential_apartment'],
  [/\b(condo|condominium)\b/i, 'residential_condo'],
  [/\b(multi.?family|duplex|triplex|quadplex|fourplex|multifamily)\b/i, 'residential_multifamily'],
  [/\b(townhouse|townhome|town home|row home)\b/i, 'residential_townhouse'],
];

const COMMERCIAL_PATTERNS: [RegExp, PropertyCategory][] = [
  [/\b(medical|healthcare|clinic|dental|physician|lab)\b/i, 'commercial_medical'],
  [/\b(restaurant|food service|kitchen|dining|café|cafe|bar)\b/i, 'commercial_restaurant'],
  [/\b(office|professional|suite)\b/i, 'commercial_office'],
  [/\b(retail|storefront|shop|boutique|showroom|salon)\b/i, 'commercial_retail'],
  [/\b(industrial|warehouse|distribution|manufacturing|flex|logistics)\b/i, 'commercial_industrial'],
];

const LAND_PATTERNS: [RegExp, PropertyCategory][] = [
  [/\b(ground lease|land lease|ground rent)\b/i, 'land_ground'],
  [/\b(agricultural|farm|ranch|crop|pasture|grazing|acreage)\b/i, 'land_agricultural'],
];

export function detectPropertyCategory(
  propertyType: string,
  extractedData: Record<string, unknown>
): PropertyCategory {
  const haystack = [
    propertyType,
    String(extractedData.permittedUse ?? ''),
    String(extractedData.propertyAddress ?? ''),
    String(extractedData.extractionNotes ?? ''),
  ]
    .join(' ')
    .toLowerCase();

  for (const [re, cat] of LAND_PATTERNS) if (re.test(haystack)) return cat;
  if (/\bmixed.?use\b/i.test(haystack)) return 'mixed_use';
  for (const [re, cat] of RESIDENTIAL_PATTERNS) if (re.test(haystack)) return cat;
  for (const [re, cat] of COMMERCIAL_PATTERNS) if (re.test(haystack)) return cat;

  return 'unknown';
}

const CATEGORY_LABELS: Record<PropertyCategory, string> = {
  residential_single_family: 'Single-Family Residential',
  residential_apartment: 'Apartment / Flat',
  residential_condo: 'Condominium',
  residential_multifamily: 'Multi-Family Residential',
  residential_townhouse: 'Townhouse',
  commercial_office: 'Office',
  commercial_retail: 'Retail',
  commercial_industrial: 'Industrial / Warehouse',
  commercial_medical: 'Medical Office',
  commercial_restaurant: 'Restaurant / Food Service',
  mixed_use: 'Mixed-Use',
  land_ground: 'Ground Lease',
  land_agricultural: 'Agricultural Land',
  unknown: 'Commercial',
};

// ─── Search strategy per category ────────────────────────────────────────────

function buildSearchStrategy(
  category: PropertyCategory,
  address: string,
  monthlyRent: number,
  squareFootage: number | null,
  extractedData: Record<string, unknown>
): { prompt: string; rentUnit: string } {
  const zip = (address.match(/\b\d{5}\b/) ?? [])[0] ?? '';
  const city = zip ? `ZIP ${zip}` : address;
  const annualRent = monthlyRent * 12;
  const rentPerSqft = squareFootage && squareFootage > 0 ? annualRent / squareFootage : null;

  const beds = String(extractedData.bedrooms ?? extractedData.bedroomCount ?? '');
  const baths = String(extractedData.bathrooms ?? extractedData.bathroomCount ?? '');
  const bedsLine = beds ? `Bedrooms: ${beds}` : '';
  const bathsLine = baths ? `Bathrooms: ${baths}` : '';
  const sqftLine = squareFootage ? `Square footage: ${squareFootage.toLocaleString()} sqft` : '';
  const rentLine = `Current monthly rent: $${monthlyRent.toLocaleString()}/mo`;
  const rentPerSqftLine = rentPerSqft ? ` ($${rentPerSqft.toFixed(2)}/sqft/yr)` : '';

  const isResidential = category.startsWith('residential');
  const isLand = category.startsWith('land');
  const rentUnit = isResidential ? '/mo' : isLand ? '/acre/yr' : '/sqft/yr';

  let searchInstructions = '';

  if (isResidential) {
    const typeLabel = CATEGORY_LABELS[category];
    searchInstructions = `
Search for:
1. Active ${typeLabel} rental listings in ${city}${bedsLine ? ` with ${beds} bedrooms` : ''}
2. Recently rented comparable ${typeLabel} units in the same ZIP code
3. Local apartment/rental market reports for ${city} (Zillow, Apartments.com, Rentometer, Zumper)
4. Average asking rents for ${typeLabel} in this area

Additional details:
${rentLine}
${bedsLine}
${bathsLine}
${sqftLine}

Compare the current rent of $${monthlyRent.toLocaleString()}/mo to the local market. Report marketRentLow/Mid/High as monthly dollar amounts (not per sqft). Set rentUnit to "/mo".`;
  } else if (category === 'land_agricultural') {
    searchInstructions = `
Search for:
1. Agricultural land lease rates per acre per year near ${city}
2. Farm rental rates in this county/state
3. USDA or state agricultural extension reports on cash rent rates for farmland
4. Any recent agricultural land transactions or listed ground rents near ${city}

${rentLine}
Current annual rent: $${annualRent.toLocaleString()}/yr

Report marketRentLow/Mid/High as annual dollars per acre. Set rentUnit to "/acre/yr". Estimate acreage if not provided.`;
  } else if (category === 'land_ground') {
    searchInstructions = `
Search for:
1. Ground lease rates for comparable land in ${city}
2. Comparable ground lease transactions in the area
3. Typical ground lease yield rates (as % of land value) for this market
4. Any public records or broker reports on ground lease rates near ${city}

${rentLine}
${sqftLine}

Report marketRentLow/Mid/High as annual dollars per square foot of land. Set rentUnit to "/sqft/yr".`;
  } else if (category === 'mixed_use') {
    searchInstructions = `
Search for:
1. Mixed-use property lease rates in ${city}
2. Comparable retail/residential mixed-use asking rents in this ZIP
3. Market reports from CBRE, JLL, or Cushman & Wakefield on mixed-use properties in this market
4. Average blended rents for mixed-use in this area

${rentLine}${rentPerSqftLine}
${sqftLine}

Report marketRentLow/Mid/High as annual dollars per square foot (blended). Set rentUnit to "/sqft/yr".`;
  } else {
    // Commercial: office, retail, industrial, medical, restaurant
    const typeLabel = CATEGORY_LABELS[category];
    let specialSearch = '';
    if (category === 'commercial_restaurant') {
      specialSearch = '5. Look specifically for any free-rent concessions, tenant improvement allowances, or percentage-rent structures common in restaurant leases in this market';
    } else if (category === 'commercial_retail') {
      specialSearch = '5. Check if landlords are currently offering free rent or TI allowances for retail in this market and estimate the effective net rent impact';
    } else if (category === 'commercial_medical') {
      specialSearch = '5. Medical office typically commands a premium — note any typical premium over standard office in this market';
    } else if (category === 'commercial_industrial') {
      specialSearch = '5. Note whether the market distinguishes between flex, bulk warehouse, and last-mile distribution rents';
    }

    searchInstructions = `
Search for:
1. Current asking rents for ${typeLabel} space in ${city}
2. Recent comparable ${typeLabel} lease transactions in the area
3. Market rate reports from CoStar, LoopNet, CBRE, JLL, or Cushman & Wakefield for ${typeLabel} in this market
4. Average asking rents per square foot annually for ${typeLabel} in this ZIP/submarket
${specialSearch}

${rentLine}${rentPerSqftLine}
${sqftLine}

Report marketRentLow/Mid/High as annual dollars per square foot. Set rentUnit to "/sqft/yr".`;
  }

  const prompt = `You are a real estate market analyst specializing in lease benchmarking. Research current market rents for the following lease using web search.

Property Address: ${address}
Detected Property Type: ${CATEGORY_LABELS[category]}
${searchInstructions}

After researching, return ONLY a valid JSON object with exactly these fields:
{
  "marketRentLow": number,
  "marketRentHigh": number,
  "marketRentMid": number,
  "rentUnit": string,
  "position": "below_market" | "at_market" | "above_market" | "unknown",
  "positionPercentage": number,
  "confidenceLevel": "high" | "medium" | "low",
  "summary": string,
  "propertyTypeInsight": string,
  "sources": string[],
  "renewalLeverage": "strong" | "moderate" | "weak",
  "recommendedAction": string
}

Rules:
- position: "below_market" if >10% below mid, "above_market" if >10% above mid, "at_market" if within ±10%, "unknown" if insufficient data
- positionPercentage: positive = above market, negative = below (e.g. -15 = 15% below market)
- confidenceLevel: "high" if 3+ real data sources found, "medium" if 1-2, "low" if mostly estimated
- summary: 2-3 plain English sentences covering location, property type, market range, current rent position, and leverage
- propertyTypeInsight: 1-2 sentences of property-type-specific market intelligence (concessions, trends, typical deal terms, etc.) for this specific market right now
- renewalLeverage: "strong" = tenant well below market, "moderate" = near market, "weak" = above market (landlord has leverage)
- recommendedAction: one actionable sentence for the tenant at renewal
- sources: up to 5 source names or URLs found during research

Return ONLY the JSON object, no other text.`;

  return { prompt, rentUnit };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function analyzeMarketRent(params: {
  propertyAddress: string;
  propertyType: string;
  monthlyRent: number;
  squareFootage?: number | null;
  extractedData?: Record<string, unknown>;
}): Promise<MarketAnalysis> {
  const {
    propertyAddress,
    propertyType,
    monthlyRent,
    squareFootage = null,
    extractedData = {},
  } = params;

  const category = detectPropertyCategory(propertyType, extractedData);
  const propertyCategoryLabel = CATEGORY_LABELS[category];
  const { prompt, rentUnit } = buildSearchStrategy(
    category,
    propertyAddress,
    monthlyRent,
    squareFootage,
    extractedData
  );

  const annualRent = monthlyRent * 12;
  const rentPerSqft =
    squareFootage && squareFootage > 0 ? annualRent / squareFootage : null;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }],
  });

  // Find the final text block (after any tool-use turns)
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
    propertyCategory: category,
    propertyCategoryLabel,
    marketRentLow: Number(result.marketRentLow) || 0,
    marketRentHigh: Number(result.marketRentHigh) || 0,
    marketRentMid: Number(result.marketRentMid) || 0,
    rentUnit: result.rentUnit || rentUnit,
    currentRentMonthly: monthlyRent,
    currentRentPerSqft: rentPerSqft,
    squareFootage: squareFootage ?? null,
    position: result.position || 'unknown',
    positionPercentage: Number(result.positionPercentage) || 0,
    confidenceLevel: result.confidenceLevel || 'low',
    summary: result.summary || '',
    propertyTypeInsight: result.propertyTypeInsight || '',
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
