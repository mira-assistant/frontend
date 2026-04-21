
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@dadei/ui/contexts/AuthContext';
import { useNotifications } from '@dadei/ui/contexts/NotificationContext';
import { serviceApi } from '@dadei/ui/lib/api/service';
import { getStoredClientName, setStoredClientName } from '@dadei/ui/lib/clientNameStorage';
import { startRealtimeClient, stopRealtimeClient, subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';
import { webTokenStore } from '@dadei/ui/lib/webTokenStore';
import { useQueryClient } from '@tanstack/react-query';
import { clearAssistantSessionCaches } from '@dadei/ui/lib/queryHooks';
import { queryKeys } from '@dadei/ui/lib/queryKeys';

interface ServiceContextType {
  isServiceEnabled: boolean;
  isConnected: boolean;
  /** True when POST /service/clients returned 409 (client id already registered). */
  registrationConflict: boolean;
  clientName: string;
  toggleService: () => Promise<void>;
  setClientName: (name: string) => void;
  isTogglingService: boolean;
}

export const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

const ENABLE_TIMEOUT_MS = 5000;
const DEFAULT_CLIENT_PREFIX = 'client';
const AUTO_NAME_PATTERN = /^client\d+$/;
const FALLBACK_DEFAULT_CLIENT_NAME = `${DEFAULT_CLIENT_PREFIX}1`;
const MAX_AUTO_NAME_REGISTER_ATTEMPTS = 5;

function pickFirstAvailableClientName(existing: string[]): string {
  const used = new Set<number>();
  for (const name of existing) {
    const match = AUTO_NAME_PATTERN.exec(name);
    if (!match) continue;
    const value = Number(name.slice(DEFAULT_CLIENT_PREFIX.length));
    if (Number.isInteger(value) && value > 0) {
      used.add(value);
    }
  }

  for (let i = 1; i < 10_000; i += 1) {
    if (!used.has(i)) {
      return `${DEFAULT_CLIENT_PREFIX}${i}`;
    }
  }

  return `${DEFAULT_CLIENT_PREFIX}${Date.now()}`;
}

async function resolveAutoClientName(): Promise<string> {
  const existing = await serviceApi.listClients();
  return pickFirstAvailableClientName(existing);
}

function readInitialClientName(): string {
  if (typeof window === 'undefined' || window.electronAPI) {
    return FALLBACK_DEFAULT_CLIENT_NAME;
  }
  return getStoredClientName() || FALLBACK_DEFAULT_CLIENT_NAME;
}

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading, getAccessToken } = useAuth();
  const { showToast } = useNotifications();
  const queryClient = useQueryClient();
  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  const [isServiceEnabled, setIsServiceEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [clientName, setClientName] = useState(readInitialClientName);
  /** False until persisted identity has been applied (see mount effect). */
  const [isClientIdentityReady, setIsClientIdentityReady] = useState(false);
  const [isTogglingService, setIsTogglingService] = useState(false);
  const [registrationConflict, setRegistrationConflict] = useState(false);
  const shouldResolveAutoClientNameRef = useRef(
    Boolean(
      typeof window !== 'undefined' &&
      !window.electronAPI &&
      !getStoredClientName()
    )
  );

  const enableTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRegisteredRef = useRef(false);
  /** Latest client id for stale checks after async register. */
  const clientNameRef = useRef(clientName);
  clientNameRef.current = clientName;
  /** Used for unload/DELETE so deregister effect does not depend on `clientName` (rename must not trigger cleanup deregister). */
  const clientNameForLifecycleRef = useRef(clientName);
  clientNameForLifecycleRef.current = clientName;
  const prevClientNameForRealtimeRef = useRef<string | null>(null);

  /**
   * Resolve persisted identity before any registration.
   * Starts false for all platforms so the register effect never runs in the same passive flush
   * as the first paint (avoids ordering races with other state).
   * Web: name is already in state from readInitialClientName; readiness is deferred one microtask.
   * Electron: wait for IPC, then optionally replace default clientName.
   */
  useEffect(() => {
    let cancelled = false;

    if (window.electronAPI) {
      void window.electronAPI
        .getClientName()
        .then((result) => {
          if (cancelled) return;
          if (result.success && result.clientName) {
            shouldResolveAutoClientNameRef.current = false;
            setClientName(result.clientName);
            return;
          }
          shouldResolveAutoClientNameRef.current = true;
          setClientName(FALLBACK_DEFAULT_CLIENT_NAME);
        })
        .catch(() => {
          shouldResolveAutoClientNameRef.current = true;
          setClientName(FALLBACK_DEFAULT_CLIENT_NAME);
        })
        .finally(() => {
          if (!cancelled) setIsClientIdentityReady(true);
        });
    } else {
      queueMicrotask(() => {
        if (!cancelled) setIsClientIdentityReady(true);
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      stopRealtimeClient();
      setRegistrationConflict(false);
      clearAssistantSessionCaches(queryClient);
    }
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    setRegistrationConflict(false);
  }, [clientName]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setIsConnected(false);
      isRegisteredRef.current = false;
      return;
    }

    let registerCancelled = false;

    const registerClient = async () => {
      if (!isClientIdentityReady) return;
      if (!clientName) return;
      if (isRegisteredRef.current) return;

      const requestedNameAtStart = clientName;
      let idAtStart = requestedNameAtStart;
      const allowAutoRetry =
        shouldResolveAutoClientNameRef.current && AUTO_NAME_PATTERN.test(requestedNameAtStart);

      for (let attempt = 0; attempt < MAX_AUTO_NAME_REGISTER_ATTEMPTS; attempt += 1) {
        if (registerCancelled || clientNameRef.current !== requestedNameAtStart) {
          return;
        }

        if (allowAutoRetry) {
          try {
            idAtStart = await resolveAutoClientName();
          } catch {
            idAtStart = attempt === 0 ? requestedNameAtStart : idAtStart;
          }
        }

        try {
          await serviceApi.registerClient(idAtStart);

          if (registerCancelled) {
            try {
              await serviceApi.deregisterClient(idAtStart);
            } catch {
              /* best-effort undo of orphan registration */
            }
            return;
          }

          if (clientNameRef.current !== requestedNameAtStart) {
            try {
              await serviceApi.deregisterClient(idAtStart);
            } catch {
              /* best-effort */
            }
            return;
          }

          setRegistrationConflict(false);
          if (window.electronAPI) {
            await window.electronAPI.storeClientName(idAtStart);
          } else {
            setStoredClientName(idAtStart);
          }

          if (registerCancelled || clientNameRef.current !== requestedNameAtStart) {
            try {
              await serviceApi.deregisterClient(idAtStart);
            } catch {
              /* best-effort */
            }
            return;
          }

          if (requestedNameAtStart !== idAtStart) {
            setClientName(idAtStart);
            showToast(`Client name "${requestedNameAtStart}" was taken. Switched to "${idAtStart}".`, 'error');
          }

          setIsConnected(true);
          isRegisteredRef.current = true;
          shouldResolveAutoClientNameRef.current = false;
          void queryClient.invalidateQueries({ queryKey: queryKeys.serviceClients });
          console.log(`Client ${idAtStart} registered`);

          startRealtimeClient({
            getAccessToken: () => getAccessTokenRef.current(),
            clientId: idAtStart,
          });
          return;
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 409 && allowAutoRetry) {
            continue;
          }

          console.error('Failed to register client:', error);
          if (status === 409) {
            setRegistrationConflict(true);
            showToast(
              `Client name "${idAtStart}" is already in use for your account (another tab, device, or stale session). Choose a different name in settings or disconnect the other client.`,
              'error'
            );
          }
          setIsConnected(false);
          isRegisteredRef.current = false;
          stopRealtimeClient();
          return;
        }
      }

      if (allowAutoRetry) {
        setRegistrationConflict(true);
        setIsConnected(false);
        isRegisteredRef.current = false;
        stopRealtimeClient();
        showToast(
          `Could not claim an automatic client name after ${MAX_AUTO_NAME_REGISTER_ATTEMPTS} attempts. Try again.`,
          'error'
        );
      } else {
        setRegistrationConflict(true);
        setIsConnected(false);
        isRegisteredRef.current = false;
        stopRealtimeClient();
        showToast(
          `Client name "${idAtStart}" is already in use for your account (another tab, device, or stale session). Choose a different name in settings or disconnect the other client.`,
          'error'
        );
      }
    };

    void registerClient();

    return () => {
      registerCancelled = true;
    };
  }, [clientName, isAuthenticated, isAuthLoading, isClientIdentityReady, queryClient, showToast]);

  /**
   * PATCH rename already moves registration server-side. Do not re-POST /clients for the new id.
   * When `clientName` changes while this session is still registered, only reconnect the WebSocket.
   */
  useEffect(() => {
    if (!isAuthenticated || !isConnected || !isRegisteredRef.current) {
      prevClientNameForRealtimeRef.current = clientName;
      return;
    }

    const prev = prevClientNameForRealtimeRef.current;
    prevClientNameForRealtimeRef.current = clientName;

    if (prev === null || prev === clientName) {
      return;
    }

    stopRealtimeClient();
    startRealtimeClient({
      getAccessToken: () => getAccessTokenRef.current(),
      clientId: clientName,
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.serviceClients });
  }, [clientName, isAuthenticated, isConnected, queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !isConnected) return;

    const sendCloseDeregister = () => {
      if (!isRegisteredRef.current) return;

      if (window.electronAPI) {
        window.electronAPI.deregisterClient();
        return;
      }

      const accessToken = webTokenStore.get()?.accessToken;
      if (!accessToken) return;
      const baseUrl = process.env.API_URL || 'http://localhost:8000';
      const prefix = process.env.BETA === 'true' ? '/api/v2' : '/api/v1';
      const id = clientNameForLifecycleRef.current;
      const endpoint = `${baseUrl.replace(/\/$/, '')}${prefix}/service/clients/${encodeURIComponent(id)}`;
      void fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        keepalive: true,
      }).catch(() => {
        /* best-effort cleanup only */
      });
    };

    const deregisterClient = async () => {
      if (!isRegisteredRef.current) return;

      const id = clientNameForLifecycleRef.current;
      try {
        console.log(`Deregistering client ${id}...`);
        stopRealtimeClient();
        await serviceApi.deregisterClient(id);
        isRegisteredRef.current = false;
        void queryClient.invalidateQueries({ queryKey: queryKeys.serviceClients });
        console.log(`Client ${id} deregistered`);
      } catch (error) {
        console.error('Failed to deregister client:', error);
      }
    };

    const handleBeforeUnload = () => sendCloseDeregister();
    const handlePageHide = () => sendCloseDeregister();

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      deregisterClient();
    };
  }, [isAuthenticated, isConnected, queryClient]);

  useEffect(() => {
    const handleServiceStatusChanged = (status: { enabled: boolean }) => {
      console.log('[Service] Status event:', status.enabled ? 'ENABLED' : 'DISABLED');

      if (enableTimeoutRef.current) {
        clearTimeout(enableTimeoutRef.current);
        enableTimeoutRef.current = null;
      }

      setIsServiceEnabled(status.enabled);
      setIsTogglingService(false);
    };

    const offWs = subscribeRealtimeMessages(msg => {
      if (msg.event !== 'service_status') return;
      if (typeof msg.enabled !== 'boolean') return;
      handleServiceStatusChanged({ enabled: msg.enabled });
    });

    let offElectron: (() => void) | undefined;
    if (window.electronAPI?.onServiceStatusChanged) {
      offElectron = window.electronAPI.onServiceStatusChanged(handleServiceStatusChanged);
    }

    return () => {
      offWs();
      if (offElectron) offElectron();
    };
  }, []);

  const toggleService = useCallback(async () => {
    if (registrationConflict) {
      showToast(
        'This session is not registered as a client. Change the client name to resolve the conflict.',
        'error'
      );
      return;
    }

    setIsTogglingService(true);

    try {
      if (isServiceEnabled) {
        await serviceApi.disable();
      } else {
        await serviceApi.enable();

        enableTimeoutRef.current = setTimeout(() => {
          console.error('[Service] Enable timeout - no status event received');
          setIsTogglingService(false);
          showToast('Service failed to enable - no response from backend', 'error');
        }, ENABLE_TIMEOUT_MS);
      }
    } catch (error) {
      console.error('Failed to toggle service:', error);
      setIsTogglingService(false);
      showToast('Failed to communicate with backend', 'error');
    }
  }, [isServiceEnabled, showToast, registrationConflict]);

  return (
    <ServiceContext.Provider
      value={{
        isServiceEnabled,
        isConnected,
        registrationConflict,
        clientName,
        toggleService,
        setClientName,
        isTogglingService,
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
}

export function useService() {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error('useService must be used within a ServiceProvider');
  }
  return context;
}
