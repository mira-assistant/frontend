
import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@dadei/ui/hooks/useAuth';
import { useToast } from '@dadei/ui/contexts/ToastContext';
import { serviceApi } from '@dadei/ui/lib/api/service';
import { getStoredClientName, setStoredClientName } from '@dadei/ui/lib/clientNameStorage';
import { startRealtimeClient, stopRealtimeClient, subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';
import { webTokenStore } from '@dadei/ui/lib/webTokenStore';

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

function readInitialClientName(): string {
  if (typeof window === 'undefined' || window.electronAPI) {
    return 'web-client';
  }
  return getStoredClientName() || 'web-client';
}

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading, getAccessToken } = useAuth();
  const { showToast } = useToast();
  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  const [isServiceEnabled, setIsServiceEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [clientName, setClientName] = useState(readInitialClientName);
  /** Electron resolves the persisted name asynchronously; never register until this is true. */
  const [isClientIdentityReady, setIsClientIdentityReady] = useState(
    () => typeof window === 'undefined' || !window.electronAPI
  );
  const [isTogglingService, setIsTogglingService] = useState(false);
  const [registrationConflict, setRegistrationConflict] = useState(false);

  const enableTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRegisteredRef = useRef(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    let cancelled = false;
    void window.electronAPI
      .getClientName()
      .then((result) => {
        if (cancelled) return;
        if (result.success && result.clientName) {
          setClientName(result.clientName);
        }
      })
      .catch(() => {
        /* keep default client name */
      })
      .finally(() => {
        if (!cancelled) setIsClientIdentityReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      stopRealtimeClient();
      setRegistrationConflict(false);
    }
  }, [isAuthenticated]);

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

    const registerClient = async () => {
      if (!isClientIdentityReady) return;
      if (!clientName) return;
      if (isRegisteredRef.current) return;

      try {
        await serviceApi.registerClient(clientName);
        setRegistrationConflict(false);
        if (window.electronAPI) {
          await window.electronAPI.storeClientName(clientName);
        } else {
          setStoredClientName(clientName);
        }
        setIsConnected(true);
        isRegisteredRef.current = true;
        console.log(`Client ${clientName} registered`);

        startRealtimeClient({
          getAccessToken: () => getAccessTokenRef.current(),
          clientId: clientName,
        });
      } catch (error: any) {
        console.error('Failed to register client:', error);
        const status = error?.response?.status;
        if (status === 409) {
          setRegistrationConflict(true);
          showToast(
            `Client name "${clientName}" is already in use for your account (another tab, device, or stale session). Choose a different name in settings or disconnect the other client.`,
            'error'
          );
        }
        setIsConnected(false);
        isRegisteredRef.current = false;
        stopRealtimeClient();
      }
    };

    registerClient();
  }, [clientName, isAuthenticated, isAuthLoading, isClientIdentityReady]);

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
      const endpoint = `${baseUrl.replace(/\/$/, '')}${prefix}/service/clients/${encodeURIComponent(clientName)}`;
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

      try {
        console.log(`Deregistering client ${clientName}...`);
        stopRealtimeClient();
        await serviceApi.deregisterClient(clientName);
        isRegisteredRef.current = false;
        console.log(`Client ${clientName} deregistered`);
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
  }, [clientName, isAuthenticated, isConnected]);

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
