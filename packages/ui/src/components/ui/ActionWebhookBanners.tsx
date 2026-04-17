import { useCallback, useEffect } from 'react';
import type { ActionWebhookPayload } from '@dadei/ui/types/electron';
import { subscribeRealtimeMessages } from '@dadei/ui/lib/realtimeClient';
import { useNotification } from '@dadei/ui/contexts/NotificationContext';

function titleCaseActionType(actionType: string): string {
  return actionType
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const AUTO_DISMISS_MS = 14_000;

/**
 * Subscribes to realtime "action" events and surfaces them as teardrop notifications.
 * Renders no UI — host lives in NotificationProvider.
 */
export default function ActionWebhookBanners() {
  const { pushNotification } = useNotification();

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
      const body = data.details?.trim() || undefined;
      pushNotification({ title, body, durationMs: AUTO_DISMISS_MS });
    },
    [pushNotification]
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
