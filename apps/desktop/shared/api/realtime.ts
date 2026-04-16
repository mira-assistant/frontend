const isBeta = process.env.BETA === 'true';
const API_PREFIX = isBeta ? '/api/v2' : '/api/v1';
const apiUrl = process.env.MIRA_API_URL || 'http://localhost:8000';

/**
 * WebSocket URL for /api/v1/realtime/ws (or v2 when BETA), same host as REST base (MIRA_API_URL).
 */
export function buildRealtimeWebSocketUrl(): string {
  const wsProto = apiUrl.startsWith('https') ? 'wss' : 'ws';
  const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `${wsProto}://${host}${API_PREFIX}/realtime/ws`;
}
