import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ActionWebhookPayload } from '@mira/ui/types/electron';
import { subscribeRealtimeMessages } from '@mira/ui/lib/realtimeClient';

const AUTO_DISMISS_MS = 14_000;
const MAX_STACK = 4;

function titleCaseActionType(actionType: string): string {
  return actionType
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function ActionWebhookBanners() {
  const [items, setItems] = useState<{ id: string; data: ActionWebhookPayload }[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
  }, []);

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
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      setItems(prev => [{ id, data }, ...prev].slice(0, MAX_STACK));
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  useEffect(() => {
    const offWs = subscribeRealtimeMessages(msg => {
      if (msg.event !== 'action') return;
      pushActionPayload(msg.data);
    });

    let offElectron: (() => void) | undefined;
    if (window.electronAPI?.onWebhookAction) {
      offElectron = window.electronAPI.onWebhookAction(body => {
        pushActionPayload(body?.data);
      });
    }

    return () => {
      offWs();
      if (offElectron) offElectron();
    };
  }, [pushActionPayload]);

  return (
    <div
      className="fixed left-0 right-0 top-0 z-200 flex flex-col items-center gap-2 px-4 pt-3 pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {items.map(({ id, data }) => (
          <motion.div
            key={id}
            layout
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-auto w-full max-w-lg rounded-lg border border-[#00ff88]/35 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur-md overflow-hidden"
          >
            <div className="flex items-stretch gap-0">
              <div className="w-1 shrink-0 bg-[#00ff88]" aria-hidden />
              <div className="flex-1 min-w-0 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Action · {data.status}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {titleCaseActionType(data.action_type)}
                    </p>
                    {data.details ? (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-3 leading-snug">{data.details}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(id)}
                    className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    aria-label="Dismiss"
                  >
                    <i className="fas fa-times text-sm" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
