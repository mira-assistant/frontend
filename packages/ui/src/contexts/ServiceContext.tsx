
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
  /** True when device registration with the service failed after sign-in. */
  registrationConflict: boolean;
  /** Server-assigned or persisted device client id (opaque string). */
  clientName: string;
  toggleService: () => Promise<void>;
  isTogglingService: boolean;
}

export const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

const ENABLE_TIMEOUT_MS = 5000;

function readInitialClientId(): string {
  if (typeof window === 'undefined' || window.electronAPI) {
    return '';
  }
  return getStoredClientName() || '';
}

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading, getAccessToken } = useAuth();
  const { showToast } = useNotifications();
  const queryClient = useQueryClient();
  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  const [isServiceEnabled, setIsServiceEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [clientName, setClientName] = useState(readInitialClientId);
  /** False until persisted identity has been applied (Electron IPC); web resolves on microtask. */
  const [isClientIdentityReady, setIsClientIdentityReady] = useState(false);
  const [isTogglingService, setIsTogglingService] = useState(false);
  const [registrationConflict, setRegistrationConflict] = useState(false);

  const enableTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRegisteredRef = useRef(false);
  const clientNameRef = useRef(clientName);
  clientNameRef.current = clientName;
  const clientNameForLifecycleRef = useRef(clientName);
  clientNameForLifecycleRef.current = clientName;

  useEffect(() => {
    let cancelled = false;

    if (window.electronAPI) {
      void window.electronAPI
        .getClientName()
        .then((result) => {
          if (cancelled) return;
          if (result.success && result.clientName) {
            setClientName(result.clientName);
          }
        })
        .catch(() => {
          /* keep empty — server will assign */
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
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setIsConnected(false);
      isRegisteredRef.current = false;
      return;
    }

    let registerCancelled = false;

    const registerClient = async () => {
      if (!isClientIdentityReady) return;
      if (isRegisteredRef.current) return;

      const persisted = clientNameRef.current.trim() || undefined;

      try {
        const response = await serviceApi.registerClient(persisted);

        if (registerCancelled) {
          try {
            await serviceApi.deregisterClient(response.client_id);
          } catch {
            /* best-effort undo */
          }
          return;
        }

        const id = response.client_id;

        setRegistrationConflict(false);
        if (window.electronAPI) {
          await window.electronAPI.storeClientName(id);
        } else {
          setStoredClientName(id);
        }

        if (registerCancelled) {
          try {
            await serviceApi.deregisterClient(id);
          } catch {
            /* best-effort */
          }
          return;
        }

        setClientName(id);
        setIsConnected(true);
        isRegisteredRef.current = true;
        void queryClient.invalidateQueries({ queryKey: queryKeys.serviceClients });
        console.log(`Client ${id} registered`);

        startRealtimeClient({
          getAccessToken: () => getAccessTokenRef.current(),
          clientId: id,
        });
      } catch (error: unknown) {
        console.error('Failed to register client:', error);
        setRegistrationConflict(true);
        showToast(
          'Could not register this device with the assistant service. Try signing out and back in, or try again in a moment.',
          'error'
        );
        setIsConnected(false);
        isRegisteredRef.current = false;
        stopRealtimeClient();
      }
    };

    void registerClient();

    return () => {
      registerCancelled = true;
    };
  }, [isAuthenticated, isAuthLoading, isClientIdentityReady, queryClient, showToast]);

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
        'This session is not registered with the assistant service. Try signing out and back in.',
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
