import type {
  ApiEnvelope,
  BackendFeedbackReviewStatus,
  BackendIssueStatus,
  BackendMediaStage,
  BackendPriority,
  BackendRoleName,
  BackendTimelineAction,
  BackendVerificationOutcome,
  BackendVerificationStatus,
  BackendWorkflowStage,
} from '@/contracts/api.types';
import { apiClient } from '@/shared/api-client';

export interface IssueCategorySummaryDto {
  publicId: string;
  code: string;
  name: string;
  icon: string | null;
  slaHours: number;
}

export interface IssueDepartmentSummaryDto {
  publicId: string;
  code: string;
  name: string;
}

export interface PublicReviewDto {
  verified: boolean;
  approvedAt: string | null;
}

export interface PublicIssueSummaryDto {
  publicId: string;
  code: string;
  title: string;
  description: string | null;
  status: BackendIssueStatus;
  stage: BackendWorkflowStage;
  priority: BackendPriority;
  suggestedPriority: BackendPriority | null;
  latitude: number;
  longitude: number;
  addressText: string;
  ward: string;
  thumbnailUrl: string | null;
  reportCount: number;
  assignedUnit: string | null;
  dueAt: string | null;
  deadlineAt: string | null;
  resolvedAt: string | null;
  isOverdue: boolean;
  isDuplicate: boolean;
  needsReopenReview: boolean;
  publicReview: PublicReviewDto;
  category: IssueCategorySummaryDto;
  assignedDepartment: IssueDepartmentSummaryDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface NearbyIssueItemDto extends PublicIssueSummaryDto {
  distanceMeters: number;
}

export type BackendReportType = 'INITIAL' | 'ME_TOO' | 'MERGED';

export interface MyIssueItemDto extends PublicIssueSummaryDto {
  intakeNote: string | null;
  rejectionReason: string | null;
  myReportTypes: BackendReportType[];
}

export interface IssueMediaItemDto {
  publicId: string;
  stage: BackendMediaStage;
  url: string;
  caption: string | null;
  createdAt: string;
}

export interface IssueTimelineItemDto {
  publicId: string;
  actionType: BackendTimelineAction;
  fromStatus: BackendIssueStatus | null;
  toStatus: BackendIssueStatus | null;
  previousStage: BackendWorkflowStage | null;
  newStage: BackendWorkflowStage | null;
  content: string;
  actorRole: BackendRoleName | null;
  actorLabel: string;
  createdAt: string;
  timestamp: string;
}

export interface PublicFeedbackItemDto {
  publicId: string;
  isSatisfied: boolean;
  rating: number | null;
  reason: string | null;
  comment: string | null;
  reviewStatus: BackendFeedbackReviewStatus;
  reviewNote: string | null;
  createdAt: string;
}

export interface FeedbackSummaryDto {
  totalCount: number;
  satisfiedCount: number;
  unsatisfiedCount: number;
  averageRating: number | null;
  items: PublicFeedbackItemDto[];
}

export interface IssueVerificationSummaryDto {
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
  volunteerLabel: string | null;
}

export interface PublicIssueDetailDto extends PublicIssueSummaryDto {
  intakeNote: string | null;
  resolutionNote: string | null;
  rejectionReason: string | null;
  aiSuggestedCategoryCode: string | null;
  aiConfidence: number | null;
  media: IssueMediaItemDto[];
  timeline: IssueTimelineItemDto[];
  latestVerification: IssueVerificationSummaryDto | null;
  feedbackSummary: FeedbackSummaryDto;
}

export interface NearbyIssuesParams {
  lat: number;
  lng: number;
  radiusMeters?: number;
  categoryPublicId?: string;
  categoryCode?: string;
  status?: BackendIssueStatus;
  forDuplicateCheck?: boolean;
  limit?: number;
}

export interface QueryIssuesParams {
  page?: number;
  limit?: number;
  categoryPublicId?: string;
  categoryCode?: string;
  status?: BackendIssueStatus;
  ward?: string;
  search?: string;
}

export interface QueryMyIssuesParams {
  page?: number;
  limit?: number;
  status?: BackendIssueStatus;
  stage?: BackendWorkflowStage;
}

export interface CreateIssueInput {
  categoryPublicId?: string;
  categoryCode?: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  addressText: string;
  ward?: string;
  imageUrls: string[];
  aiSuggestedCategoryPublicId?: string;
  aiSuggestedCategoryCode?: string;
  aiConfidence?: number;
}

export interface MeTooIssueInput {
  description?: string;
  latitude?: number;
  longitude?: number;
  addressText?: string;
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
 * Headless Issues SDK matching naisee_backend IssuesController (public & citizen endpoints).
 */
export const issuesApi = {
  getNearby(
    params: NearbyIssuesParams,
  ): Promise<ApiEnvelope<NearbyIssueItemDto[]>> {
    return apiClient.get<NearbyIssueItemDto[]>(
      `/issues/nearby${toQueryString({ ...params })}`,
    );
  },

  list(
    params: QueryIssuesParams = {},
  ): Promise<ApiEnvelope<PublicIssueSummaryDto[]>> {
    return apiClient.get<PublicIssueSummaryDto[]>(
      `/issues${toQueryString({ ...params })}`,
    );
  },

  getDetail(
    publicIdOrCode: string,
  ): Promise<ApiEnvelope<PublicIssueDetailDto>> {
    return apiClient.get<PublicIssueDetailDto>(
      `/issues/${encodeURIComponent(publicIdOrCode)}`,
    );
  },

  getMine(
    params: QueryMyIssuesParams = {},
  ): Promise<ApiEnvelope<MyIssueItemDto[]>> {
    return apiClient.get<MyIssueItemDto[]>(
      `/issues/mine${toQueryString({ ...params })}`,
    );
  },

  create(input: CreateIssueInput): Promise<ApiEnvelope<PublicIssueDetailDto>> {
    return apiClient.post<PublicIssueDetailDto>('/issues', input);
  },

  meToo(
    publicIdOrCode: string,
    input: MeTooIssueInput = {},
  ): Promise<ApiEnvelope<PublicIssueDetailDto>> {
    return apiClient.post<PublicIssueDetailDto>(
      `/issues/${encodeURIComponent(publicIdOrCode)}/me-too`,
      input,
    );
  },

  supplement(
    publicIdOrCode: string,
    content: string,
  ): Promise<ApiEnvelope<PublicIssueDetailDto>> {
    return apiClient.post<PublicIssueDetailDto>(
      `/issues/${encodeURIComponent(publicIdOrCode)}/supplement`,
      { content },
    );
  },
};
