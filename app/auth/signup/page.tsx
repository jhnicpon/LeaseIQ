'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Loader2, CheckCircle, XCircle, Tag } from 'lucide-react';

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: '', color: '', width: '0%' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
  if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '50%' };
  if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: '75%' };
  return { label: 'Strong', color: 'bg-green-500', width: '100%' };
}

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [promoStatus, setPromoStatus] = useState<'idle' | 'valid' | 'invalid' | 'checking'>('idle');
  const [promoMessage, setPromoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const strength = getPasswordStrength(password);
  const promoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validatePromo = (code: string) => {
    if (promoDebounceRef.current) clearTimeout(promoDebounceRef.current);
    if (!code.trim()) {
      setPromoStatus('idle');
      setPromoMessage('');
      return;
    }
    setPromoStatus('checking');
    promoDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/promo?code=${encodeURIComponent(code.trim())}`);
        const data = await res.json();
        if (data.valid) {
          setPromoStatus('valid');
          setPromoMessage(data.message || 'Promo code applied!');
        } else {
          setPromoStatus('invalid');
          setPromoMessage('Invalid promo code');
        }
      } catch {
        setPromoStatus('invalid');
        setPromoMessage('Could not validate code. Try again.');
      }
    }, 500);
  };

  const handlePromoChange = (val: string) => {
    setPromoCode(val);
    validatePromo(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // If they typed a promo code and it's still invalid, block
    if (promoCode.trim() && promoStatus === 'invalid') {
      setError('Please enter a valid promo code or leave it blank.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed');
      } else {
        const qs = data.promoApplied ? '?registered=true&promo=true' : '?registered=true';
        router.push(`/auth/signin${qs}`);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">LeaseIQ</span>
          </div>
          <p className="text-gray-400">Commercial Real Estate Intelligence Platform</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Create your account</h2>

          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Full name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="At least 8 characters"
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p className="text-xs mt-1 text-gray-500">
                    Password strength: <span className={
                      strength.label === 'Strong' ? 'text-green-400' :
                      strength.label === 'Good' ? 'text-yellow-400' :
                      strength.label === 'Fair' ? 'text-orange-400' : 'text-red-400'
                    }>{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Promo code toggle */}
            {!showPromo ? (
              <button
                type="button"
                onClick={() => setShowPromo(true)}
                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Tag className="h-3.5 w-3.5" />
                Have a promo code?
              </button>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Promo Code (optional)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={e => handlePromoChange(e.target.value)}
                    className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 pr-10 transition-colors ${
                      promoStatus === 'valid'
                        ? 'border-green-600 focus:ring-green-500'
                        : promoStatus === 'invalid'
                        ? 'border-red-700 focus:ring-red-500'
                        : 'border-gray-700 focus:ring-blue-500'
                    }`}
                    placeholder="Enter promo code"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {promoStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                    {promoStatus === 'valid' && <CheckCircle className="h-4 w-4 text-green-400" />}
                    {promoStatus === 'invalid' && <XCircle className="h-4 w-4 text-red-400" />}
                  </div>
                </div>
                {promoStatus === 'valid' && (
                  <div className="mt-2 flex items-center gap-2 bg-green-900/20 border border-green-800 text-green-400 rounded-lg px-3 py-2 text-sm">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    {promoMessage}
                  </div>
                )}
                {promoStatus === 'invalid' && promoCode.trim() && (
                  <p className="mt-1 text-xs text-red-400">{promoMessage}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
