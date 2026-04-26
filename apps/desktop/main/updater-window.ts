import { BrowserWindow, app, ipcMain, shell } from 'electron';
import path from 'path';
import type { UpdaterSplashPayload } from './updater-splash-types';

const GITHUB_RELEASES = 'https://github.com/dadei-app/frontend/releases';

let splashWindow: BrowserWindow | null = null;
let ipcRegistered = false;

function updaterHtmlPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'updater.html');
  }
  return path.join(app.getAppPath(), 'resources', 'updater.html');
}

function ensureUpdaterIpc(): void {
  if (ipcRegistered) return;
  ipcRegistered = true;
  ipcMain.handle('updater:open-releases', async () => {
    await shell.openExternal(GITHUB_RELEASES);
  });
  ipcMain.handle('updater:quit-app', () => {
    app.quit();
  });
}

export async function createUpdaterSplashWindow(): Promise<BrowserWindow> {
  ensureUpdaterIpc();

  splashWindow = new BrowserWindow({
    width: 440,
    height: 168,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    frame: false,
    show: false,
    backgroundColor: '#09090b',
    title: 'dadei — Updater',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'updater-preload.js'),
    },
  });

  await splashWindow.loadFile(updaterHtmlPath());
  splashWindow.show();

  splashWindow.on('closed', () => {
    splashWindow = null;
  });

  return splashWindow;
}

export function getUpdaterSplashWindow(): BrowserWindow | null {
  return splashWindow;
}

export function sendUpdaterSplashState(payload: UpdaterSplashPayload): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('updater:splash-state', payload);
  }
}

export function closeUpdaterSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}
