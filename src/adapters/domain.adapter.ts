import type {
  BackendCategoryCode,
  BackendIssueStatus,
  BackendPriority,
  BackendRoleName,
  BackendVerificationOutcome,
} from '@/contracts/api.types';

/**
 * Type aliases matching the standalone UI (`example/NaiSee/cham-pho/src/types/incident.ts`)
 * plus UX alignment from docs/phan_tich_de_bai_2.md (`rejected`, 3-choice verification outcome).
 */
export type UiUserRole = 'citizen' | 'volunteer' | 'officer' | 'admin';
export type UiIncidentCategory = 'waste' | 'streetlight' | 'flooding' | 'road';
export type UiIncidentStatus =
  | 'new'
  | 'verifying'
  | 'in_progress'
  | 'resolved'
  | 'reopened'
  | 'rejected';
export type UiIncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type UiVerificationOutcome =
  | 'still_exists'
  | 'already_resolved'
  | 'not_found_or_unclear';

const ROLE_BE_TO_UI: Record<BackendRoleName, UiUserRole> = {
  CITIZEN: 'citizen',
  VOLUNTEER: 'volunteer',
  STAFF: 'officer',
  ADMIN: 'admin',
};

const ROLE_UI_TO_BE: Record<UiUserRole, BackendRoleName> = {
  citizen: 'CITIZEN',
  volunteer: 'VOLUNTEER',
  officer: 'STAFF',
  admin: 'ADMIN',
};

const CATEGORY_BE_TO_UI: Record<BackendCategoryCode, UiIncidentCategory> = {
  WASTE: 'waste',
  STREET_LIGHT: 'streetlight',
  FLOODING: 'flooding',
  ROAD_SURFACE: 'road',
  OTHER: 'road',
};

const CATEGORY_UI_TO_BE: Record<UiIncidentCategory, BackendCategoryCode> = {
  waste: 'WASTE',
  streetlight: 'STREET_LIGHT',
  flooding: 'FLOODING',
  road: 'ROAD_SURFACE',
};

const PRIORITY_BE_TO_UI: Record<BackendPriority, UiIncidentSeverity> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const PRIORITY_UI_TO_BE: Record<UiIncidentSeverity, BackendPriority> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
};

const OUTCOME_BE_TO_UI: Record<
  BackendVerificationOutcome,
  UiVerificationOutcome
> = {
  STILL_EXISTS: 'still_exists',
  ALREADY_RESOLVED: 'already_resolved',
  NOT_FOUND_OR_UNCLEAR: 'not_found_or_unclear',
};

const OUTCOME_UI_TO_BE: Record<
  UiVerificationOutcome,
  BackendVerificationOutcome
> = {
  still_exists: 'STILL_EXISTS',
  already_resolved: 'ALREADY_RESOLVED',
  not_found_or_unclear: 'NOT_FOUND_OR_UNCLEAR',
};

export function toUiRole(role: BackendRoleName): UiUserRole {
  return ROLE_BE_TO_UI[role];
}

export function toBackendRole(role: UiUserRole): BackendRoleName {
  return ROLE_UI_TO_BE[role];
}

export function toUiCategory(code: BackendCategoryCode): UiIncidentCategory {
  return CATEGORY_BE_TO_UI[code];
}

export function toBackendCategory(
  category: UiIncidentCategory,
): BackendCategoryCode {
  return CATEGORY_UI_TO_BE[category];
}

export function toUiStatus(
  status: BackendIssueStatus,
  needsReopenReview = false,
): UiIncidentStatus {
  if (needsReopenReview && status === 'RESOLVED') {
    return 'reopened';
  }
  switch (status) {
    case 'PENDING_REVIEW':
    case 'RECEIVED':
      return 'new';
    case 'VERIFYING':
      return 'verifying';
    case 'IN_PROGRESS':
      return 'in_progress';
    case 'RESOLVED':
      return 'resolved';
    case 'REJECTED':
      return 'rejected';
  }
}

export function toUiSeverity(priority: BackendPriority): UiIncidentSeverity {
  return PRIORITY_BE_TO_UI[priority];
}

export function toBackendPriority(
  severity: UiIncidentSeverity,
): BackendPriority {
  return PRIORITY_UI_TO_BE[severity];
}

export function toUiVerificationOutcome(
  outcome: BackendVerificationOutcome,
): UiVerificationOutcome {
  return OUTCOME_BE_TO_UI[outcome];
}

export function toBackendVerificationOutcome(
  outcome: UiVerificationOutcome,
): BackendVerificationOutcome {
  return OUTCOME_UI_TO_BE[outcome];
}
