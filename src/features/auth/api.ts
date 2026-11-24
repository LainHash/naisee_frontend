import type { ApiEnvelope, BackendRoleName } from '@/contracts/api.types';
import { apiClient, setStoredToken } from '@/shared/api-client';

export interface AuthUserDto {
  publicId: string;
  fullName: string;
  phone: string;
  role: BackendRoleName;
  departmentId: number | null;
  ward: string;
  largeTextMode: boolean;
  isActive: boolean;
}

export interface AuthResponseDto {
  accessToken: string;
  user: AuthUserDto;
}

export interface RoleDto {
  publicId: string;
  name: BackendRoleName;
  description: string | null;
}

export interface StaffCheckDto {
  allowed: boolean;
  role: BackendRoleName;
}

/**
 * Headless Auth & RBAC SDK matching naisee_backend AuthController.
 * Standalone frontend agents can import/copy these functions directly.
 */
export const authApi = {
  async login(phone: string, password?: string): Promise<ApiEnvelope<AuthResponseDto>> {
    const res = await apiClient.post<AuthResponseDto>('/auth/login', {
      phone,
      ...(password ? { password } : {}),
    });
    if (res.success) {
      setStoredToken(res.data.accessToken);
    }
    return res;
  },

  async demoSwitch(
    role: Extract<BackendRoleName, 'CITIZEN' | 'STAFF' | 'VOLUNTEER'>,
  ): Promise<ApiEnvelope<AuthResponseDto>> {
    const res = await apiClient.post<AuthResponseDto>('/auth/demo-switch', {
      role,
    });
    if (res.success) {
      setStoredToken(res.data.accessToken);
    }
    return res;
  },

  me(): Promise<ApiEnvelope<AuthUserDto>> {
    return apiClient.get<AuthUserDto>('/auth/me');
  },

  updatePreferences(largeTextMode: boolean): Promise<ApiEnvelope<AuthUserDto>> {
    return apiClient.patch<AuthUserDto>('/auth/me/preferences', {
      largeTextMode,
    });
  },

  getRoles(): Promise<ApiEnvelope<RoleDto[]>> {
    return apiClient.get<RoleDto[]>('/roles');
  },

  staffCheck(): Promise<ApiEnvelope<StaffCheckDto>> {
    return apiClient.get<StaffCheckDto>('/auth/staff-check');
  },

  logout(): void {
    setStoredToken(null);
  },
};

