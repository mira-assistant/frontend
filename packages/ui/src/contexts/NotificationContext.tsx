import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import TeardropNotificationHost from '@dadei/ui/components/ui/TeardropNotificationHost';

const DEFAULT_DURATION_MS = 14_000;
const MAX_STACK = 4;

export type PushNotificationInput = {
  id?: string;
  title: string;
  body?: string;
  durationMs?: number;
};

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  durationMs: number;
};

type NotificationContextType = {
  notifications: NotificationItem[];
  pushNotification: (input: PushNotificationInput) => string;
  dismissNotification: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const pushNotification = useCallback((input: PushNotificationInput) => {
    const id = input.id ?? newId();
    const durationMs = input.durationMs ?? DEFAULT_DURATION_MS;
    const item: NotificationItem = {
      id,
      title: input.title,
      body: input.body,
      durationMs,
    };
    setNotifications((prev) => [item, ...prev].slice(0, MAX_STACK));
    return id;
  }, []);

  const value = useMemo(
    () => ({ notifications, pushNotification, dismissNotification }),
    [notifications, pushNotification, dismissNotification]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <TeardropNotificationHost />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return ctx;
}
