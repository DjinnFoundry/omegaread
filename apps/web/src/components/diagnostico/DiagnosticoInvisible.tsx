'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { hablar } from '@/lib/audio/tts';
import {
  acierto as sonidoAcierto,
  error as sonidoError,
  celebracion as sonidoCelebracion,
} from '@/lib/audio/sonidos';
import { BotonGrande } from '@/components/ui/BotonGrande';
import { BarraProgreso } from '@/components/ui/BarraProgreso';
import { Celebracion } from '@/components/ui/Celebracion';
import { LetraGrande } from '@/components/actividades/vocales/LetraGrande';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

/** Resultado del diagnóstico invisible */
export interface DiagnosticoResultado {
  /** Letras que el niño reconoce */
  letrasReconocidas: string[];
  /** Cuenta estable hasta este número */
  cuentaHasta: number;
  /** Nivel de conciencia fonológica (0-4) */
  concienciaFonologica: number;
  /** Duración total en segundos */
  duracionSegundos: number;
  /** Timestamp */
  fecha: string;
}

/** Props de DiagnosticoInvisible */
export interface DiagnosticoInvisibleProps {
  /** Nombre del niño (para personalizar mensajes) */
  nombreNino: string;
  /** Callback cuando el diagnóstico se completa */
  onComplete: (resultado: DiagnosticoResultado) => void;
}

/** Fase del diagnóstico */
type FaseDiagnostico = 'intro' | 'letras' | 'conteo' | 'rimas' | 'final';

// ─────────────────────────────────────────────
// DATOS
// ─────────────────────────────────────────────

/** Letras a evaluar en el juego 1 */
const LETRAS_DIAGNOSTICO = ['A', 'E', 'M', 'P', 'S', 'L'] as const;

/** Distractores para cada letra */
const DISTRACTORES_LETRAS: Record<string, string[]> = {
  A: ['O', 'U', 'E'],
  E: ['A', 'I', 'O'],
  M: ['N', 'W', 'R'],
  P: ['B', 'D', 'R'],
  S: ['Z', 'C', 'N'],
  L: ['I', 'T', 'J'],
};

/** Emojis para los objetos contables */
const OBJETOS_CONTEO = ['🍎', '⭐', '🐟', '🌸', '🎈', '🐱', '🌙', '🍌', '🦋', '🔵'];

/** Pares de rimas para juego 3 */
const PARES_RIMAS: Array<{
  /** Palabra objetivo */
  palabra: string;
  /** Emoji de la palabra */
  emoji: string;
  /** Respuesta correcta (rima) */
  rima: string;
  /** Emoji de la rima */
  rimaEmoji: string;
  /** Opciones incorrectas */
  distractores: Array<{ palabra: string; emoji: string }>;
}> = [
  {
    palabra: 'GATO',
    emoji: '🐱',
    rima: 'PATO',
    rimaEmoji: '🦆',
    distractores: [
      { palabra: 'PERRO', emoji: '🐕' },
      { palabra: 'LUNA', emoji: '🌙' },
    ],
  },
  {
    palabra: 'SOL',
    emoji: '☀️',
    rima: 'COL',
    rimaEmoji: '🥬',
    distractores: [
      { palabra: 'MAR', emoji: '🌊' },
      { palabra: 'PAN', emoji: '🍞' },
    ],
  },
  {
    palabra: 'LUNA',
    emoji: '🌙',
    rima: 'CUNA',
    rimaEmoji: '🛏️',
    distractores: [
      { palabra: 'MESA', emoji: '🪑' },
      { palabra: 'CASA', emoji: '🏠' },
    ],
  },
  {
    palabra: 'MESA',
    emoji: '🪑',
    rima: 'FRESA',
    rimaEmoji: '🍓',
    distractores: [
      { palabra: 'GATO', emoji: '🐱' },
      { palabra: 'CIELO', emoji: '🌤️' },
    ],
  },
];

