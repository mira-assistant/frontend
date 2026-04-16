
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@mira/ui/lib/cn';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error';
  show?: boolean; // Allow controlled visibility
  position?: 'top' | 'bottom';
}

export default function Tooltip({
  content,
  children,
  variant = 'default',
  show,
  position = 'bottom'
}: TooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const targetRef = useRef<HTMLDivElement>(null);

  // Use controlled visibility if provided, otherwise use hover state
  const isVisible = show !== undefined ? show : isHovered;

  useEffect(() => {
    if (isVisible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();

      if (position === 'bottom') {
        setCoords({
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
        });
      } else {
        setCoords({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
      }
    }
  }, [isVisible, position]);

  const variantStyles = {
    default: 'bg-gray-900 text-white',
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
  };

  return (
    <div
      ref={targetRef}
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: position === 'bottom' ? -10 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'bottom' ? -10 : 10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'fixed z-50 px-3 py-1.5 text-xs font-medium rounded-lg shadow-lg',
              '-translate-x-1/2 whitespace-nowrap',
              variantStyles[variant]
            )}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              ...(position === 'top' && { transform: 'translate(-50%, -100%)' })
            }}
          >
            {content}
            {/* Arrow */}
            <div
              className={cn(
                'absolute w-2 h-2 rotate-45',
                position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2' : '-bottom-1 left-1/2 -translate-x-1/2',
                variant === 'default' && 'bg-gray-900',
                variant === 'success' && 'bg-green-500',
                variant === 'error' && 'bg-red-500'
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}