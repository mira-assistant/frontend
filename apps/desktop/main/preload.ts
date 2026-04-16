import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Token storage
  storeTokens: (accessToken: string, refreshToken: string) =>
    ipcRenderer.invoke('auth:store-tokens', accessToken, refreshToken),

  getTokens: () =>
    ipcRenderer.invoke('auth:get-tokens'),

  clearTokens: () =>
    ipcRenderer.invoke('auth:clear-tokens'),

  hasTokens: () =>
    ipcRenderer.invoke('auth:has-tokens'),

  // App lifecycle
  onAppClosing: (callback: () => void) =>
    ipcRenderer.on('app-closing', callback),

  onNewInteraction: (callback: (payload: any) => void) => {
    const listener = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('new-interaction', listener);

    return () => {
      ipcRenderer.removeListener('new-interaction', listener);
    };
  },

  onWebhookAction: (callback: (payload: any) => void) => {
    const listener = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('webhook-action', listener);

    return () => {
      ipcRenderer.removeListener('webhook-action', listener);
    };
  },

  onServiceStatusChanged: (callback: (status: any) => void) => {
    const listener = (_event: any, status: any) => callback(status);
    ipcRenderer.on('service-status-changed', listener);

    return () => {
      ipcRenderer.removeListener('service-status-changed', listener);
    };
  },

  // OAuth
  loginWithGoogle: () => ipcRenderer.invoke('auth:google-oauth'),
  loginWithGitHub: () => ipcRenderer.invoke('auth:github-oauth'),

  // Client name
  storeClientName: (clientName: string) => ipcRenderer.invoke('client:store-name', clientName),
  getClientName: () => ipcRenderer.invoke('client:get-name'),


  // Synchronous deregister for beforeunload event
  deregisterClient: () => ipcRenderer.invoke('client:deregister'),
});