/** Mezcla un array aleatoriamente */
function mezclar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Diagnóstico invisible "disfrazado de juego".
 *
 * 3 mini-juegos de ~2 min cada uno:
 * 1. "¿Conoces estas letras?" → detecta letras reconocidas
 * 2. "¡Contamos juntos!" → detecta nivel de conteo estable
 * 3. "¿Cuál suena igual?" → detecta conciencia fonológica
 *
 * Todo se presenta como un juego divertido. Sin puntuación visible.
 * Los resultados se compilan internamente.
 */
export function DiagnosticoInvisible({
  nombreNino,
  onComplete,
}: DiagnosticoInvisibleProps) {
  const [fase, setFase] = useState<FaseDiagnostico>('intro');
  const [progreso, setProgreso] = useState(0);
  const [mostrarCelebracion, setMostrarCelebracion] = useState(false);

  // Resultados internos
  const letrasReconocidasRef = useRef<string[]>([]);
  const cuentaHastaRef = useRef(0);
  const concienciaFonologicaRef = useRef(0);
  const inicioRef = useRef(Date.now());

  // ── Intro ──
  useEffect(() => {
    if (fase === 'intro') {
      const timer = setTimeout(() => {
        hablar(`¡Hola ${nombreNino}! ¡Vamos a jugar unos juegos divertidos!`, {
          onEnd: () => {
            setTimeout(() => {
              setFase('letras');
            }, 500);
          },
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [fase, nombreNino]);

  // ── Transiciones ──
  const avanzarFase = useCallback(
    (siguiente: FaseDiagnostico) => {
      setMostrarCelebracion(true);
      sonidoCelebracion();
      hablar('¡Muy bien! ¡Vamos con otro juego!', {
        onEnd: () => {
          setMostrarCelebracion(false);
          setFase(siguiente);
        },
      });
    },
    [],
  );

  const finalizarDiagnostico = useCallback(() => {
    const resultado: DiagnosticoResultado = {
      letrasReconocidas: letrasReconocidasRef.current,
      cuentaHasta: cuentaHastaRef.current,
      concienciaFonologica: concienciaFonologicaRef.current,
      duracionSegundos: Math.round((Date.now() - inicioRef.current) / 1000),
      fecha: new Date().toISOString(),
    };

    setFase('final');
    setMostrarCelebracion(true);
    hablar(`¡Genial ${nombreNino}! ¡Eres increíble! ¡Ya podemos empezar la aventura!`);

    setTimeout(() => {
      onComplete(resultado);
    }, 3000);
  }, [nombreNino, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto p-4">
      {/* Barra de progreso global (sin números) */}
      <BarraProgreso
        progreso={progreso}
        color="#A28BD4"
        className="mb-2"
      />

      {/* Contenido por fase */}
      <div className="flex-1 flex items-center justify-center w-full min-h-[350px]">
        {fase === 'intro' && (
          <div className="text-center">
            <div className="text-7xl mb-4 animate-bounce" role="presentation">🐱</div>
            <p className="text-xl font-bold" style={{ color: '#5D4037' }}>
              ¡Vamos a jugar!
            </p>
          </div>
        )}

        {fase === 'letras' && (
          <JuegoLetras
            onComplete={(letras) => {
              letrasReconocidasRef.current = letras;
              setProgreso(0.33);
              avanzarFase('conteo');
            }}
          />
        )}

        {fase === 'conteo' && (
          <JuegoConteo
            onComplete={(cuenta) => {
              cuentaHastaRef.current = cuenta;
              setProgreso(0.66);
              avanzarFase('rimas');
            }}
          />
        )}

        {fase === 'rimas' && (
          <JuegoRimas
            onComplete={(nivel) => {
              concienciaFonologicaRef.current = nivel;
              setProgreso(1);
              finalizarDiagnostico();
            }}
          />
        )}

        {fase === 'final' && (
          <div className="text-center">
            <div className="text-7xl mb-4 animate-bounce" role="presentation">🌟</div>
            <p className="text-2xl font-bold" style={{ color: '#5D4037' }}>
              ¡Increíble, {nombreNino}!
            </p>
            <p className="text-lg mt-2" style={{ color: '#8D6E63' }}>
              ¡Ya estamos listos para la aventura!
            </p>
          </div>
        )}
      </div>

      <Celebracion
        visible={mostrarCelebracion}
        onClose={() => setMostrarCelebracion(false)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// JUEGO 1: "¿Conoces estas letras?"
// ─────────────────────────────────────────────

interface JuegoLetrasProps {
  onComplete: (letrasReconocidas: string[]) => void;
}

function JuegoLetras({ onComplete }: JuegoLetrasProps) {
  const [indiceLetra, setIndiceLetra] = useState(0);
  const [opciones, setOpciones] = useState<string[]>([]);
  const [bloqueado, setBloqueado] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [estadoLetra, setEstadoLetra] = useState<'jugando' | 'correcto' | 'incorrecto'>('jugando');
  const reconocidasRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const letraActual = LETRAS_DIAGNOSTICO[indiceLetra];

  // Generar opciones para la letra actual
  useEffect(() => {
    if (indiceLetra >= LETRAS_DIAGNOSTICO.length) {
      onComplete(reconocidasRef.current);
      return;
    }

    const letra = LETRAS_DIAGNOSTICO[indiceLetra];
    const distractores = DISTRACTORES_LETRAS[letra] ?? ['X', 'Y', 'Z'];
    setOpciones(mezclar([letra, ...distractores]));
    setSeleccion(null);
    setEstadoLetra('jugando');
    setBloqueado(false);

    // TTS: "¿Sabes qué letra es esta?"
    const ttsTimer = setTimeout(() => {
      hablar(`¿Sabes cuál es la ${letra}?`);
    }, 400);

    // Timeout: si no responde en 5s, la mascota dice el nombre y pasa
    timerRef.current = setTimeout(() => {
      if (!reconocidasRef.current.includes(letra)) {
        hablar(`¡Esta es la ${letra}!`, {
          onEnd: () => {
            setIndiceLetra((i) => i + 1);
          },
        });
      }
    }, 5000);

    return () => {
      clearTimeout(ttsTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indiceLetra]);

  const manejarSeleccion = useCallback(
    (letra: string) => {
      if (bloqueado) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setBloqueado(true);
      setSeleccion(letra);

      const letraObj = LETRAS_DIAGNOSTICO[indiceLetra];

      if (letra === letraObj) {
        // Reconoce la letra
        setEstadoLetra('correcto');
        reconocidasRef.current = [...reconocidasRef.current, letraObj];
        sonidoAcierto();
        hablar('¡Muy bien!');
        setTimeout(() => setIndiceLetra((i) => i + 1), 1000);
      } else {
        setEstadoLetra('incorrecto');
        sonidoError();
        hablar(`¡Esta es la ${letraObj}!`);
        setTimeout(() => setIndiceLetra((i) => i + 1), 1500);
      }
    },
    [bloqueado, indiceLetra],
  );

  if (indiceLetra >= LETRAS_DIAGNOSTICO.length) return null;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex items-center gap-2">
        <span className="text-3xl" role="presentation">🔤</span>
        <span className="text-xl font-bold" style={{ color: '#5D4037' }}>
          ¿Conoces esta letra?
        </span>
      </div>

      {/* Indicador de progreso (puntitos) */}
      <div className="flex gap-2">
        {LETRAS_DIAGNOSTICO.map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all"
            style={{
              backgroundColor: i < indiceLetra ? '#7BC67E' : i === indiceLetra ? '#FFE66D' : '#E8E0D8',
            }}
          />
        ))}
      </div>

      {/* Opciones en grid */}
      <div className="grid grid-cols-2 gap-4">
        {opciones.map((letra, i) => (
          <LetraGrande
            key={`${letra}-${i}-${indiceLetra}`}
            letra={letra}
            size="xl"
            seleccionada={seleccion === letra && estadoLetra === 'jugando'}
            correcta={seleccion === letra && estadoLetra === 'correcto'}
            incorrecta={seleccion === letra && estadoLetra === 'incorrecto'}
            onClick={() => manejarSeleccion(letra)}
            deshabilitado={bloqueado}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// JUEGO 2: "¡Contamos juntos!"
// ─────────────────────────────────────────────

interface JuegoConteoProps {
  onComplete: (cuentaHasta: number) => void;
}

function JuegoConteo({ onComplete }: JuegoConteoProps) {
  const [cantidad, setCantidad] = useState(1);
  const [objetosTocados, setObjetosTocados] = useState(0);
  const [faseConteo, setFaseConteo] = useState<'tocar' | 'elegir' | 'resultado'>('tocar');
  const [opcionesNumero, setOpcionesNumero] = useState<number[]>([]);
  const [bloqueado, setBloqueado] = useState(false);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [estadoNum, setEstadoNum] = useState<'jugando' | 'correcto' | 'incorrecto'>('jugando');
  const fallosConsecutivosRef = useRef(0);
  const mejorCuentaRef = useRef(0);

  // Instrucción TTS
  useEffect(() => {
    if (faseConteo === 'tocar') {
      setObjetosTocados(0);
      setBloqueado(false);
      setSeleccion(null);
      setEstadoNum('jugando');

      const timer = setTimeout(() => {
        hablar(`¿Cuántos hay? ¡Toca para contar!`);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [cantidad, faseConteo]);

  // Cuando todos los objetos han sido tocados → fase elegir
  useEffect(() => {
    if (faseConteo === 'tocar' && objetosTocados === cantidad) {
      const timer = setTimeout(() => {
        // Generar opciones
        const correcta = cantidad;
        const opciones = new Set<number>([correcta]);
        while (opciones.size < 3) {
          const candidato = Math.max(1, correcta + Math.floor(Math.random() * 5) - 2);
          if (candidato !== correcta) opciones.add(candidato);
        }
        setOpcionesNumero(mezclar([...opciones]));
        setFaseConteo('elegir');
        hablar('¿Cuántos contaste?');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [objetosTocados, cantidad, faseConteo]);

  const tocarObjeto = useCallback(
    (idx: number) => {
      if (faseConteo !== 'tocar') return;
      if (idx !== objetosTocados) return; // Solo el siguiente en orden
      sonidoAcierto();
      setObjetosTocados((t) => t + 1);
      hablar(`${objetosTocados + 1}`);
    },
    [faseConteo, objetosTocados],
  );

  const elegirNumero = useCallback(
    (num: number) => {
      if (bloqueado) return;
      setBloqueado(true);
      setSeleccion(num);

      if (num === cantidad) {
        setEstadoNum('correcto');
        sonidoAcierto();
        fallosConsecutivosRef.current = 0;
        mejorCuentaRef.current = Math.max(mejorCuentaRef.current, cantidad);
        hablar('¡Muy bien!');

        setTimeout(() => {
          if (cantidad >= 10) {
            onComplete(10);
          } else {
            setCantidad((c) => c + 1);
            setFaseConteo('tocar');
          }
        }, 1000);
      } else {
        setEstadoNum('incorrecto');
        sonidoError();
        fallosConsecutivosRef.current++;

        if (fallosConsecutivosRef.current >= 2) {
          // Se detiene: registra hasta dónde llegó
          hablar('¡Buen trabajo contando!');
          setTimeout(() => {
            onComplete(mejorCuentaRef.current);
          }, 1500);
        } else {
          hablar('¡Casi! Vamos a intentar otra vez');
          setTimeout(() => {
            setFaseConteo('tocar');
          }, 1500);
        }
      }
    },
    [bloqueado, cantidad, onComplete],
  );

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex items-center gap-2">
        <span className="text-3xl" role="presentation">🔢</span>
        <span className="text-xl font-bold" style={{ color: '#5D4037' }}>
          ¡Contamos juntos!
        </span>
      </div>

      {faseConteo === 'tocar' && (
        <>
          {/* Objetos para tocar */}
          <div className="flex flex-wrap justify-center gap-3 max-w-[280px]">
            {Array.from({ length: cantidad }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => tocarObjeto(i)}
                className={`
                  text-4xl p-2 rounded-xl transition-all
                  active:scale-90 select-none touch-manipulation
                  ${i < objetosTocados ? 'opacity-50 scale-90' : 'hover:scale-110'}
                `}
                style={{
                  backgroundColor: i < objetosTocados ? '#E8E0D8' : '#FFF9F0',
                  border: i < objetosTocados ? '2px solid #7BC67E' : '2px solid #E8E0D8',
                  minWidth: '60px',
                  minHeight: '60px',
                }}
                disabled={i < objetosTocados || i !== objetosTocados}
                aria-label={`Objeto ${i + 1}`}
              >
                {OBJETOS_CONTEO[i % OBJETOS_CONTEO.length]}
              </button>
            ))}
          </div>
          {/* Contador visual */}
          <div
            className="text-2xl font-bold"
            style={{ color: '#A28BD4' }}
          >
            {objetosTocados > 0 ? objetosTocados : ''}
          </div>
        </>
      )}

      {faseConteo === 'elegir' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-medium" style={{ color: '#5D4037' }}>
            ¿Cuántos hay?
          </p>
          <div className="flex gap-4">
            {opcionesNumero.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => elegirNumero(num)}
                disabled={bloqueado}
                className={`
                  w-[70px] h-[70px] rounded-2xl text-3xl font-bold
                  select-none touch-manipulation transition-all
                  active:scale-90 disabled:opacity-50
                  ${seleccion === num && estadoNum === 'correcto' ? 'numero-correcto' : ''}
                  ${seleccion === num && estadoNum === 'incorrecto' ? 'numero-incorrecto' : ''}
                `}
                style={{
                  backgroundColor:
                    seleccion === num && estadoNum === 'correcto'
                      ? '#7BC67E'
                      : seleccion === num && estadoNum === 'incorrecto'
                        ? '#FF8A80'
                        : '#FFF9F0',
                  border:
                    seleccion === num && estadoNum === 'correcto'
                      ? '3px solid #4CAF50'
                      : seleccion === num && estadoNum === 'incorrecto'
                        ? '3px solid #FF5252'
                        : '3px solid #E8E0D8',
                  color:
                    seleccion === num && (estadoNum === 'correcto' || estadoNum === 'incorrecto')
                      ? 'white'
                      : '#5D4037',
                  boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes num-brilla {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes num-tiembla {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .numero-correcto { animation: num-brilla 0.5s ease-in-out; }
        .numero-incorrecto { animation: num-tiembla 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// JUEGO 3: "¿Cuál suena igual?"
// ─────────────────────────────────────────────

interface JuegoRimasProps {
  onComplete: (nivel: number) => void;
}

function JuegoRimas({ onComplete }: JuegoRimasProps) {
  const [indicePar, setIndicePar] = useState(0);
  const [opciones, setOpciones] = useState<Array<{ palabra: string; emoji: string }>>([]);
  const [bloqueado, setBloqueado] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [estadoRima, setEstadoRima] = useState<'jugando' | 'correcto' | 'incorrecto'>('jugando');
  const aciertosRef = useRef(0);

  const parActual = PARES_RIMAS[indicePar];

  // Generar opciones mezcladas
  useEffect(() => {
    if (indicePar >= PARES_RIMAS.length) {
      onComplete(aciertosRef.current);
      return;
    }

    const par = PARES_RIMAS[indicePar];
    const todas = mezclar([
      { palabra: par.rima, emoji: par.rimaEmoji },
      ...par.distractores,
    ]);
    setOpciones(todas);
    setSeleccion(null);
    setEstadoRima('jugando');
    setBloqueado(false);

    const timer = setTimeout(() => {
      hablar(`¿Cuál suena parecido a ${par.palabra}?`);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicePar]);

  const manejarSeleccion = useCallback(
    (palabra: string) => {
      if (bloqueado || !parActual) return;
      setBloqueado(true);
      setSeleccion(palabra);

      if (palabra === parActual.rima) {
        setEstadoRima('correcto');
        aciertosRef.current++;
        sonidoAcierto();
        hablar(`¡Sí! ${parActual.palabra} y ${parActual.rima} suenan parecido`);
        setTimeout(() => setIndicePar((i) => i + 1), 1500);
      } else {
        setEstadoRima('incorrecto');
        sonidoError();
        hablar(`${parActual.palabra} suena parecido a ${parActual.rima}`);
        setTimeout(() => setIndicePar((i) => i + 1), 2000);
      }
    },
    [bloqueado, parActual],
  );

  if (indicePar >= PARES_RIMAS.length) return null;
  if (!parActual) return null;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex items-center gap-2">
        <span className="text-3xl" role="presentation">🎵</span>
        <span className="text-xl font-bold" style={{ color: '#5D4037' }}>
          ¿Cuál suena igual?
        </span>
      </div>

      {/* Indicador de progreso */}
      <div className="flex gap-2">
        {PARES_RIMAS.map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all"
            style={{
              backgroundColor: i < indicePar ? '#7BC67E' : i === indicePar ? '#FFE66D' : '#E8E0D8',
            }}
          />
        ))}
      </div>

      {/* Palabra objetivo */}
      <div className="text-center">
        <div className="text-5xl mb-2" role="presentation">{parActual.emoji}</div>
        <div className="text-2xl font-bold" style={{ color: '#5D4037' }}>
          {parActual.palabra}
        </div>
      </div>

      {/* Botón de repetir */}
      <BotonGrande
        variante="secundario"
        icono="🔊"
        tamano="pequeno"
        onClick={() => hablar(`¿Cuál suena parecido a ${parActual.palabra}?`)}
        deshabilitado={bloqueado}
        ariaLabel="Repetir la pregunta"
      />

      {/* Opciones */}
      <div className="flex gap-4">
        {opciones.map((opcion) => {
          const esSeleccionada = seleccion === opcion.palabra;
          const esCorrecta = esSeleccionada && estadoRima === 'correcto';
          const esIncorrecta = esSeleccionada && estadoRima === 'incorrecto';

          return (
            <button
              key={opcion.palabra}
              type="button"
              onClick={() => manejarSeleccion(opcion.palabra)}
              disabled={bloqueado}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-2xl
                select-none touch-manipulation transition-all
                active:scale-90 disabled:opacity-60
                ${esCorrecta ? 'rima-correcta' : ''}
                ${esIncorrecta ? 'rima-incorrecta' : ''}
              `}
              style={{
                backgroundColor: esCorrecta
                  ? '#7BC67E'
                  : esIncorrecta
                    ? '#FF8A80'
                    : '#FFF9F0',
                border: esCorrecta
                  ? '3px solid #4CAF50'
                  : esIncorrecta
                    ? '3px solid #FF5252'
                    : '3px solid #E8E0D8',
                minWidth: '80px',
                minHeight: '80px',
                boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
              }}
            >
              <span className="text-3xl">{opcion.emoji}</span>
              <span
                className="text-xs font-bold"
                style={{ color: esCorrecta || esIncorrecta ? 'white' : '#5D4037' }}
              >
                {opcion.palabra}
              </span>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes rima-brilla {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes rima-tiembla {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .rima-correcta { animation: rima-brilla 0.5s ease-in-out; }
        .rima-incorrecta { animation: rima-tiembla 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}
