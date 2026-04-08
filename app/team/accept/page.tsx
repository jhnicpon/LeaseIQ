'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function AcceptContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('Invalid invite link.'); return; }
    fetch('/api/team/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(r => r.json()).then(d => {
      if (d.success) {
        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setStatus('error');
        setMsg(d.error || 'Failed to accept invitation.');
      }
    }).catch(() => { setStatus('error'); setMsg('Something went wrong.'); });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-blue-600 p-2 rounded-lg"><Building2 className="h-6 w-6 text-white" /></div>
          <span className="text-xl font-bold text-white">LeaseIQ</span>
        </div>
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Accepting your invitation...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-white font-semibold text-lg mb-2">Welcome to the team!</h2>
            <p className="text-gray-400 text-sm">Redirecting to your dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-white font-semibold text-lg mb-2">Invitation error</h2>
            <p className="text-gray-400 text-sm mb-4">{msg}</p>
            <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300 text-sm">Sign in →</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}>
      <AcceptContent />
    </Suspense>
  );
}
