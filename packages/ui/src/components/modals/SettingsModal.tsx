import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { LogOut, Trash2, X } from 'lucide-react';
import { useAuth } from '@dadei/ui/contexts/AuthContext';
import { authApi } from '@dadei/ui/lib/api/auth';
import { useNotifications } from '@dadei/ui/contexts/NotificationContext';
import { useAuthMeQuery } from '@dadei/ui/lib/queryHooks';

type AssistantSettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AssistantSettingsModal({ open, onOpenChange }: AssistantSettingsModalProps) {
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useNotifications();
  const authMeQuery = useAuthMeQuery(open);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const profile = authMeQuery.data ?? user;
  const email = profile?.email ?? '—';
  const canDelete =
    !!profile && deletePhrase.trim().toLowerCase() === profile.email.trim().toLowerCase();

  const handleSignOut = async () => {
    onOpenChange(false);
    await logout();
  };

  const handleDeleteAccount = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await authApi.deleteMe();
      showToast('Account deleted', 'success');
      onOpenChange(false);
      await logout();
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail)
          : e instanceof Error
            ? e.message
            : 'Failed to delete account';
      showToast(msg || 'Failed to delete account', 'error');
    } finally {
      setDeleting(false);
      setAlertOpen(false);
      setDeletePhrase('');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-240 bg-zinc-950/55 backdrop-blur-md" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-250 w-[min(96vw,42rem)] max-h-[min(90dvh,52rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl focus:outline-none">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-zinc-50">
                Settings
              </Dialog.Title>
              <p className="mt-1 text-sm text-zinc-500 font-secondary">Account and data</p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200"
                aria-label="Close settings"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="max-h-[calc(min(90dvh,52rem)-8rem)] space-y-6 overflow-y-auto overscroll-none pr-1">
            <section className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 font-secondary">
                Account
              </h3>
              <p className="mt-2 text-sm text-zinc-400 font-secondary">Email</p>
              <p className="mt-0.5 font-medium text-zinc-100">{email}</p>
              {profile?.has_password === false ? (
                <p className="mt-2 text-xs text-zinc-500 font-secondary">
                  Signed in with Google — no password on file.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void refreshUser()}
                className="mt-3 text-xs font-medium text-emerald-400/90 hover:text-emerald-300 font-secondary"
              >
                Refresh profile
              </button>
            </section>

            <section className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 font-secondary">Data</h3>
              <p className="mt-2 text-sm text-zinc-500 font-secondary">
                Export and privacy controls will connect here when available.
              </p>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-zinc-800/80 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
              <button
                type="button"
                onClick={() => setAlertOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/35 bg-rose-950/40 px-4 py-2.5 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-950/70"
              >
                <Trash2 className="h-4 w-4" />
                Delete account…
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <AlertDialog.Root open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-260 bg-black/60 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-270 w-[min(90vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rose-500/25 bg-zinc-900 p-6 shadow-2xl focus:outline-none">
            <AlertDialog.Title className="text-base font-semibold text-zinc-50">
              Delete account?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-zinc-400 font-secondary">
              This permanently removes your network and related data. Type your email{' '}
              <span className="font-medium text-zinc-300">{email}</span> to confirm.
            </AlertDialog.Description>
            <input
              type="text"
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              placeholder="Your email"
              className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 font-sans text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-rose-500/40 focus:outline-none focus:ring-2 focus:ring-rose-500/25"
              autoComplete="off"
            />
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                >
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <button
                type="button"
                disabled={!canDelete || deleting}
                onClick={() => void handleDeleteAccount()}
                className="rounded-xl border border-rose-500/50 bg-rose-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Dialog.Root>
  );
}
