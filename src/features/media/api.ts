import type { ApiEnvelope, BackendMediaStage } from '@/contracts/api.types';
import { apiClient } from '@/shared/api-client';

export interface UploadMediaResponseDto {
  url: string;
  stage: BackendMediaStage;
}

/**
 * Headless Media SDK uploading multipart images to Cloudinary via naisee_backend.
 */
export const mediaApi = {
  upload(
    file: File,
    stage: BackendMediaStage = 'BEFORE',
  ): Promise<ApiEnvelope<UploadMediaResponseDto>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('stage', stage);
    return apiClient.post<UploadMediaResponseDto>('/media/upload', formData);
  },
};

