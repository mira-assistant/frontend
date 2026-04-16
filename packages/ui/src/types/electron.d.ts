/** Payload for `event: action` webhooks from the backend. */
export interface ActionWebhookPayload {
  id: string;
  action_type: string;
  details: string | null;
  status: string;
  scheduled_time: string | null;
  completed_time: string | null;
  created_at: string;
  updated_at: string;
  person_id: string;
  interaction_id: string;
  conversation_id: string;
  network_id: string;
}

export interface ElectronAPI {
  storeTokens: (accessToken: string, refreshToken: string) => Promise<{ success: boolean; error?: string }>;
  getTokens: () => Promise<{ success: boolean; tokens?: { accessToken: string | null; refreshToken: string | null }; error?: string }>;
  clearTokens: () => Promise<{ success: boolean; error?: string }>;
  hasTokens: () => Promise<{ success: boolean; hasTokens?: boolean; error?: string }>;
  onAppClosing: (callback: () => void) => void;
  onNewInteraction: (callback: (payload: any) => void) => () => void;
  onWebhookAction: (callback: (payload: { event?: string; data?: ActionWebhookPayload }) => void) => () => void;
  onServiceStatusChanged: (callback: (status: { enabled: boolean }) => void) => () => void;
  loginWithGoogle: () => Promise<{ success: boolean; data?: { code: string; state: string }; error?: string }>;
  loginWithGitHub: () => Promise<{ success: boolean; code?: string; error?: string }>;
  storeClientName: (clientName: string) => Promise<{ success: boolean; error?: string }>;
  getClientName: () => Promise<{ success: boolean; clientName?: string; error?: string }>;
  deregisterClient: () => VoidFunction;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}