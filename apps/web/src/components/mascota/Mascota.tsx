'use client';

import { useMemo } from 'react';

/**
 * Estados posibles de la mascota.
 */
export type EstadoMascota = 'feliz' | 'pensando' | 'celebrando' | 'durmiendo' | 'triste';

/**
 * Tipos de mascota soportados.
 */
export type TipoMascota = 'gato' | 'perro' | 'buho' | 'dragon';

/**
 * Paleta de colores por tipo de mascota.
 */
const PALETAS: Record<TipoMascota, { cuerpo: string; cabeza: string; interior: string; nariz: string; detalles: string }> = {
  gato: { cuerpo: '#FF8A65', cabeza: '#FFAB91', interior: '#FFB4A2', nariz: '#E64A19', detalles: '#8D6E63' },
  perro: { cuerpo: '#A1887F', cabeza: '#BCAAA4', interior: '#D7CCC8', nariz: '#4E342E', detalles: '#6D4C41' },
  buho: { cuerpo: '#7E57C2', cabeza: '#9575CD', interior: '#B39DDB', nariz: '#FF8F00', detalles: '#4527A0' },
  dragon: { cuerpo: '#66BB6A', cabeza: '#81C784', interior: '#A5D6A7', nariz: '#E53935', detalles: '#2E7D32' },
};

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
 * Mascota animada con SVG y CSS.
 * Soporta 4 tipos de mascota (gato, perro, buho, dragon) con paletas de color distintas.
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
  const tipoMascota = (['gato', 'perro', 'buho', 'dragon'].includes(tipo) ? tipo : 'gato') as TipoMascota;
  const paleta = PALETAS[tipoMascota];

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
      <svg
        width={resolvedTamano}
        height={resolvedTamano}
        viewBox="0 0 200 200"
        className={`${animacionClase} transition-all duration-500`}
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
      >
        {/* Orejas/detalles de cabeza por tipo */}
        {tipoMascota === 'gato' && (
          <>
            <polygon points="55,65 40,20 80,55" fill={paleta.cuerpo} stroke={paleta.detalles} strokeWidth="1.5" />
            <polygon points="145,65 160,20 120,55" fill={paleta.cuerpo} stroke={paleta.detalles} strokeWidth="1.5" />
            <polygon points="58,60 48,30 75,55" fill={paleta.interior} />
            <polygon points="142,60 152,30 125,55" fill={paleta.interior} />
          </>
        )}
        {tipoMascota === 'perro' && (
          <>
            {/* Orejas caídas */}
            <ellipse cx="55" cy="60" rx="22" ry="35" fill={paleta.cuerpo} stroke={paleta.detalles} strokeWidth="1.5" transform="rotate(-15, 55, 60)" />
            <ellipse cx="145" cy="60" rx="22" ry="35" fill={paleta.cuerpo} stroke={paleta.detalles} strokeWidth="1.5" transform="rotate(15, 145, 60)" />
            <ellipse cx="55" cy="65" rx="14" ry="25" fill={paleta.interior} transform="rotate(-15, 55, 65)" />
            <ellipse cx="145" cy="65" rx="14" ry="25" fill={paleta.interior} transform="rotate(15, 145, 65)" />
          </>
        )}
        {tipoMascota === 'buho' && (
          <>
            {/* Plumitas/copete */}
            <polygon points="55,55 35,15 75,50" fill={paleta.cuerpo} stroke={paleta.detalles} strokeWidth="1.5" />
            <polygon points="145,55 165,15 125,50" fill={paleta.cuerpo} stroke={paleta.detalles} strokeWidth="1.5" />
            <polygon points="58,50 45,25 72,48" fill={paleta.interior} />
            <polygon points="142,50 155,25 128,48" fill={paleta.interior} />
          </>
        )}
        {tipoMascota === 'dragon' && (
          <>
            {/* Cuernitos */}
            <polygon points="60,55 50,10 78,50" fill={paleta.nariz} stroke={paleta.detalles} strokeWidth="1.5" />
            <polygon points="140,55 150,10 122,50" fill={paleta.nariz} stroke={paleta.detalles} strokeWidth="1.5" />
            {/* Crestas dorsales */}
            <polygon points="100,40 90,15 110,15" fill={paleta.nariz} />
          </>
        )}

        {/* Cuerpo */}
        <ellipse cx="100" cy="140" rx="50" ry="45" fill={paleta.cuerpo} />

        {/* Cabeza */}
        <circle cx="100" cy="90" r="50" fill={paleta.cabeza} />

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
              <path d="M68,72 Q78,68 88,74" stroke="#5D4037" strokeWidth="2" fill="none" />
              <path d="M112,74 Q122,68 132,72" stroke="#5D4037" strokeWidth="2" fill="none" />
            </>
          ) : (
            <>
              {/* Buho gets bigger eyes */}
              <ellipse cx="80" cy="82" rx={tipoMascota === 'buho' ? 14 : 10} ry={tipoMascota === 'buho' ? 15 : 11} fill="white" />
              <ellipse cx="120" cy="82" rx={tipoMascota === 'buho' ? 14 : 10} ry={tipoMascota === 'buho' ? 15 : 11} fill="white" />
              <circle
                cx={80}
                cy={ojos.tipo === 'mirando-arriba' ? 78 : 83}
                r={tipoMascota === 'buho' ? 8 : 6}
                fill="#5D4037"
              />
              <circle
                cx={120}
                cy={ojos.tipo === 'mirando-arriba' ? 78 : 83}
                r={tipoMascota === 'buho' ? 8 : 6}
                fill="#5D4037"
              />
              {ojos.brillo && (
                <>
                  <circle cx="77" cy="80" r="2" fill="white" />
                  <circle cx="117" cy="80" r="2" fill="white" />
                </>
              )}
            </>
          )}
        </g>

        {/* Nariz — different shapes per type */}
        {tipoMascota === 'perro' ? (
          <ellipse cx="100" cy="97" rx="8" ry="5" fill={paleta.nariz} />
        ) : tipoMascota === 'buho' ? (
          <polygon points="100,92 95,100 105,100" fill={paleta.nariz} />
        ) : (
          <ellipse cx="100" cy="95" rx="5" ry="3.5" fill={paleta.nariz} />
        )}

        {/* Bigotes (solo gato) */}
        {tipoMascota === 'gato' && (
          <>
            <line x1="55" y1="90" x2="75" y2="93" stroke={paleta.detalles} strokeWidth="1.5" />
            <line x1="55" y1="98" x2="75" y2="97" stroke={paleta.detalles} strokeWidth="1.5" />
            <line x1="125" y1="93" x2="145" y2="90" stroke={paleta.detalles} strokeWidth="1.5" />
            <line x1="125" y1="97" x2="145" y2="98" stroke={paleta.detalles} strokeWidth="1.5" />
          </>
        )}

        {/* Boca */}
        {boca === 'sonrisa' && (
          <path d="M88,103 Q100,115 112,103" stroke="#5D4037" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {boca === 'o' && (
          <ellipse cx="100" cy="107" rx="6" ry="5" fill={paleta.nariz} opacity="0.7" />
        )}
        {boca === 'triste' && (
          <path d="M88,110 Q100,100 112,110" stroke="#5D4037" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {boca === 'zzz' && (
          <path d="M90,105 Q100,112 110,105" stroke="#5D4037" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}

        {/* Patitas */}
        <ellipse cx="75" cy="178" rx="15" ry="8" fill={paleta.cabeza} />
        <ellipse cx="125" cy="178" rx="15" ry="8" fill={paleta.cabeza} />

        {/* Cola — different per type */}
        {tipoMascota === 'gato' && (
          <path
            d="M150,145 Q170,130 165,110 Q160,95 170,85"
            stroke={paleta.cuerpo}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
        )}
        {tipoMascota === 'perro' && (
          <path
            d="M150,140 Q165,120 160,105"
            stroke={paleta.cuerpo}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
        )}
        {tipoMascota === 'dragon' && (
          <path
            d="M150,145 Q175,135 170,115 Q165,100 175,85"
            stroke={paleta.cuerpo}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
        )}
        {/* Buho: no visible tail — has wing hint */}
        {tipoMascota === 'buho' && (
          <>
            <path d="M50,120 Q35,140 45,160" stroke={paleta.cuerpo} strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M150,120 Q165,140 155,160" stroke={paleta.cuerpo} strokeWidth="6" fill="none" strokeLinecap="round" />
          </>
        )}

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

        {/* Dragon flame for celebrando */}
        {tipoMascota === 'dragon' && estado === 'celebrando' && (
          <g>
            <ellipse cx="100" cy="118" rx="8" ry="5" fill="#FF6F00" opacity="0.8" />
            <ellipse cx="100" cy="115" rx="5" ry="3" fill="#FFAB00" opacity="0.8" />
          </g>
        )}
      </svg>
    </div>
  );
}
