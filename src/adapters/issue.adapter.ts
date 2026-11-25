import {
  STAGE_LABEL_VI,
  toUiCategory,
  toUiRole,
  toUiSeverity,
  toUiStatus,
  type UiIncidentCategory,
  type UiIncidentSeverity,
  type UiIncidentStatus,
  type UiUserRole,
  type UiWorkflowStage,
} from '@/adapters/domain.adapter';
import type { BackendCategoryCode, BackendIssueStatus } from '@/contracts/api.types';
import type {
  PublicIssueDetailDto,
  PublicIssueSummaryDto,
  PublicReviewDto,
} from '@/features/issues/api';

export interface UiAuditLogItem {
  id: string;
  incidentId: string;
  actorName: string;
  actorRole: UiUserRole | 'system';
  action: string;
  previousStatus?: UiIncidentStatus;
  newStatus?: UiIncidentStatus;
  previousStage?: UiWorkflowStage;
  newStage?: UiWorkflowStage;
  details: string;
  timestamp: string;
}

export interface UiFeedbackItem {
  id: string;
  incidentId: string;
  rating?: number;
  comment?: string;
  isReopenRequest: boolean;
  submittedAt: string;
  review?: { accepted: boolean; note?: string };
}

export interface UiIncident {
  id: string;
  code: string;
  title: string;
  description: string;
  category: UiIncidentCategory;
  categoryLabel: string;
  status: UiIncidentStatus;
  statusLabel: string;
  stage: UiWorkflowStage;
  stageLabel: string;
  severity: UiIncidentSeverity;
  lat: number;
  lng: number;
  address: string;
  neighborhood: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  assignedUnit?: string;
  confirmationsCount: number;
  isDuplicate: boolean;
  imageUrl?: string;
  resolvedImageUrl?: string;
  intakeNote?: string;
  officialResponse?: string;
  publicReview: PublicReviewDto;
  slaHours: number;
  deadlineAt: string;
  isOverdue: boolean;
  assignments: never[];
  auditLogs: UiAuditLogItem[];
  feedback?: UiFeedbackItem[];
}

const STATUS_LABEL_VI: Record<BackendIssueStatus, string> = {
  PENDING_REVIEW: 'Chờ tiếp nhận',
  RECEIVED: 'Đã tiếp nhận',
  VERIFYING: 'Đang xác minh',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã xử lý',
  REJECTED: 'Không tiếp nhận',
};

function isDetailDto(
  dto: PublicIssueSummaryDto | PublicIssueDetailDto,
): dto is PublicIssueDetailDto {
  return 'media' in dto && 'timeline' in dto;
}

/**
 * Maps a public Backend Issue DTO into the Standalone UI `Incident` shape.
 */
export function mapPublicIssueToUiIncident(
  dto: PublicIssueSummaryDto | PublicIssueDetailDto,
): UiIncident {
  const beforeImage = isDetailDto(dto)
    ? dto.media.find((m) => m.stage === 'BEFORE')?.url ?? dto.thumbnailUrl
    : dto.thumbnailUrl;
  const afterImage = isDetailDto(dto)
    ? dto.media.find((m) => m.stage === 'AFTER')?.url
    : undefined;
  const uiStatus = toUiStatus(dto.status, dto.needsReopenReview, dto.stage);

  return {
    id: dto.publicId,
    code: dto.code,
    title: dto.title,
    description: dto.description ?? '',
    category: toUiCategory(dto.category.code as BackendCategoryCode),
    categoryLabel: dto.category.name,
    status: uiStatus,
    statusLabel:
      uiStatus === 'reopened' ? 'Đã mở lại' : STATUS_LABEL_VI[dto.status],
    stage: dto.stage,
    stageLabel: STAGE_LABEL_VI[dto.stage],
    severity: toUiSeverity(dto.priority),
    lat: dto.latitude,
    lng: dto.longitude,
    address: dto.addressText,
    neighborhood: dto.ward,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    resolvedAt: dto.resolvedAt ?? undefined,
    assignedUnit: dto.assignedUnit ?? dto.assignedDepartment?.name,
    confirmationsCount: dto.reportCount,
    isDuplicate: dto.isDuplicate,
    imageUrl: beforeImage ?? undefined,
    resolvedImageUrl: afterImage ?? undefined,
    intakeNote: isDetailDto(dto) ? (dto.intakeNote ?? undefined) : undefined,
    officialResponse: isDetailDto(dto)
      ? (dto.resolutionNote ?? dto.rejectionReason ?? undefined)
      : undefined,
    publicReview: dto.publicReview,
    slaHours: dto.category.slaHours,
    deadlineAt: dto.deadlineAt ?? dto.dueAt ?? '',
    isOverdue: dto.isOverdue,
    assignments: [],
    auditLogs: isDetailDto(dto)
      ? dto.timeline.map((item) => ({
          id: item.publicId,
          incidentId: dto.publicId,
          actorName: item.actorLabel,
          actorRole: item.actorRole ? toUiRole(item.actorRole) : 'system',
          action: item.actionType,
          previousStatus: item.fromStatus
            ? toUiStatus(item.fromStatus, false, item.previousStage ?? undefined)
            : undefined,
          newStatus: item.toStatus
            ? toUiStatus(item.toStatus, false, item.newStage ?? undefined)
            : undefined,
          previousStage: item.previousStage ?? undefined,
          newStage: item.newStage ?? undefined,
          details: item.content,
          timestamp: item.timestamp ?? item.createdAt,
        }))
      : [],
    feedback: isDetailDto(dto)
      ? dto.feedbackSummary.items.map((item) => ({
          id: item.publicId,
          incidentId: dto.publicId,
          rating: item.rating ?? undefined,
          comment: item.comment ?? undefined,
          isReopenRequest: !item.isSatisfied,
          submittedAt: item.createdAt,
          review:
            item.reviewStatus === 'REOPENED'
              ? { accepted: true }
              : item.reviewStatus === 'ACKNOWLEDGED'
                ? { accepted: false }
                : undefined,
        }))
      : undefined,
  };
}
