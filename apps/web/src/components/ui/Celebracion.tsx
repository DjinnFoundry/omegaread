'use client';

import { useEffect, useState, useMemo } from 'react';
import { celebracion as sonidoCelebracion } from '@/lib/audio/sonidos';

/**
 * Props del componente Celebracion.
 */
export interface CelebracionProps {
  /** Si se muestra la celebración */
  visible: boolean;
  /** Callback cuando se cierra la celebración */
  onClose?: () => void;
  /** Duración en ms antes de auto-cerrar (default: 3000) */
  duracion?: number;
}

/** Genera una pieza de confetti con propiedades aleatorias */
function generarConfetti(indice: number) {
  const colores = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A28BD4', '#FFB347', '#64B5F6', '#7BC67E'];
  return {
    id: indice,
    color: colores[indice % colores.length],
    izquierda: Math.random() * 100,
    delay: Math.random() * 1.5,
    duracion: 2 + Math.random() * 2,
    rotacion: Math.random() * 360,
    tamano: 6 + Math.random() * 8,
    forma: indice % 3, // 0: cuadrado, 1: círculo, 2: triángulo
  };
}

/**
 * Overlay de celebración con confetti animado en CSS puro.
 * Se auto-cierra después de la duración especificada.
 */
export function Celebracion({
  visible,
  onClose,
  duracion = 3000,
}: CelebracionProps) {
  const [mostrar, setMostrar] = useState(false);

  const confettis = useMemo(() => Array.from({ length: 40 }, (_, i) => generarConfetti(i)), []);

  useEffect(() => {
    if (!visible) {
      setMostrar(false);
      return;
    }

    setMostrar(true);
    sonidoCelebracion();

    const timer = setTimeout(() => {
      setMostrar(false);
      onClose?.();
    }, duracion);

    return () => clearTimeout(timer);
  }, [visible, duracion, onClose]);

  if (!mostrar) return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
      role="alert"
      aria-label="¡Celebración!"
    >
      {/* Backdrop suave */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(255, 249, 240, 0.5)',
          animation: 'fadeIn 0.3s ease-out',
        }}
      />

      {/* Emoji central */}
      <div
        className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 text-7xl"
        style={{ animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
      >
        🎉
      </div>

      {/* Confetti */}
      {confettis.map((c) => (
        <div
          key={c.id}
          className="absolute top-0"
          style={{
            left: `${c.izquierda}%`,
            width: `${c.tamano}px`,
            height: c.forma === 0 ? `${c.tamano}px` : c.forma === 1 ? `${c.tamano}px` : '0',
            backgroundColor: c.forma !== 2 ? c.color : 'transparent',
            borderRadius: c.forma === 1 ? '50%' : '2px',
            borderLeft: c.forma === 2 ? `${c.tamano / 2}px solid transparent` : undefined,
            borderRight: c.forma === 2 ? `${c.tamano / 2}px solid transparent` : undefined,
            borderBottom: c.forma === 2 ? `${c.tamano}px solid ${c.color}` : undefined,
            animation: `confettiFall ${c.duracion}s ${c.delay}s ease-in forwards`,
            transform: `rotate(${c.rotacion}deg)`,
          }}
        />
      ))}

      <style>{`
        @keyframes confettiFall {
          0% { 
            transform: translateY(-10px) rotate(0deg); 
            opacity: 1; 
          }
          100% { 
            transform: translateY(100vh) rotate(720deg); 
            opacity: 0; 
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          60% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
