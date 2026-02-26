/**
 * Hook de grabacion de audio con VAD (Voice Activity Detection).
 *
 * Encapsula: MediaRecorder setup/teardown, AudioContext + analyser,
 * calculo RMS para deteccion de voz activa, y recoleccion de chunks.
 *
 * Extraido de PantallaLectura.tsx para mejorar separacion de concerns.
 */
import { useRef, useCallback, useState } from 'react';

// ─── TYPES ───

interface BrowserAudioContextConstructor {
  new (): AudioContext;
}

export type AudioRecordingState = 'idle' | 'recording' | 'unsupported' | 'denied' | 'processing';

export interface AudioRecordingResult {
  /** Base64-encoded audio */
  audioBase64: string;
  /** MIME type of the recording */
  mimeType: string;
  /** Total milliseconds of detected voice activity */
  vozActivaMs: number;
}

export interface UseAudioRecordingReturn {
  /** Current state of the recording */
  estado: AudioRecordingState;
  /** Error message, if any */
  error: string | null;
  /** Start recording from the microphone */
  iniciar: () => Promise<void>;
  /** Stop recording and return the audio data (null if no usable audio) */
  detenerYObtener: () => Promise<AudioRecordingResult | null>;
  /** Stop any active recording and release resources */
  detener: () => Promise<void>;
  /** Stop, reset, and start recording again */
  reintentar: () => Promise<void>;
  /** Clear the error message */
  clearError: () => void;
}

// ─── HELPERS ───

function getAudioContextConstructor(): BrowserAudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const ctor = (
    window as unknown as {
      AudioContext?: BrowserAudioContextConstructor;
      webkitAudioContext?: BrowserAudioContextConstructor;
    }
  ).AudioContext
    ??
    (window as unknown as { webkitAudioContext?: BrowserAudioContextConstructor }).webkitAudioContext;
  return ctor ?? null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...sub);
  }

  return btoa(binary);
}

// ─── HOOK ───

export function useAudioRecording(): UseAudioRecordingReturn {
  const [estado, setEstado] = useState<AudioRecordingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const ultimoTickVadRef = useRef(0);
  const vozActivaMsRef = useRef(0);

  const detener = useCallback(async () => {
    // Stop VAD animation frame loop
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    ultimoTickVadRef.current = 0;

    // Stop MediaRecorder
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const onStop = () => {
          recorder.removeEventListener('stop', onStop);
          resolve();
        };
        recorder.addEventListener('stop', onStop, { once: true });
        recorder.stop();
      });
    }
    mediaRecorderRef.current = null;

    // Stop media stream tracks
    const stream = audioStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    // Close AudioContext
    const ctx = audioContextRef.current;
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        // Ignored: may already be closed
      }
      audioContextRef.current = null;
    }

    // Clear accumulated data so a subsequent iniciar() starts fresh
    audioChunksRef.current = [];
    vozActivaMsRef.current = 0;
  }, []);

  const iniciar = useCallback(async () => {
    setError(null);
    setEstado('idle');

    if (
      typeof window === 'undefined'
      || !navigator.mediaDevices?.getUserMedia
      || !window.MediaRecorder
    ) {
      setEstado('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;

      // Set up AudioContext + analyser for VAD
      const Ctx = getAudioContextConstructor();
      if (Ctx) {
        const audioContext = new Ctx();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);
        const thresholdRms = 0.02;

        const tick = () => {
          analyser.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
          }
          const rms = Math.sqrt(sum / buffer.length);

          const now = performance.now();
          const delta = ultimoTickVadRef.current > 0 ? now - ultimoTickVadRef.current : 0;
          ultimoTickVadRef.current = now;

          if (rms >= thresholdRms && delta > 0 && delta < 1000) {
            vozActivaMsRef.current += delta;
          }

          vadRafRef.current = requestAnimationFrame(tick);
        };
        vadRafRef.current = requestAnimationFrame(tick);
      }

      // Set up MediaRecorder
      const preferred = 'audio/webm;codecs=opus';
      const mimeType = MediaRecorder.isTypeSupported(preferred) ? preferred : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setEstado('recording');
    } catch {
      setEstado('denied');
      setError('No se pudo activar el microfono. Puedes reintentarlo desde el menu.');
    }
  }, []);

  const detenerYObtener = useCallback(async (): Promise<AudioRecordingResult | null> => {
    setEstado('processing');
    await detener();

    const vozActivaMs = Math.round(vozActivaMsRef.current);
    const chunks = audioChunksRef.current;

    if (chunks.length === 0 || vozActivaMs <= 0) {
      setEstado('idle');
      return null;
    }

    const mimeType = chunks[0]?.type || 'audio/webm';
    const blob = new Blob(chunks, { type: mimeType });
    const audioBase64 = await blobToBase64(blob);

    setEstado('idle');
    return { audioBase64, mimeType, vozActivaMs };
  }, [detener]);

  const reintentar = useCallback(async () => {
    await detener();
    audioChunksRef.current = [];
    vozActivaMsRef.current = 0;
    await iniciar();
  }, [detener, iniciar]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    estado,
    error,
    iniciar,
    detenerYObtener,
    detener,
    reintentar,
    clearError,
  };
}
