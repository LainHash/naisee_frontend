import type {
  ApiEnvelope,
  BackendIssueStatus,
  BackendPriority,
  BackendVerificationOutcome,
  BackendVerificationStatus,
  BackendWorkflowStage,
} from '@/contracts/api.types';
import type { IssueMediaItemDto } from '@/features/issues/api';
import { apiClient } from '@/shared/api-client';

export interface VerificationIssueSummaryDto {
  publicId: string;
  code: string;
  title: string;
  description: string | null;
  status: BackendIssueStatus;
  stage: BackendWorkflowStage;
  priority: BackendPriority;
  latitude: number;
  longitude: number;
  addressText: string;
  ward: string;
  wardPublicId?: string | null;
  thumbnailUrl: string | null;
  reportCount: number;
  dueAt: string | null;
  isOverdue: boolean;
  category: {
    publicId: string;
    code: string;
    name: string;
    icon: string | null;
  };
  media: IssueMediaItemDto[];
}

export interface VerificationTaskDto {
  publicId: string;
  status: BackendVerificationStatus;
  instruction: string | null;
  dueAt: string | null;
  outcome: BackendVerificationOutcome | null;
  isIssueConfirmed: boolean | null;
  verifiedLatitude: number | null;
  verifiedLongitude: number | null;
  safetyRiskNote: string | null;
  resultNote: string | null;
  completedAt: string | null;
  claimedByMe: boolean;
  volunteerPublicId: string | null;
  volunteerName: string | null;
  media: IssueMediaItemDto[];
  issue: VerificationIssueSummaryDto;
  distanceMeters?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequestVerificationInput {
  instruction?: string;
  dueAt?: string;
  slaHours?: number;
}

export interface QueryVolunteerVerificationsParams {
  page?: number;
  limit?: number;
  status?: BackendVerificationStatus;
  mine?: boolean;
  wardPublicId?: string;
  ward?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  search?: string;
}

export interface SubmitVerificationInput {
  outcome: BackendVerificationOutcome;
  verifiedLatitude?: number;
  verifiedLongitude?: number;
  safetyRiskNote?: string;
  resultNote?: string;
  imageUrls?: string[];
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
 * Headless Verifications SDK matching StaffVerificationsController & VolunteerVerificationsController.
 */
export const verificationsApi = {
  requestForIssue(
    issuePublicIdOrCode: string,
    input: RequestVerificationInput = {},
  ): Promise<ApiEnvelope<VerificationTaskDto>> {
    return apiClient.post<VerificationTaskDto>(
      `/staff/issues/${encodeURIComponent(issuePublicIdOrCode)}/verifications`,
      input,
    );
  },

  listVolunteerTasks(
    params: QueryVolunteerVerificationsParams = {},
  ): Promise<ApiEnvelope<VerificationTaskDto[]>> {
    return apiClient.get<VerificationTaskDto[]>(
      `/volunteer/verifications${toQueryString({ ...params })}`,
    );
  },

  getVolunteerTask(
    publicIdOrCode: string,
  ): Promise<ApiEnvelope<VerificationTaskDto>> {
    return apiClient.get<VerificationTaskDto>(
      `/volunteer/verifications/${encodeURIComponent(publicIdOrCode)}`,
    );
  },

  claimTask(
    publicIdOrCode: string,
  ): Promise<ApiEnvelope<VerificationTaskDto>> {
    return apiClient.post<VerificationTaskDto>(
      `/volunteer/verifications/${encodeURIComponent(publicIdOrCode)}/claim`,
      {},
    );
  },

  submitTask(
    publicIdOrCode: string,
    input: SubmitVerificationInput,
  ): Promise<ApiEnvelope<VerificationTaskDto>> {
    return apiClient.post<VerificationTaskDto>(
      `/volunteer/verifications/${encodeURIComponent(publicIdOrCode)}/submit`,
      input,
    );
  },
};

