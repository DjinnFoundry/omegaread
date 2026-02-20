'use client';

import { useState, useCallback, useEffect } from 'react';
import { ZonaMapa } from './ZonaMapa';
import { Mascota } from '@/components/mascota/Mascota';
import { MascotaDialogo } from '@/components/mascota/MascotaDialogo';
import { Estrellas } from '@/components/ui/Estrellas';
import { BotonGrande } from '@/components/ui/BotonGrande';
import type { EstadoMascota } from '@/components/mascota/Mascota';

/**
 * Identificadores de zonas del mapa.
 */
export type ZonaId = 'bosque-letras' | 'montana-numeros' | 'taller-trazos' | 'lago-palabras';

/**
 * Definición de una zona del mapa.
 */
export interface ZonaDefinicion {
  id: ZonaId;
  icono: string;
  nombre: string;
  color: string;
  bloqueada: boolean;
}

/**
 * Props del componente MapaAventuras.
 */
export interface MapaAventurasProps {
  /** Zonas desbloqueadas (por defecto solo bosque-letras) */
  zonasActivas?: ZonaId[];
  /** Cantidad de estrellas del niño */
  estrellas?: number;
  /** Zona recomendada */
  zonaRecomendada?: ZonaId;
  /** Callback cuando el niño selecciona una zona */
  onZoneSelect?: (zona: ZonaId) => void;
  /** Callback cuando toca botón de stickers */
  onStickersClick?: () => void;
  /** Nombre del niño para saludos personalizados */
  nombreNino?: string;
}

const ZONAS: ZonaDefinicion[] = [
  { id: 'bosque-letras', icono: '🌳', nombre: 'Bosque de las Letras', color: '#7BC67E', bloqueada: false },
  { id: 'montana-numeros', icono: '🏔️', nombre: 'Montaña de los Números', color: '#A28BD4', bloqueada: true },
  { id: 'taller-trazos', icono: '🎨', nombre: 'Taller de Trazos', color: '#FFB347', bloqueada: true },
  { id: 'lago-palabras', icono: '🌊', nombre: 'Lago de Palabras', color: '#64B5F6', bloqueada: true },
];

/**
 * Mapa de aventuras — pantalla principal del niño.
 * 4 zonas tocables enormes con fondo ilustrativo suave.
 */
export function MapaAventuras({
  zonasActivas = ['bosque-letras'],
  estrellas = 0,
  zonaRecomendada = 'bosque-letras',
  onZoneSelect,
  onStickersClick,
  nombreNino,
}: MapaAventurasProps) {
  const [dialogoMascota, setDialogoMascota] = useState('');
  const [estadoMascota, setEstadoMascota] = useState<EstadoMascota>('feliz');
  const [saludoInicial, setSaludoInicial] = useState(false);

  // Saludo de la mascota al llegar al mapa
  useEffect(() => {
    if (!saludoInicial) {
      setSaludoInicial(true);
      const zonaRec = ZONAS.find((z) => z.id === zonaRecomendada);
      const saludo = nombreNino
        ? `¡Hola ${nombreNino}! ${
            zonaRec ? `¡Vamos al ${zonaRec.nombre}!` : '¡Elige dónde quieres jugar!'
          }`
        : zonaRec
          ? `¡Vamos al ${zonaRec.nombre}!`
          : '¡Elige dónde quieres jugar!';
      setDialogoMascota(saludo);
      setEstadoMascota('celebrando');
    }
  }, [saludoInicial, nombreNino, zonaRecomendada]);

  const manejarZonaClick = useCallback(
    (zona: ZonaDefinicion) => {
      const activa = zonasActivas.includes(zona.id);
      if (activa) {
        setEstadoMascota('celebrando');
        setDialogoMascota(`¡Vamos al ${zona.nombre}!`);
        onZoneSelect?.(zona.id);
      } else {
        setEstadoMascota('pensando');
        setDialogoMascota('¡Próximamente! Sigue jugando para desbloquear.');
      }
    },
    [zonasActivas, onZoneSelect]
  );

  const limpiarDialogo = useCallback(() => {
    setDialogoMascota('');
    setEstadoMascota('feliz');
  }, []);

  return (
    <div
      className="relative flex flex-col min-h-screen w-full overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #E8F5E9 0%, #FFF9F0 40%, #FFF3E0 100%)',
      }}
    >
      {/* Decoraciones de fondo */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        <span className="absolute top-4 left-6 text-4xl opacity-60">☀️</span>
        <span className="absolute top-8 right-12 text-3xl opacity-40">☁️</span>
        <span className="absolute top-16 left-1/3 text-2xl opacity-30">☁️</span>
        <span className="absolute bottom-32 left-4 text-2xl opacity-30">🌸</span>
        <span className="absolute bottom-48 right-8 text-2xl opacity-30">🦋</span>
        <span className="absolute top-1/3 right-4 text-xl opacity-20">🌈</span>
      </div>

      {/* Mascota y diálogo - parte superior */}
      <div className="relative z-10 flex flex-col items-center pt-4 pb-2">
        {dialogoMascota && (
          <MascotaDialogo
            texto={dialogoMascota}
            onFinish={limpiarDialogo}
            visible={!!dialogoMascota}
          />
        )}
        <Mascota estado={estadoMascota} tamano={160} />
      </div>

      {/* Grid de zonas - centro */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-4">
        <div className="grid grid-cols-2 gap-4 max-w-[340px]">
          {ZONAS.map((zona) => {
            const activa = zonasActivas.includes(zona.id);
            return (
              <ZonaMapa
                key={zona.id}
                icono={zona.icono}
                nombre={zona.nombre}
                color={zona.color}
                bloqueada={!activa}
                recomendada={zona.id === zonaRecomendada && activa}
                onClick={() => manejarZonaClick(zona)}
              />
            );
          })}
        </div>
      </div>

      {/* Barra inferior */}
      <div
        className="relative z-10 flex items-center justify-between px-6 py-4"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          borderTop: '2px solid rgba(255, 230, 109, 0.4)',
        }}
      >
        {/* Avatar mini */}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full border-2"
          style={{ borderColor: '#FFE66D', backgroundColor: '#FFF9F0' }}
        >
          <span className="text-2xl">😺</span>
        </div>

        {/* Estrellas */}
        <Estrellas cantidad={estrellas} />

        {/* Botón stickers */}
        <BotonGrande
          variante="celebracion"
          icono="🏆"
          onClick={onStickersClick}
          tamano="pequeno"
        />
      </div>
    </div>
  );
}
