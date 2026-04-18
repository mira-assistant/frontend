import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Trash2, X } from 'lucide-react';
import { accordionEase, DELETE_SLOT_ARMED_PX, DELETE_SLOT_IDLE_PX } from './constants';
import type { SplitDeleteGroup } from './types';

export default function SplitDeleteToolbar({
  armed,
  onArm,
  onDisarm,
  onConfirm,
  group,
  idleTitle,
  idleAriaLabel,
}: {
  armed: boolean;
  onArm: () => void;
  onDisarm: () => void;
  onConfirm: () => void;
  group: SplitDeleteGroup;
  idleTitle: string;
  idleAriaLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const hoverVisible =
    group === 'interaction'
      ? 'group-hover/interaction:opacity-100'
      : 'group-hover/conv:opacity-100';

  return (
    <motion.div
      data-split-delete
      initial={false}
      animate={{ width: armed ? DELETE_SLOT_ARMED_PX : DELETE_SLOT_IDLE_PX }}
      transition={{
        duration: reduceMotion ? 0.01 : 0.26,
        ease: accordionEase,
      }}
      className="relative h-9 shrink-0 self-center overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <AnimatePresence initial={false} mode="wait">
        {armed ? (
          <motion.div
            key="del-armed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.09, ease: 'easeOut' }}
            className="flex h-full w-full items-center justify-end gap-1"
          >
            <button
              type="button"
              aria-label="Confirm delete"
              title="Confirm delete"
              onClick={e => {
                e.stopPropagation();
                onConfirm();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-emerald-400/95 transition-colors hover:bg-emerald-500/15 hover:text-emerald-300"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              title="Cancel"
              onClick={e => {
                e.stopPropagation();
                onDisarm();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-400/90 transition-colors hover:bg-rose-950/65 hover:text-rose-100"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="del-idle"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.09, ease: 'easeOut' }}
            title={idleTitle}
            aria-label={idleAriaLabel}
            onClick={e => {
              e.stopPropagation();
              onArm();
            }}
            className={`flex h-full w-full items-center justify-center rounded-lg text-rose-400/90 opacity-0 transition-[opacity,background-color,color] duration-150 hover:bg-rose-950/70 hover:text-rose-100 ${hoverVisible}`}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
