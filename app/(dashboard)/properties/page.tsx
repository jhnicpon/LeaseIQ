'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2, ChevronDown, ChevronRight, FileText, Loader2,
  MapPin, DollarSign, AlertCircle, Plus, X, MoreHorizontal,
} from 'lucide-react';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  propertyType: string | null; // aliased from property_type in API query
  leaseCount: number;
  totalMonthlyRent: number;
  earliestExpiration: string | null;
}

interface Lease {
  id: string;
  fileName: string;
  propertyAddress: string | null;
  tenantName: string | null;
  expirationDate: string | null;
  monthlyRent: number | null;
  status: string;
  riskScore: number | null;
}

interface PropertyDetail extends Property {
  leases: Lease[];
}

function riskColor(score: number | null) {
  if (score === null) return 'text-gray-500';
  if (score >= 70) return 'text-red-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-green-400';
}

function fmt(n: number | null) {
  if (!n) return '—';
  return '$' + n.toLocaleString();
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function ExpirationBadge({ date }: { date: string | null }) {
  const days = daysUntil(date);
  if (days === null) return <span className="text-gray-600 text-xs">—</span>;
  const color = days <= 30 ? 'text-red-400' : days <= 90 ? 'text-yellow-400' : 'text-gray-400';
  return (
    <span className={`text-xs ${color}`}>
      {date} ({days > 0 ? `${days}d` : 'Expired'})
    </span>
  );
}

function PropertyCard({
  property,
  allProperties,
  onReassign,
}: {
  property: Property;
  allProperties: Property[];
  onReassign: (leaseId: string, propertyId: string | null) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<PropertyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reassigning, setReassigning] = useState<string | null>(null);

  const loadDetail = async () => {
    if (detail) return;
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/properties/${property.id}`);
      const data = await res.json();
      setDetail({ ...data.property, leases: data.leases });
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggle = async () => {
    if (!expanded) await loadDetail();
    setExpanded(e => !e);
  };

  const handleReassign = async (leaseId: string, newPropertyId: string | null) => {
    setReassigning(leaseId);
    try {
      await onReassign(leaseId, newPropertyId);
      // Refresh detail
      const res = await fetch(`/api/properties/${property.id}`);
      const data = await res.json();
      setDetail({ ...data.property, leases: data.leases });
    } finally {
      setReassigning(null);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-gray-800/40 transition-colors"
      >
        <div className="bg-blue-600/20 p-2 rounded-lg flex-shrink-0">
          <Building2 className="h-5 w-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white font-semibold truncate">{property.name}</h3>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded flex-shrink-0">
              {property.leaseCount} {property.leaseCount === 1 ? 'lease' : 'leases'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {(property.city || property.state) && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[property.city, property.state].filter(Boolean).join(', ')}
              </span>
            )}
            {property.propertyType && (
              <span className="text-xs text-gray-500">{property.propertyType}</span>
            )}
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {fmt(property.totalMonthlyRent)}/mo
            </span>
            {property.earliestExpiration && (
              <span className="text-xs text-gray-500">
                Next expiry: <ExpirationBadge date={property.earliestExpiration} />
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
        </div>
      </button>

      {/* Lease list */}
      {expanded && (
        <div className="border-t border-gray-800">
          {loadingDetail ? (
            <div className="p-6 flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading leases…
            </div>
          ) : detail?.leases.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No leases linked to this property.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {detail?.leases.map(lease => (
                <div key={lease.id} className="p-4 flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/leases/${lease.id}`}
                        className="text-sm text-blue-400 hover:text-blue-300 font-medium truncate"
                      >
                        {lease.tenantName || lease.fileName}
                      </Link>
                      {lease.riskScore !== null && (
                        <span className={`text-xs font-medium ${riskColor(lease.riskScore)}`}>
                          Risk {lease.riskScore}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-gray-500">{fmt(lease.monthlyRent)}/mo</span>
                      <ExpirationBadge date={lease.expirationDate} />
                    </div>
                  </div>

                  {/* Reassign dropdown */}
                  <div className="flex-shrink-0 relative">
                    {reassigning === lease.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <select
                        className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={property.id}
                        onChange={e => {
                          const val = e.target.value;
                          handleReassign(lease.id, val === '' ? null : val);
                        }}
                        title="Move to property"
                      >
                        <option value="" disabled>Move to…</option>
                        {allProperties.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        <option value="">Unlink from property</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newType, setNewType] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/properties');
      const data = await res.json();
      setProperties(data.properties ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReassign = async (leaseId: string, propertyId: string | null) => {
    await fetch(`/api/leases/${leaseId}/property`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId }),
    });
    await load(); // refresh counts
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAddress) return;
    setSaving(true);
    try {
      await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, address: newAddress, propertyType: newType || null }),
      });
      setNewName(''); setNewAddress(''); setNewType('');
      setCreating(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const totalRent = properties.reduce((s, p) => s + (p.totalMonthlyRent ?? 0), 0);
  const totalLeases = properties.reduce((s, p) => s + p.leaseCount, 0);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Properties</h1>
          <p className="text-gray-400 mt-1">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} · {totalLeases} leases · {fmt(totalRent)}/mo total
          </p>
        </div>
        <button
          onClick={() => setCreating(c => !c)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {creating ? 'Cancel' : 'New property'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 space-y-3">
          <h3 className="text-white font-semibold mb-3">Add property manually</h3>
          <input
            type="text"
            placeholder="Property name (e.g. Dallas Office Tower)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Full address (e.g. 123 Main St, Dallas TX 75201)"
            value={newAddress}
            onChange={e => setNewAddress(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Property type (optional, e.g. Office, Retail)"
            value={newType}
            onChange={e => setNewType(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create property
          </button>
        </form>
      )}

      {/* Property list */}
      {loading ? (
        <div className="flex items-center gap-3 text-gray-400 py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading properties…</span>
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium text-gray-400">No properties yet</p>
          <p className="text-sm mt-1">Properties are created automatically when you upload a lease.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map(p => (
            <PropertyCard
              key={p.id}
              property={p}
              allProperties={properties}
              onReassign={handleReassign}
            />
          ))}
        </div>
      )}
    </div>
  );
}
