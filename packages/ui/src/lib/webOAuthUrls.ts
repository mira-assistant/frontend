import { ENDPOINTS } from '@mira/ui/shared/api/constants';

function apiOriginPrefix(): string {
  const apiUrl = process.env.MIRA_API_URL || 'http://localhost:8000';
  const isBeta = process.env.BETA === 'true';
  const prefix = isBeta ? '/api/v2' : '/api/v1';
  return `${apiUrl.replace(/\/$/, '')}${prefix}`;
}

/**
 * Full URL to start Google OAuth in the browser (server redirect).
 * Backend redirects to `/auth/callback` on the SPA with tokens or errors in the query string.
 * Pass `spaOrigin` (e.g. `window.location.origin`) so the API can return there without a fixed WEB_APP_ORIGIN env.
 */
export function buildWebGoogleOAuthLoginUrl(nextPath: string = '/app', spaOrigin?: string): string {
  const u = new URL(`${apiOriginPrefix()}${ENDPOINTS.AUTH_GOOGLE_WEB_LOGIN}`);
  u.searchParams.set('next', nextPath);
  if (spaOrigin) {
    u.searchParams.set('spa_origin', spaOrigin);
  }
  return u.toString();
}
