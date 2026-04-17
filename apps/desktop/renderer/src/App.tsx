import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@dadei/ui/contexts/ToastContext';
import { AuthProvider } from '@dadei/ui/contexts/AuthContext';
import { ServiceProvider } from '@dadei/ui/contexts/ServiceContext';
import { AudioProvider } from '@dadei/ui/contexts/AudioContext';
import AppPage from '@dadei/ui/pages/AppPage';
import LoginPage from '@dadei/ui/pages/LoginPage';

export function App() {
  return (
    <MemoryRouter initialEntries={['/app']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}
