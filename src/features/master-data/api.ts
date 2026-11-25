import type {
  ApiEnvelope,
  BackendAdministrativeUnitType,
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

export interface GeoJsonPolygonGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface WardDto {
  publicId: string;
  code: string;
  name: string;
  unitType: BackendAdministrativeUnitType;
  provinceName: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  bbox: [number, number, number, number];
  isActive: boolean;
  boundaryGeoJson?: GeoJsonPolygonGeometry | null;
}

export interface ResolveWardResponseDto {
  inServiceArea: boolean;
  ward: WardDto | null;
}

export interface QueryWardsParams {
  unitType?: BackendAdministrativeUnitType;
  includeBoundary?: boolean;
  includeInactive?: boolean;
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
 * Headless Master Data SDK matching naisee_backend MasterDataController.
 */
export const masterDataApi = {
  getCategories(): Promise<ApiEnvelope<CategoryDto[]>> {
    return apiClient.get<CategoryDto[]>('/categories');
  },

  getDepartments(): Promise<ApiEnvelope<DepartmentDto[]>> {
    return apiClient.get<DepartmentDto[]>('/departments');
  },

  getWards(params: QueryWardsParams = {}): Promise<ApiEnvelope<WardDto[]>> {
    return apiClient.get<WardDto[]>(`/wards${toQueryString({ ...params })}`);
  },

  resolveWard(
    lat: number,
    lng: number,
  ): Promise<ApiEnvelope<ResolveWardResponseDto>> {
    return apiClient.get<ResolveWardResponseDto>(
      `/wards/resolve${toQueryString({ lat, lng })}`,
    );
  },
};
