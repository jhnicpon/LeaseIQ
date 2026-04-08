'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText, DollarSign, AlertTriangle, Clock, Upload,
  Bell, ChevronRight, Building2, Loader2, RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate, getDaysUntil, getUrgencyColor } from '@/lib/dateUtils';
import OnboardingChecklist from '@/components/ui/OnboardingChecklist';

interface DashboardData {
  totalLeases: number;
  totalMonthlyRent: number;
  criticalDeadlines: number;
  expiringThisYear: number;
  urgentAlerts: any[];
  recentLeases: any[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load dashboard. Please refresh.'); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium mx-auto"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Leases',
      value: data?.totalLeases || 0,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-900/20',
    },
    {
      label: 'Monthly Rent Exposure',
      value: formatCurrency(data?.totalMonthlyRent || 0),
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-900/20',
    },
    {
      label: 'Critical Deadlines (90d)',
      value: data?.criticalDeadlines || 0,
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-900/20',
    },
    {
      label: 'Expiring This Year',
      value: data?.expiringThisYear || 0,
      icon: Clock,
      color: 'text-orange-400',
      bg: 'bg-orange-900/20',
    },
  ];

  return (
    <div className="p-8">
      <OnboardingChecklist />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Dashboard</h1>
          <p className="text-gray-400 mt-1">Overview of your commercial lease portfolio</p>
        </div>
        <Link
          href="/leases/upload"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Lease
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400">{stat.label}</span>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Urgent Deadlines */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Urgent Deadlines</h2>
            <Link href="/alerts" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {!data?.urgentAlerts?.length ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No urgent deadlines</p>
              <p className="text-gray-600 text-sm">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.urgentAlerts.map((alert: any) => {
                const days = getDaysUntil(alert.triggerDate);
                const colorClass = getUrgencyColor(days);
                return (
                  <Link
                    key={alert.id}
                    href={`/leases/${alert.leaseId}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                  >
                    <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${days <= 30 ? 'text-red-400' : days <= 90 ? 'text-orange-400' : 'text-yellow-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{alert.propertyAddress || alert.fileName}</p>
                      <p className="text-xs text-gray-400 truncate">{alert.alertType}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass} flex-shrink-0`}>
                      {days <= 0 ? 'Overdue' : `${days}d`}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Link href="/leases" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {!data?.recentLeases?.length ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No leases yet</p>
              <Link href="/leases/upload" className="text-sm text-blue-400 hover:text-blue-300 mt-1 inline-block">
                Upload your first lease
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentLeases.map((lease: any) => (
                <Link
                  key={lease.id}
                  href={`/leases/${lease.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    lease.status === 'completed' ? 'bg-green-400' :
                    lease.status === 'processing' ? 'bg-yellow-400' :
                    lease.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {lease.propertyAddress || lease.fileName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {lease.tenantName && `${lease.tenantName} • `}{formatDate(lease.uploadedAt)}
                    </p>
                  </div>
                  <StatusBadge status={lease.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, string> = {
    completed: 'text-green-400 bg-green-900/20 border-green-800',
    processing: 'text-yellow-400 bg-yellow-900/20 border-yellow-800',
    error: 'text-red-400 bg-red-900/20 border-red-800',
    pending: 'text-gray-400 bg-gray-800 border-gray-700',
  };
  const labels: Record<string, string> = { completed: 'Done', processing: 'Processing', error: 'Error', pending: 'Pending' };
  const cfg = configs[status] || configs.pending;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg} flex-shrink-0`}>
      {labels[status] || status}
    </span>
  );
}
