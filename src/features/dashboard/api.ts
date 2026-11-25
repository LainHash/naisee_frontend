import type { ApiEnvelope } from '@/contracts/api.types';
import { apiClient } from '@/shared/api-client';

export interface DashboardCategoryMetricDto {
  categoryPublicId: string;
  code: string;
  name: string;
  totalIssues: number;
  resolvedCount: number;
  pendingCount: number;
  percentage: number;
}

export interface DashboardWardMetricDto {
  name: string;
  total: number;
  resolved: number;
}

export interface DashboardMetricsDto {
  totalReports: number;
  totalIssues: number;
  resolvedCount: number;
  resolvedRate: number;
  avgResolutionDays: number;
  pendingCount: number;
  overdueCount: number;
  reopenedCount: number;
  byCategory: DashboardCategoryMetricDto[];
  byWard: DashboardWardMetricDto[];
}

/**
 * Headless Dashboard SDK matching naisee_backend DashboardController.
 */
export const dashboardApi = {
  getStaffDashboard(): Promise<ApiEnvelope<DashboardMetricsDto>> {
    return apiClient.get<DashboardMetricsDto>('/staff/dashboard');
  },

  getPublicDashboard(): Promise<ApiEnvelope<DashboardMetricsDto>> {
    return apiClient.get<DashboardMetricsDto>('/dashboard/public');
  },
};

