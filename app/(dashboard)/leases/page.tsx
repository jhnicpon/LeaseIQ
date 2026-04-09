'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Download, Plus, ChevronUp, ChevronDown, Loader2, FileText, GitCompare, Upload, AlertTriangle, RefreshCw, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { formatDate, formatCurrency, getDaysUntil } from '@/lib/dateUtils';
import { getRiskBadgeClasses } from '@/lib/riskScore';

export default function LeasesPage() {
  const router = useRouter();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('uploadedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeases = async (searchVal?: string) => {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams({ sort, order });
      const q = searchVal !== undefined ? searchVal : search;
      if (q) params.set('search', q);
      const res = await fetch(`/api/leases?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeases(data.leases || []);
    } catch {
      setFetchError('Could not load leases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeases(); }, [sort, order]);

  // Debounced search — fires 350ms after the user stops typing
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLeases(val), 350);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchLeases(); };

  const toggleSort = (col: string) => {
    if (sort === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder('asc'); }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelected(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const compareSelected = () => {
    router.push(`/compare?ids=${[...selected].join(',')}`);
  };

  const getMarketBadge = (position: string | null | undefined) => {
    switch (position) {
      case 'below_market':
        return { label: 'Below Market', color: 'text-green-400 bg-green-900/20 border-green-800', Icon: TrendingDown };
      case 'at_market':
        return { label: 'At Market', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-800', Icon: Minus };
      case 'above_market':
        return { label: 'Above Market', color: 'text-red-400 bg-red-900/20 border-red-800', Icon: TrendingUp };
      default:
        return null;
    }
  };

  const getRiskLabel = (lease: any) => {
    if (!lease.riskScore && lease.riskScore !== 0) return null;
    const score = lease.riskScore as number;
    const label = score <= 40 ? 'HIGH RISK' : score <= 70 ? 'MEDIUM RISK' : 'LOW RISK';
    const color = score <= 40 ? 'red' : score <= 70 ? 'yellow' : 'green';
    return { label, color, score };
  };

  const getStatusConfig = (lease: any) => {
    const days = getDaysUntil(lease.expirationDate);
    if (lease.status !== 'completed') return { label: lease.status, color: 'text-gray-400 bg-gray-800 border-gray-700' };
    if (days < 0) return { label: 'Expired', color: 'text-gray-400 bg-gray-800 border-gray-700' };
    if (days <= 30) return { label: 'Critical', color: 'text-red-400 bg-red-900/20 border-red-800' };
    if (days <= 90) return { label: 'Expiring Soon', color: 'text-orange-400 bg-orange-900/20 border-orange-800' };
    return { label: 'Active', color: 'text-green-400 bg-green-900/20 border-green-800' };
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return null;
    return order === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white">All Leases</h1>
        <div className="flex items-center gap-2">
          {selected.size >= 2 && (
            <button
              onClick={compareSelected}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
            >
              <GitCompare className="h-4 w-4" /> Compare Selected ({selected.size})
            </button>
          )}
          <Link
            href="/leases/bulk-upload"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm border border-gray-700"
          >
            <Upload className="h-4 w-4" /> Bulk Upload
          </Link>
          <Link
            href="/leases/upload"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            <Plus className="h-4 w-4" /> Add Lease
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search leases by address, tenant..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </form>
        <a
          href="/api/leases?format=excel"
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm border border-gray-700"
        >
          <Download className="h-4 w-4" /> Export
        </a>
      </div>

      {selected.size > 0 && selected.size < 2 && (
        <p className="text-xs text-gray-500 mb-3">Select 1 more lease to enable comparison.</p>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-4 py-3 w-8"></th>
                {[
                  { col: 'propertyAddress', label: 'Property' },
                  { col: 'tenantName', label: 'Tenant' },
                  { col: 'expirationDate', label: 'Expiration' },
                  { col: 'monthlyRent', label: 'Monthly Rent' },
                ].map(({ col, label }) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200"
                  >
                    <span className="flex items-center gap-1">{label}<SortIcon col={col} /></span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Days Left</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Market</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                    <p className="text-gray-400 mb-3">{fetchError}</p>
                    <button onClick={() => fetchLeases()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium mx-auto">
                      <RefreshCw className="h-4 w-4" /> Retry
                    </button>
                  </td>
                </tr>
              ) : !leases.length ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <FileText className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500">No leases found</p>
                    <Link href="/leases/upload" className="text-blue-400 hover:text-blue-300 text-sm mt-1 inline-block">Upload your first lease</Link>
                  </td>
                </tr>
              ) : leases.map((lease) => {
                const { label, color } = getStatusConfig(lease);
                const days = getDaysUntil(lease.expirationDate);
                const risk = getRiskLabel(lease);
                const market = getMarketBadge(lease.marketPosition);
                const isSelected = selected.has(lease.id);
                return (
                  <tr
                    key={lease.id}
                    onClick={() => router.push(`/leases/${lease.id}`)}
                    className={`hover:bg-gray-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/10' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={e => toggleSelect(e, lease.id)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{lease.propertyAddress || lease.fileName}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{lease.tenantName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(lease.expirationDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{lease.monthlyRent ? formatCurrency(lease.monthlyRent) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {lease.expirationDate ? (days < 0 ? 'Expired' : `${days}d`) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {market ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 w-fit ${market.color}`}>
                          <market.Icon className="h-3 w-3" />
                          {market.label}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {risk ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRiskBadgeClasses(risk.color)}`}>
                          {risk.score} · {risk.label}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
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
