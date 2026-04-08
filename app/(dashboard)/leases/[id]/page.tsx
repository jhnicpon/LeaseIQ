'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Check, X, RefreshCw, Download, AlertTriangle, Loader2, FileDown, Mail, History, Brain } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/dateUtils';
import { getRiskBadgeClasses } from '@/lib/riskScore';
import RenewalLetterModal from '@/components/ui/RenewalLetterModal';

export default function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [reprocessing, setReprocessing] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  const fetchLease = async () => {
    try {
      const res = await fetch(`/api/leases/${id}`);
      if (!res.ok) throw new Error('Failed to load lease');
      const data = await res.json();
      setLease(data.lease);
      setLoadError('');
    } catch {
      setLoadError('Could not load lease. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLease(); }, [id]);

  const data = lease?.extractedData ? JSON.parse(lease.extractedData) : {};

  const startEdit = (field: string, value: any) => {
    setEditing(field);
    setEditValue(String(value ?? ''));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/leases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData: { [editing]: editValue } }),
      });
      if (!res.ok) throw new Error('Save failed');
      await fetchLease();
      setEditing(null);
    } catch {
      setSaveError('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const reprocess = async () => {
    setReprocessing(true);
    try {
      await fetch(`/api/leases/${id}/reprocess`, { method: 'POST' });
    } catch {
      setReprocessing(false);
      return;
    }
    // Poll until done; store ref so we can clear it if the component unmounts
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/leases/${id}`);
        const d = await res.json();
        if (d.lease?.status !== 'processing') {
          clearInterval(poll);
          setLease(d.lease);
          setReprocessing(false);
        }
      } catch {
        clearInterval(poll);
        setReprocessing(false);
      }
    }, 3000);
    // Return a cleanup via a module-level ref isn't possible in this pattern;
    // use a flag so the component tracks the poll ID
    (window as any).__leaseReprocessPoll = poll;
  };

  // Clear any in-flight reprocess poll on unmount
  useEffect(() => {
    return () => {
      const poll = (window as any).__leaseReprocessPoll;
      if (poll) { clearInterval(poll); delete (window as any).__leaseReprocessPoll; }
    };
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>;
  if (loadError) return (
    <div className="p-8">
      <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-red-400 font-medium">{loadError}</p>
          <button onClick={fetchLease} className="text-sm text-red-300 underline mt-1">Try again</button>
        </div>
      </div>
    </div>
  );
  if (!lease) return <div className="p-8"><p className="text-gray-400">Lease not found.</p></div>;

  const EditableField = ({ field, label, value, type = 'text' }: { field: string; label: string; value: any; type?: string }) => {
    const displayValue = type === 'currency' ? formatCurrency(Number(value)) : type === 'date' ? formatDate(String(value || '')) : String(value ?? 'N/A');
    const isFlagged = data.flaggedFields?.includes(field);

    return (
      <div className={`p-4 rounded-lg border ${isFlagged ? 'border-yellow-800 bg-yellow-900/10' : 'border-gray-800 bg-gray-800/30'}`}>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
          <div className="flex items-center gap-1">
            {isFlagged && <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />}
            {editing === field ? (
              <>
                <button onClick={saveEdit} disabled={saving} className="p-1 text-green-400 hover:text-green-300">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:text-gray-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button onClick={() => startEdit(field, value)} className="p-1 text-gray-500 hover:text-gray-300">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {editing === field ? (
          <input
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <p className={`text-sm font-medium ${value ? 'text-white' : 'text-gray-500'}`}>{displayValue || 'Not specified'}</p>
        )}
      </div>
    );
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
      <h2 className="text-base font-semibold text-white mb-4 pb-3 border-b border-gray-800">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );

  const confidence = data.confidenceScore || 0;
  const confidenceColor = confidence >= 90 ? 'text-green-400' : confidence >= 70 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leases" className="text-gray-400 hover:text-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{data.propertyAddress || lease.fileName}</h1>
            <p className="text-gray-400 text-sm">{data.tenantName && `${data.tenantName} • `}{data.propertyType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Risk Score Badge */}
          {(lease.riskScore !== null && lease.riskScore !== undefined) && (() => {
            const score = lease.riskScore as number;
            const label = score <= 40 ? 'HIGH RISK' : score <= 70 ? 'MEDIUM RISK' : 'LOW RISK';
            const color = score <= 40 ? 'red' : score <= 70 ? 'yellow' : 'green';
            return (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold ${getRiskBadgeClasses(color)}`}>
                {score} · {label}
              </div>
            );
          })()}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${confidence >= 90 ? 'border-green-800 bg-green-900/20' : confidence >= 70 ? 'border-yellow-800 bg-yellow-900/20' : 'border-red-800 bg-red-900/20'}`}>
            <span className="text-xs text-gray-400">Confidence</span>
            <span className={`text-sm font-bold ${confidenceColor}`}>{confidence}%</span>
          </div>
          {data.renewalOptions && data.renewalOptions.trim() !== '' && data.renewalOptions.toLowerCase() !== 'none' && (
            <button
              onClick={() => setShowRenewalModal(true)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm border border-gray-700"
            >
              <Mail className="h-4 w-4" />
              Renewal Notice
            </button>
          )}
          <Link
            href={`/leases/${id}/analyze`}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Brain className="h-4 w-4" />
            AI Analyst
          </Link>
          <Link
            href={`/leases/${id}/history`}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm border border-gray-700"
          >
            <History className="h-4 w-4" />
            History
          </Link>
          <button
            onClick={reprocess}
            disabled={reprocessing || lease.status === 'processing'}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm border border-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${reprocessing ? 'animate-spin' : ''}`} />
            Re-extract
          </button>
          <a
            href={`/api/leases/${id}/abstract`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
          >
            <FileDown className="h-4 w-4" />
            Download Abstract
          </a>
          <a
            href={`/api/leases/${id}/export`}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm border border-gray-700"
          >
            <Download className="h-4 w-4" />
            Export
          </a>
        </div>
      </div>

      {data.flaggedFields?.length > 0 && (
        <div className="bg-yellow-900/10 border border-yellow-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">Fields Requiring Review</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.flaggedFields.map((f: string) => (
              <span key={f} className="text-xs bg-yellow-900/20 border border-yellow-800 text-yellow-300 px-2 py-1 rounded">
                {f}
              </span>
            ))}
          </div>
          {data.extractionNotes && <p className="text-xs text-gray-400 mt-2">{data.extractionNotes}</p>}
        </div>
      )}

      {saveError && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{saveError}</p>
        </div>
      )}

      {reprocessing && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          <p className="text-sm text-blue-300">Re-extracting lease data with Claude AI...</p>
        </div>
      )}

      <Section title="Parties">
        <EditableField field="tenantName" label="Tenant Name" value={data.tenantName} />
        <EditableField field="landlordName" label="Landlord Name" value={data.landlordName} />
        <EditableField field="guarantor" label="Guarantor" value={data.guarantor} />
        <EditableField field="personalGuaranty" label="Personal Guaranty" value={data.personalGuaranty} />
      </Section>

      <Section title="Property">
        <EditableField field="propertyAddress" label="Property Address" value={data.propertyAddress} />
        <EditableField field="propertyType" label="Property Type" value={data.propertyType} />
        <EditableField field="permittedUse" label="Permitted Use" value={data.permittedUse} />
        <EditableField field="exclusivityClause" label="Exclusivity Clause" value={data.exclusivityClause} />
      </Section>

      <Section title="Financial Terms">
        <EditableField field="baseRentMonthly" label="Monthly Base Rent" value={data.baseRentMonthly} type="currency" />
        <EditableField field="baseRentAnnual" label="Annual Base Rent" value={data.baseRentAnnual} type="currency" />
        <EditableField field="rentEscalationDescription" label="Rent Escalation" value={data.rentEscalationDescription} />
        <EditableField field="rentEscalationPercentage" label="Escalation %" value={data.rentEscalationPercentage} />
        <EditableField field="securityDeposit" label="Security Deposit" value={data.securityDeposit} type="currency" />
        <EditableField field="tenantImprovementAllowance" label="TI Allowance" value={data.tenantImprovementAllowance} type="currency" />
        <EditableField field="camCharges" label="CAM Charges" value={data.camCharges} />
        <EditableField field="operatingExpenses" label="Operating Expenses" value={data.operatingExpenses} />
        <EditableField field="freeRentPeriod" label="Free Rent Period" value={data.freeRentPeriod} />
      </Section>

      <Section title="Critical Dates">
        <EditableField field="leaseCommencementDate" label="Commencement Date" value={data.leaseCommencementDate} type="date" />
        <EditableField field="leaseExpirationDate" label="Expiration Date" value={data.leaseExpirationDate} type="date" />
        <EditableField field="leaseTermMonths" label="Lease Term (Months)" value={data.leaseTermMonths} />
        <EditableField field="renewalOptionDeadline" label="Renewal Option Deadline" value={data.renewalOptionDeadline} type="date" />
        <EditableField field="terminationOptionDate" label="Termination Option Date" value={data.terminationOptionDate} type="date" />
      </Section>

      <Section title="Rights & Options">
        <EditableField field="renewalOptions" label="Renewal Options" value={data.renewalOptions} />
        <EditableField field="terminationOption" label="Termination Option" value={data.terminationOption} />
        <EditableField field="expansionRights" label="Expansion Rights" value={data.expansionRights} />
        <EditableField field="rightOfFirstRefusal" label="Right of First Refusal" value={data.rightOfFirstRefusal} />
        <EditableField field="subleaseRights" label="Sublease Rights" value={data.subleaseRights} />
        <EditableField field="assignmentRights" label="Assignment Rights" value={data.assignmentRights} />
      </Section>

      <Section title="Parking & Notices">
        <EditableField field="parkingSpaces" label="Parking Spaces" value={data.parkingSpaces} />
        <EditableField field="parkingCost" label="Parking Cost" value={data.parkingCost} />
        <EditableField field="tenantNoticeAddress" label="Tenant Notice Address" value={data.tenantNoticeAddress} />
        <EditableField field="landlordNoticeAddress" label="Landlord Notice Address" value={data.landlordNoticeAddress} />
      </Section>

      {/* Risk Score Breakdown */}
      {lease.riskFactors && (() => {
        const factors = JSON.parse(lease.riskFactors) as Array<{ label: string; points: number; category: string }>;
        const score = lease.riskScore as number;
        const label = score <= 40 ? 'HIGH RISK' : score <= 70 ? 'MEDIUM RISK' : 'LOW RISK';
        const color = score <= 40 ? 'red' : score <= 70 ? 'yellow' : 'green';
        return (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-base font-semibold text-white mb-4 pb-3 border-b border-gray-800">Risk Score Breakdown</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-3xl font-bold px-4 py-2 rounded-lg border ${getRiskBadgeClasses(color)}`}>
                {score}
              </div>
              <div>
                <p className={`font-semibold text-lg ${color === 'red' ? 'text-red-400' : color === 'yellow' ? 'text-yellow-400' : 'text-green-400'}`}>{label}</p>
                <p className="text-gray-400 text-sm">Starting from 100, adjusted by {factors.length} factor{factors.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="space-y-2">
              {factors.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <span className="text-sm text-gray-300">{f.label}</span>
                  <span className={`text-sm font-semibold ${f.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {f.points > 0 ? '+' : ''}{f.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {showRenewalModal && (
        <RenewalLetterModal leaseData={data} onClose={() => setShowRenewalModal(false)} />
      )}
    </div>
  );
}
