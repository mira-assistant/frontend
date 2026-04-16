import { BrowserWindow } from 'electron';
import { api } from '../../shared/api/client';
import { ENDPOINTS } from '../../shared/api/constants';

export async function handleGoogleOAuth(): Promise<{ code: string; state: string } | null> {
  try {
    // Get OAuth URL from backend
    const { data } = await api.get(ENDPOINTS.AUTH_GOOGLE_URL, {
      params: { redirect_port: 4280 }
    });

    const { url, state } = data;

    return new Promise((resolve) => {
      const authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        center: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
        titleBarStyle: 'default',
        backgroundColor: '#ffffff',
      });

      authWindow.loadURL(url);

      // ✅ Inject CSS to make it look better (optional)
      authWindow.webContents.on('did-finish-load', () => {
        authWindow.webContents.insertCSS(`
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
        `);
      });

      // Listen for navigation to callback URL
      authWindow.webContents.on('will-redirect', (event, redirectUrl) => {
        if (redirectUrl.startsWith('http://127.0.0.1:4280/auth/google/callback')) {
          const urlObj = new URL(redirectUrl);
          const code = urlObj.searchParams.get('code');
          const returnedState = urlObj.searchParams.get('state');

          if (code && returnedState) {
            authWindow.close();
            resolve({ code, state: returnedState });
          }
        }
      });

      authWindow.on('closed', () => {
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return null;
  }
}

export async function handleGitHubOAuth(): Promise<string | null> {
  try {
    // Get OAuth URL from backend
    const { data } = await api.get(ENDPOINTS.AUTH_GITHUB_URL, {
      params: { redirect_port: 4280 }
    });

    const { url } = data;

    return new Promise((resolve) => {
      const authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        center: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
        titleBarStyle: 'default',
        backgroundColor: '#24292e',
      });

      authWindow.loadURL(url);

      // Listen for navigation to callback URL
      authWindow.webContents.on('will-redirect', (event, redirectUrl) => {
        if (redirectUrl.startsWith('http://127.0.0.1:4280/auth/github/callback')) {
          const urlObj = new URL(redirectUrl);
          const code = urlObj.searchParams.get('code');

          if (code) {
            authWindow.close();
            resolve(code);
          }
        }
      });

      authWindow.on('closed', () => {
        resolve(null);
      });
    });
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return null;
  }
}