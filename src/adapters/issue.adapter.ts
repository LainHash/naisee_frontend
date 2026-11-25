import {
  toUiCategory,
  toUiRole,
  toUiSeverity,
  toUiStatus,
  type UiIncidentCategory,
  type UiIncidentSeverity,
  type UiIncidentStatus,
  type UiUserRole,
} from '@/adapters/domain.adapter';
import type { BackendCategoryCode, BackendIssueStatus } from '@/contracts/api.types';
import type {
  PublicIssueDetailDto,
  PublicIssueSummaryDto,
} from '@/features/issues/api';

export interface UiAuditLogItem {
  id: string;
  incidentId: string;
  actorName: string;
  actorRole: UiUserRole | 'system';
  action: string;
  previousStatus?: UiIncidentStatus;
  newStatus?: UiIncidentStatus;
  details: string;
  timestamp: string;
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
  imageUrl?: string;
  resolvedImageUrl?: string;
  officialResponse?: string;
  slaHours: number;
  deadlineAt: string;
  isOverdue: boolean;
  auditLogs: UiAuditLogItem[];
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

  return {
    id: dto.publicId,
    code: dto.code,
    title: dto.title,
    description: dto.description ?? '',
    category: toUiCategory(dto.category.code as BackendCategoryCode),
    categoryLabel: dto.category.name,
    status: toUiStatus(dto.status, dto.needsReopenReview),
    statusLabel: STATUS_LABEL_VI[dto.status],
    severity: toUiSeverity(dto.priority),
    lat: dto.latitude,
    lng: dto.longitude,
    address: dto.addressText,
    neighborhood: dto.ward,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    resolvedAt: dto.resolvedAt ?? undefined,
    assignedUnit: dto.assignedDepartment?.name,
    confirmationsCount: dto.reportCount,
    imageUrl: beforeImage ?? undefined,
    resolvedImageUrl: afterImage ?? undefined,
    officialResponse: isDetailDto(dto)
      ? (dto.resolutionNote ?? dto.rejectionReason ?? undefined)
      : undefined,
    slaHours: dto.category.slaHours,
    deadlineAt: dto.dueAt ?? '',
    isOverdue: dto.isOverdue,
    auditLogs: isDetailDto(dto)
      ? dto.timeline.map((item) => ({
          id: item.publicId,
          incidentId: dto.publicId,
          actorName: item.actorLabel,
          actorRole: item.actorRole ? toUiRole(item.actorRole) : 'system',
          action: item.actionType,
          previousStatus: item.fromStatus
            ? toUiStatus(item.fromStatus)
            : undefined,
          newStatus: item.toStatus ? toUiStatus(item.toStatus) : undefined,
          details: item.content,
          timestamp: item.createdAt,
        }))
      : [],
  };
}

