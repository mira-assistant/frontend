import { api } from '@mira/ui/shared/api/client';
import { ENDPOINTS } from '@mira/ui/shared/api/constants';
import { buildEndpoint, getClientIpAddresses, retryWithBackoff } from './utils';

// Types
interface ClientRegistration {
  client_id: string;
  metadata?: Record<string, unknown>;
}

interface ClientResponse {
  connected_at: string;
  metadata?: Record<string, unknown>;
}

export const serviceApi = {
  /**
   * Register client with network
   * POST /api/v1/service/clients
   */
  async registerClient(clientId: string): Promise<ClientResponse> {
    const ipAddresses = getClientIpAddresses();

    const registration: ClientRegistration = {
      client_id: clientId,
      metadata: {
        local_ip: ipAddresses.local,
        external_ip: ipAddresses.external,
      },
    };

    const { data } = await api.post<ClientResponse>(ENDPOINTS.SERVICE_CLIENTS, registration);
    return data;
  },

  /**
   * Deregister client from network
   * DELETE /api/v1/service/clients/{client_id}
   */
  async deregisterClient(clientId: string): Promise<void> {
    const endpoint = buildEndpoint(ENDPOINTS.SERVICE_CLIENT_BY_ID, { clientId });
    await api.delete(endpoint);
  },

  /**
   * Rename client
   * PATCH /api/v1/service/clients/{client_id}/rename
   */
  async renameClient(oldClientId: string, newClientId: string): Promise<ClientResponse> {
    const endpoint = buildEndpoint(ENDPOINTS.SERVICE_CLIENT_RENAME, { clientId: oldClientId });
    const { data } = await api.patch<ClientResponse>(endpoint, {
      new_client_id: newClientId,
    });
    return data;
  },

  /**
   * List all registered clients
   * GET /api/v1/service/clients
   */
  async listClients(): Promise<string[]> {
    const { data } = await api.get(ENDPOINTS.SERVICE_CLIENTS);
    return data;
  },

  /**
   * Enable service for network
   * PATCH /api/v1/service/network/enable
   */
  async enable(): Promise<void> {
    await api.patch(ENDPOINTS.SERVICE_NETWORK_ENABLE);
  },

  /**
   * Disable service for network with retry
   * PATCH /api/v1/service/network/disable
   */
  async disable(): Promise<void> {
    await retryWithBackoff(
      () => api.patch(ENDPOINTS.SERVICE_NETWORK_DISABLE)
    );
  },
};