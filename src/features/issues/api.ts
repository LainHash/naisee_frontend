import type {
  ApiEnvelope,
  BackendFeedbackReviewStatus,
  BackendIssueStatus,
  BackendMediaStage,
  BackendPriority,
  BackendRoleName,
  BackendTimelineAction,
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

export interface PublicIssueSummaryDto {
  publicId: string;
  code: string;
  title: string;
  description: string | null;
  status: BackendIssueStatus;
  priority: BackendPriority;
  suggestedPriority: BackendPriority | null;
  latitude: number;
  longitude: number;
  addressText: string;
  ward: string;
  thumbnailUrl: string | null;
  reportCount: number;
  dueAt: string | null;
  resolvedAt: string | null;
  isOverdue: boolean;
  needsReopenReview: boolean;
  category: IssueCategorySummaryDto;
  assignedDepartment: IssueDepartmentSummaryDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface NearbyIssueItemDto extends PublicIssueSummaryDto {
  distanceMeters: number;
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
  content: string;
  actorRole: BackendRoleName | null;
  actorLabel: string;
  createdAt: string;
}

export interface PublicFeedbackItemDto {
  publicId: string;
  isSatisfied: boolean;
  rating: number | null;
  comment: string | null;
  reviewStatus: BackendFeedbackReviewStatus;
  createdAt: string;
}

export interface FeedbackSummaryDto {
  totalCount: number;
  satisfiedCount: number;
  unsatisfiedCount: number;
  averageRating: number | null;
  items: PublicFeedbackItemDto[];
}

export interface PublicIssueDetailDto extends PublicIssueSummaryDto {
  resolutionNote: string | null;
  rejectionReason: string | null;
  aiSuggestedCategoryCode: string | null;
  aiConfidence: number | null;
  media: IssueMediaItemDto[];
  timeline: IssueTimelineItemDto[];
  feedbackSummary: FeedbackSummaryDto;
}

export interface NearbyIssuesParams {
  lat: number;
  lng: number;
  radiusMeters?: number;
  categoryPublicId?: string;
  categoryCode?: string;
  status?: BackendIssueStatus;
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
 * Headless Issues SDK matching naisee_backend IssuesController (public endpoints).
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
};
