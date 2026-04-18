export { default as AssistantLayout } from './pages/AssistantLayout';
export { default as LoginPage } from './pages/LoginPage';

export { AuthProvider, AuthContext } from './contexts/AuthContext';
export { ServiceProvider, ServiceContext } from './contexts/ServiceContext';
export { AudioProvider, AudioContext } from './contexts/AudioContext';
export { ToastProvider, useToast } from './contexts/ToastContext';
export { NotificationProvider, useNotification } from './contexts/NotificationContext';

export { useAuth } from './hooks/useAuth';
export { useService } from './hooks/useService';
export { useAudio } from './hooks/useAudio';

export { default as LoginOverlay } from './components/LoginModal';
export { default as Header } from './components/Header';
export { default as MicrophoneButton } from './components/MicrophoneButton';
export { default as InteractionPanel } from './components/InteractionPanel';
export { default as ActionWebhookBanners } from './components/ui/ActionWebhookBanners';
export { default as Toast } from './components/ui/Toast';
export { default as PeoplePanel } from './components/PeoplePanel';
