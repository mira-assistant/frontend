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
    iconWrap:
      'border-rose-200/80 bg-linear-to-br from-rose-100/90 to-rose-50/70 text-rose-600 shadow-inner shadow-white/40',
    confirmClass:
      'border border-rose-300/60 bg-linear-to-b from-rose-500/95 to-rose-600/95 text-white shadow-[0_8px_32px_rgba(225,29,72,0.25)] backdrop-blur-md hover:brightness-110',
  },
  warning: {
    icon: 'fa-exclamation-circle',
    iconWrap:
      'border-amber-200/80 bg-linear-to-br from-amber-100/90 to-amber-50/70 text-amber-700 shadow-inner shadow-white/40',
    confirmClass:
      'border border-amber-300/60 bg-linear-to-b from-amber-500/95 to-amber-600/95 text-white shadow-[0_8px_32px_rgba(217,119,6,0.2)] backdrop-blur-md hover:brightness-110',
  },
  info: {
    icon: 'fa-info-circle',
    iconWrap:
      'border-sky-200/80 bg-linear-to-br from-sky-100/90 to-sky-50/70 text-sky-700 shadow-inner shadow-white/40',
    confirmClass:
      'border border-sky-300/60 bg-linear-to-b from-sky-500/95 to-sky-600/95 text-white shadow-[0_8px_32px_rgba(2,132,199,0.2)] backdrop-blur-md hover:brightness-110',
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
          className="fixed inset-0 z-220 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: veilMs, ease: veilEase }}
        >
          <div
            role="presentation"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/15 backdrop-blur-2xl backdrop-saturate-150"
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
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white/45 p-7 shadow-[0_24px_80px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)_inset] ring-1 ring-[#00ff88]/15 backdrop-blur-2xl"
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b from-white/55 via-white/20 to-emerald-400/10"
              aria-hidden
            />

            <div className="relative">
              <div
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border backdrop-blur-md ${styles.iconWrap}`}
              >
                <i className={`fas ${styles.icon} text-xl`} aria-hidden />
              </div>

              <h3 className="mb-2 text-xl font-semibold tracking-tight text-slate-800">{title}</h3>

              <p className="mb-7 text-sm leading-relaxed text-slate-600">{message}</p>

              <div className="flex items-stretch gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-white/80 bg-white/55 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-[background-color,border-color,box-shadow] hover:border-slate-200/90 hover:bg-white/75"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[filter,box-shadow] ${styles.confirmClass}`}
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
