
import { createContext, useEffect, useState } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { interactionsApi } from '@dadei/ui/lib/api/interactions';
import { useService } from '@dadei/ui/hooks/useService';

interface AudioContextType {
  isProcessing: boolean;
  isVADReady: boolean;
}

export const AudioContext = createContext<AudioContextType | undefined>(undefined);

function calculateRMS(audio: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < audio.length; i++) {
    sum += audio[i] * audio[i];
  }
  return Math.sqrt(sum / audio.length);
}

function hasSignificantAudio(audio: Float32Array): boolean {
  const rms = calculateRMS(audio);
  const minRMS = 0.008;
  // Loud speech can legitimately exceed 0.3 RMS without being broken audio; rejecting it was dropping good takes.
  const maxRMS = 0.55;

  if (rms < minRMS) {
    console.log('[VAD] Rejected: Too quiet (RMS:', rms.toFixed(4), ')');
    return false;
  }

  if (rms > maxRMS) {
    console.log('[VAD] Rejected: Too loud/clipping (RMS:', rms.toFixed(4), ')');
    return false;
  }

  const durationSeconds = audio.length / 16000;
  // Align with VAD minSpeechMs: need enough audio for Whisper + speaker embedding (backend prefers ~0.8s+ when possible).
  const minDuration = 0.42;
  const maxDuration = 10;

  if (durationSeconds < minDuration) {
    console.log('[VAD] Rejected: Too short (', durationSeconds.toFixed(2), 's)');
    return false;
  }

  if (durationSeconds > maxDuration) {
    console.log('[VAD] Rejected: Too long (', durationSeconds.toFixed(2), 's)');
    return false;
  }

  console.log('[VAD] Accepted: RMS=', rms.toFixed(4), 'Duration=', durationSeconds.toFixed(2), 's');
  return true;
}

function encodeWAV(samples: Float32Array, sampleRate: number = 16000): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { clientName, isServiceEnabled, registrationConflict } = useService();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVADReady, setIsVADReady] = useState(false);

  // VAD/ONNX assets live in `/public` and must resolve from the app origin,
  // not the current client route (e.g. `/app`).
  function getAssetPath() {
    return new URL(import.meta.env.BASE_URL, window.location.origin).href;
  }

  const assetPath = getAssetPath();

  const vad = useMicVAD({
    startOnLoad: true,
    // Use the calculated absolute path
    baseAssetPath: assetPath,
    onnxWASMBasePath: assetPath,

    onSpeechStart: () => console.log("Speech started"),
    onVADMisfire: () => console.log("VAD misfire"),
    onSpeechEnd: async (audio: Float32Array) => {
      if (!hasSignificantAudio(audio)) {
        console.log('[VAD] Audio rejected - quality check failed');
        return;
      }

      setIsProcessing(true);

      try {
        const wavBuffer = encodeWAV(audio, 16000);
        await interactionsApi.register(wavBuffer, clientName);
        console.log('[VAD] Audio sent successfully');
        setIsProcessing(false);
      } catch (error) {
        console.error('[VAD] Failed to send audio:', error);
        setIsProcessing(false);
      }
    },

    model: 'v5',
    // Defaults in @ricky0123/vad-web use ~800ms pre-speech pad and ~1400ms redemption — we were far more
    // aggressive (100ms / 300ms / 0.85), which trims word onsets and tails and hurts Whisper + speaker ID.
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    redemptionMs: 1000,
    minSpeechMs: 500,
    preSpeechPadMs: 600,
    submitUserSpeechOnPause: false,
  });

  // Track when VAD is fully loaded and ready
  useEffect(() => {
    if (!vad.loading && !vad.errored) {
      console.log('[VAD] Ready and initialized');
      setIsVADReady(true);
    }
  }, [vad.loading, vad.errored]);

  // Control VAD listening based on service state (pause if client registration conflict)
  useEffect(() => {
    if (!isVADReady) return; // Wait for VAD to be ready

    const shouldListen = isServiceEnabled && !registrationConflict;

    if (shouldListen && !vad.listening) {
      console.log('[VAD] Starting listening');
      vad.start();
    } else if (!shouldListen && vad.listening) {
      console.log('[VAD] Pausing listening');
      vad.pause();
    }
  }, [isServiceEnabled, registrationConflict, vad.listening, isVADReady]);

  useEffect(() => {
    if (vad.loading) {
      console.log('[VAD] Loading models...');
    }
    if (vad.errored) {
      console.error('[VAD] Error:', vad.errored);
    }
  }, [vad.loading, vad.errored]);

  return (
    <AudioContext.Provider value={{ isProcessing, isVADReady }}>
      {children}
    </AudioContext.Provider>
  );
}