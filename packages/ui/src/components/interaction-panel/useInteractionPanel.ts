import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { Conversation, Interaction, Person } from '@dadei/ui/types/models.types';
import { interactionsApi } from '@dadei/ui/lib/api/interactions';
import { conversationsApi } from '@dadei/ui/lib/api/conversations';
import { useService } from '@dadei/ui/contexts/ServiceContext';
import { useNotifications } from '@dadei/ui/contexts/NotificationContext';
import { subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';
import {
  conversationQueryOptions,
  removeAllConversationQueries,
  useInteractionsQuery,
  usePersonsQuery,
} from '@dadei/ui/lib/queryHooks';
import { queryKeys } from '@dadei/ui/lib/queryKeys';
import { ORPHAN_KEY, PERSON_COLOR_SHADES } from './constants';
import { activeConversationKey, groupKey, parseInteractionDate } from './conversationUtils';
import type { ConversationGroupState, ConversationGroupView } from './types';

function buildConversationGroups(
  interactions: Interaction[],
  conversationById: Map<string, Conversation>,
  previous: ConversationGroupState[] = []
): ConversationGroupState[] {
  const expandedByKey = new Map<string, boolean | undefined>();
  for (const group of previous) {
    expandedByKey.set(groupKey(group), group.isExpanded);
  }

  const grouped = new Map<string | null, Interaction[]>();
  for (const interaction of interactions) {
    const convId = interaction.conversation_id?.trim() || null;
    const existing = grouped.get(convId) ?? [];
    existing.push(interaction);
    grouped.set(convId, existing);
  }

  const groups: ConversationGroupState[] = [];
  for (const [conversationId, interactionGroup] of grouped.entries()) {
    const sortedInteractions = [...interactionGroup].sort(
      (a, b) =>
        parseInteractionDate(a.timestamp).getTime() -
        parseInteractionDate(b.timestamp).getTime()
    );
    const key = conversationId ?? ORPHAN_KEY;
    groups.push({
      conversation: conversationId ? conversationById.get(conversationId) ?? null : null,
      interactions: sortedInteractions,
      isExpanded: expandedByKey.get(key),
    });
  }

  groups.sort((a, b) => {
    const aTime = a.conversation?.started_at || a.interactions[0]?.timestamp || '';
    const bTime = b.conversation?.started_at || b.interactions[0]?.timestamp || '';
    return parseInteractionDate(bTime).getTime() - parseInteractionDate(aTime).getTime();
  });

  return groups;
}

export function useInteractionPanel() {
  const { isConnected } = useService();
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useNotifications();
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const interactionsQuery = useInteractionsQuery(isConnected);
  const personsQuery = usePersonsQuery(isConnected);
  const interactions = interactionsQuery.data ?? [];

  const conversationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const interaction of interactions) {
      const id = interaction.conversation_id?.trim();
      if (id) ids.add(id);
    }
    return Array.from(ids).sort();
  }, [interactions]);

  const conversationQueries = useQueries({
    queries: conversationIds.map(id => ({
      ...conversationQueryOptions(id),
      enabled: isConnected && Boolean(id),
    })),
  });

  const conversationById = useMemo(() => {
    const map = new Map<string, Conversation>();
    conversationIds.forEach((id, index) => {
      const row = conversationQueries[index];
      const data = row?.data;
      if (data) map.set(id, data);
    });
    return map;
  }, [conversationIds, conversationQueries]);

  const [conversationGroups, setConversationGroups] = useState<ConversationGroupState[]>([]);
  const loading = interactionsQuery.isLoading;
  const personsById = useMemo(
    () => new Map((personsQuery.data ?? []).map(person => [person.id, person])),
    [personsQuery.data]
  );

  const displayGroups: ConversationGroupView[] = useMemo(() => {
    const activeKey = activeConversationKey(conversationGroups);
    return conversationGroups.map(g => {
      const gkey = groupKey(g);
      const isActive = gkey === activeKey;
      const isExpanded = g.isExpanded !== undefined ? g.isExpanded : isActive;
      return { ...g, isActive, isExpanded };
    });
  }, [conversationGroups]);

  /** Only changes when interactions are added/removed/reordered — not on expand/collapse. */
  const interactionsScrollSignature = useMemo(
    () =>
      conversationGroups
        .flatMap(g => g.interactions)
        .map(i => i.id)
        .join('\u001f'),
    [conversationGroups]
  );

  const [armedInteractionDeleteId, setArmedInteractionDeleteId] = useState<string | null>(null);
  const [armedConversationDeleteId, setArmedConversationDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!armedInteractionDeleteId && !armedConversationDeleteId) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-split-delete]')) return;
      setArmedInteractionDeleteId(null);
      setArmedConversationDeleteId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setArmedInteractionDeleteId(null);
        setArmedConversationDeleteId(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [armedInteractionDeleteId, armedConversationDeleteId]);

  useEffect(() => {
    if (!isConnected) return;
    if (interactionsQuery.isError) {
      showToast('Failed to load interactions', 'error');
    }
  }, [interactionsQuery.isError, isConnected, showToast]);

  useEffect(() => {
    setConversationGroups(previous => buildConversationGroups(interactions, conversationById, previous));
  }, [interactions, conversationById]);

  useEffect(() => {
    if (!isConnected) return;

    const handleNewInteraction = (payload: { data?: Interaction }) => {
      const interaction = payload.data;
      if (!interaction) return;
      queryClient.setQueryData<Interaction[]>(queryKeys.interactions, prev => {
        if (!prev) return [interaction];
        if (prev.some(item => item.id === interaction.id)) return prev;
        return [...prev, interaction];
      });
      const convId = interaction.conversation_id?.trim();
      if (convId) {
        void queryClient.prefetchQuery(conversationQueryOptions(convId));
      }
    };

    const offWs = subscribeRealtimeMessages(msg => {
      if (msg.event !== 'interaction') return;
      const data = msg.data;
      if (!data || typeof data !== 'object') return;
      handleNewInteraction({ data: data as Interaction });
    });

    let offElectron: (() => void) | undefined;
    if (window.electronAPI?.onNewInteraction) {
      offElectron = window.electronAPI.onNewInteraction(handleNewInteraction);
    }

    return () => {
      offWs();
      if (offElectron) offElectron();
    };
  }, [isConnected, queryClient]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [interactionsScrollSignature]);

  const toggleConversation = (index: number) => {
    setConversationGroups(prev => {
      const activeKey = activeConversationKey(prev);
      return prev.map((g, i) => {
        if (i !== index) return g;
        const derived =
          g.isExpanded !== undefined ? g.isExpanded : groupKey(g) === activeKey;
        return { ...g, isExpanded: !derived };
      });
    });
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    try {
      await interactionsApi.delete(interactionId);
      queryClient.setQueryData<Interaction[]>(
        queryKeys.interactions,
        previous => (previous ?? []).filter(interaction => interaction.id !== interactionId)
      );

      showToast('Interaction deleted', 'success');
      setArmedInteractionDeleteId(null);
    } catch (error) {
      console.error('Failed to delete interaction:', error);
      showToast('Failed to delete interaction', 'error');
      setArmedInteractionDeleteId(null);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const group = conversationGroups.find(
        g => g.conversation?.id === conversationId || groupKey(g) === conversationId
      );
      if (!group) {
        setArmedConversationDeleteId(null);
        return;
      }

      await Promise.all(group.interactions.map(i => interactionsApi.delete(i.id)));
      const toRemove = new Set(group.interactions.map(interaction => interaction.id));
      queryClient.setQueryData<Interaction[]>(
        queryKeys.interactions,
        previous => (previous ?? []).filter(interaction => !toRemove.has(interaction.id))
      );
      queryClient.removeQueries({ queryKey: queryKeys.conversationById(conversationId) });

      showToast('Conversation deleted', 'success');
      setArmedConversationDeleteId(null);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      showToast('Failed to delete conversation', 'error');
      setArmedConversationDeleteId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      await Promise.all(
        conversationGroups.map(async group => {
          if (group.conversation) {
            await conversationsApi.delete(group.conversation.id);
          } else {
            await Promise.all(group.interactions.map(interaction => interactionsApi.delete(interaction.id)));
          }
        })
      );
      queryClient.setQueryData<Interaction[]>(queryKeys.interactions, []);
      removeAllConversationQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.persons });
      showToast('All interactions cleared', 'success');
    } catch (error) {
      console.error('Failed to clear:', error);
      showToast('Failed to clear interactions', 'error');
    }
  };

  const getPersonDisplay = (personId: string): { label: string; index: number } => {
    const person = personsById.get(personId);
    if (person?.name) return { label: person.name, index: person.index };
    if (person?.index !== undefined) return { label: `Person ${person.index}`, index: person.index };
    return { label: 'Loading...', index: 1 };
  };

  const getPersonColor = (personIndex: number) => {
    return PERSON_COLOR_SHADES[personIndex % PERSON_COLOR_SHADES.length];
  };

  return {
    containerRef,
    loading,
    conversationGroups,
    displayGroups,
    prefersReducedMotion,
    armedInteractionDeleteId,
    armedConversationDeleteId,
    setArmedInteractionDeleteId,
    setArmedConversationDeleteId,
    toggleConversation,
    handleDeleteInteraction,
    handleDeleteConversation,
    handleClearAll,
    getPersonDisplay,
    getPersonColor,
  };
}
