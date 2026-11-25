import type {
  ApiEnvelope,
  BackendFeedbackReviewStatus,
} from '@/contracts/api.types';
import type { PublicIssueDetailDto } from '@/features/issues/api';
import type { StaffIssueDetailDto } from '@/features/staff/api';
import { apiClient } from '@/shared/api-client';

export interface CreateFeedbackInput {
  isSatisfied: boolean;
  rating?: number;
  reason?: string;
  comment?: string;
}

export interface ReviewFeedbackInput {
  reviewStatus: Extract<
    BackendFeedbackReviewStatus,
    'ACKNOWLEDGED' | 'REOPENED'
  >;
  reviewNote?: string;
  reassignToDepartment?: boolean;
  dueAt?: string;
  slaHours?: number;
}

/**
 * Headless Feedback & Reopen SDK matching naisee_backend FeedbackController.
 */
export const feedbackApi = {
  submit(
    issuePublicIdOrCode: string,
    input: CreateFeedbackInput,
  ): Promise<ApiEnvelope<PublicIssueDetailDto>> {
    return apiClient.post<PublicIssueDetailDto>(
      `/issues/${encodeURIComponent(issuePublicIdOrCode)}/feedback`,
      input,
    );
  },

  review(
    feedbackOrIssueId: string,
    input: ReviewFeedbackInput,
  ): Promise<ApiEnvelope<StaffIssueDetailDto>> {
    return apiClient.patch<StaffIssueDetailDto>(
      `/staff/feedbacks/${encodeURIComponent(feedbackOrIssueId)}/review`,
      input,
    );
  },
};

