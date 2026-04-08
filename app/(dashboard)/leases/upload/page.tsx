'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { Upload, File, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState('');
  const [leaseId, setLeaseId] = useState('');

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0];
      if (err?.code === 'file-too-large') setError('File too large (max 50MB)');
      else if (err?.code === 'file-invalid-type') setError('Only PDF files are accepted');
      else setError('File rejected');
    },
  });

  const handleUpload = async () => {
    if (!file) return;

    setState('uploading');
    setError('');

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

      setLeaseId(data.leaseId);
      setState('processing');

      // Poll for completion
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const statusRes = await fetch(`/api/leases/${data.leaseId}`);
        const statusData = await statusRes.json();

        if (statusData.lease?.status === 'completed') {
          clearInterval(poll);
          setState('success');
          setTimeout(() => router.push(`/leases/${data.leaseId}`), 1500);
        } else if (statusData.lease?.status === 'error' || attempts > 60) {
          clearInterval(poll);
          setError('Processing failed. Please try again.');
          setState('error');
        }
      }, 3000);
    } catch {
      setError('Upload failed. Please check your connection.');
      setState('error');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Upload Lease Document</h1>
      <p className="text-gray-400 mb-8">Upload a PDF lease document to extract and analyze all key terms automatically.</p>

      {state === 'processing' && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">Analyzing your lease document...</p>
          <p className="text-gray-400 mt-2">Claude AI is extracting all critical terms. This typically takes 30-60 seconds.</p>
        </div>
      )}

      {state === 'success' && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">Extraction complete!</p>
          <p className="text-gray-400 mt-2">Redirecting to lease details...</p>
        </div>
      )}

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
              <p className="text-blue-400 font-medium">Drop your PDF here</p>
            ) : (
              <>
                <p className="text-gray-300 font-medium">Drag & drop your lease PDF here</p>
                <p className="text-gray-500 text-sm mt-1">or click to browse files</p>
                <p className="text-gray-600 text-xs mt-4">PDF files only, max 50MB</p>
              </>
            )}
          </div>

          {file && (
            <div className="mt-4 flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg p-4">
              <File className="h-8 w-8 text-blue-400 flex-shrink-0" />
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
            <div className="mt-4 flex items-center gap-2 bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || state === 'uploading'}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {state === 'uploading' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="h-4 w-4" /> Extract Lease Terms</>
            )}
          </button>
        </>
      )}
    </div>
  );
}
