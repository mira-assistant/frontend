import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Conversation, Interaction, Person } from '@dadei/ui/types/models.types';
import { personsApi } from '@dadei/ui/lib/api/persons';
import { interactionsApi } from '@dadei/ui/lib/api/interactions';
import { conversationsApi } from '@dadei/ui/lib/api/conversations';
import { useService } from '@dadei/ui/contexts/ServiceContext';
import { useNotifications } from '@dadei/ui/contexts/NotificationContext';
import { subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';
import { ORPHAN_KEY, PERSON_COLOR_SHADES } from './constants';
import {
  activeConversationKey,
  appendDedupe,
  findGroupIndex,
  groupKey,
  parseInteractionDate,
} from './conversationUtils';
import type { ConversationGroupState, ConversationGroupView } from './types';

export function useInteractionPanel() {
  const { isConnected } = useService();
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useNotifications();
  const prefersReducedMotion = useReducedMotion();

  const [conversationGroups, setConversationGroups] = useState<ConversationGroupState[]>([]);
  const [persons, setPersons] = useState<Map<string, Person>>(new Map());
  const [loading, setLoading] = useState(false);

  const displayGroups: ConversationGroupView[] = useMemo(() => {
    const activeKey = activeConversationKey(conversationGroups);
    return conversationGroups.map(g => {
      const gkey = groupKey(g);
      const isActive = gkey === activeKey;
      const isExpanded = g.isExpanded !== undefined ? g.isExpanded : isActive;
      return { ...g, isActive, isExpanded };
    });
  }, [conversationGroups]);

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

    const loadData = async () => {
      setLoading(true);
      try {
        const interactions = await interactionsApi.getAll();

        const conversationIds = new Set<string>();
        const interactionGroups = new Map<string | null, Interaction[]>();

        interactions.forEach(interaction => {
          const convId = interaction.conversation_id;
          if (convId) conversationIds.add(convId);

          const existing = interactionGroups.get(convId) || [];
          interactionGroups.set(convId, [...existing, interaction]);
        });

        const conversationMap = new Map<string, Conversation>();
        if (conversationIds.size > 0) {
          const conversations = await Promise.all(
            Array.from(conversationIds).map(id => conversationsApi.getById(id).catch(() => null))
          );

          conversations.forEach(conv => {
            if (conv) conversationMap.set(conv.id, conv);
          });
        }

        const groups: ConversationGroupState[] = [];

        for (const [conversationId, groupInteractions] of interactionGroups.entries()) {
          const sortedInteractions = groupInteractions.sort(
            (a, b) =>
              parseInteractionDate(a.timestamp).getTime() -
              parseInteractionDate(b.timestamp).getTime()
          );

          if (conversationId === null) {
            groups.push({
              conversation: null,
              interactions: sortedInteractions,
            });
          } else {
            const conversation = conversationMap.get(conversationId) ?? null;
            groups.push({
              conversation,
              interactions: sortedInteractions,
            });
          }
        }

        groups.sort((a, b) => {
          const aTime = a.conversation?.started_at || a.interactions[0]?.timestamp || '';
          const bTime = b.conversation?.started_at || b.interactions[0]?.timestamp || '';
          return parseInteractionDate(bTime).getTime() - parseInteractionDate(aTime).getTime();
        });

        setConversationGroups(groups);
      } catch (error) {
        console.error('Failed to load data:', error);
        showToast('Failed to load interactions', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isConnected, showToast]);

  useEffect(() => {
    if (!isConnected) return;

    const handleNewInteraction = async (payload: { data?: Interaction }) => {
      const interaction = payload.data;
      if (!interaction) return;

      let handledSync = false;
      setConversationGroups(prev => {
        const idx = findGroupIndex(prev, interaction);
        if (idx !== -1) {
          handledSync = true;
          return appendDedupe(prev, idx, interaction, null);
        }
        if (!interaction.conversation_id?.trim()) {
          handledSync = true;
          const orphanIdx = prev.findIndex(g => groupKey(g) === ORPHAN_KEY);
          if (orphanIdx !== -1) {
            return appendDedupe(prev, orphanIdx, interaction, null);
          }
          return [
            {
              conversation: null,
              interactions: [interaction],
            },
            ...prev,
          ];
        }
        return prev;
      });

      if (handledSync) {
        return;
      }

      const convId = interaction.conversation_id!.trim();

      try {
        const conversation = await conversationsApi.getById(convId);

        setConversationGroups(prev => {
          const idx = findGroupIndex(prev, interaction);
          if (idx !== -1) {
            return appendDedupe(prev, idx, interaction, conversation);
          }
          const nextGroup: ConversationGroupState = {
            conversation,
            interactions: [interaction],
          };
          return [nextGroup, ...prev];
        });
      } catch (error) {
        console.error('Failed to fetch new conversation:', error);

        setConversationGroups(prev => {
          const idx = findGroupIndex(prev, interaction);
          if (idx !== -1) {
            return appendDedupe(prev, idx, interaction, null);
          }
          return [
            {
              conversation: null,
              interactions: [interaction],
            },
            ...prev,
          ];
        });
      }
    };

    const offWs = subscribeRealtimeMessages(msg => {
      if (msg.event !== 'interaction') return;
      const data = msg.data;
      if (!data || typeof data !== 'object') return;
      void handleNewInteraction({ data: data as Interaction });
    });

    let offElectron: (() => void) | undefined;
    if (window.electronAPI?.onNewInteraction) {
      offElectron = window.electronAPI.onNewInteraction(handleNewInteraction);
    }

    return () => {
      offWs();
      if (offElectron) offElectron();
    };
  }, [isConnected]);

  useEffect(() => {
    const fetchMissingPersons = async () => {
      const allInteractions = conversationGroups.flatMap(g => g.interactions);
      const personIds = new Set(
        allInteractions
          .map(i => i.person_id)
          .filter((id): id is string => id !== null && id !== undefined)
      );

      const missingIds = Array.from(personIds).filter(id => !persons.has(id));
      if (missingIds.length === 0) return;

      try {
        const fetchedPersons = await Promise.all(
          missingIds.map(id => personsApi.getById(id).catch(() => null))
        );

        setPersons(prev => {
          const newMap = new Map(prev);
          fetchedPersons.forEach((person, idx) => {
            if (person) newMap.set(missingIds[idx], person);
          });
          return newMap;
        });
      } catch (error) {
        console.error('Failed to fetch persons:', error);
      }
    };

    fetchMissingPersons();
  }, [conversationGroups, persons]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [conversationGroups]);

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

      setConversationGroups(prev =>
        prev
          .map(group => ({
            ...group,
            interactions: group.interactions.filter(i => i.id !== interactionId),
          }))
          .filter(group => group.interactions.length > 0)
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

      setConversationGroups(prev => prev.filter(g => groupKey(g) !== conversationId));

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
      const allInteractions = conversationGroups.flatMap(g => g.interactions);
      await Promise.all(allInteractions.map(i => interactionsApi.delete(i.id)));
      setConversationGroups([]);
      setPersons(new Map());
      showToast('All interactions cleared', 'success');
    } catch (error) {
      console.error('Failed to clear:', error);
      showToast('Failed to clear interactions', 'error');
    }
  };

  const getPersonDisplay = (personId: string): { label: string; index: number } => {
    const person = persons.get(personId);
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
