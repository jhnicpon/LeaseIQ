'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { ArrowLeft, Clock, RotateCcw, Upload, Loader2, AlertCircle, CheckCircle, File } from 'lucide-react';

export default function LeaseHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reverting, setReverting] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState('');

  const fetchVersions = () => {
    setLoading(true);
    fetch(`/api/leases/${id}/versions`).then(r => r.json()).then(d => {
      setVersions(d.versions || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchVersions(); }, [id]);

  const revert = async (versionId: string) => {
    if (!confirm('Revert to this version? Your current data will be saved before reverting.')) return;
    setReverting(versionId);
    await fetch(`/api/leases/${id}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId }),
    });
    setReverting(null);
    fetchVersions();
  };

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setUploadFile(accepted[0]); setUploadError(''); setUploadResult(null); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  const uploadAmendment = async () => {
    if (!uploadFile) return;
    setUploading(true); setUploadError(''); setUploadResult(null);
    const fd = new FormData();
    fd.append('file', uploadFile);
    const res = await fetch(`/api/leases/${id}/amendment`, { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      setUploadResult(data);
      setUploadFile(null);
      fetchVersions();
    } else {
      setUploadError(data.error || 'Amendment processing failed');
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/leases/${id}`} className="text-gray-400 hover:text-gray-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Version History</h1>
          <p className="text-gray-400 text-sm">Track all changes and amendments to this lease</p>
        </div>
      </div>

      {/* Upload Amendment */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4 text-blue-400" /> Upload Amendment
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Upload a lease amendment PDF. AI will identify which fields changed and update the lease automatically.
          The current version is saved before applying changes.
        </p>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-3 ${
            isDragActive ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <input {...getInputProps()} />
          {uploadFile ? (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <File className="h-5 w-5" /> <span className="text-sm font-medium">{uploadFile.name}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Drop amendment PDF here or click to browse</p>
          )}
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
            <AlertCircle className="h-4 w-4" /> {uploadError}
          </div>
        )}

        {uploadResult && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-1">
              <CheckCircle className="h-4 w-4" /> Amendment applied successfully
            </div>
            <p className="text-xs text-gray-400">
              Fields updated: {uploadResult.changedFields?.join(', ') || 'none detected'}
            </p>
          </div>
        )}

        <button
          onClick={uploadAmendment}
          disabled={!uploadFile || uploading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><Upload className="h-4 w-4" /> Apply Amendment</>}
        </button>
      </div>

      {/* Version Timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          <h2 className="text-base font-semibold text-white">Version History ({versions.length})</h2>
        </div>
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></div>
        ) : versions.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No versions recorded yet.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {versions.map((v, i) => (
              <div key={v.id} className="flex items-start justify-between px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-900/40 border border-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-blue-400 font-bold">{v.version}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{v.changeDescription}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      By {v.changedBy} · {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {i > 0 && (
                  <button
                    onClick={() => revert(v.id)}
                    disabled={reverting === v.id}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50 ml-4 flex-shrink-0"
                  >
                    {reverting === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Revert
                  </button>
                )}
                {i === 0 && <span className="text-xs text-green-400 bg-green-900/20 border border-green-800 px-2 py-0.5 rounded-full ml-4">Current</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
