'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { ArrowLeft, Upload, File, X, CheckCircle, XCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

type FileStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error';

interface QueueItem {
  id: string;
  file: File;
  status: FileStatus;
  leaseId?: string;
  error?: string;
  progress?: number;
}

const MAX_CONCURRENT = 3;

export default function BulkUploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: QueueItem[] = accepted.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      status: 'queued',
    }));
    setQueue(q => [...q, ...newItems]);
    setDone(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
    onDropRejected: rejections => {
      alert(`${rejections.length} file(s) rejected (PDF only, max 50MB each)`);
    },
  });

  const removeItem = (id: string) => {
    setQueue(q => q.filter(i => i.status === 'queued' && i.id !== id ? true : i.id !== id || i.status !== 'queued'));
  };

  const updateItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue(q => q.map(i => i.id === id ? { ...i, ...patch } : i));

  const processOne = async (item: QueueItem): Promise<void> => {
    updateItem(item.id, { status: 'uploading' });
    const fd = new FormData();
    fd.append('file', item.file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { updateItem(item.id, { status: 'error', error: data.error || 'Upload failed' }); return; }

      const leaseId = data.leaseId;
      updateItem(item.id, { status: 'processing', leaseId });

      // Poll until done
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise(r => setTimeout(r, 3000));
        const poll = await fetch(`/api/leases/${leaseId}`);
        const pollData = await poll.json();
        const status = pollData.lease?.status;
        if (status === 'completed') { updateItem(item.id, { status: 'done' }); return; }
        if (status === 'error') { updateItem(item.id, { status: 'error', error: 'Processing failed' }); return; }
      }
      updateItem(item.id, { status: 'error', error: 'Timed out' });
    } catch {
      updateItem(item.id, { status: 'error', error: 'Network error' });
    }
  };

  const startAll = async () => {
    const queued = queue.filter(i => i.status === 'queued');
    if (!queued.length) return;
    setRunning(true);

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < queued.length; i += MAX_CONCURRENT) {
      const batch = queued.slice(i, i + MAX_CONCURRENT);
      await Promise.all(batch.map(processOne));
    }

    setRunning(false);
    setDone(true);
  };

  const statusIcon = (s: FileStatus) => {
    if (s === 'queued') return <File className="h-4 w-4 text-gray-400" />;
    if (s === 'uploading') return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
    if (s === 'processing') return <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />;
    if (s === 'done') return <CheckCircle className="h-4 w-4 text-green-400" />;
    return <XCircle className="h-4 w-4 text-red-400" />;
  };

  const statusLabel = (s: FileStatus) => {
    if (s === 'queued') return 'Queued';
    if (s === 'uploading') return 'Uploading…';
    if (s === 'processing') return 'AI extracting…';
    if (s === 'done') return 'Complete';
    return 'Error';
  };

  const counts = {
    total: queue.length,
    done: queue.filter(i => i.status === 'done').length,
    error: queue.filter(i => i.status === 'error').length,
    queued: queue.filter(i => i.status === 'queued').length,
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/leases" className="text-gray-400 hover:text-gray-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Bulk Upload</h1>
          <p className="text-gray-400 text-sm">Upload and process multiple lease PDFs at once (up to {MAX_CONCURRENT} at a time)</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-6 ${
          isDragActive ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-gray-500 mx-auto mb-3" />
        {isDragActive ? (
          <p className="text-blue-400 font-medium">Drop PDFs here</p>
        ) : (
          <>
            <p className="text-gray-300 font-medium">Drag & drop lease PDFs here</p>
            <p className="text-gray-500 text-sm mt-1">or click to browse — multiple files accepted</p>
            <p className="text-gray-600 text-xs mt-3">PDF only · Max 50MB per file</p>
          </>
        )}
      </div>

      {/* Progress summary */}
      {queue.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-gray-400">{counts.total} files</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-400">{counts.done} done</span>
              {counts.error > 0 && <span className="text-red-400">{counts.error} failed</span>}
              <span className="text-gray-400">{counts.queued} queued</span>
            </div>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${counts.total ? ((counts.done + counts.error) / counts.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* File queue */}
      {queue.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
          <div className="divide-y divide-gray-800">
            {queue.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-shrink-0">{statusIcon(item.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.file.name}</p>
                  <p className={`text-xs mt-0.5 ${
                    item.status === 'error' ? 'text-red-400' :
                    item.status === 'done' ? 'text-green-400' :
                    item.status === 'processing' ? 'text-yellow-400' :
                    item.status === 'uploading' ? 'text-blue-400' :
                    'text-gray-500'
                  }`}>
                    {item.error ? item.error : statusLabel(item.status)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-600">{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
                  {item.status === 'done' && item.leaseId && (
                    <Link href={`/leases/${item.leaseId}`} className="text-blue-400 hover:text-blue-300">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {item.status === 'queued' && (
                    <button onClick={() => removeItem(item.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 mb-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-300">
            Bulk upload complete — {counts.done} succeeded, {counts.error} failed.{' '}
            <Link href="/leases" className="underline hover:no-underline">View all leases →</Link>
          </p>
        </div>
      )}

      {counts.error > 0 && !running && (
        <div className="flex items-center gap-2 text-sm text-red-400 mb-4">
          <AlertCircle className="h-4 w-4" />
          {counts.error} file(s) failed. Check that they are valid lease PDFs and try again.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={startAll}
          disabled={running || counts.queued === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {running ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Processing {counts.total - counts.queued}/{counts.total}…</>
          ) : (
            <><Upload className="h-4 w-4" /> Start Processing {counts.queued} File{counts.queued !== 1 ? 's' : ''}</>
          )}
        </button>
        {!running && queue.some(i => i.status === 'queued') && (
          <button
            onClick={() => setQueue(q => q.filter(i => i.status !== 'queued'))}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear queue
          </button>
        )}
      </div>
    </div>
  );
}
