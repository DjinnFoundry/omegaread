/**
 * Barrel re-export for story actions.
 *
 * Previously a 1915-line god file, now split into focused modules:
 * - audio-actions: audio analysis and transcription
 * - story-generation-actions: story generation pipeline, trace, question generation
 * - session-finalization-actions: session completion, ELO, stars
 * - story-rewrite-actions: in-session story rewriting
 * - lib/learning/topic-selector: pure domain logic for skill/topic selection
 *
 * All consumers (page.tsx, tests) import from this barrel,
 * so no downstream changes are needed.
 */

export { analizarLecturaAudio } from './audio-actions';

export {
  generarHistoria,
  obtenerProgresoGeneracionHistoria,
  generarPreguntasSesion,
} from './story-generation-actions';

export {
  registrarLecturaCompletada,
  finalizarSesionLectura,
} from './session-finalization-actions';

export { reescribirHistoria } from './story-rewrite-actions';
