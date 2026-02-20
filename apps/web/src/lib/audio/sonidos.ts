/**
 * Manager de efectos de sonido generados programáticamente.
 * Usa AudioContext API — sin archivos de audio externos.
 * Todos los sonidos son cortos (<1s).
 */

let audioCtx: AudioContext | null = null;

/**
 * Obtiene o crea el AudioContext (lazy init por políticas del navegador).
 */
function obtenerContexto(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Reproduce un tono simple.
 */
function reproducirTono(
  frecuencia: number,
  duracion: number,
  tipo: OscillatorType = 'sine',
  volumen: number = 0.3,
  inicioMs: number = 0
): void {
  const ctx = obtenerContexto();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, ctx.currentTime);
  gain.gain.setValueAtTime(volumen, ctx.currentTime + inicioMs / 1000);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + inicioMs / 1000 + duracion
  );

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + inicioMs / 1000);
  osc.stop(ctx.currentTime + inicioMs / 1000 + duracion);
}

/**
 * Tono ascendente alegre (do-mi-sol) — para respuestas correctas.
 */
export function acierto(): void {
  // Do (C5) - Mi (E5) - Sol (G5)
  reproducirTono(523.25, 0.15, 'sine', 0.25, 0);
  reproducirTono(659.25, 0.15, 'sine', 0.25, 100);
  reproducirTono(783.99, 0.25, 'sine', 0.3, 200);
}

/**
 * Tono suave descendente — para errores (sin ser triste).
 */
export function error(): void {
  // Tono suave que baja un poco
  reproducirTono(440, 0.15, 'sine', 0.15, 0);
  reproducirTono(392, 0.2, 'sine', 0.12, 120);
}

/**
 * Click suave — feedback táctil sonoro.
 */
export function click(): void {
  const ctx = obtenerContexto();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

/**
 * Secuencia alegre de celebración — para logros importantes.
 */
export function celebracion(): void {
  // Do-Mi-Sol-Do(octava) rápido y brillante
  reproducirTono(523.25, 0.12, 'sine', 0.2, 0);
  reproducirTono(659.25, 0.12, 'sine', 0.2, 80);
  reproducirTono(783.99, 0.12, 'sine', 0.25, 160);
  reproducirTono(1046.5, 0.35, 'sine', 0.3, 240);
  // Arpegio extra brillante
  reproducirTono(1318.51, 0.15, 'triangle', 0.15, 400);
  reproducirTono(1567.98, 0.3, 'triangle', 0.12, 500);
}

/**
 * Twinkle — para estrellas ganadas.
 */
export function estrellaGanada(): void {
  // Brillito ascendente rápido
  reproducirTono(1200, 0.08, 'sine', 0.2, 0);
  reproducirTono(1600, 0.08, 'sine', 0.2, 60);
  reproducirTono(2000, 0.15, 'sine', 0.15, 120);
  reproducirTono(2400, 0.25, 'triangle', 0.1, 180);
}

/**
 * Objeto agrupado para importar como `sonidos.acierto()`, etc.
 */
export const sonidos = {
  acierto,
  error,
  click,
  celebracion,
  estrellaGanada,
};
