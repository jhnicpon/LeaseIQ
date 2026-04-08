'use client';
import { useState } from 'react';
import { X, Copy, CheckCircle, Download, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface Props {
  leaseData: any;
  onClose: () => void;
}

function buildLetter(d: any): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const mark = (val: string | undefined | null, fallback: string) =>
    val && val.trim() && val.toLowerCase() !== 'none' ? val : `[${fallback}]`;

  const tenant = mark(d.tenantName, 'TENANT NAME');
  const landlord = mark(d.landlordName, 'LANDLORD NAME');
  const address = mark(d.propertyAddress, 'PROPERTY ADDRESS');
  const landlordAddr = mark(d.landlordNoticeAddress, 'LANDLORD NOTICE ADDRESS');
  const commence = d.leaseCommencementDate ? formatDate(d.leaseCommencementDate) : '[COMMENCEMENT DATE]';
  const renewal = mark(d.renewalOptions, 'RENEWAL OPTION TERMS');

  return `${today}


${landlord}
${landlordAddr}


RE: Notice of Exercise of Renewal Option
    ${address}
    Lease dated ${commence}


Dear ${landlord},

This letter serves as formal notice that ${tenant} hereby exercises its option to renew the Lease Agreement dated ${commence} for the premises located at ${address}, pursuant to the renewal option provisions set forth therein.

The renewal option terms are as follows: ${renewal}.

Please confirm receipt of this notice by signing and returning a copy to the address listed below at your earliest convenience.

Time is of the essence with respect to the exercise of this renewal option.


Sincerely,


_______________________________
${tenant}
Date: _______________


_______________________________
Acknowledged and agreed by Landlord:
${landlord}
Date: _______________
`;
}

export default function RenewalLetterModal({ leaseData: d, onClose }: Props) {
  const [letter, setLetter] = useState(() => buildLetter(d));
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadDocx = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/renewal-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: letter, leaseData: d }),
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RenewalNotice-${(d.propertyAddress || 'lease').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate Word document.');
    } finally {
      setDownloading(false);
    }
  };

  // Highlight unfilled placeholders
  const highlightedLetter = letter.split('\n').map((line, i) => {
    const parts = line.split(/(\[[^\]]+\])/g);
    return (
      <div key={i} className="min-h-[1.5em]">
        {parts.map((part, j) =>
          /^\[.+\]$/.test(part) ? (
            <mark key={j} className="bg-yellow-400/30 text-yellow-300 rounded px-0.5">{part}</mark>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </div>
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Renewal Notice</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Items in <mark className="bg-yellow-400/30 text-yellow-300 rounded px-0.5 not-italic">[brackets]</mark> need manual completion.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Editable letter */}
        <div className="flex-1 overflow-auto p-6 grid grid-cols-1 gap-4">
          <textarea
            value={letter}
            onChange={e => setLetter(e.target.value)}
            className="w-full h-96 bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            spellCheck={false}
          />
          {/* Preview with highlights */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
            <p className="text-xs text-gray-500 mb-2 font-sans">Preview (highlights show unfilled fields)</p>
            {highlightedLetter}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-800">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-700 transition-colors"
          >
            {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={downloadDocx}
            disabled={downloading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download as Word Document
          </button>
          <button onClick={onClose} className="ml-auto text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
