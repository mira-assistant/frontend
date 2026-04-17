import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@dadei/ui/contexts/AuthContext';
import { ServiceProvider } from '@dadei/ui/contexts/ServiceContext';
import { AudioProvider } from '@dadei/ui/contexts/AudioContext';
import { ToastProvider } from '@dadei/ui/contexts/ToastContext';
import AppPage from '@dadei/ui/pages/AppPage';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@dadei/ui/pages/LoginPage';
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
                  <AppPage />
                </AudioProvider>
              </ServiceProvider>
            }
          />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
