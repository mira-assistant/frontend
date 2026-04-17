import { useContext } from 'react';
import { AudioContext } from '@dadei/ui/contexts/AudioContext';

export function useAudio() {
  const context = useContext(AudioContext);

  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }

  return context;
}