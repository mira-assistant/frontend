import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const variantTokens = {
  danger: {
    icon: 'fa-exclamation-triangle',
    iconWrap: 'border-rose-500/30 bg-rose-950/50 text-rose-300',
    confirmClass:
      'border border-rose-500/45 bg-rose-600/90 text-white hover:bg-rose-600 focus-visible:ring-rose-400/40',
  },
  warning: {
    icon: 'fa-exclamation-circle',
    iconWrap: 'border-amber-500/30 bg-amber-950/50 text-amber-200',
    confirmClass:
      'border border-amber-500/45 bg-amber-600/90 text-white hover:bg-amber-600 focus-visible:ring-amber-400/40',
  },
  info: {
    icon: 'fa-info-circle',
    iconWrap: 'border-sky-500/30 bg-sky-950/50 text-sky-200',
    confirmClass:
      'border border-sky-500/45 bg-sky-600/90 text-white hover:bg-sky-600 focus-visible:ring-sky-400/40',
  },
};

const veilEase = [0.22, 1, 0.36, 1] as const;

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ModalProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const styles = variantTokens[variant];
  const veilMs = prefersReducedMotion ? 0.14 : 0.46;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="modal-root"
          className="fixed inset-0 z-[220] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: veilMs, ease: veilEase }}
        >
          <div
            role="presentation"
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.16, ease: veilEase }
                : { type: 'spring', damping: 34, stiffness: 360, mass: 0.82 }
            }
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.5)] ring-1 ring-emerald-500/10 backdrop-blur-xl"
          >
            <div className="relative">
              <div
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border backdrop-blur-md ${styles.iconWrap}`}
              >
                <i className={`fas ${styles.icon} text-xl`} aria-hidden />
              </div>

              <h3 className="mb-2 text-xl font-semibold tracking-tight text-zinc-50">{title}</h3>

              <p className="mb-7 text-sm leading-relaxed text-zinc-400">{message}</p>

              <div className="flex items-stretch gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800/80"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[filter,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${styles.confirmClass}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
