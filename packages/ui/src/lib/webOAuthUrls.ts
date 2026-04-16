import { ENDPOINTS } from '@mira/ui/shared/api/constants';

function apiOriginPrefix(): string {
  const apiUrl = process.env.MIRA_API_URL || 'http://localhost:8000';
  const isBeta = process.env.BETA === 'true';
  const prefix = isBeta ? '/api/v2' : '/api/v1';
  return `${apiUrl.replace(/\/$/, '')}${prefix}`;
}

/**
 * Full URL to start Google OAuth in the browser (server redirect).
 * Backend should redirect back to `/auth/callback` with tokens or errors in the query string.
 */
export function buildWebGoogleOAuthLoginUrl(nextPath: string = '/app'): string {
  const u = new URL(`${apiOriginPrefix()}${ENDPOINTS.AUTH_GOOGLE_WEB_LOGIN}`);
  u.searchParams.set('next', nextPath);
  return u.toString();
}
