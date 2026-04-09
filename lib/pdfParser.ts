// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

/**
 * Parse a PDF from:
 *   - a Buffer (in-memory bytes, preferred on serverless)
 *   - a URL string (fetched from Vercel Blob or any HTTPS source)
 *   - a local file path string (legacy / local dev only)
 */
export async function parsePdf(source: Buffer | string): Promise<string> {
  let buffer: Buffer;

  if (Buffer.isBuffer(source)) {
    buffer = source;
  } else if (source.startsWith('http://') || source.startsWith('https://')) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch PDF from blob: HTTP ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    // Local file path — only reached in local dev / reprocess of old records
    const fs = await import('fs');
    buffer = fs.readFileSync(source);
  }

  const data = await pdfParse(buffer);
  return data.text;
}
