import { differenceInDays, format, parseISO, addDays } from 'date-fns';

export function getDaysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  try {
    const date = parseISO(dateStr);
    return differenceInDays(date, new Date());
  } catch {
    return Infinity;
  }
}

export function getUrgencyLevel(days: number): 'critical' | 'warning' | 'caution' | 'safe' {
  if (days <= 30) return 'critical';
  if (days <= 90) return 'warning';
  if (days <= 180) return 'caution';
  return 'safe';
}

export function getUrgencyColor(days: number): string {
  const level = getUrgencyLevel(days);
  switch (level) {
    case 'critical': return 'text-red-400 bg-red-900/20 border-red-800';
    case 'warning': return 'text-orange-400 bg-orange-900/20 border-orange-800';
    case 'caution': return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
    case 'safe': return 'text-green-400 bg-green-900/20 border-green-800';
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatCurrency(amount: number): string {
  if (!amount && amount !== 0) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function generateAlertDates(criticalDate: string): { daysBeforeDate: number; triggerDate: string }[] {
  if (!criticalDate) return [];
  try {
    const date = parseISO(criticalDate);
    const intervals = [365, 180, 90, 60, 30, 14, 7];
    return intervals.map(days => ({
      daysBeforeDate: days,
      triggerDate: format(addDays(date, -days), 'yyyy-MM-dd'),
    }));
  } catch {
    return [];
  }
}
