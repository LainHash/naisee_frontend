import type {
  ApiEnvelope,
  BackendCategoryCode,
  BackendPriority,
} from '@/contracts/api.types';
import { apiClient } from '@/shared/api-client';

export interface DepartmentSummaryDto {
  publicId: string;
  code: string;
  name: string;
}

export interface CategoryDto {
  publicId: string;
  code: BackendCategoryCode | string;
  name: string;
  defaultPriority: BackendPriority;
  slaHours: number;
  icon: string | null;
  defaultDepartment: DepartmentSummaryDto | null;
}

export interface DepartmentDto {
  publicId: string;
  code: string;
  name: string;
  contactPhone: string | null;
  description: string | null;
}

/**
 * Headless Master Data SDK matching naisee_backend MasterDataController.
 */
export const masterDataApi = {
  getCategories(): Promise<ApiEnvelope<CategoryDto[]>> {
    return apiClient.get<CategoryDto[]>('/categories');
  },

  getDepartments(): Promise<ApiEnvelope<DepartmentDto[]>> {
    return apiClient.get<DepartmentDto[]>('/departments');
  },
};

