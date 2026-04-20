export const queryKeys = {
  persons: ['persons'] as const,
  personById: (personId: string) => ['persons', personId] as const,
  interactions: ['interactions'] as const,
  /** Prefix for `conversationById`; use with `removeQueries` / `invalidateQueries` to affect all cached conversations. */
  conversations: ['conversations'] as const,
  conversationById: (conversationId: string) =>
    [...queryKeys.conversations, conversationId] as readonly ['conversations', string],
  serviceClients: ['service', 'clients'] as const,
  authMe: ['auth', 'me'] as const,
};
