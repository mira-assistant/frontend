
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@dadei/ui/contexts/AuthContext';
import { useNotifications } from '@dadei/ui/contexts/NotificationContext';
import { serviceApi } from '@dadei/ui/lib/api/service';
import { getStoredClientName, setStoredClientName } from '@dadei/ui/lib/clientNameStorage';
import { startRealtimeClient, stopRealtimeClient, subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';
import { clearAssistantSessionCaches } from '@dadei/ui/lib/queryHooks';
import { useQueryClient } from '@tanstack/react-query';

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

function generateClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `client-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `client-${Math.random().toString(36).slice(2, 10)}`;
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
  const clientNameRef = useRef(clientName);
  clientNameRef.current = clientName;

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
      setIsConnected(false);
      setRegistrationConflict(false);
      clearAssistantSessionCaches(queryClient);
    }
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setIsConnected(false);
      return;
    }

    let cancelled = false;

    const connectRealtime = async () => {
      if (!isClientIdentityReady) return;
      const persisted = clientNameRef.current.trim();
      const effectiveClientId = persisted || generateClientId();

      try {
        if (cancelled) {
          return;
        }
        setRegistrationConflict(false);
        if (window.electronAPI) {
          await window.electronAPI.storeClientName(effectiveClientId);
        } else {
          setStoredClientName(effectiveClientId);
        }
        setClientName(effectiveClientId);

        startRealtimeClient({
          getAccessToken: () => getAccessTokenRef.current(),
          clientId: effectiveClientId,
        });
      } catch (error: unknown) {
        console.error('Failed to start realtime client:', error);
        setRegistrationConflict(true);
        showToast(
          'Could not start realtime connectivity. Try signing out and back in, or try again in a moment.',
          'error'
        );
        setIsConnected(false);
        stopRealtimeClient();
      }
    };

    void connectRealtime();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthLoading, isClientIdentityReady, showToast]);

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
      if (msg.event === 'realtime_status') {
        if (typeof msg.connected === 'boolean') {
          setIsConnected(msg.connected);
        }
        return;
      }
      if (msg.event === 'session_ready') {
        const serverClientId = typeof msg.client_id === 'string' ? msg.client_id : null;
        if (serverClientId) {
          setClientName(serverClientId);
          if (window.electronAPI) {
            void window.electronAPI.storeClientName(serverClientId);
          } else {
            setStoredClientName(serverClientId);
          }
        }
        setIsConnected(true);
        setRegistrationConflict(false);
        return;
      }
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
