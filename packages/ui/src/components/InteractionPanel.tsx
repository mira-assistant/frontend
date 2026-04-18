import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, X } from 'lucide-react';
import { Interaction, Person, Conversation } from '@dadei/ui/types/models.types';
import { personsApi } from '@dadei/ui/lib/api/persons';
import { interactionsApi } from '@dadei/ui/lib/api/interactions';
import { conversationsApi } from '@dadei/ui/lib/api/conversations';
import { useService } from '@dadei/ui/hooks/useService';
import { useToast } from '@dadei/ui/contexts/ToastContext';
import { subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';

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

type SplitDeleteGroup = 'interaction' | 'conversation';

function SplitDeleteToolbar({
  armed,
  onArm,
  onDisarm,
  onConfirm,
  group,
  idleTitle,
  idleAriaLabel,
}: {
  armed: boolean;
  onArm: () => void;
  onDisarm: () => void;
  onConfirm: () => void;
  group: SplitDeleteGroup;
  idleTitle: string;
  idleAriaLabel: string;
}) {
  const hoverVisible =
    group === 'interaction'
      ? 'group-hover/interaction:opacity-100'
      : 'group-hover/conv:opacity-100';

  return (
    <div
      data-split-delete
      className="relative h-9 w-[4.75rem] shrink-0 self-center"
      onClick={e => e.stopPropagation()}
    >
      <AnimatePresence initial={false} mode="wait">
        {armed ? (
          <motion.div
            key="del-armed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.09, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-end gap-0.5"
          >
            <button
              type="button"
              aria-label="Confirm delete"
              title="Confirm delete"
              onClick={e => {
                e.stopPropagation();
                onConfirm();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-emerald-400/95 transition-colors hover:bg-emerald-500/15 hover:text-emerald-300"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              title="Cancel"
              onClick={e => {
                e.stopPropagation();
                onDisarm();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-400/90 transition-colors hover:bg-rose-950/65 hover:text-rose-100"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="del-idle"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.09, ease: 'easeOut' }}
            title={idleTitle}
            aria-label={idleAriaLabel}
            onClick={e => {
              e.stopPropagation();
              onArm();
            }}
            className={`absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg text-rose-400/90 opacity-0 transition-[opacity,background-color,color] duration-150 hover:bg-rose-950/70 hover:text-rose-100 ${hoverVisible}`}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
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
    <div className="flex h-full flex-col overflow-hidden rounded-none bg-zinc-950/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-zinc-950/40 px-6 py-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-zinc-100">Interactions</h2>
          <button
            onClick={handleClearAll}
            disabled={conversationGroups.length === 0 || loading}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-300/95 transition-all duration-200 hover:border-emerald-500/45 hover:bg-emerald-950/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <i className="fas fa-trash" />
            Clear All
          </button>
        </div>

        {/* Interaction List */}
        <div ref={containerRef} className="flex-1 space-y-3 overflow-y-auto overscroll-none px-6 py-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <i className="fas fa-spinner fa-spin text-3xl text-emerald-400/80" />
            </div>
          ) : displayGroups.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <i className="fas fa-robot mb-4 text-5xl text-zinc-600 opacity-50" />
              <p className="mb-2 text-lg font-medium text-zinc-500">No conversations yet</p>
              <small className="text-sm text-zinc-600 opacity-90 font-secondary">
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
                  className="group/conv w-full min-w-0 max-w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-emerald-500/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  <div className="flex w-full min-w-0 items-center gap-3 border-b border-white/[0.08] bg-zinc-900/60 p-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center text-zinc-500 transition-colors group-hover/conv:text-emerald-400/90"
                        aria-hidden
                      >
                        <i
                          className={`fas fa-chevron-${group.isExpanded ? 'down' : 'right'} text-xs leading-none`}
                        />
                      </span>

                      {group.isActive ? (
                        <span
                          className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400"
                          aria-hidden
                        />
                      ) : null}

                      <div className="min-w-0 flex-1 overflow-hidden py-0.5">
                        <h3 className="text-sm font-semibold text-zinc-100">
                          <span className="block truncate" title={getConversationTitle(group)}>
                            {getConversationTitle(group)}
                          </span>
                        </h3>
                        {group.isActive && group.conversation?.topic_summary ? (
                          <p
                            className="mt-0.5 truncate text-xs text-zinc-500 font-secondary"
                            title={group.conversation.topic_summary}
                          >
                            {group.conversation.topic_summary}
                          </p>
                        ) : null}
                        {group.conversation?.context_summary ? (
                          <p
                            className="mt-0.5 truncate text-xs text-zinc-500 font-secondary"
                            title={group.conversation.context_summary}
                          >
                            {group.conversation.context_summary}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col items-end justify-center gap-0.5 text-xs text-zinc-500 font-secondary sm:flex-row sm:items-center sm:gap-4">
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
                      <SplitDeleteToolbar
                        group="conversation"
                        armed={armedConversationDeleteId === group.conversation.id}
                        onArm={() => {
                          setArmedInteractionDeleteId(null);
                          setArmedConversationDeleteId(group.conversation!.id);
                        }}
                        onDisarm={() => setArmedConversationDeleteId(null)}
                        onConfirm={() => void handleDeleteConversation(group.conversation!.id)}
                        idleTitle="Delete conversation"
                        idleAriaLabel="Delete conversation"
                      />
                    ) : null}
                  </div>

                  {/* No CSS transition on grid rows — animated 0fr/1fr caused intermittent width/height glitches. */}
                  <div
                    className={`grid w-full min-w-0 ${group.isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="min-h-0 overflow-hidden" inert={!group.isExpanded}>
                      <div className="w-full min-w-0 space-y-2 bg-zinc-950/50 p-4">
                        {group.interactions.map(interaction => {
                          const person = getPersonDisplay(interaction.person_id);
                          const colors = getPersonColor(person.index);

                          return (
                            <div
                              key={interaction.id}
                              className="group/interaction overflow-hidden rounded-lg border border-white/10 bg-zinc-900/70 transition-[border-color,box-shadow] duration-200 hover:border-emerald-500/25 hover:shadow-sm"
                            >
                              <div className="flex items-center gap-3 p-3">
                                <div
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                  style={{ backgroundColor: colors.border }}
                                >
                                  {person.label[0].toUpperCase()}
                                </div>

                                <div className="min-w-0 flex-1 self-center py-0.5">
                                  <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-secondary">
                                    <span className="text-xs font-semibold" style={{ color: colors.text }}>
                                      {person.label}
                                    </span>
                                    <span className="text-[10px] tabular-nums text-zinc-500">
                                      {formatLocalTime(interaction.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-sm leading-relaxed text-zinc-200">{interaction.text}</p>
                                </div>

                                <SplitDeleteToolbar
                                  group="interaction"
                                  armed={armedInteractionDeleteId === interaction.id}
                                  onArm={() => {
                                    setArmedConversationDeleteId(null);
                                    setArmedInteractionDeleteId(interaction.id);
                                  }}
                                  onDisarm={() => setArmedInteractionDeleteId(null)}
                                  onConfirm={() => void handleDeleteInteraction(interaction.id)}
                                  idleTitle="Delete interaction"
                                  idleAriaLabel="Delete interaction"
                                />
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
  );
}
