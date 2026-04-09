'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Loader2, AlertTriangle, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/dateUtils';

export default function CityBenchmarkPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = use(params);
  const cityDecoded = decodeURIComponent(city);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/benchmarks/${city}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load city data.'); setLoading(false); });
  }, [city]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.insufficient || data.leaseCount === 0) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/leases" className="text-gray-400 hover:text-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">{cityDecoded} Lease Benchmarks</h1>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium mb-1">Not enough data for {cityDecoded} yet.</p>
          <p className="text-gray-500 text-sm">Benchmarks improve as more leases are added to this city.</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );

  const typeEntries = Object.entries(data.avgRentByPropertyType || {}) as [string, number][];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/leases" className="text-gray-400 hover:text-gray-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            {cityDecoded} Lease Benchmarks
          </h1>
          <p className="text-gray-400 text-sm">
            Aggregate statistics from {data.leaseCount} lease{data.leaseCount !== 1 ? 's' : ''} in this city
          </p>
        </div>
      </div>

      {/* Privacy note */}
      <div className="bg-blue-900/10 border border-blue-800/50 rounded-lg p-3 mb-6 text-xs text-blue-300">
        All data is anonymized. Individual lease details and company information are never disclosed.
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Avg Monthly Rent"
          value={data.avgMonthlyRent != null ? formatCurrency(data.avgMonthlyRent) : 'N/A'}
          sub="per month"
        />
        <StatCard
          label="Avg Lease Term"
          value={data.avgLeaseTermMonths != null ? `${data.avgLeaseTermMonths} mo` : 'N/A'}
          sub={data.avgLeaseTermMonths ? `≈ ${(data.avgLeaseTermMonths / 12).toFixed(1)} years` : undefined}
        />
        <StatCard
          label="Avg Security Deposit"
          value={data.avgSecurityDeposit != null ? formatCurrency(data.avgSecurityDeposit) : 'N/A'}
        />
        <StatCard
          label="Avg Rent Escalation"
          value={data.avgRentEscalationPct != null ? `${data.avgRentEscalationPct}%` : 'N/A'}
          sub="per year"
        />
        <StatCard
          label="Avg CAM Charges"
          value={data.avgCamCharges != null ? formatCurrency(data.avgCamCharges) : 'N/A'}
          sub="per month"
        />
        <StatCard
          label="Leases in Database"
          value={String(data.leaseCount)}
          sub="for this city"
        />
      </div>

      {/* Avg rent by property type */}
      {typeEntries.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4 pb-3 border-b border-gray-800 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-400" />
            Average Monthly Rent by Property Type
          </h2>
          <div className="space-y-3">
            {typeEntries
              .sort(([, a], [, b]) => b - a)
              .map(([type, rentVal]) => {
                const maxRent = Math.max(...typeEntries.map(([, v]) => v));
                const barWidth = maxRent > 0 ? (rentVal / maxRent) * 100 : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{type}</span>
                      <span className="text-sm font-semibold text-white">{formatCurrency(rentVal)}/mo</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
