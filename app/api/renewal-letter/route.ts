import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
} from 'docx';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, leaseData: d } = await req.json() as { text: string; leaseData: any };

  const lines = text.split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    if (line.startsWith('RE:')) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, bold: true, size: 22 })],
          spacing: { after: 120 },
        })
      );
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
    } else {
      // Detect [placeholder] spans
      const parts = line.split(/(\[[^\]]+\])/g);
      const runs = parts.map(part =>
        /^\[.+\]$/.test(part)
          ? new TextRun({ text: part, highlight: 'yellow', bold: true, size: 22 })
          : new TextRun({ text: part, size: 22 })
      );
      children.push(new Paragraph({ children: runs, spacing: { after: 100 } }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children,
      },
    ],
  });

  const nodeBuffer = await Packer.toBuffer(doc);
  const buffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);

  const filename = `RenewalNotice-${(d?.propertyAddress || 'lease').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.docx`;
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
