'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook ligero de Text-to-Speech usando Web Speech API.
 * Pensado para leer preguntas/opciones en voz alta a ninos pequenos.
 */
export function useTTS(lang = 'es-ES') {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setSpeakingId(null);
  }, []);

  const speak = useCallback((text: string, id: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    // If already speaking this same id, toggle off
    if (utteranceRef.current && speakingId === id) {
      stop();
      return;
    }

    // Cancel any current speech
    synth.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.9;
    utt.pitch = 1.1;

    // Try to pick a Spanish voice
    const voices = synth.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es'));
    if (esVoice) utt.voice = esVoice;

    utt.onend = () => {
      utteranceRef.current = null;
      setSpeakingId(null);
    };
    utt.onerror = () => {
      utteranceRef.current = null;
      setSpeakingId(null);
    };

    utteranceRef.current = utt;
    setSpeakingId(id);
    synth.speak(utt);
  }, [lang, speakingId, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Stop speech when question changes (component will call this externally)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { speak, stop, speakingId, supported };
}
