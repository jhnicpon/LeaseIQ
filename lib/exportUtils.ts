import * as XLSX from 'xlsx';
import { ExtractedLeaseData } from './claude';
import { formatDate, formatCurrency } from './dateUtils';

export function exportToExcel(leases: any[]): Buffer {
  const data = leases.map(lease => {
    const extracted: ExtractedLeaseData = lease.extractedData ? JSON.parse(lease.extractedData) : {};
    return {
      'Property Address': extracted.propertyAddress || lease.propertyAddress || '',
      'Tenant Name': extracted.tenantName || lease.tenantName || '',
      'Landlord Name': extracted.landlordName || '',
      'Property Type': extracted.propertyType || '',
      'Commencement Date': extracted.leaseCommencementDate || '',
      'Expiration Date': extracted.leaseExpirationDate || lease.expirationDate || '',
      'Monthly Rent': extracted.baseRentMonthly || lease.monthlyRent || '',
      'Annual Rent': extracted.baseRentAnnual || '',
      'Security Deposit': extracted.securityDeposit || '',
      'TI Allowance': extracted.tenantImprovementAllowance || '',
      'Renewal Options': extracted.renewalOptions || '',
      'Renewal Deadline': extracted.renewalOptionDeadline || '',
      'Termination Option': extracted.terminationOption || '',
      'Permitted Use': extracted.permittedUse || '',
      'Parking Spaces': extracted.parkingSpaces || '',
      'Guarantor': extracted.guarantor || '',
      'Status': lease.status || '',
      'Uploaded At': lease.uploadedAt || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leases');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf;
}

export function exportToCsv(leases: any[]): string {
  const data = leases.map(lease => {
    const extracted: ExtractedLeaseData = lease.extractedData ? JSON.parse(lease.extractedData) : {};
    return [
      extracted.propertyAddress || lease.propertyAddress || '',
      extracted.tenantName || lease.tenantName || '',
      extracted.landlordName || '',
      extracted.leaseCommencementDate || '',
      extracted.leaseExpirationDate || lease.expirationDate || '',
      extracted.baseRentMonthly || lease.monthlyRent || '',
      extracted.renewalOptions || '',
      lease.status || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const header = '"Property Address","Tenant","Landlord","Commencement","Expiration","Monthly Rent","Renewal Options","Status"';
  return [header, ...data].join('\n');
}
