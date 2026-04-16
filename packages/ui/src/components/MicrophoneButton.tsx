
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useService } from '@mira/ui/hooks/useService';
import { cn } from '@mira/ui/lib/cn';

interface MicrophoneButtonProps {
  disableSpaceToggle?: boolean;
}

export default function MicrophoneButton({ disableSpaceToggle = false }: MicrophoneButtonProps) {
  const {
    isServiceEnabled,
    toggleService,
    isTogglingService,
    registrationConflict,
  } = useService();

  const micBlocked = isTogglingService || registrationConflict;

  // Spacebar activation
  // Spacebar activation (disabled when panel open)
  useEffect(() => {
    if (disableSpaceToggle) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !micBlocked) {
        e.preventDefault();
        toggleService();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [micBlocked, toggleService, disableSpaceToggle]);

  const handleClick = async () => {
    if (micBlocked) return;
    await toggleService();
  };

  return (
    <div className="flex flex-col items-center gap-10">
      <motion.button
        onClick={handleClick}
        disabled={micBlocked}
        whileHover={!micBlocked && !isServiceEnabled ? {
          scale: 1.05,
          rotate: [0, -2, 2, -2, 2, 0],
          transition: { duration: 0 }
        } : {}}
        whileTap={!micBlocked ? {
          scale: 0.95,
          rotate: isServiceEnabled ? 0 : [0, -5, 5, -5, 5, 0]
        } : {}}
        className={cn(
          'relative w-40 h-40 rounded-full transition-all duration-300 border-[3px] border-[rgba(255,255,255,0.3)]',
          'flex items-center justify-center',
          'focus:outline-none focus:ring-4 focus:ring-[#00ff88]/30',
          micBlocked
            ? 'bg-[#6b7280] cursor-not-allowed opacity-60'
            : isServiceEnabled
              ? 'bg-linear-to-br from-[#ff4444] to-[#e53e3e] shadow-[0_10px_30px_rgba(255,68,68,0.6),0_0_30px_rgba(255,68,68,0.4),0_0_60px_rgba(255,68,68,0.2)] cursor-pointer'
              : 'bg-linear-to-br from-[#00ff88] to-[#00e676] shadow-[0_5px_20px_rgba(0,255,136,0.3)] hover:shadow-[0_15px_40px_rgba(0,255,136,0.7),0_0_40px_rgba(0,255,136,0.5),0_0_80px_rgba(0,255,136,0.3)] cursor-pointer'
        )}
      >
        {/* Red Ripple Waves - when service enabled */}
        {isServiceEnabled && !micBlocked && (
          <>
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border-2 border-[rgba(255,68,68,0.6)] rounded-full bg-transparent pointer-events-none"
              animate={{
                scale: [1.05, 2],
                opacity: [0, 0.6, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border-2 border-[rgba(255,68,68,0.6)] rounded-full bg-transparent pointer-events-none"
              animate={{
                scale: [1.05, 2],
                opacity: [0, 0.6, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.4
              }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border-2 border-[rgba(255,68,68,0.6)] rounded-full bg-transparent pointer-events-none"
              animate={{
                scale: [1.05, 2],
                opacity: [0, 0.6, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.8
              }}
            />
          </>
        )}

        {/* Green pulse effect when disabled (inactive) */}
        {!isServiceEnabled && !micBlocked && (
          <motion.div
            className="absolute inset-0 rounded-full bg-linear-to-br from-[#00ff88] to-[#00e676] opacity-0"
            animate={{
              opacity: [0, 0.3, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        {/* Microphone Icon - static when enabled */}
        <div className="relative z-10 text-white flex items-center justify-center">
          <svg
            className="w-16 h-16 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        </div>

        {/* Spinning ring when toggling */}
        {isTogglingService && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        )}
      </motion.button>

      {/* <motion.p
        className="text-base font-medium text-[#6b7280]"
        animate={{
          opacity: [0.7, 1, 0.7]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {getStatusText()}
      </motion.p> */}

      {/* Keyboard hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute bottom-20 flex items-center gap-2 text-sm text-[#9ca3af]"
      >
        <kbd className="px-4 py-1 bg-white border border-[#e5e7eb] rounded-md shadow-sm font-mono text-base">
          Space
        </kbd>
        <span>to toggle Mira</span>
      </motion.div>
    </div>
  );
}