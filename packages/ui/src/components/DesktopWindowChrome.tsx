import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';
import { cn } from '@dadei/ui/lib/cn';
import { isElectronCustomTitleBar } from '@dadei/ui/lib/electronWindowChrome';

function useMaximizedState() {
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!api?.windowIsMaximized || !api.onWindowMaximizedChanged) return;
    let cancelled = false;
    void api.windowIsMaximized().then((v) => {
      if (!cancelled) setIsMaximized(v);
    });
    const off = api.onWindowMaximizedChanged(setIsMaximized);
    return () => {
      cancelled = true;
      off();
    };
  }, [api]);

  return { api, isMaximized, setIsMaximized };
}

/** Window controls for frameless desktop Electron (all platforms). */
export function DesktopWindowControls({ className }: { className?: string }) {
  const { api, isMaximized, setIsMaximized } = useMaximizedState();

  const minimize = useCallback(() => {
    void api?.windowMinimize?.();
  }, [api]);

  const toggleMax = useCallback(() => {
    if (!api?.windowToggleMaximize) return;
    void api.windowToggleMaximize().then(setIsMaximized);
  }, [api, setIsMaximized]);

  const close = useCallback(() => {
    void api?.windowClose?.();
  }, [api]);

  if (!isElectronCustomTitleBar() || !api?.windowMinimize) {
    return null;
  }

  const btn =
    'flex h-full w-10 items-center justify-center text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100 active:bg-white/[0.12]';

  return (
    <div
      className={cn('flex self-stretch border-l border-white/[0.08]', className)}
      style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
    >
      <button type="button" onClick={minimize} className={btn} title="Minimize" aria-label="Minimize">
        <Minus className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
      <button type="button" onClick={toggleMax} className={btn} title={isMaximized ? 'Restore' : 'Maximize'} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
        {isMaximized ? <Copy className="h-3.5 w-3.5" strokeWidth={2} /> : <Square className="h-3 w-3" strokeWidth={2.25} />}
      </button>
      <button
        type="button"
        onClick={close}
        className={cn(
          btn,
          'w-11 hover:bg-rose-600 hover:text-white active:bg-rose-700',
        )}
        title="Close"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
    </div>
  );
}

/** Slim top bar when the main assistant header is not shown (login, loading). */
export function DesktopTitleBarStrip({ className }: { className?: string }) {
  if (!isElectronCustomTitleBar()) return null;

  return (
    <div
      className={cn(
        'relative z-50 flex h-10 shrink-0 items-stretch border-b border-white/[0.08] bg-zinc-950/90 backdrop-blur-md',
        className,
      )}
      style={{ WebkitAppRegion: 'drag' } as CSSProperties}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 pl-4">
        <span className="pointer-events-none select-none text-xs font-semibold tracking-tight text-zinc-500 font-brand">
          dadei
        </span>
      </div>
      <DesktopWindowControls className="shrink-0" />
    </div>
  );
}
