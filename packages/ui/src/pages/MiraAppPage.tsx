import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@mira/ui/hooks/useAuth';
import { useToast } from '@mira/ui/contexts/ToastContext';
import ActionWebhookBanners from '@mira/ui/components/ui/ActionWebhookBanners';
import Header from '@mira/ui/components/Header';
import MicrophoneButton from '@mira/ui/components/MicrophoneButton';
import InteractionPanel from '@mira/ui/components/InteractionPanel';
import Toast from '@mira/ui/components/ui/Toast';

export default function MiraAppPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toasts, removeToast } = useToast();
  const [isPeoplePanelOpen, setIsPeoplePanelOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-linear-to-br from-[#00ff88] to-[#00cc6a]">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-microphone-alt text-6xl text-white animate-pulse" />
          <p className="text-xl font-medium text-white">Loading Mira…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    const qs = next && next !== '/app' ? `?next=${encodeURIComponent(next)}` : '';
    return <Navigate to={`/login${qs}`} replace />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[rgba(255,255,255,0.95)] backdrop-blur-[2px]">
      <ActionWebhookBanners />

      <Header isPeoplePanelOpen={isPeoplePanelOpen} setIsPeoplePanelOpen={setIsPeoplePanelOpen} />

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex flex-1 items-center justify-center bg-linear-to-br from-[#f0fffa] to-[#f0fffa] px-10 py-10">
          <MicrophoneButton disableSpaceToggle={isPeoplePanelOpen} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <InteractionPanel />
        </div>
      </main>

      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-2">
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
