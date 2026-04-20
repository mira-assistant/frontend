import { shell } from 'electron';
import { createServer, type Server } from 'node:http';
import { api } from '../../shared/api/client';
import { ENDPOINTS } from '../../shared/api/constants';

const OAUTH_REDIRECT_PORT = 4280;
const OAUTH_CALLBACK_PATH = '/auth/google/callback';
const OAUTH_TIMEOUT_MS = 3 * 60 * 1000;

export async function handleGoogleOAuth(): Promise<{ code: string; state: string } | null> {
  try {
    // Get OAuth URL from backend
    const { data } = await api.get(ENDPOINTS.AUTH_GOOGLE_URL, {
      params: { redirect_port: OAUTH_REDIRECT_PORT }
    });

    const { url } = data;

    return await new Promise((resolve) => {
      let settled = false;
      let server: Server | null = null;
      let timeout: NodeJS.Timeout | null = null;

      const finalize = (result: { code: string; state: string } | null) => {
        if (settled) return;
        settled = true;

        if (timeout) {
          clearTimeout(timeout);
        }

        if (server) {
          server.close();
        }

        resolve(result);
      };

      server = createServer((req, res) => {
        try {
          const requestUrl = new URL(req.url || '/', `http://127.0.0.1:${OAUTH_REDIRECT_PORT}`);
          const isExpectedPath = requestUrl.pathname === OAUTH_CALLBACK_PATH;

          if (!isExpectedPath) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
          }

          const code = requestUrl.searchParams.get('code');
          const returnedState = requestUrl.searchParams.get('state');

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!doctype html>
            <html>
              <head><meta charset="utf-8"><title>Sign-in complete</title></head>
              <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px;">
                <h2>Sign-in complete</h2>
                <p>You can close this tab and return to Dadei.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);

          if (code && returnedState) {
            finalize({ code, state: returnedState });
            return;
          }

          finalize(null);
        } catch (error) {
          console.error('Error handling OAuth callback:', error);
          finalize(null);
        }
      });

      server.on('error', (error) => {
        console.error('Failed to start OAuth callback server:', error);
        finalize(null);
      });

      server.listen(OAUTH_REDIRECT_PORT, '127.0.0.1', async () => {
        try {
          await shell.openExternal(url);
        } catch (error) {
          console.error('Error opening OAuth URL:', error);
          finalize(null);
        }
      });

      timeout = setTimeout(() => {
        console.warn('OAuth flow timed out');
        finalize(null);
      }, OAUTH_TIMEOUT_MS);
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return null;
  }
}