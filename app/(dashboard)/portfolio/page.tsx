'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, FileSpreadsheet, Plus, Loader2, Building2, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { formatDate, formatCurrency, getDaysUntil, getUrgencyColor } from '@/lib/dateUtils';

export default function PortfolioPage() {
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/leases')
      .then(r => r.json())
      .then(d => { setLeases(d.leases || []); setLoading(false); });
  }, []);

  const completed = leases.filter(l => l.status === 'completed');
  const totalRent = completed.reduce((s, l) => s + (l.monthlyRent || 0), 0);
  const avgRent = completed.length ? totalRent / completed.length : 0;

  const toggleSelect = (id: string) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Portfolio Overview</h1>
        <div className="flex gap-3">
          {selected.length >= 2 && (
            <Link
              href={`/compare?ids=${selected.join(',')}`}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm"
            >
              Compare ({selected.length})
            </Link>
          )}
          <a href="/api/leases?format=csv" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm border border-gray-700">
            <Download className="h-4 w-4" /> CSV
          </a>
          <a href="/api/leases?format=excel" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm border border-gray-700">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </a>
          <Link href="/leases/upload" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="h-4 w-4" /> Add Lease
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Properties', value: completed.length, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-900/20' },
          { label: 'Total Monthly Rent', value: formatCurrency(totalRent), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-900/20' },
          { label: 'Avg Monthly Rent', value: formatCurrency(avgRent), icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-900/20' },
          { label: 'Expiring in 90d', value: completed.filter(l => { const d = getDaysUntil(l.expirationDate); return d >= 0 && d <= 90; }).length, icon: Calendar, color: 'text-orange-400', bg: 'bg-orange-900/20' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">{s.label}</span>
              <div className={`${s.bg} p-1.5 rounded`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">
                  <input
                    type="checkbox"
                    onChange={e => setSelected(e.target.checked ? completed.map(l => l.id) : [])}
                    checked={selected.length === completed.length && completed.length > 0}
                    className="accent-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Property</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Tenant</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Commencement</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Expiration</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Monthly Rent</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Days Left</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Renewal Deadline</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : !completed.length ? (
                <tr><td colSpan={9} className="py-16 text-center">
                  <Building2 className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">No completed leases yet</p>
                </td></tr>
              ) : completed.map(lease => {
                const extractedData = lease.extractedData ? JSON.parse(lease.extractedData) : {};
                const days = getDaysUntil(lease.expirationDate);
                const urgencyColor = days >= 0 ? getUrgencyColor(days) : 'text-gray-400 bg-gray-800 border-gray-700';
                const statusLabel = days < 0 ? 'Expired' : days <= 30 ? 'Critical' : days <= 90 ? 'Expiring Soon' : 'Active';
                return (
                  <tr key={lease.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(lease.id)} onChange={() => toggleSelect(lease.id)} className="accent-blue-500" />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/leases/${lease.id}`} className="text-sm font-medium text-white hover:text-blue-400">
                        {lease.propertyAddress || lease.fileName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{lease.tenantName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{extractedData.leaseCommencementDate ? formatDate(extractedData.leaseCommencementDate) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(lease.expirationDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{lease.monthlyRent ? formatCurrency(lease.monthlyRent) : '—'}</td>
                    <td className="px-4 py-3">
                      {lease.expirationDate ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${urgencyColor}`}>
                          {days < 0 ? 'Expired' : `${days}d`}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{extractedData.renewalOptionDeadline ? formatDate(extractedData.renewalOptionDeadline) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${urgencyColor}`}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
