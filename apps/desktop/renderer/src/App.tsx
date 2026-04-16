import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@mira/ui/contexts/ToastContext';
import { AuthProvider } from '@mira/ui/contexts/AuthContext';
import { ServiceProvider } from '@mira/ui/contexts/ServiceContext';
import { AudioProvider } from '@mira/ui/contexts/AudioContext';
import MiraAppPage from '@mira/ui/pages/MiraAppPage';
import LoginPage from '@mira/ui/pages/LoginPage';

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
                    <MiraAppPage />
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
