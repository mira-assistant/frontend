import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';
import { queryKeys } from '@dadei/ui/lib/queryKeys';
import type { EpisodicMemory } from '@dadei/ui/types/models.types';

function isEpisodicMemory(data: unknown): data is EpisodicMemory {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.canonical_text === 'string' && typeof o.status === 'string';
}

/**
 * Keeps React Query `memories` in sync with WebSocket `episodic_memory` events.
 */
export default function EpisodicMemoryRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeRealtimeMessages(msg => {
      if (msg.event !== 'episodic_memory') return;
      if (!isEpisodicMemory(msg.data)) return;
      const memory = msg.data;

      queryClient.setQueryData<EpisodicMemory[]>(queryKeys.memories, prev => {
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
    });
  }, [queryClient]);

  return null;
}
