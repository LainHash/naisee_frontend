import type {
  ApiEnvelope,
  BackendCategoryCode,
  BackendPriority,
} from '@/contracts/api.types';
import { apiClient } from '@/shared/api-client';

export interface ClassifyImageResultDto {
  categoryPublicId: string;
  categoryCode: BackendCategoryCode | string;
  categoryName: string;
  confidence: number;
  suggestedTitle: string;
  suggestedPriority: BackendPriority;
  isMocked: boolean;
}

/**
 * Headless AI classification SDK matching naisee_backend AiController.
 */
export const aiApi = {
  classifyImage(
    imageUrl: string,
    hint?: string,
  ): Promise<ApiEnvelope<ClassifyImageResultDto>> {
    return apiClient.post<ClassifyImageResultDto>('/ai/classify-image', {
      imageUrl,
      ...(hint ? { hint } : {}),
    });
  },
};

