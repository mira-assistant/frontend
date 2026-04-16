import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@mira/ui/contexts/AuthContext';
import { ServiceProvider } from '@mira/ui/contexts/ServiceContext';
import { AudioProvider } from '@mira/ui/contexts/AudioContext';
import { ToastProvider } from '@mira/ui/contexts/ToastContext';
import MiraAppPage from '@mira/ui/pages/MiraAppPage';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@mira/ui/pages/LoginPage';
import AuthOAuthCallbackPage from '@/pages/AuthOAuthCallbackPage';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthOAuthCallbackPage />} />
          <Route
            path="/app"
            element={
              <ServiceProvider>
                <AudioProvider>
                  <MiraAppPage />
                </AudioProvider>
              </ServiceProvider>
            }
          />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
