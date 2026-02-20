'use client';

import { useMemo } from 'react';

/**
 * Estados posibles de la mascota.
 */
export type EstadoMascota = 'feliz' | 'pensando' | 'celebrando' | 'durmiendo' | 'triste';

/**
 * Props del componente Mascota.
 */
export interface MascotaProps {
  /** Nombre de la mascota */
  nombre?: string;
  /** Tipo de mascota: gato, perro, buho, dragon */
  tipo?: string;
  /** Estado emocional actual */
  estado?: EstadoMascota;
  /** Tamaño predefinido: sm (80), md (140), lg (200) */
  size?: 'sm' | 'md' | 'lg';
  /** Tamaño en píxeles (override de size) */
  tamano?: number;
  /** Clase CSS adicional */
  className?: string;
}

const SIZE_MAP = { sm: 80, md: 140, lg: 200 } as const;

/**
 * Mascota animada (gato) con SVG y CSS.
 * Cambia expresión según el estado emocional.
 */
export function Mascota({
  nombre = 'Michi',
  tipo = 'gato',
  estado = 'feliz',
  size = 'lg',
  tamano,
  className = '',
}: MascotaProps) {
  const resolvedTamano = tamano ?? SIZE_MAP[size];
  const animacionClase = useMemo(() => {
    switch (estado) {
      case 'celebrando':
        return 'animate-bounce';
      case 'pensando':
        return 'animate-pulse';
      case 'durmiendo':
        return 'animate-sway';
      default:
        return 'animate-sway';
    }
  }, [estado]);

  /** Expresión de los ojos según estado */
  const ojos = useMemo(() => {
    switch (estado) {
      case 'feliz':
      case 'celebrando':
        return { tipo: 'abiertos', brillo: true };
      case 'pensando':
        return { tipo: 'mirando-arriba', brillo: false };
      case 'durmiendo':
        return { tipo: 'cerrados', brillo: false };
      case 'triste':
        return { tipo: 'tristes', brillo: false };
      default:
        return { tipo: 'abiertos', brillo: true };
    }
  }, [estado]);

  /** Boca según estado */
  const boca = useMemo(() => {
    switch (estado) {
      case 'feliz':
      case 'celebrando':
        return 'sonrisa';
      case 'pensando':
        return 'o';
      case 'durmiendo':
        return 'zzz';
      case 'triste':
        return 'triste';
      default:
        return 'sonrisa';
    }
  }, [estado]);

  return (
    <div
      className={`relative inline-flex flex-col items-center ${className}`}
      role="img"
      aria-label={`${nombre} está ${estado}`}
    >
      {/* Keyframes inline para animaciones custom */}
      <style>{`
        @keyframes sway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes zzz {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          50% { opacity: 1; transform: translate(10px, -15px) scale(1); }
          100% { opacity: 0; transform: translate(20px, -30px) scale(0.5); }
        }
        .animate-sway { animation: sway 3s ease-in-out infinite; }
        .animate-blink { animation: blink 4s ease-in-out infinite; }
        .animate-float { animation: float 2s ease-in-out infinite; }
        .animate-zzz { animation: zzz 2s ease-in-out infinite; }
      `}</style>

      <svg
        width={resolvedTamano}
        height={resolvedTamano}
        viewBox="0 0 200 200"
        className={`${animacionClase} transition-all duration-500`}
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
      >
        {/* Orejas */}
        <polygon points="55,65 40,20 80,55" fill="#FF8A65" stroke="#FF7043" strokeWidth="2" />
        <polygon points="145,65 160,20 120,55" fill="#FF8A65" stroke="#FF7043" strokeWidth="2" />
        {/* Interior orejas */}
        <polygon points="58,60 48,30 75,55" fill="#FFB4A2" />
        <polygon points="142,60 152,30 125,55" fill="#FFB4A2" />

        {/* Cuerpo */}
        <ellipse cx="100" cy="140" rx="50" ry="45" fill="#FF8A65" />

        {/* Cabeza */}
        <circle cx="100" cy="90" r="50" fill="#FFAB91" />

        {/* Ojos */}
        <g className="animate-blink" style={{ transformOrigin: '100px 82px' }}>
          {ojos.tipo === 'cerrados' ? (
            <>
              <path d="M70,82 Q80,87 90,82" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M110,82 Q120,87 130,82" stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          ) : ojos.tipo === 'tristes' ? (
            <>
              <ellipse cx="80" cy="82" rx="10" ry="11" fill="white" />
              <ellipse cx="120" cy="82" rx="10" ry="11" fill="white" />
              <circle cx="80" cy="84" r="6" fill="#5D4037" />
              <circle cx="120" cy="84" r="6" fill="#5D4037" />
              {/* Cejas tristes */}
              <path d="M68,72 Q78,68 88,74" stroke="#5D4037" strokeWidth="2" fill="none" />
              <path d="M112,74 Q122,68 132,72" stroke="#5D4037" strokeWidth="2" fill="none" />
            </>
          ) : (
            <>
              <ellipse cx="80" cy="82" rx="10" ry="11" fill="white" />
              <ellipse cx="120" cy="82" rx="10" ry="11" fill="white" />
              <circle
                cx={ojos.tipo === 'mirando-arriba' ? 80 : 80}
                cy={ojos.tipo === 'mirando-arriba' ? 78 : 83}
                r="6"
                fill="#5D4037"
              />
              <circle
                cx={ojos.tipo === 'mirando-arriba' ? 120 : 120}
                cy={ojos.tipo === 'mirando-arriba' ? 78 : 83}
                r="6"
                fill="#5D4037"
              />
              {/* Brillo en ojos */}
              {ojos.brillo && (
                <>
                  <circle cx="77" cy="80" r="2" fill="white" />
                  <circle cx="117" cy="80" r="2" fill="white" />
                </>
              )}
            </>
          )}
        </g>

        {/* Nariz */}
        <ellipse cx="100" cy="95" rx="5" ry="3.5" fill="#E64A19" />

        {/* Bigotes */}
        <line x1="55" y1="90" x2="75" y2="93" stroke="#8D6E63" strokeWidth="1.5" />
        <line x1="55" y1="98" x2="75" y2="97" stroke="#8D6E63" strokeWidth="1.5" />
        <line x1="125" y1="93" x2="145" y2="90" stroke="#8D6E63" strokeWidth="1.5" />
        <line x1="125" y1="97" x2="145" y2="98" stroke="#8D6E63" strokeWidth="1.5" />

        {/* Boca */}
        {boca === 'sonrisa' && (
          <path d="M88,103 Q100,115 112,103" stroke="#5D4037" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {boca === 'o' && (
          <ellipse cx="100" cy="107" rx="6" ry="5" fill="#E64A19" opacity="0.7" />
        )}
        {boca === 'triste' && (
          <path d="M88,110 Q100,100 112,110" stroke="#5D4037" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {boca === 'zzz' && (
          <path d="M90,105 Q100,112 110,105" stroke="#5D4037" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}

        {/* Patitas */}
        <ellipse cx="75" cy="178" rx="15" ry="8" fill="#FFAB91" />
        <ellipse cx="125" cy="178" rx="15" ry="8" fill="#FFAB91" />

        {/* Cola */}
        <path
          d="M150,145 Q170,130 165,110 Q160,95 170,85"
          stroke="#FF8A65"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />

        {/* ZZZ para durmiendo */}
        {estado === 'durmiendo' && (
          <g>
            <text x="135" y="60" fontSize="16" fill="#A28BD4" fontWeight="bold" className="animate-zzz">
              z
            </text>
            <text x="145" y="45" fontSize="20" fill="#A28BD4" fontWeight="bold" className="animate-zzz" style={{ animationDelay: '0.5s' }}>
              Z
            </text>
            <text x="155" y="28" fontSize="24" fill="#A28BD4" fontWeight="bold" className="animate-zzz" style={{ animationDelay: '1s' }}>
              Z
            </text>
          </g>
        )}

        {/* Estrellitas para celebrando */}
        {estado === 'celebrando' && (
          <g className="animate-float">
            <text x="30" y="40" fontSize="20">⭐</text>
            <text x="150" y="30" fontSize="16">✨</text>
            <text x="160" y="60" fontSize="14">⭐</text>
          </g>
        )}

        {/* Signo de interrogación para pensando */}
        {estado === 'pensando' && (
          <text x="140" y="45" fontSize="28" fill="#A28BD4" fontWeight="bold" className="animate-float">
            ?
          </text>
        )}
      </svg>
    </div>
  );
}
