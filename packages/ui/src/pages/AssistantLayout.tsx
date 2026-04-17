import { useState, type CSSProperties } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@dadei/ui/hooks/useAuth';
import { useToast } from '@dadei/ui/contexts/ToastContext';
import ActionWebhookBanners from '@dadei/ui/components/ui/ActionWebhookBanners';
import Header from '@dadei/ui/components/Header';
import MicrophoneButton from '@dadei/ui/components/MicrophoneButton';
import InteractionPanel from '@dadei/ui/components/InteractionPanel';
import Toast from '@dadei/ui/components/ui/Toast';
import AssistantSettingsModal from '@dadei/ui/components/settings/AssistantSettingsModal';
import { ASSISTANT_PATH } from '@dadei/ui/lib/assistantPaths';
import { Mic } from 'lucide-react';

/**
 * Authenticated assistant shell: layout, theme tokens, overlays (settings), toasts, and realtime hooks.
 */
export default function AssistantLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toasts, removeToast } = useToast();
  const [isPeoplePanelOpen, setIsPeoplePanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center overscroll-none bg-zinc-950">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.25), transparent), radial-gradient(circle at 100% 0%, rgba(6,182,212,0.12), transparent 50%)',
          }}
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-4">
          <Mic className="h-16 w-16 animate-pulse text-emerald-400/90" strokeWidth={1.5} />
          <p className="text-lg font-medium tracking-tight text-zinc-300">Loading Dadei…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    const qs = next && next !== ASSISTANT_PATH ? `?next=${encodeURIComponent(next)}` : '';
    return <Navigate to={`/login${qs}`} replace />;
  }

  return (
    <div
      className="assistant-shell relative flex h-screen flex-col overflow-hidden overscroll-none bg-zinc-950 text-zinc-100"
      style={
        {
          ['--assistant-accent' as string]: 'rgb(52 211 153)',
          ['--assistant-accent-muted' as string]: 'rgb(6 95 70)',
          ['--assistant-surface' as string]: 'rgba(24 24 27 / 0.72)',
          ['--assistant-border' as string]: 'rgba(255 255 255 / 0.08)',
          ['--assistant-header-h' as string]: '4.75rem',
        } as CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 60% at 50% -10%, rgba(16,185,129,0.14), transparent 55%), radial-gradient(circle at 100% 20%, rgba(6,182,212,0.08), transparent 45%), linear-gradient(180deg, rgba(9,9,11,0.97) 0%, rgba(24,24,27,0.99) 100%)',
        }}
        aria-hidden
      />

      <ActionWebhookBanners />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Header
          isPeoplePanelOpen={isPeoplePanelOpen}
          setIsPeoplePanelOpen={setIsPeoplePanelOpen}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* z-0 so header (z-20) stacks above this column; fixed tooltips in header are not covered */}
        <main className="relative z-0 flex min-h-0 flex-1 overflow-hidden overscroll-none">
          <div
            className="flex flex-1 items-center justify-center px-10 py-10"
            style={{
              background:
                'linear-gradient(145deg, rgba(24,24,27,0.35) 0%, rgba(9,9,11,0.55) 100%)',
            }}
          >
            <MicrophoneButton disableSpaceToggle={isPeoplePanelOpen} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col border-l border-white/[0.07] bg-zinc-950/40 backdrop-blur-sm">
            <InteractionPanel />
          </div>
        </main>
      </div>

      <AssistantSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      <div className="pointer-events-none fixed bottom-5 right-5 z-[180] flex max-w-sm flex-col-reverse gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
