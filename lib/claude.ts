import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExtractedLeaseData {
  tenantName: string;
  landlordName: string;
  propertyAddress: string;
  propertyType: string;
  leaseCommencementDate: string;
  leaseExpirationDate: string;
  leaseTermMonths: number;
  baseRentMonthly: number;
  baseRentAnnual: number;
  rentEscalationDescription: string;
  rentEscalationPercentage: number;
  securityDeposit: number;
  camCharges: string;
  operatingExpenses: string;
  renewalOptions: string;
  renewalOptionDeadline: string;
  terminationOption: string;
  terminationOptionDate: string;
  expansionRights: string;
  rightOfFirstRefusal: string;
  permittedUse: string;
  exclusivityClause: string;
  subleaseRights: string;
  assignmentRights: string;
  tenantNoticeAddress: string;
  landlordNoticeAddress: string;
  guarantor: string;
  parkingSpaces: number;
  parkingCost: string;
  tenantImprovementAllowance: number;
  freeRentPeriod: string;
  personalGuaranty: string;
  confidenceScore: number;
  flaggedFields: string[];
  extractionNotes: string;
}

export async function extractLeaseData(pdfText: string): Promise<ExtractedLeaseData> {
  const prompt = `You are a commercial real estate lease abstraction specialist with 20 years of experience. Read this lease document carefully and extract every critical term. Return ONLY a valid JSON object with exactly these fields:
{
  "tenantName": string,
  "landlordName": string,
  "propertyAddress": string,
  "propertyType": string,
  "leaseCommencementDate": string,
  "leaseExpirationDate": string,
  "leaseTermMonths": number,
  "baseRentMonthly": number,
  "baseRentAnnual": number,
  "rentEscalationDescription": string,
  "rentEscalationPercentage": number,
  "securityDeposit": number,
  "camCharges": string,
  "operatingExpenses": string,
  "renewalOptions": string,
  "renewalOptionDeadline": string,
  "terminationOption": string,
  "terminationOptionDate": string,
  "expansionRights": string,
  "rightOfFirstRefusal": string,
  "permittedUse": string,
  "exclusivityClause": string,
  "subleaseRights": string,
  "assignmentRights": string,
  "tenantNoticeAddress": string,
  "landlordNoticeAddress": string,
  "guarantor": string,
  "parkingSpaces": number,
  "parkingCost": string,
  "tenantImprovementAllowance": number,
  "freeRentPeriod": string,
  "personalGuaranty": string,
  "confidenceScore": number,
  "flaggedFields": string[],
  "extractionNotes": string
}

Rules:
- For dates, use ISO format YYYY-MM-DD when possible
- For numbers, use numeric values (not strings)
- For confidenceScore, rate 0-100 based on document clarity
- For flaggedFields, list field names that were ambiguous or could not be found
- For extractionNotes, explain any issues or ambiguities found
- If a field is not found, use empty string "" for strings, 0 for numbers, [] for arrays
- For leaseExpirationDate and leaseCommencementDate, these are critical - flag them if uncertain

LEASE DOCUMENT:
${pdfText.substring(0, 100000)}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from response
  const text = content.text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const extracted = JSON.parse(jsonMatch[0]) as ExtractedLeaseData;
  return extracted;
}
