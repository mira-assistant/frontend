import { motion } from 'framer-motion';

export interface CommandBubbleProps {
  mode: 'listening_for_command' | 'capturing' | 'streaming' | 'done';
  transcript: string;
  responseTokens: string[];
  activeToolCall?: string;
  onDismiss: () => void;
}

export default function CommandBubble({
  mode,
  transcript,
  responseTokens,
  activeToolCall,
  onDismiss,
}: CommandBubbleProps) {
  const fullResponse = responseTokens.join('');
  const words = fullResponse.split(/\s+/).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-[420px] self-center px-5 py-4"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(16,185,129,0.07),transparent)]"
        aria-hidden
      />
      <div
        className="relative rounded-3xl border border-white/[0.08] bg-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-emerald-500/10 backdrop-blur-2xl"
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 text-zinc-600 transition-colors hover:text-zinc-300"
          aria-label="Dismiss"
        >
          ×
        </button>

        <div className="relative pr-8">
          {mode === 'listening_for_command' && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-secondary text-sm text-zinc-400">Listening...</span>
            </div>
          )}

          {mode === 'capturing' && (
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400"
                aria-hidden
              />
              <span className="font-secondary text-sm text-zinc-400">Processing...</span>
            </div>
          )}

          {(mode === 'streaming' || mode === 'done') && (
            <div>
              {transcript ? (
                <p className="mb-3 font-secondary text-xs text-zinc-500">{transcript}</p>
              ) : null}
              <p className="font-primary text-sm leading-relaxed text-zinc-50">
                {words.map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="inline"
                  >
                    {i > 0 ? ' ' : ''}
                    {word}
                  </motion.span>
                ))}
              </p>
              {activeToolCall ? (
                <p className="mt-2 font-secondary text-[11px] font-medium text-emerald-400">
                  <span className="inline-block animate-pulse">⚙</span> {activeToolCall}...
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
