
import { useContext } from 'react';
import { ServiceContext } from '@dadei/ui/contexts/ServiceContext';

export function useService() {
  const context = useContext(ServiceContext);

  if (context === undefined) {
    throw new Error('useService must be used within a ServiceProvider');
  }

  return context;
}