export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Lease {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  processedAt: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedData: string | null;
  originalText: string | null;
  propertyAddress: string | null;
  tenantName: string | null;
  expirationDate: string | null;
  monthlyRent: number | null;
}

export interface Alert {
  id: string;
  leaseId: string;
  userId: string;
  alertType: string;
  triggerDate: string;
  acknowledgedAt: string | null;
  createdAt: string;
  lease?: Lease;
}

export interface DashboardStats {
  totalLeases: number;
  totalMonthlyRent: number;
  criticalDeadlines: number;
  expiringThisYear: number;
  urgentDeadlines: Alert[];
  recentLeases: Lease[];
}
