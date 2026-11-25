/**
 * Backend contract enums & envelope types mirroring naisee_backend/src/common/.
 * Run `npm run sync:types` while naisee_backend is running to generate `openapi.d.ts`.
 */

export type BackendRoleName = 'CITIZEN' | 'STAFF' | 'VOLUNTEER' | 'ADMIN';

export type BackendIssueStatus =
  | 'PENDING_REVIEW'
  | 'RECEIVED'
  | 'VERIFYING'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export type BackendWorkflowStage =
  | 'unassigned'
  | 'received'
  | 'needs_information'
  | 'not_accepted'
  | 'verification_requested'
  | 'volunteer_assigned'
  | 'verification_submitted'
  | 'department_assigned'
  | 'work_accepted'
  | 'resolution_submitted'
  | 'resolution_review'
  | 'completed'
  | 'reopened';

export type BackendPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type BackendCategoryCode =
  | 'ROAD_SURFACE'
  | 'STREET_LIGHT'
  | 'WASTE'
  | 'FLOODING'
  | 'OTHER';

export type BackendMediaStage = 'BEFORE' | 'VERIFICATION' | 'AFTER';

export type BackendVerificationStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type BackendVerificationOutcome =
  | 'STILL_EXISTS'
  | 'ALREADY_RESOLVED'
  | 'NOT_FOUND_OR_UNCLEAR';

export type BackendTimelineAction =
  | 'CREATED'
  | 'ME_TOO_ADDED'
  | 'MERGED'
  | 'RECEIVED'
  | 'ASSIGNED'
  | 'VERIFICATION_REQUESTED'
  | 'VERIFICATION_SUBMITTED'
  | 'PROGRESS_NOTE'
  | 'RESOLVED'
  | 'REOPENED'
  | 'REJECTED';

export type BackendFeedbackReviewStatus =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'REOPENED';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiEnvelope<T> = ApiSuccessResponse<T> | ApiErrorResponse;
