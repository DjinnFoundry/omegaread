/**
 * Utilidad de Text-to-Speech para la mascota y UI del niño.
 * Usa Web Speech API con voz en español, rate reducido y pitch amigable.
 */

/** Opciones para la función hablar */
export interface OpcionesHablar {
  /** Velocidad de habla (default: 0.85) */
  velocidad?: number;
  /** Callback cuando termina de hablar */
  onEnd?: () => void;
}

let vozEspanol: SpeechSynthesisVoice | null = null;

/**
 * Busca y cachea la mejor voz en español disponible.
 */
function obtenerVozEspanol(): SpeechSynthesisVoice | null {
  if (vozEspanol) return vozEspanol;

  const voces = window.speechSynthesis.getVoices();
  // Prioridad: es-MX, es-ES, es-*, cualquiera con "spanish"
  vozEspanol =
    voces.find((v) => v.lang === 'es-MX') ??
    voces.find((v) => v.lang === 'es-ES') ??
    voces.find((v) => v.lang.startsWith('es')) ??
    voces.find((v) => v.name.toLowerCase().includes('spanish')) ??
    null;

  return vozEspanol;
}

// Precarga voces cuando estén disponibles
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    obtenerVozEspanol();
  };
}

/**
 * Habla un texto en español con voz amigable para niños.
 * Cancela cualquier utterance anterior antes de iniciar.
 *
 * @param texto - El texto a hablar
 * @param opciones - Velocidad y callback de fin
 */
export function hablar(texto: string, opciones?: OpcionesHablar): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Cancela cualquier speech anterior
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(texto);
  const voz = obtenerVozEspanol();
  if (voz) {
    utterance.voice = voz;
  }
  utterance.lang = 'es-ES';
  utterance.rate = opciones?.velocidad ?? 0.85;
  utterance.pitch = 1.1;

  if (opciones?.onEnd) {
    utterance.onend = opciones.onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Detiene cualquier speech en curso.
 */
export function detenerHabla(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
