import { differenceInDays, parseISO } from 'date-fns';
import type { ExtractedLeaseData } from './claude';

export interface RiskFactor {
  label: string;
  points: number;
  category: 'urgency' | 'clause' | 'positive';
}

export interface RiskScoreResult {
  score: number;
  label: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK';
  color: 'green' | 'yellow' | 'red';
  factors: RiskFactor[];
}

export function calculateRiskScore(data: ExtractedLeaseData): RiskScoreResult {
  const factors: RiskFactor[] = [];
  let score = 100;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ─── URGENCY FACTORS (max -40) ─────────────────────────────────────────────

  if (data.leaseExpirationDate) {
    try {
      const exp = parseISO(data.leaseExpirationDate);
      const days = differenceInDays(exp, today);
      if (days >= 0 && days < 90) {
        factors.push({ label: 'Lease expires in less than 90 days', points: -20, category: 'urgency' });
      } else if (days >= 0 && days < 180) {
        factors.push({ label: 'Lease expires in less than 180 days', points: -10, category: 'urgency' });
      }
    } catch { /* invalid date */ }
  }

  if (data.renewalOptionDeadline) {
    try {
      const dl = parseISO(data.renewalOptionDeadline);
      const days = differenceInDays(dl, today);
      if (days >= 0 && days < 60) {
        factors.push({ label: 'Renewal option deadline in less than 60 days', points: -15, category: 'urgency' });
      } else if (days >= 0 && days < 120) {
        factors.push({ label: 'Renewal option deadline in less than 120 days', points: -8, category: 'urgency' });
      }
    } catch { /* invalid date */ }
  }

  if (data.terminationOptionDate) {
    try {
      const tod = parseISO(data.terminationOptionDate);
      const days = differenceInDays(tod, today);
      if (days < 30) {
        factors.push({ label: 'Termination option deadline missed or within 30 days', points: -5, category: 'urgency' });
      }
    } catch { /* invalid date */ }
  }

  // ─── CLAUSE RISK FACTORS (max -40) ─────────────────────────────────────────

  const noRenewal = !data.renewalOptions || data.renewalOptions.trim() === '' || data.renewalOptions.toLowerCase() === 'none';
  if (noRenewal) {
    factors.push({ label: 'No renewal options found', points: -15, category: 'clause' });
  }

  const hasGuaranty = data.personalGuaranty && data.personalGuaranty.toLowerCase() !== 'none' && data.personalGuaranty.toLowerCase() !== 'n/a' && data.personalGuaranty.trim() !== '';
  if (hasGuaranty) {
    factors.push({ label: 'Personal guaranty required', points: -10, category: 'clause' });
  }

  const camText = (data.camCharges || '').toLowerCase();
  const camUncapped = camText.includes('uncap') || (camText.length > 0 && !camText.includes('cap') && !camText.includes('limit') && !camText.includes('max'));
  if (camText.length > 0 && camUncapped) {
    factors.push({ label: 'CAM charges appear uncapped', points: -8, category: 'clause' });
  }

  const noSublease = !data.subleaseRights || data.subleaseRights.trim() === '' || data.subleaseRights.toLowerCase().includes('no subleas') || data.subleaseRights.toLowerCase() === 'none';
  if (noSublease) {
    factors.push({ label: 'No sublease rights', points: -5, category: 'clause' });
  }

  const isRetail = (data.propertyType || '').toLowerCase().includes('retail');
  const noExclusivity = !data.exclusivityClause || data.exclusivityClause.trim() === '' || data.exclusivityClause.toLowerCase() === 'none';
  if (isRetail && noExclusivity) {
    factors.push({ label: 'Exclusivity clause missing for retail property', points: -5, category: 'clause' });
  }

  if (data.rentEscalationPercentage && data.rentEscalationPercentage > 4) {
    factors.push({ label: `Rent escalation above 4% per year (${data.rentEscalationPercentage}%)`, points: -5, category: 'clause' });
  }

  const noTermination = !data.terminationOption || data.terminationOption.trim() === '' || data.terminationOption.toLowerCase() === 'none';
  if (noTermination) {
    factors.push({ label: 'No termination option', points: -3, category: 'clause' });
  }

  // TI below market: flag if monthly rent > $5k but TI < $10k (rough heuristic)
  if (data.baseRentMonthly && data.baseRentMonthly > 5000 && data.tenantImprovementAllowance !== undefined && data.tenantImprovementAllowance < 10000) {
    factors.push({ label: 'TI allowance potentially below market', points: -3, category: 'clause' });
  }

  // ─── POSITIVE FACTORS (max +20) ─────────────────────────────────────────────

  const renewalText = (data.renewalOptions || '').toLowerCase();
  const multipleRenewals = renewalText.includes('two') || renewalText.includes('three') || renewalText.includes('2') || renewalText.includes('3') || renewalText.includes('multiple');
  if (!noRenewal && multipleRenewals) {
    factors.push({ label: 'Multiple renewal options', points: 10, category: 'positive' });
  }

  // Below market rent: very rough — flag if rent is low (per sqft heuristic not available, skip)

  if (!noTermination) {
    factors.push({ label: 'Termination option exists', points: 5, category: 'positive' });
  }

  // Apply factors
  for (const f of factors) {
    score += f.points;
  }
  score = Math.max(0, Math.min(100, score));

  let label: RiskScoreResult['label'];
  let color: RiskScoreResult['color'];
  if (score <= 40) { label = 'HIGH RISK'; color = 'red'; }
  else if (score <= 70) { label = 'MEDIUM RISK'; color = 'yellow'; }
  else { label = 'LOW RISK'; color = 'green'; }

  return { score, label, color, factors };
}

export function getRiskBadgeClasses(color: string): string {
  if (color === 'red') return 'text-red-400 bg-red-900/20 border-red-800';
  if (color === 'yellow') return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
  return 'text-green-400 bg-green-900/20 border-green-800';
}
