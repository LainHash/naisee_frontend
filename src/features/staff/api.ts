import type {
  ApiEnvelope,
  BackendIssueStatus,
  BackendPriority,
  BackendWorkflowStage,
} from '@/contracts/api.types';
import type {
  PublicIssueDetailDto,
  PublicIssueSummaryDto,
} from '@/features/issues/api';
import { apiClient } from '@/shared/api-client';

export interface StaffIssueItemDto extends PublicIssueSummaryDto {
  intakeNote: string | null;
  rejectionReason: string | null;
  priorityReason: string | null;
}

export interface StaffIssueDetailDto extends PublicIssueDetailDto {
  priorityReason: string | null;
}

export interface QueryStaffIssuesParams {
  page?: number;
  limit?: number;
  status?: BackendIssueStatus;
  stage?: BackendWorkflowStage;
  priority?: BackendPriority;
  categoryPublicId?: string;
  categoryCode?: string;
  departmentPublicId?: string;
  departmentId?: string;
  overdue?: boolean;
  needsReopenReview?: boolean;
  includeDuplicates?: boolean;
  search?: string;
}

export interface TriageIssueInput {
  categoryPublicId?: string;
  categoryCode?: string;
  priority?: BackendPriority;
  needsInformation?: boolean;
  intakeNote?: string;
}

export interface RejectIssueInput {
  rejectionReason: string;
}

export interface AssignIssueInput {
  departmentPublicId?: string;
  departmentCode?: string;
  dueAt?: string;
  slaHours?: number;
  priority?: BackendPriority;
  stage?: Extract<BackendWorkflowStage, 'department_assigned' | 'work_accepted'>;
  note?: string;
  publicReviewVerified?: boolean;
}

export interface UpdatePublicReviewInput {
  verified: boolean;
  note?: string;
}

export interface MergeIssuesInput {
  sourceIssuePublicIds: string[];
  note?: string;
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
 * Headless Staff Coordination SDK matching naisee_backend StaffIssuesController.
 */
export const staffApi = {
  listIssues(
    params: QueryStaffIssuesParams = {},
  ): Promise<ApiEnvelope<StaffIssueItemDto[]>> {
    return apiClient.get<StaffIssueItemDto[]>(
      `/staff/issues${toQueryString({ ...params })}`,
    );
  },

  getDetail(publicIdOrCode: string): Promise<ApiEnvelope<StaffIssueDetailDto>> {
    return apiClient.get<StaffIssueDetailDto>(
      `/staff/issues/${encodeURIComponent(publicIdOrCode)}`,
    );
  },

  triage(
    publicIdOrCode: string,
    input: TriageIssueInput,
  ): Promise<ApiEnvelope<StaffIssueDetailDto>> {
    return apiClient.patch<StaffIssueDetailDto>(
      `/staff/issues/${encodeURIComponent(publicIdOrCode)}/triage`,
      input,
    );
  },

  reject(
    publicIdOrCode: string,
    input: RejectIssueInput,
  ): Promise<ApiEnvelope<StaffIssueDetailDto>> {
    return apiClient.patch<StaffIssueDetailDto>(
      `/staff/issues/${encodeURIComponent(publicIdOrCode)}/reject`,
      input,
    );
  },

  assign(
    publicIdOrCode: string,
    input: AssignIssueInput,
  ): Promise<ApiEnvelope<StaffIssueDetailDto>> {
    return apiClient.patch<StaffIssueDetailDto>(
      `/staff/issues/${encodeURIComponent(publicIdOrCode)}/assign`,
      input,
    );
  },

  updatePublicReview(
    publicIdOrCode: string,
    input: UpdatePublicReviewInput,
  ): Promise<ApiEnvelope<StaffIssueDetailDto>> {
    return apiClient.patch<StaffIssueDetailDto>(
      `/staff/issues/${encodeURIComponent(publicIdOrCode)}/public-review`,
      input,
    );
  },

  merge(
    publicIdOrCode: string,
    input: MergeIssuesInput,
  ): Promise<ApiEnvelope<StaffIssueDetailDto>> {
    return apiClient.post<StaffIssueDetailDto>(
      `/staff/issues/${encodeURIComponent(publicIdOrCode)}/merge`,
      input,
    );
  },
};
