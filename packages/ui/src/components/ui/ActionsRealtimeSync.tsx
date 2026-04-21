import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';
import { queryKeys } from '@dadei/ui/lib/queryKeys';
import type { NetworkAction } from '@dadei/ui/types/models.types';

function isNetworkAction(data: unknown): data is NetworkAction {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.action_type === 'string' && typeof o.status === 'string';
}

/**
 * Keeps React Query `actions` in sync with WebSocket `action` events (same payload as banners).
 */
export default function ActionsRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const mergeAction = (action: NetworkAction) => {
      queryClient.setQueryData<NetworkAction[]>(queryKeys.actions, prev => {
        const list = prev ?? [];
        const idx = list.findIndex(a => a.id === action.id);
        if (idx === -1) {
          return [action, ...list];
        }
        const next = [...list];
        next[idx] = action;
        return next;
      });
    };

    const offWs = subscribeRealtimeMessages(msg => {
      if (msg.event !== 'action') return;
      if (!isNetworkAction(msg.data)) return;
      mergeAction(msg.data);
    });

    let offElectron: (() => void) | undefined;
    if (window.electronAPI?.onWebhookAction) {
      offElectron = window.electronAPI.onWebhookAction(payload => {
        if (!isNetworkAction(payload?.data)) return;
        mergeAction(payload.data);
      });
    }

    return () => {
      offWs();
      if (offElectron) offElectron();
    };
  }, [queryClient]);

  return null;
}
