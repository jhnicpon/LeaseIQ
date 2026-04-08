'use client';
import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle, AlertTriangle, XCircle, DollarSign, FileText, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { formatCurrency } from '@/lib/dateUtils';
import type { CamAuditResult, CamLineItem } from '@/app/api/cam-checker/route';

export default function CamCheckerPage() {
  const [leases, setLeases] = useState<any[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState('');
  const [camFile, setCamFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CamAuditResult | null>(null);
  const [error, setError] = useState('');
  const [showLetter, setShowLetter] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/leases').then(r => r.json()).then(d => {
      setLeases((d.leases || []).filter((l: any) => l.status === 'completed'));
    });
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setCamFile(accepted[0]); setError(''); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  const runAudit = async () => {
    if (!selectedLeaseId || !camFile) { setError('Select a lease and upload the CAM statement.'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      const fd = new FormData();
      fd.append('leaseId', selectedLeaseId);
      fd.append('camStatement', camFile);
      const res = await fetch('/api/cam-checker', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Audit failed'); } else { setResult(data); }
    } catch { setError('Something went wrong. Please try again.'); }
    setLoading(false);
  };

  const statusConfig = (s: CamLineItem['status']) => {
    if (s === 'ALLOWED') return { color: 'text-green-400 bg-green-900/20 border-green-800', icon: CheckCircle };
    if (s === 'QUESTIONABLE') return { color: 'text-yellow-400 bg-yellow-900/20 border-yellow-800', icon: AlertTriangle };
    return { color: 'text-red-400 bg-red-900/20 border-red-800', icon: XCircle };
  };

  const copyLetter = async () => {
    if (!result?.disputeLetter) return;
    await navigator.clipboard.writeText(result.disputeLetter);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">CAM Reconciliation Checker</h1>
      <p className="text-gray-400 mb-8">
        Upload your CAM reconciliation statement to audit it against your lease terms. Commercial tenants are routinely overcharged — a single audit can recover thousands.
      </p>

      {/* Setup */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-4">1. Select Lease & Upload Statement</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Lease</label>
            <select
              value={selectedLeaseId}
              onChange={e => setSelectedLeaseId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Choose a lease...</option>
              {leases.map(l => (
                <option key={l.id} value={l.id}>{l.propertyAddress || l.fileName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">CAM Statement PDF</label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <input {...getInputProps()} />
              {camFile ? (
                <p className="text-sm text-green-400 font-medium">{camFile.name}</p>
              ) : (
                <p className="text-sm text-gray-500">Drop CAM statement PDF here or click to browse</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
            <XCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        <button
          onClick={runAudit}
          disabled={loading || !selectedLeaseId || !camFile}
          className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing (30-60 seconds)...</> : <><Upload className="h-4 w-4" /> Run CAM Audit</>}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Billed', value: formatCurrency(result.totalBilled), color: 'text-white' },
              { label: 'Allowed', value: formatCurrency(result.totalAllowed), color: 'text-green-400' },
              { label: 'Questionable', value: formatCurrency(result.totalQuestionable), color: 'text-yellow-400' },
              { label: 'Potential Recovery', value: formatCurrency(result.potentialRecovery), color: 'text-red-400' },
            ].map(c => (
              <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" /> Audit Summary
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
          </div>

          {/* Line items */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-semibold text-white">Line Item Analysis</h2>
            </div>
            <div className="divide-y divide-gray-800">
              {result.lineItems.map((item, i) => {
                const { color, icon: Icon } = statusConfig(item.status);
                return (
                  <div key={i} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
                            <Icon className="h-3 w-3" /> {item.status}
                          </span>
                          <span className="text-sm font-medium text-white">{item.description}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{item.reason}</p>
                        <p className="text-xs text-gray-500 italic">{item.recommendation}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-white">{formatCurrency(item.amount)}</p>
                        {item.estimatedOvercharge > 0 && (
                          <p className="text-xs text-red-400 font-medium">
                            Overcharge: {formatCurrency(item.estimatedOvercharge)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispute letter */}
          {result.disputeLetter && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <button
                onClick={() => setShowLetter(s => !s)}
                className="flex items-center justify-between w-full"
              >
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-400" /> Template Dispute Letter
                </h2>
                {showLetter ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              {showLetter && (
                <div className="mt-4">
                  <button
                    onClick={copyLetter}
                    className="mb-3 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy letter'}
                  </button>
                  <pre className="bg-gray-800 rounded-lg p-4 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-mono overflow-auto max-h-96">
                    {result.disputeLetter}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
