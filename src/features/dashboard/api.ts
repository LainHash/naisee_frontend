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
  wardPublicId?: string | null;
  code?: string | null;
  name: string;
  total: number;
  resolved: number;
  pending: number;
  overdue: number;
  resolvedRate: number;
}

export interface DashboardMetricsDto {
  wardFilter?: string | null;
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

export interface QueryDashboardParams {
  wardPublicId?: string;
  ward?: string;
}

function toQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value));
    }
  }
  const encoded = qs.toString();
  return encoded ? `?${encoded}` : '';
}

/**
 * Headless Dashboard SDK matching naisee_backend DashboardController.
 */
export const dashboardApi = {
  getStaffDashboard(
    params: QueryDashboardParams = {},
  ): Promise<ApiEnvelope<DashboardMetricsDto>> {
    return apiClient.get<DashboardMetricsDto>(
      `/staff/dashboard${toQueryString({ ...params })}`,
    );
  },

  getPublicDashboard(
    params: QueryDashboardParams = {},
  ): Promise<ApiEnvelope<DashboardMetricsDto>> {
    return apiClient.get<DashboardMetricsDto>(
      `/dashboard/public${toQueryString({ ...params })}`,
    );
  },
};
