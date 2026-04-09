import Anthropic from '@anthropic-ai/sdk';
import type { ParsedContent } from './fileParser';

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

const EXTRACTION_PROMPT = `You are a commercial real estate lease abstraction specialist with 20 years of experience. Read this lease document carefully and extract every critical term. Return ONLY a valid JSON object with exactly these fields:
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
- For leaseExpirationDate and leaseCommencementDate, these are critical - flag them if uncertain`;

/**
 * Streaming extraction prompt — Claude outputs one FIELD line per extracted key
 * so the SSE layer can emit real-time updates, followed by the full JSON block.
 */
const STREAMING_EXTRACTION_PROMPT = `You are a commercial real estate lease abstraction specialist with 20 years of experience. Read this lease document and extract every critical term.

Output format — IMPORTANT, follow exactly:
1. As you determine each field value, output a line in this format:
   FIELD:fieldName=value
   (one line per field, no extra whitespace around the = sign)
2. After all FIELD lines, output the complete JSON object between ===JSON_START=== and ===JSON_END=== markers.

Fields to extract (use empty string or 0 if not found):
tenantName, landlordName, propertyAddress, propertyType, leaseCommencementDate, leaseExpirationDate, leaseTermMonths, baseRentMonthly, baseRentAnnual, rentEscalationDescription, rentEscalationPercentage, securityDeposit, camCharges, operatingExpenses, renewalOptions, renewalOptionDeadline, terminationOption, terminationOptionDate, expansionRights, rightOfFirstRefusal, permittedUse, exclusivityClause, subleaseRights, assignmentRights, tenantNoticeAddress, landlordNoticeAddress, guarantor, parkingSpaces, parkingCost, tenantImprovementAllowance, freeRentPeriod, personalGuaranty, confidenceScore (0-100), flaggedFields (comma-separated), extractionNotes

Example output format:
FIELD:tenantName=Acme Corp
FIELD:landlordName=Smith Properties LLC
FIELD:propertyAddress=123 Main St, Dallas TX 75201
...
===JSON_START===
{"tenantName":"Acme Corp",...}
===JSON_END===`;

function parseExtractedJson(text: string): ExtractedLeaseData {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Claude response');
  return JSON.parse(jsonMatch[0]) as ExtractedLeaseData;
}

/**
 * Extract lease data from pre-parsed text content (PDF, DOCX, XLSX).
 */
export async function extractLeaseData(pdfText: string): Promise<ExtractedLeaseData> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\nLEASE DOCUMENT:\n${pdfText.substring(0, 100000)}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return parseExtractedJson(content.text);
}

/**
 * Extract lease data from an image (JPG/PNG/WEBP) using Claude vision.
 */
export async function extractLeaseDataFromImage(
  base64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
): Promise<ExtractedLeaseData> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `${EXTRACTION_PROMPT}\n\nThe lease document is the image above. Extract all visible lease terms.`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return parseExtractedJson(content.text);
}

/**
 * Unified extraction — accepts either text or image ParsedContent.
 */
export async function extractLeaseDataFromContent(content: ParsedContent): Promise<ExtractedLeaseData> {
  if (content.type === 'image') {
    return extractLeaseDataFromImage(content.base64, content.mediaType);
  }
  return extractLeaseData(content.text);
}

/**
 * Streaming extraction — calls onField for each field as Claude emits it,
 * calls onProgress with raw text chunks, resolves with the full extracted object.
 *
 * Uses the STREAMING_EXTRACTION_PROMPT so Claude outputs FIELD: lines first.
 */
export async function extractLeaseDataStreaming(
  content: ParsedContent,
  onField: (field: string, value: string) => void,
  onProgress?: (chunk: string) => void,
): Promise<ExtractedLeaseData> {
  let userContent: Anthropic.MessageParam['content'];

  if (content.type === 'image') {
    userContent = [
      {
        type: 'image',
        source: { type: 'base64', media_type: content.mediaType, data: content.base64 },
      },
      {
        type: 'text',
        text: `${STREAMING_EXTRACTION_PROMPT}\n\nThe lease document is the image above.`,
      },
    ];
  } else {
    userContent = `${STREAMING_EXTRACTION_PROMPT}\n\nLEASE DOCUMENT:\n${content.text.substring(0, 100000)}`;
  }

  let fullText = '';
  let lineBuffer = '';

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userContent }],
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      const text = chunk.delta.text;
      fullText += text;
      lineBuffer += text;
      onProgress?.(text);

      // Parse complete FIELD: lines from the buffer
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? ''; // keep the incomplete last line
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('FIELD:')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const field = trimmed.slice(6, eqIdx).trim();
            const value = trimmed.slice(eqIdx + 1).trim();
            if (field) onField(field, value);
          }
        }
      }
    }
  }

  // Parse any remaining FIELD: lines
  if (lineBuffer.trim().startsWith('FIELD:')) {
    const eqIdx = lineBuffer.indexOf('=');
    if (eqIdx !== -1) {
      const field = lineBuffer.slice(6, eqIdx).trim();
      const value = lineBuffer.slice(eqIdx + 1).trim();
      if (field) onField(field, value);
    }
  }

  // Extract JSON from the ===JSON_START=== / ===JSON_END=== block, or fall back
  const jsonBlockMatch = fullText.match(/===JSON_START===\s*([\s\S]*?)\s*===JSON_END===/);
  if (jsonBlockMatch) {
    return JSON.parse(jsonBlockMatch[1].trim()) as ExtractedLeaseData;
  }
  // Fallback: scan for any JSON object in the response
  return parseExtractedJson(fullText);
}
