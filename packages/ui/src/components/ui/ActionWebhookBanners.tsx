import { useCallback, useEffect } from 'react';
import type { ActionWebhookPayload } from '@dadei/ui/types/electron';
import { subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';
import { useNotifications } from '@dadei/ui/contexts/NotificationContext';

function titleCaseActionType(actionType: string): string {
  return actionType
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const ACTION_BANNER_MS = 10_000;

function bodyFromActionDetails(details: string | null): string | undefined {
  const t = details?.trim();
  if (!t) return undefined;
  try {
    const o = JSON.parse(t) as { canonical_text?: unknown };
    if (typeof o.canonical_text === 'string' && o.canonical_text.trim()) {
      return o.canonical_text.trim();
    }
  } catch {
    /* not JSON */
  }
  return t;
}

/**
 * Subscribes to realtime "action" events and enqueues assistant notification banners (FIFO).
 * Renders no UI — banners are shown via NotificationBannerSlot in AssistantLayout.
 */
export default function ActionWebhookBanners() {
  const { showBanner } = useNotifications();

  const pushActionPayload = useCallback(
    (raw: unknown) => {
      if (
        !raw ||
        typeof raw !== 'object' ||
        typeof (raw as ActionWebhookPayload).action_type !== 'string'
      ) {
        return;
      }
      const data = raw as ActionWebhookPayload;
      const title = `${titleCaseActionType(data.action_type)} · ${data.status}`;
      const body = bodyFromActionDetails(data.details);
      showBanner({
        id: data.id,
        title,
        body,
        durationMs: ACTION_BANNER_MS,
      });
    },
    [showBanner]
  );

  useEffect(() => {
    const offWs = subscribeRealtimeMessages((msg) => {
      if (msg.event !== 'action') return;
      pushActionPayload(msg.data);
    });

    let offElectron: (() => void) | undefined;
    if (window.electronAPI?.onWebhookAction) {
      offElectron = window.electronAPI.onWebhookAction((body) => {
        pushActionPayload(body?.data);
      });
    }

    return () => {
      offWs();
      if (offElectron) offElectron();
    };
  }, [pushActionPayload]);

  return null;
}
