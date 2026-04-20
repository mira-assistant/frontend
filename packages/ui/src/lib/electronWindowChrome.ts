/** Desktop Electron: frameless window; in-app chrome supplies drag + window controls (all platforms). */
export function isElectronCustomTitleBar(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.electronAPI);
}
