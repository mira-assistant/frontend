import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Droplet, X } from 'lucide-react';
import { useNotification } from '@dadei/ui/contexts/NotificationContext';
import { teardropEnter, teardropExit } from '@dadei/ui/lib/motion';

/**
 * Notification stack (top center) with teardrop motif and short in/out motion.
 * Mounted inside NotificationProvider.
 */
export default function TeardropNotificationHost() {
  const { notifications, dismissNotification } = useNotification();
  const timers = useRef<Map<string, number>>(new Map());
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const map = timers.current;
    for (const n of notifications) {
      if (map.has(n.id)) continue;
      const t = window.setTimeout(() => {
        map.delete(n.id);
        dismissNotification(n.id);
      }, n.durationMs);
      map.set(n.id, t);
    }
    const ids = new Set(notifications.map((x) => x.id));
    for (const [id, t] of map.entries()) {
      if (!ids.has(id)) {
        window.clearTimeout(t);
        map.delete(id);
      }
    }
    return () => {
      for (const t of map.values()) window.clearTimeout(t);
      map.clear();
    };
  }, [notifications, dismissNotification]);

  const enter = prefersReducedMotion ? { duration: 0.12 } : teardropEnter;
  const exitTr = prefersReducedMotion ? { duration: 0.1 } : teardropExit;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[200] flex flex-col items-center gap-2 px-4 pt-4"
      aria-live="polite"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -12, scale: 0.92, transformOrigin: '50% 0%' }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0, transition: exitTr }
                : { opacity: 0, y: -8, scale: 0.94, transformOrigin: '50% 0%', transition: exitTr }
            }
            transition={enter}
            className="pointer-events-auto w-full max-w-md"
          >
            <div className="relative flex gap-3 overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-900/88 px-4 py-3 pr-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15 text-emerald-300"
                aria-hidden
              >
                <Droplet className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/85">
                  Notification
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-zinc-50">{n.title}</p>
                {n.body ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-zinc-400">{n.body}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissNotification(n.id)}
                className="absolute right-2 top-2 rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
