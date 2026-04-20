/** Windows / Linux Electron: frameless window; in-app chrome supplies drag + window controls. */
export function isElectronCustomTitleBar(): boolean {
  if (typeof window === 'undefined') return false;
  const api = window.electronAPI;
  if (!api?.platform) return false;
  return api.platform !== 'darwin';
}
