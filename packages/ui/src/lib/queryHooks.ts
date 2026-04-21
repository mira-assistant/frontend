import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { actionsApi } from '@dadei/ui/lib/api/actions';
import { memoriesApi } from '@dadei/ui/lib/api/memories';
import { personsApi } from '@dadei/ui/lib/api/persons';
import { interactionsApi } from '@dadei/ui/lib/api/interactions';
import { conversationsApi } from '@dadei/ui/lib/api/conversations';
import { serviceApi } from '@dadei/ui/lib/api/service';
import { authApi } from '@dadei/ui/lib/api/auth';
import type { Conversation, Person } from '@dadei/ui/types/models.types';
import type { UserMe } from '@dadei/ui/types/auth.types';
import { queryKeys } from '@dadei/ui/lib/queryKeys';

const CONVERSATION_STALE_MS = 5 * 60_000;
const INTERACTIONS_BOOTSTRAP_STALE_MS = 30_000;

/** Recent conversation page size for the interaction panel bootstrap. */
export const INTERACTION_PANEL_RECENT_LIMIT = 10;

/** Shared options so every code path (useQueries, prefetch, realtime) hits the same cache shape. */
export function conversationQueryOptions(conversationId: string) {
  return {
    queryKey: queryKeys.conversationById(conversationId),
    queryFn: (): Promise<Conversation> => conversationsApi.getById(conversationId),
    staleTime: CONVERSATION_STALE_MS,
  };
}

export function removeAllConversationQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: queryKeys.conversations });
}

export function usePersonsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.persons,
    queryFn: () => personsApi.getAll(),
    enabled,
  });
}

export function usePersonQuery(personId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.personById(personId ?? ''),
    queryFn: () => personsApi.getById(personId ?? ''),
    enabled: Boolean(personId) && enabled,
  });
}

export function useRenamePersonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, name }: { personId: string; name: string }) =>
      personsApi.update(personId, { name }),
    onMutate: async ({ personId, name }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.persons });
      const previous = queryClient.getQueryData<Person[]>(queryKeys.persons);
      if (previous) {
        queryClient.setQueryData<Person[]>(
          queryKeys.persons,
          previous.map(person => (person.id === personId ? { ...person, name } : person))
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.persons, context.previous);
      }
    },
    onSuccess: updatedPerson => {
      queryClient.setQueryData<Person[]>(queryKeys.persons, previous =>
        (previous ?? []).map(person => (person.id === updatedPerson.id ? updatedPerson : person))
      );
      queryClient.setQueryData(queryKeys.personById(updatedPerson.id), updatedPerson);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.persons });
    },
  });
}

export function useDeletePersonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) => personsApi.delete(personId),
    onSuccess: (_data, personId) => {
      queryClient.setQueryData<Person[]>(queryKeys.persons, previous =>
        (previous ?? []).filter(person => person.id !== personId)
      );
      queryClient.removeQueries({ queryKey: queryKeys.personById(personId) });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.persons });
      void queryClient.invalidateQueries({ queryKey: queryKeys.interactions });
    },
  });
}

export function useInteractionsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.interactions,
    queryFn: () => interactionsApi.getAll(),
    enabled,
  });
}

export function useMemoriesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.memories,
    queryFn: () => memoriesApi.list({ limit: 100 }),
    enabled,
    staleTime: 30_000,
  });
}

export function useActionsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.actions,
    queryFn: () => actionsApi.list({ limit: 100, offset: 0 }),
    enabled,
    staleTime: 30_000,
  });
}

export function useRecentConversationsQuery(enabled = true, limit = INTERACTION_PANEL_RECENT_LIMIT) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.conversationsRecent(limit),
    queryFn: async (): Promise<Conversation[]> => {
      const rows = await conversationsApi.getRecent(limit, 0);
      for (const c of rows) {
        queryClient.setQueryData<Conversation>(queryKeys.conversationById(c.id), c);
      }
      return rows;
    },
    enabled,
    staleTime: CONVERSATION_STALE_MS,
  });
}

/**
 * Initial interaction load scoped to recent conversation IDs (plus orphans), for the interaction panel.
 */
export function useInteractionsBootstrapQuery(
  conversationIds: string[],
  enabled: boolean,
  limit?: number
) {
  const idsKey = [...conversationIds].sort().join('\u001f');
  return useQuery({
    queryKey: queryKeys.interactionsBootstrap(idsKey),
    queryFn: () => interactionsApi.getBootstrapForConversations(conversationIds, { limit }),
    enabled,
    staleTime: INTERACTIONS_BOOTSTRAP_STALE_MS,
  });
}

export function useConversationByIdQuery(conversationId: string | null | undefined, enabled = true) {
  const id = conversationId ?? '';
  return useQuery({
    ...conversationQueryOptions(id),
    enabled: Boolean(conversationId) && enabled,
  });
}

export function useServiceClientsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.serviceClients,
    queryFn: () => serviceApi.listClients(),
    enabled,
    staleTime: 30_000,
  });
}

export function useAuthMeQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.authMe,
    queryFn: (): Promise<UserMe> => authApi.me(),
    enabled,
  });
}
