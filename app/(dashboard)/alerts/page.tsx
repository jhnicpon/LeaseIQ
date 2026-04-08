'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDate, getDaysUntil } from '@/lib/dateUtils';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = () => {
    setLoading(true);
    fetch(`/api/alerts?acknowledged=${showAcknowledged}`)
      .then(r => r.json())
      .then(d => { setAlerts(d.alerts || []); setUnreadCount(d.unreadCount || 0); setLoading(false); });
  };

  useEffect(() => { fetchAlerts(); }, [showAcknowledged]);

  const acknowledge = async (alertId: string) => {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId }),
    });
    fetchAlerts();
  };

  const acknowledgeAll = async () => {
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledgeAll: true }),
    });
    fetchAlerts();
  };

  const getAlertColor = (alert: any) => {
    if (alert.alertType.includes('7 days') || alert.alertType.includes('14 days')) return 'border-red-800 bg-red-900/10';
    if (alert.alertType.includes('30 days') || alert.alertType.includes('60 days')) return 'border-orange-800 bg-orange-900/10';
    if (alert.alertType.includes('90 days') || alert.alertType.includes('180 days')) return 'border-yellow-800 bg-yellow-900/10';
    return 'border-gray-800 bg-gray-900/50';
  };

  const getAlertIconColor = (alert: any) => {
    if (alert.alertType.includes('7 days') || alert.alertType.includes('14 days')) return 'text-red-400';
    if (alert.alertType.includes('30 days') || alert.alertType.includes('60 days')) return 'text-orange-400';
    return 'text-yellow-400';
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          {unreadCount > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAcknowledged(s => !s)}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors ${showAcknowledged ? 'border-blue-600 text-blue-400 bg-blue-900/20' : 'border-gray-700 text-gray-400 hover:text-gray-200'}`}
          >
            {showAcknowledged ? 'Showing History' : 'Show History'}
          </button>
          {unreadCount > 0 && (
            <button onClick={acknowledgeAll} className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-700">
              <CheckCheck className="h-4 w-4" /> Acknowledge All
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>
      ) : !alerts.length ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
          <Bell className="h-16 w-16 text-gray-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-400 mb-2">No active alerts</h2>
          <p className="text-gray-600 text-sm">Alerts are generated automatically based on critical dates in your leases.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-xl border ${getAlertColor(alert)} ${alert.acknowledgedAt ? 'opacity-50' : ''}`}>
              <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${getAlertIconColor(alert)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/leases/${alert.leaseId}`} className="text-sm font-semibold text-white hover:text-blue-400">
                      {alert.propertyAddress || alert.fileName}
                    </Link>
                    <p className="text-sm text-gray-300 mt-0.5">{alert.alertType}</p>
                    <p className="text-xs text-gray-500 mt-1">Triggered: {formatDate(alert.triggerDate)}</p>
                  </div>
                  {!alert.acknowledgedAt && (
                    <button onClick={() => acknowledge(alert.id)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-400 px-2 py-1 rounded border border-gray-700 hover:border-green-800 transition-colors flex-shrink-0">
                      <Check className="h-3.5 w-3.5" /> Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
