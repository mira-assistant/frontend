import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useService } from '@dadei/ui/contexts/ServiceContext';
import { subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';
import {
  ASSISTANT_ACTIONS_LIST_LIMIT,
  ASSISTANT_MEMORIES_LIST_LIMIT,
} from '@dadei/ui/lib/queryHooks';
import { queryKeys } from '@dadei/ui/lib/queryKeys';
import type { EpisodicMemory, NetworkAction } from '@dadei/ui/types/models.types';

function isEpisodicMemory(data: unknown): data is EpisodicMemory {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.canonical_text === 'string' && typeof o.status === 'string';
}

function isNetworkAction(data: unknown): data is NetworkAction {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.action_type === 'string' && typeof o.status === 'string';
}

/**
 * When the service client is connected, keeps React Query memory/action list caches in sync with
 * WebSocket `episodic_memory` and `action` events (same pattern as interaction/conversation updates
 * in the interaction panel).
 */
export default function NetworkMemoryRealtimeSync() {
  const { isConnected } = useService();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected) return;

    const memoryKey = queryKeys.memoriesList(ASSISTANT_MEMORIES_LIST_LIMIT);
    const actionKey = queryKeys.actionsList(ASSISTANT_ACTIONS_LIST_LIMIT, 0);

    const mergeMemory = (memory: EpisodicMemory) => {
      queryClient.setQueryData<EpisodicMemory[]>(memoryKey, prev => {
        const list = prev ?? [];
        if (memory.status === 'cancelled' || memory.status === 'expired') {
          return list.filter(m => m.id !== memory.id);
        }
        const idx = list.findIndex(m => m.id === memory.id);
        if (idx === -1) {
          return [memory, ...list];
        }
        const next = [...list];
        next[idx] = memory;
        return next;
      });
    };

    const mergeAction = (action: NetworkAction) => {
      queryClient.setQueryData<NetworkAction[]>(actionKey, prev => {
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
      if (msg.event === 'episodic_memory') {
        if (!isEpisodicMemory(msg.data)) return;
        mergeMemory(msg.data);
        return;
      }
      if (msg.event === 'action') {
        if (!isNetworkAction(msg.data)) return;
        mergeAction(msg.data);
      }
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
  }, [isConnected, queryClient]);

  return null;
}
