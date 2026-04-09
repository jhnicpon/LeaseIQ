/**
 * Unified file parser — routes to the correct parser based on file type.
 *
 * Supported formats:
 *   .pdf   → pdf-parse
 *   .docx  → mammoth
 *   .xlsx / .xls → xlsx (sheets flattened to tab-separated text)
 *   .jpg / .jpeg / .png / .webp / .gif → returns ImageContent for Claude vision
 */

import { parsePdf } from './pdfParser';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

export type ParsedContent = TextContent | ImageContent;

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function getMimeType(ext: string): ImageContent['mediaType'] | null {
  const map: Record<string, ImageContent['mediaType']> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return map[ext] ?? null;
}

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'webp', 'gif'];

export const ACCEPT_MIME_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

/**
 * Parse a file from a Buffer. The fileName is used to determine which parser to use.
 * Returns either text content (for text-based formats) or image content (for images).
 */
export async function parseFile(buffer: Buffer, fileName: string): Promise<ParsedContent> {
  const ext = getExtension(fileName);

  if (ext === 'pdf') {
    const text = await parsePdf(buffer);
    return { type: 'text', text };
  }

  if (ext === 'docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return { type: 'text', text: result.value };
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const lines: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv: string = XLSX.utils.sheet_to_csv(sheet);
      lines.push(`=== Sheet: ${sheetName} ===`);
      lines.push(csv);
    }
    return { type: 'text', text: lines.join('\n') };
  }

  const mimeType = getMimeType(ext);
  if (mimeType) {
    return {
      type: 'image',
      base64: buffer.toString('base64'),
      mediaType: mimeType,
    };
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

/**
 * Parse a file from a URL (Vercel Blob). Downloads and dispatches to parseFile.
 * If fileName is not provided it is inferred from the URL.
 */
export async function parseFileFromUrl(url: string, fileName?: string): Promise<ParsedContent> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file from blob: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const name = fileName ?? url.split('/').pop() ?? 'file';
  return parseFile(buffer, name);
}
