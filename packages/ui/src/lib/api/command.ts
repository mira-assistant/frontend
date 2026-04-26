import { API_BASE_URL } from '@dadei/ui/shared/api/client';
import { ENDPOINTS } from '@dadei/ui/shared/api/constants';
import { getRealtimeSessionToken } from '@dadei/ui/lib/realtimeClient';

export type CommandSSEEvent =
  | { type: 'transcript'; text: string }
  | { type: 'token'; text: string }
  | { type: 'tool_call'; tool: string; status: string }
  | { type: 'tool_result'; tool: string; ok: boolean; summary?: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

function parseDataLine(line: string): CommandSSEEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;
  const jsonPart = trimmed.slice(5).trim();
  if (!jsonPart) return null;
  try {
    return JSON.parse(jsonPart) as CommandSSEEvent;
  } catch {
    return null;
  }
}

export async function* streamCommand(
  wavBuffer: ArrayBuffer,
  clientId: string,
  accessToken: string,
): AsyncGenerator<CommandSSEEvent> {
  const url = `${API_BASE_URL}${ENDPOINTS.COMMAND}`;
  const form = new FormData();
  form.append('audio', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav');
  form.append('client_id', clientId);
  const sessionToken = getRealtimeSessionToken();
  if (sessionToken) {
    form.append('session_token', sessionToken);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error';
    yield { type: 'error', message };
    yield { type: 'done' };
    return;
  }

  if (!response.ok || !response.body) {
    let detail = `HTTP ${response.status}`;
    try {
      const t = await response.text();
      if (t) detail = t.slice(0, 200);
    } catch {
      /* ignore */
    }
    yield { type: 'error', message: detail };
    yield { type: 'done' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawDone = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const ev = parseDataLine(line);
        if (ev) {
          if (ev.type === 'done') sawDone = true;
          yield ev;
        }
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      for (const line of buffer.split('\n')) {
        const ev = parseDataLine(line);
        if (ev) {
          if (ev.type === 'done') sawDone = true;
          yield ev;
        }
      }
    }
    if (!sawDone) {
      yield { type: 'done' };
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Stream read failed';
    yield { type: 'error', message };
    yield { type: 'done' };
    return;
  }
}
