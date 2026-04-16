export interface Person {
  id: string;
  name: string | null;
  index: number;
  network_id: string;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  text: string;
  timestamp: string;
  network_id: string;
  person_id: string;
  conversation_id: string;
  sentiment: number | null;
}

export interface Conversation {
  id: string;
  started_at: string;
  topic_summary: string | null;
  context_summary: string | null;
  is_active: boolean;
}

// Toast notifications
export type ToastType = 'success' | 'error' | 'warning' | 'info';