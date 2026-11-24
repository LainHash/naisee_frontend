import type {
  BackendCategoryCode,
  BackendIssueStatus,
  BackendPriority,
  BackendRoleName,
} from '@/contracts/api.types';

/**
 * Type aliases matching the standalone UI (`example/NaiSee/cham-pho/src/types/incident.ts`)
 * so a standalone frontend agent can integrate backend DTOs without breaking UI components.
 */
export type UiUserRole = 'citizen' | 'volunteer' | 'officer' | 'admin';
export type UiIncidentCategory = 'waste' | 'streetlight' | 'flooding' | 'road';
export type UiIncidentStatus =
  | 'new'
  | 'verifying'
  | 'in_progress'
  | 'resolved'
  | 'reopened';
export type UiIncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

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

