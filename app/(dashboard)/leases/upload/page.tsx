'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import {
  Upload, File, X, CheckCircle, Loader2, AlertCircle,
  FileText, FileSpreadsheet, Image as ImageIcon,
} from 'lucide-react';

type UploadState = 'idle' | 'uploading' | 'extracting' | 'success' | 'error';

// Fields that will be shown as they stream in
const DISPLAY_FIELDS: { key: string; label: string }[] = [
  { key: 'tenantName', label: 'Tenant' },
  { key: 'landlordName', label: 'Landlord' },
  { key: 'propertyAddress', label: 'Address' },
  { key: 'propertyType', label: 'Property type' },
  { key: 'leaseCommencementDate', label: 'Start date' },
  { key: 'leaseExpirationDate', label: 'Expiration date' },
  { key: 'leaseTermMonths', label: 'Lease term (months)' },
  { key: 'baseRentMonthly', label: 'Monthly rent' },
  { key: 'securityDeposit', label: 'Security deposit' },
  { key: 'renewalOptions', label: 'Renewal options' },
  { key: 'tenantImprovementAllowance', label: 'TI allowance' },
  { key: 'parkingSpaces', label: 'Parking spaces' },
  { key: 'confidenceScore', label: 'Confidence score' },
];

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="h-8 w-8 text-green-400 flex-shrink-0" />;
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp')
    return <ImageIcon className="h-8 w-8 text-purple-400 flex-shrink-0" />;
  return <FileText className="h-8 w-8 text-blue-400 flex-shrink-0" />;
}

function formatFieldValue(key: string, value: string): string {
  if ((key === 'baseRentMonthly' || key === 'securityDeposit' || key === 'tenantImprovementAllowance') && value && !isNaN(Number(value))) {
    return '$' + Number(value).toLocaleString();
  }
  if (key === 'confidenceScore' && value) return `${value}%`;
  return value || '—';
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [extractedFields, setExtractedFields] = useState<Record<string, string>>({});

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0];
      if (err?.code === 'file-too-large') setError('File too large (max 50MB)');
      else if (err?.code === 'file-invalid-type') setError('Unsupported file type');
      else setError('File rejected');
    },
  });

  const handleUpload = async () => {
    if (!file) return;

    setState('uploading');
    setError('');
    setExtractedFields({});

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        setState('error');
        return;
      }

      const leaseId = data.leaseId as string;
      setState('extracting');
      setStatus('Connecting to AI…');

      // Open SSE stream for real-time extraction progress
      const evtSource = new EventSource(`/api/leases/${leaseId}/extract-stream`);

      evtSource.addEventListener('status', (e) => {
        const d = JSON.parse(e.data);
        setStatus(d.message);
      });

      evtSource.addEventListener('field', (e) => {
        const d = JSON.parse(e.data);
        setExtractedFields(prev => ({ ...prev, [d.field]: d.value }));
      });

      evtSource.addEventListener('done', () => {
        evtSource.close();
        setState('success');
        setTimeout(() => router.push(`/leases/${leaseId}`), 1800);
      });

      evtSource.addEventListener('error', (e) => {
        evtSource.close();
        let msg = 'Extraction failed';
        try { msg = JSON.parse((e as MessageEvent).data)?.error ?? msg; } catch { /* ignored */ }
        setError(msg);
        setState('error');
      });

      // Fallback: if SSE connection itself errors (network issue), poll instead
      evtSource.onerror = () => {
        evtSource.close();
        // Only fall back to polling if we haven't succeeded yet
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await fetch(`/api/leases/${leaseId}`);
            const statusData = await statusRes.json();
            if (statusData.lease?.status === 'completed') {
              clearInterval(poll);
              setState('success');
              setTimeout(() => router.push(`/leases/${leaseId}`), 1500);
            } else if (statusData.lease?.status === 'error') {
              clearInterval(poll);
              setError('AI extraction failed. Try reprocessing from the lease page.');
              setState('error');
            } else if (attempts > 60) {
              clearInterval(poll);
              setError('Processing is taking longer than expected. Check the Leases page in a few minutes.');
              setState('error');
            }
          } catch { /* network hiccup, keep polling */ }
        }, 3000);
      };
    } catch (err: any) {
      if (err?.message?.includes('413') || err?.message?.includes('too large')) {
        setError('File too large. Please ensure your file is under 50 MB.');
      } else if (!navigator.onLine) {
        setError('You appear to be offline. Please check your internet connection and try again.');
      } else {
        setError('Upload failed. Please check your connection and try again.');
      }
      setState('error');
    }
  };

  const fieldsPopulated = DISPLAY_FIELDS.filter(f => extractedFields[f.key]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Upload Lease Document</h1>
      <p className="text-gray-400 mb-8">
        Upload a lease in PDF, Word (.docx), Excel (.xlsx), or image format. Claude AI will extract all key terms in real time.
      </p>

      {/* ── Extracting state ── */}
      {state === 'extracting' && (
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold">Extracting lease terms…</p>
                <p className="text-gray-400 text-sm">{status}</p>
              </div>
            </div>
            {/* Progress bar based on fields populated */}
            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (fieldsPopulated.length / DISPLAY_FIELDS.length) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{fieldsPopulated.length} / {DISPLAY_FIELDS.length} fields extracted</p>
          </div>

          {/* Live field grid */}
          {fieldsPopulated.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Extracted so far</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DISPLAY_FIELDS.map(({ key, label }) => {
                  const val = extractedFields[key];
                  if (!val) return null;
                  return (
                    <div key={key} className="flex justify-between gap-2 text-sm py-1 border-b border-gray-800 last:border-0">
                      <span className="text-gray-400 truncate">{label}</span>
                      <span className="text-white font-medium text-right truncate max-w-[55%]">
                        {formatFieldValue(key, val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Success state ── */}
      {state === 'success' && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">Extraction complete!</p>
          <p className="text-gray-400 mt-2">Redirecting to lease details…</p>
        </div>
      )}

      {/* ── Upload / idle / error state ── */}
      {(state === 'idle' || state === 'uploading' || state === 'error') && (
        <>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-blue-400 font-medium">Drop your file here</p>
            ) : (
              <>
                <p className="text-gray-300 font-medium">Drag & drop your lease document here</p>
                <p className="text-gray-500 text-sm mt-1">or click to browse files</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['PDF', 'Word (.docx)', 'Excel (.xlsx)', 'JPG / PNG'].map(fmt => (
                    <span key={fmt} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">{fmt}</span>
                  ))}
                </div>
                <p className="text-gray-600 text-xs mt-3">Max 50 MB</p>
              </>
            )}
          </div>

          {file && (
            <div className="mt-4 flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg p-4">
              {fileIcon(file.name)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={() => setFile(null)} className="text-gray-500 hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-900/20 border border-red-800 rounded-lg p-4">
              <div className="flex gap-2 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
              <button
                onClick={() => { setError(''); setState('idle'); }}
                className="mt-3 text-xs text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Dismiss and try again
              </button>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || state === 'uploading'}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {state === 'uploading' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="h-4 w-4" /> Extract Lease Terms</>
            )}
          </button>
        </>
      )}
    </div>
  );
}
