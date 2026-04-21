import { api } from '@dadei/ui/shared/api/client';
import { ENDPOINTS } from '@dadei/ui/shared/api/constants';
import type { NetworkAction } from '@dadei/ui/types/models.types';

export interface ListActionsParams {
  limit?: number;
  offset?: number;
}

export const actionsApi = {
  async list(params?: ListActionsParams): Promise<NetworkAction[]> {
    const { data } = await api.get<NetworkAction[]>(ENDPOINTS.MEMORY_ACTIONS, {
      params: {
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
      },
    });
    return data;
  },
};
