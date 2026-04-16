import { api } from '@mira/ui/shared/api/client';
import { ENDPOINTS } from '@mira/ui/shared/api/constants';
import { buildEndpoint } from '@mira/ui/lib/api/utils';
import { Conversation } from '@mira/ui/types/models.types';

export const conversationsApi = {
  /**
   * Get all conversations for network
   * GET /api/v1/conversations
   */
  async getAll(): Promise<Conversation[]> {
    const { data } = await api.get<Conversation[]>(ENDPOINTS.CONVERSATIONS);
    return data;
  },

  /**
   * Get conversation by ID
   * GET /api/v1/conversations/{conversation_id}
   */
  async getById(conversationId: string): Promise<Conversation> {
    const endpoint = buildEndpoint(ENDPOINTS.CONVERSATION_BY_ID, { conversationId });
    const { data } = await api.get<Conversation>(endpoint);
    return data;
  },

  /**
   * Delete a conversation by ID
   * DELETE /api/v1/conversations/{conversation_id}
   */
  async delete(conversationId: string): Promise<void> {
    const endpoint = buildEndpoint(ENDPOINTS.CONVERSATION_BY_ID, { conversationId });
    await api.delete(endpoint);
  },
};