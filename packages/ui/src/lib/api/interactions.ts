import { api } from '@mira/ui/shared/api/client';
import { ENDPOINTS, API_CONFIG } from '@mira/ui/shared/api/constants';
import { buildEndpoint } from './utils';
import { Interaction } from '@mira/ui/types/models.types';

interface GetInteractionsParams {
  limit?: number;
  offset?: number;
}

export const interactionsApi = {
  /**
   * Get all interactions for the network
   * GET /api/v1/interactions
   */
  async getAll(params?: GetInteractionsParams): Promise<Interaction[]> {
    const { data } = await api.get<Interaction[]>(ENDPOINTS.INTERACTIONS, {
      params: {
        limit: params?.limit || 50,
        offset: params?.offset || 0,
      },
    });
    return data;
  },

  /**
   * Get interaction by ID
   * GET /api/v1/interactions/{interaction_id}
   */
  async getById(interactionId: string): Promise<Interaction> {
    const endpoint = buildEndpoint(ENDPOINTS.INTERACTION_BY_ID, { interactionId });
    const { data } = await api.get<Interaction>(endpoint);
    return data;
  },

  /**
   * Delete interaction
   * DELETE /api/v1/interactions/{interaction_id}
   */
  async delete(interactionId: string): Promise<void> {
    const endpoint = buildEndpoint(ENDPOINTS.INTERACTION_BY_ID, { interactionId });
    await api.delete(endpoint);
  },

  /**
   * Register interaction from audio
   * POST /api/v1/interactions/register
   *
   * Returns 204 No Content immediately
   * Actual interaction data is pushed over the realtime WebSocket
   */
  async register(
    audioData: ArrayBuffer,
    clientId: string,
  ): Promise<void> {
    const formData = new FormData();
    const blob = new Blob([audioData], { type: 'audio/wav' });
    formData.append('audio', blob, 'audio.wav');
    formData.append('client_id', clientId);

    try {
      await api.post(
        ENDPOINTS.INTERACTIONS_REGISTER,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: API_CONFIG.TIMEOUTS.INTERACTION,
          validateStatus: (status) => status === 204,
        }
      );
    } catch (error: any) {
      console.error('Failed to register interaction:', error);
    }
  },
};