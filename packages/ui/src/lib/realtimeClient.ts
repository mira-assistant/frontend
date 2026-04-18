import { buildRealtimeWebSocketUrl } from '@dadei/ui/shared/api/realtime';

export type RealtimeMessage = Record<string, unknown> & {
  event?: string;
};

type RealtimeHandler = (msg: RealtimeMessage) => void;

const listeners = new Set<RealtimeHandler>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let stopped = true;
let reconnectAttempt = 0;
let connectOpts: { getAccessToken: () => Promise<string | null>; clientId: string } | null = null;
const HEARTBEAT_INTERVAL_MS = 20_000;

function emit(msg: RealtimeMessage) {
  listeners.forEach((h) => {
    try {
      h(msg);
    } catch (e) {
      console.error('[Realtime] listener error', e);
    }
  });
}

export function subscribeRealtimeMessages(handler: RealtimeHandler): () => void {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function clearHeartbeatTimer() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function scheduleReconnect() {
  if (stopped) return;
  clearReconnectTimer();
  const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    void openSocket();
  }, delay);
}

async function openSocket() {
  if (stopped || !connectOpts) return;

  const token = await connectOpts.getAccessToken();
  if (!token) {
    scheduleReconnect();
    return;
  }

  const base = buildRealtimeWebSocketUrl();
  const url = `${base}?token=${encodeURIComponent(token)}&client_id=${encodeURIComponent(connectOpts.clientId)}`;

  try {
    ws = new WebSocket(url);
  } catch (e) {
    console.error('[Realtime] WebSocket construct failed', e);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectAttempt = 0;
    console.log('[Realtime] connected');
    clearHeartbeatTimer();
    heartbeatTimer = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: 'ping' }));
    }, HEARTBEAT_INTERVAL_MS);
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as RealtimeMessage;
      emit(msg);
    } catch (e) {
      console.error('[Realtime] bad message', e);
    }
  };

  ws.onerror = () => {
    /* onclose will handle */
  };

  ws.onclose = () => {
    clearHeartbeatTimer();
    ws = null;
    if (!stopped) {
      console.warn('[Realtime] disconnected, reconnecting…');
      scheduleReconnect();
    }
  };
}

export function startRealtimeClient(opts: {
  getAccessToken: () => Promise<string | null>;
  clientId: string;
}): void {
  stopped = false;
  connectOpts = opts;
  reconnectAttempt = 0;
  clearReconnectTimer();
  if (ws) {
    ws.close();
    ws = null;
  }
  void openSocket();
}

export function stopRealtimeClient(): void {
  stopped = true;
  connectOpts = null;
  clearReconnectTimer();
  clearHeartbeatTimer();
  reconnectAttempt = 0;
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
}
