
import { useEffect, useMemo, useRef, useState } from 'react';
import { Interaction, Person, Conversation } from '@mira/ui/types/models.types';
import { personsApi } from '@mira/ui/lib/api/persons';
import { interactionsApi } from '@mira/ui/lib/api/interactions';
import { conversationsApi } from '@mira/ui/lib/api/conversations';
import { useService } from '@mira/ui/hooks/useService';
import { useToast } from '@mira/ui/contexts/ToastContext';
import Modal from '@mira/ui/components/ui/Modal';
import { subscribeRealtimeMessages } from '@mira/ui/lib/realtimeClient';

const ORPHAN_KEY = '__orphan__';

/**
 * Parse API datetimes for display and sorting. Strings without a timezone are treated as UTC
 * (common for SQLAlchemy/FastAPI naive UTC), then `toLocale*` shows the user's local time.
 */
function parseInteractionDate(iso: string | undefined | null): Date {
  if (iso == null || String(iso).trim() === '') {
    return new Date(NaN);
  }
  const s = String(iso).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?$/.test(s)) {
    return new Date(`${s}Z`);
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,9})?$/.test(s)) {
    return new Date(`${s.replace(' ', 'T')}Z`);
  }
  return new Date(s);
}

function formatLocalTime(iso: string | undefined | null): string {
  const d = parseInteractionDate(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatLocalDate(iso: string | undefined | null): string {
  const d = parseInteractionDate(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/** Stable bucket id: conversation row id, else first known interaction conversation_id, else orphan sentinel. */
function groupKey(g: { conversation: Conversation | null; interactions: Interaction[] }): string {
  if (g.conversation?.id) return g.conversation.id;
  const cid = g.interactions.find(i => i.conversation_id?.trim())?.conversation_id?.trim();
  return cid || ORPHAN_KEY;
}

function interactionKey(i: Interaction): string {
  return i.conversation_id?.trim() || ORPHAN_KEY;
}

function latestInteraction(groups: { interactions: Interaction[] }[]): Interaction | null {
  const all = groups.flatMap(g => g.interactions);
  if (all.length === 0) return null;
  return all.reduce((a, b) =>
    parseInteractionDate(b.timestamp).getTime() > parseInteractionDate(a.timestamp).getTime()
      ? b
      : a
  );
}

function activeConversationKey(groups: { interactions: Interaction[] }[]): string {
  const latest = latestInteraction(groups);
  return latest ? interactionKey(latest) : ORPHAN_KEY;
}

function findGroupIndex(
  groups: { conversation: Conversation | null; interactions: Interaction[] }[],
  interaction: Interaction
): number {
  const key = interactionKey(interaction);
  return groups.findIndex(g => groupKey(g) === key);
}

function appendDedupe(
  groups: ConversationGroupState[],
  index: number,
  interaction: Interaction,
  conversation: Conversation | null
): ConversationGroupState[] {
  const group = groups[index];
  if (group.interactions.some(i => i.id === interaction.id)) {
    return groups;
  }
  const next = [...groups];
  next[index] = {
    ...group,
    conversation: conversation ?? group.conversation,
    interactions: [...group.interactions, interaction],
  };
  return next;
}

interface ConversationGroupState {
  conversation: Conversation | null;
  interactions: Interaction[];
  /** When set, user has toggled expand/collapse; otherwise UI derives from active conversation */
  isExpanded?: boolean;
}

interface ConversationGroupView extends ConversationGroupState {
  isActive: boolean;
  isExpanded: boolean;
}

export default function InteractionPanel() {
  const { isConnected } = useService();
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

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

  // Delete modals
  const [deleteInteractionModal, setDeleteInteractionModal] = useState<string | null>(null);
  const [deleteConversationModal, setDeleteConversationModal] = useState<string | null>(null);

  const greenShades = [
    { background: '#f0fffa', border: '#00ff88', text: '#00cc6a' },
    { background: '#e6fffa', border: '#00e074', text: '#00b359' },
    { background: '#dcfdf7', border: '#00d15a', text: '#009944' },
    { background: '#d1fae5', border: '#00c249', text: '#007f30' },
  ];

  // Load interactions and build conversation groups
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
            Array.from(conversationIds).map(id =>
              conversationsApi.getById(id).catch(() => null)
            )
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
          return (
            parseInteractionDate(bTime).getTime() - parseInteractionDate(aTime).getTime()
          );
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

  // New interactions: WebSocket + optional Electron IPC (legacy)
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

  // Fetch person details
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

  // Auto-scroll to bottom
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
    } catch (error) {
      console.error('Failed to delete interaction:', error);
      showToast('Failed to delete interaction', 'error');
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const group = conversationGroups.find(
        g => g.conversation?.id === conversationId || groupKey(g) === conversationId
      );
      if (!group) return;

      await Promise.all(group.interactions.map(i => interactionsApi.delete(i.id)));

      setConversationGroups(prev => prev.filter(g => groupKey(g) !== conversationId));

      showToast('Conversation deleted', 'success');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      showToast('Failed to delete conversation', 'error');
    }
  };

  const getConversationTitle = (group: ConversationGroupView): string => {
    if (group.isActive) return 'Active Conversation';
    if (group.conversation?.topic_summary) return group.conversation.topic_summary;
    if (!group.conversation && group.interactions.length > 0) return 'Untitled Conversation';
    return 'Conversation';
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
    return greenShades[personIndex % greenShades.length];
  };

  return (
    <>
      <div className="flex flex-col h-full bg-linear-to-br from-white to-[#f0fffa] rounded-none overflow-hidden border-l border-[#80ffdb]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-[#80ffdb] bg-linear-to-r from-[#f0fffa] to-white">
          <h2 className="text-xl font-semibold text-[#1f2937]">Interactions</h2>
          <button
            onClick={handleClearAll}
            disabled={conversationGroups.length === 0 || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#00cc6a] bg-[#f0fffa] border border-[#80ffdb] rounded-lg transition-all duration-200 hover:bg-[#e6fffa] hover:text-[#00b359] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-trash" />
            Clear All
          </button>
        </div>

        {/* Interaction List */}
        <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <i className="fas fa-spinner fa-spin text-3xl text-[#00cc6a]" />
            </div>
          ) : displayGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <i className="fas fa-robot text-5xl text-[#9ca3af] opacity-50 mb-4" />
              <p className="text-lg font-medium text-[#9ca3af] mb-2">No conversations yet</p>
              <small className="text-sm text-[#9ca3af] opacity-80">
                Start speaking to interact with your AI assistant
              </small>
            </div>
          ) : (
            displayGroups.map((group, groupIndex) => (
              <div key={group.conversation?.id || `orphan-${groupIndex}`} className="min-w-0 space-y-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleConversation(groupIndex)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleConversation(groupIndex);
                    }
                  }}
                  className="w-full min-w-0 max-w-full cursor-pointer overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-[#00ff88] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f0fffa]"
                >
                  <div className="flex w-full min-w-0 items-center gap-3 border-b border-[#e5e7eb] bg-linear-to-r from-[#f9fafb] to-white p-4">
                    <div className="group/header flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center text-[#6b7280] transition-colors group-hover/header:text-[#00cc6a]"
                        aria-hidden
                      >
                        <i
                          className={`fas fa-chevron-${group.isExpanded ? 'down' : 'right'} text-xs leading-none`}
                        />
                      </span>

                      {group.isActive ? (
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#00ff88] animate-pulse"
                          aria-hidden
                        />
                      ) : null}

                      <div className="min-w-0 flex-1 overflow-hidden py-0.5">
                        <h3 className="text-sm font-semibold text-[#1f2937]">
                          <span className="block truncate" title={getConversationTitle(group)}>
                            {getConversationTitle(group)}
                          </span>
                        </h3>
                        {group.isActive && group.conversation?.topic_summary ? (
                          <p
                            className="mt-0.5 truncate text-xs text-[#9ca3af]"
                            title={group.conversation.topic_summary}
                          >
                            {group.conversation.topic_summary}
                          </p>
                        ) : null}
                        {group.conversation?.context_summary ? (
                          <p
                            className="mt-0.5 truncate text-xs text-[#9ca3af]"
                            title={group.conversation.context_summary}
                          >
                            {group.conversation.context_summary}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col items-end justify-center gap-0.5 text-xs text-[#9ca3af] sm:flex-row sm:items-center sm:gap-4">
                        <span className="flex items-center gap-1 whitespace-nowrap tabular-nums">
                          <i className="fas fa-comment text-[11px] opacity-80" aria-hidden />
                          {group.interactions.length}
                        </span>
                        <span className="whitespace-nowrap">
                          {formatLocalDate(
                            group.conversation?.started_at || group.interactions[0]?.timestamp
                          )}
                        </span>
                      </div>
                    </div>

                    {group.conversation ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteConversationModal(group.conversation!.id);
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Delete conversation"
                      >
                        <i className="fas fa-trash text-xs" aria-hidden />
                      </button>
                    ) : null}
                  </div>

                  {/* No CSS transition on grid rows — animated 0fr/1fr caused intermittent width/height glitches. */}
                  <div
                    className={`grid w-full min-w-0 ${group.isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="min-h-0 overflow-hidden" inert={!group.isExpanded}>
                      <div className="w-full min-w-0 space-y-2 bg-[#fafbfc] p-4">
                        {group.interactions.map(interaction => {
                          const person = getPersonDisplay(interaction.person_id);
                          const colors = getPersonColor(person.index);

                          return (
                            <div
                              key={interaction.id}
                              className="group/interaction overflow-hidden rounded-lg border border-[#e5e7eb] bg-white transition-[border-color,box-shadow] duration-200 hover:border-[#80ffdb] hover:shadow-sm"
                            >
                              <div className="flex items-center gap-3 p-3">
                                <div
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                  style={{ backgroundColor: colors.border }}
                                >
                                  {person.label[0].toUpperCase()}
                                </div>

                                <div className="min-w-0 flex-1 self-center py-0.5">
                                  <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                    <span
                                      className="text-xs font-semibold"
                                      style={{ color: colors.text }}
                                    >
                                      {person.label}
                                    </span>
                                    <span className="text-[10px] tabular-nums text-[#9ca3af]">
                                      {formatLocalTime(interaction.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-sm leading-relaxed text-[#1f2937]">
                                    {interaction.text}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setDeleteInteractionModal(interaction.id);
                                  }}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-md text-red-400 opacity-0 transition-[opacity,background-color,color] duration-200 group-hover/interaction:opacity-100 hover:bg-red-50 hover:text-red-600"
                                  title="Delete interaction"
                                >
                                  <i className="fas fa-trash text-xs" aria-hidden />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Interaction Modal */}
      <Modal
        isOpen={deleteInteractionModal !== null}
        onClose={() => setDeleteInteractionModal(null)}
        onConfirm={() => {
          if (deleteInteractionModal) handleDeleteInteraction(deleteInteractionModal);
          setDeleteInteractionModal(null);
        }}
        title="Delete Interaction"
        message="Are you sure you want to delete this interaction? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Delete Conversation Modal */}
      <Modal
        isOpen={deleteConversationModal !== null}
        onClose={() => setDeleteConversationModal(null)}
        onConfirm={() => {
          if (deleteConversationModal) handleDeleteConversation(deleteConversationModal);
          setDeleteConversationModal(null);
        }}
        title="Delete Conversation"
        message="Are you sure you want to delete this entire conversation? All interactions will be permanently deleted."
        confirmText="Delete Conversation"
        variant="danger"
      />
    </>
  );
}
