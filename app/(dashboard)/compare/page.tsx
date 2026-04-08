'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, GitCompare, Download } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/dateUtils';
import Link from 'next/link';

const COMPARE_FIELDS = [
  { key: 'tenantName', label: 'Tenant' },
  { key: 'landlordName', label: 'Landlord' },
  { key: 'propertyAddress', label: 'Property Address' },
  { key: 'propertyType', label: 'Property Type' },
  { key: 'leaseCommencementDate', label: 'Commencement', type: 'date' },
  { key: 'leaseExpirationDate', label: 'Expiration', type: 'date' },
  { key: 'leaseTermMonths', label: 'Term (Months)' },
  { key: 'baseRentMonthly', label: 'Monthly Rent', type: 'currency' },
  { key: 'baseRentAnnual', label: 'Annual Rent', type: 'currency' },
  { key: 'rentEscalationDescription', label: 'Rent Escalation' },
  { key: 'rentEscalationPercentage', label: 'Escalation %' },
  { key: 'securityDeposit', label: 'Security Deposit', type: 'currency' },
  { key: 'tenantImprovementAllowance', label: 'TI Allowance', type: 'currency' },
  { key: 'freeRentPeriod', label: 'Free Rent Period' },
  { key: 'camCharges', label: 'CAM Charges' },
  { key: 'renewalOptions', label: 'Renewal Options' },
  { key: 'renewalOptionDeadline', label: 'Renewal Deadline', type: 'date' },
  { key: 'terminationOption', label: 'Termination Option' },
  { key: 'subleaseRights', label: 'Sublease Rights' },
  { key: 'assignmentRights', label: 'Assignment Rights' },
  { key: 'permittedUse', label: 'Permitted Use' },
  { key: 'parkingSpaces', label: 'Parking Spaces' },
  { key: 'guarantor', label: 'Guarantor' },
] as const;

function CompareContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids');
  const [leases, setLeases] = useState<any[]>([]);
  const [allLeases, setAllLeases] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>(idsParam ? idsParam.split(',') : []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leases').then(r => r.json()).then(d => {
      const completed = (d.leases || []).filter((l: any) => l.status === 'completed');
      setAllLeases(completed);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setLeases(allLeases.filter(l => selected.includes(l.id)));
  }, [selected, allLeases]);

  const getValue = (lease: any, field: string, type?: string) => {
    const data = lease.extractedData ? JSON.parse(lease.extractedData) : {};
    const val = data[field];
    if (!val && val !== 0) return 'N/A';
    if (type === 'currency') return formatCurrency(Number(val));
    if (type === 'date') return formatDate(String(val));
    return String(val);
  };

  const isDifferent = (field: string) => {
    if (leases.length < 2) return false;
    const values = leases.map(l => getValue(l, field));
    return new Set(values).size > 1;
  };

  const downloadComparisonPdf = async () => {
    const ids = leases.map(l => l.id).join(',');
    window.location.href = `/api/compare/export?ids=${ids}`;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>;

  return (
    <>
      {/* Selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Select leases to compare (2 or more)</h2>
        <div className="flex flex-wrap gap-2">
          {allLeases.map(l => (
            <button
              key={l.id}
              onClick={() => setSelected(s => s.includes(l.id) ? s.filter(x => x !== l.id) : [...s, l.id])}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                selected.includes(l.id) ? 'border-blue-600 bg-blue-900/20 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {l.propertyAddress || l.fileName}
            </button>
          ))}
        </div>
      </div>

      {leases.length >= 2 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={downloadComparisonPdf}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="h-4 w-4" /> Download Comparison Report
          </button>
        </div>
      )}

      {leases.length < 2 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
          <GitCompare className="h-16 w-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">Select 2 or more leases above to compare</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase w-40">Field</th>
                  {leases.map(l => (
                    <th key={l.id} className="px-4 py-3 text-left text-xs font-medium text-white">
                      <Link href={`/leases/${l.id}`} className="hover:text-blue-400">
                        {l.propertyAddress || l.fileName}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {COMPARE_FIELDS.map(({ key, label, type }: { key: string; label: string; type?: string }) => {
                  const diff = isDifferent(key);
                  return (
                    <tr key={key} className={diff ? 'bg-yellow-900/10' : ''}>
                      <td className="px-4 py-3 text-xs font-medium text-gray-400">{label}</td>
                      {leases.map(l => (
                        <td key={l.id} className={`px-4 py-3 text-sm ${diff ? 'text-yellow-300' : 'text-gray-300'}`}>
                          {getValue(l, key, type)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default function ComparePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Lease Comparison</h1>
      <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>}>
        <CompareContent />
      </Suspense>
    </div>
  );
}
