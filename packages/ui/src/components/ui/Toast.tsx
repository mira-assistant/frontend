import { useCallback, useEffect, useState } from 'react';
import { ToastType } from '@mira/ui/types/models.types';
import { cn } from '@mira/ui/lib/cn';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  autoDismiss?: boolean;
}

export default function Toast({ message, type, onClose, autoDismiss = true }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);

    if (autoDismiss && type !== 'error') {
      const duration = Math.max(3000, Math.min(8000, message.length * 50));
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, type, autoDismiss, handleClose]);

  const bgColors = {
    info: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    success: 'bg-emerald-600',
  };

  return (
    <div
      onClick={handleClose}
      className={cn(
        'max-w-md px-4 py-3 rounded-lg shadow-lg text-white font-medium text-sm',
        'cursor-pointer transition-all duration-300 ease-out',
        bgColors[type],
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      )}
    >
      {message}
    </div>
  );
}