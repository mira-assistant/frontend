import { api } from '@dadei/ui/shared/api/client';
import { ENDPOINTS } from '@dadei/ui/shared/api/constants';
import type { EpisodicMemory } from '@dadei/ui/types/models.types';

export interface ListMemoriesParams {
  limit?: number;
}

export const memoriesApi = {
  async list(params?: ListMemoriesParams): Promise<EpisodicMemory[]> {
    const { data } = await api.get<EpisodicMemory[]>(ENDPOINTS.MEMORIES, {
      params: { limit: params?.limit ?? 100 },
    });
    return data;
  },
};
