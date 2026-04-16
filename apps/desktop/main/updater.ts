import { app, dialog } from 'electron';
import axios from 'axios';
import { autoUpdater } from 'electron-updater';

const ROOT_TIMEOUT_MS = 10_000;

interface RootHealthResponse {
  version: string;
  status: string;
}

function apiBaseUrl(): string {
  return (process.env.MIRA_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
}

function semverMajor(version: string): number | null {
  const match = /^(\d+)/.exec(version.trim());
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * GET {MIRA_API_URL}/ — unreachable or bad payload: log and allow app to start.
 * Major mismatch: blocking dialog, kick updater, caller should quit.
 */
export async function assertBackendMajorCompatible(): Promise<boolean> {
  const url = `${apiBaseUrl()}/`;

  try {
    const { data } = await axios.get<RootHealthResponse>(url, {
      timeout: ROOT_TIMEOUT_MS,
      validateStatus: (s) => s === 200,
    });

    if (!data || typeof data.version !== 'string') {
      console.warn('[version] Root health response missing version; continuing.');
      return true;
    }

    const backendMajor = semverMajor(data.version);
    const appMajor = semverMajor(app.getVersion());

    if (backendMajor === null || appMajor === null) {
      console.warn('[version] Could not parse major version; continuing.');
      return true;
    }

    if (backendMajor !== appMajor) {
      dialog.showMessageBoxSync({
        type: 'error',
        title: 'Update required',
        message: 'This version of the app is not compatible with the server.',
        detail: `The app is on major version ${appMajor} but the server requires major version ${backendMajor}. Install the latest release, then try again.`,
        buttons: ['OK'],
      });

      if (app.isPackaged) {
        void autoUpdater.checkForUpdatesAndNotify().catch((e) => {
          console.warn('[version] checkForUpdatesAndNotify failed:', e);
        });
      }

      return false;
    }

    return true;
  } catch (e) {
    console.warn('[version] Backend root check failed; continuing without compatibility gate.', e);
    return true;
  }
}

let autoUpdaterConfigured = false;
let installInProgress = false;
let updateDownloaded = false;

export function isUpdateInstallInProgress(): boolean {
  return installInProgress || updateDownloaded;
}

/**
 * GitHub Releases feed is baked in at package time (electron-builder publish).
 * Checks on launch, downloads silently, prompts when ready to install.
 */
export function configureSilentAutoUpdates(): void {
  if (!app.isPackaged || autoUpdaterConfigured) {
    return;
  }
  autoUpdaterConfigured = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    console.warn('[updater]', err);
  });

  autoUpdater.on('update-downloaded', (event) => {
    updateDownloaded = true;
    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: `Version ${event.version} has been downloaded.`,
        detail: 'Restart now to apply the update, or choose Later to install when you quit the app.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          installInProgress = true;
          setImmediate(() => autoUpdater.quitAndInstall());
        }
      });
  });

  void autoUpdater.checkForUpdates().catch((err: unknown) => {
    console.warn('[updater] checkForUpdates failed:', err);
  });
}
