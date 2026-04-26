import { contextBridge, ipcRenderer } from 'electron';
import type { UpdaterSplashPayload } from './updater-splash-types';

contextBridge.exposeInMainWorld('updaterAPI', {
  onState: (callback: (s: UpdaterSplashPayload) => void) => {
    const listener = (_e: unknown, s: UpdaterSplashPayload) => callback(s);
    ipcRenderer.on('updater:splash-state', listener);
    return () => ipcRenderer.removeListener('updater:splash-state', listener);
  },
  openReleases: () => ipcRenderer.invoke('updater:open-releases'),
  quitApp: () => ipcRenderer.invoke('updater:quit-app'),
});
