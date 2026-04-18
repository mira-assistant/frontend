import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from '@dadei/ui/contexts/NotificationContext';
import { AuthProvider } from '@dadei/ui/contexts/AuthContext';
import { ServiceProvider } from '@dadei/ui/contexts/ServiceContext';
import { AudioProvider } from '@dadei/ui/contexts/AudioContext';
import AssistantLayout from '@dadei/ui/pages/AssistantLayout';
import LoginPage from '@dadei/ui/pages/LoginPage';

export function App() {
  return (
    <MemoryRouter initialEntries={['/assistant']}>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/assistant"
              element={
                <ServiceProvider>
                  <AudioProvider>
                    <AssistantLayout />
                  </AudioProvider>
                </ServiceProvider>
              }
            />
            <Route path="/app" element={<Navigate to="/assistant" replace />} />
            <Route path="/" element={<Navigate to="/assistant" replace />} />
            <Route path="*" element={<Navigate to="/assistant" replace />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </MemoryRouter>
  );
}
