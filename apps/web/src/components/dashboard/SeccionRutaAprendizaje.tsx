'use client';

/**
 * Seccion de ruta de aprendizaje: tech tree SVG + topics + dominios + sugerencias.
 * Extraida de DashboardPadreDetalle.
 *
 * SVG nodes are clickable:
 * - Completed (turquesa) nodes show an info popup with topic name + times studied
 * - Suggested (amarillo) nodes show a confirmation overlay to navigate to /jugar/lectura?topic=SLUG
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Network } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { SeccionCard } from './SeccionCard';

function recortarLabel(value: string, max = 16): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

// ─────────────────────────────────────────────
// Overlay types
// ─────────────────────────────────────────────

interface CompletedOverlay {
  kind: 'completed';
  nombre: string;
  emoji: string;
  veces: number;
  x: number;
  y: number;
}

interface SuggestedOverlay {
  kind: 'suggested';
  nombre: string;
  emoji: string;
  slug: string;
  x: number;
  y: number;
}

type NodeOverlay = CompletedOverlay | SuggestedOverlay;

// ─────────────────────────────────────────────
// Floating overlay component
// ─────────────────────────────────────────────

function NodePopover({
  overlay,
  onClose,
  containerRef,
}: {
  overlay: NodeOverlay;
  onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  // Compute pixel position from SVG coords via effect (not during render)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // SVG viewBox is 620x220
    const scaleX = svgRect.width / 620;
    const scaleY = svgRect.height / 220;
    const pixelX = (overlay.x * scaleX) + (svgRect.left - containerRect.left);
    const pixelY = (overlay.y * scaleY) + (svgRect.top - containerRect.top);
    setPosition({ x: pixelX, y: pixelY });
  }, [overlay.x, overlay.y, containerRef]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!position) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y - 8}px`,
    transform: 'translate(-50%, -100%)',
    zIndex: 20,
  };

  if (overlay.kind === 'completed') {
    return (
      <div ref={popoverRef} style={style} className="animate-fade-in">
        <div className="rounded-2xl bg-superficie border border-turquesa/30 shadow-lg px-3 py-2.5 text-center min-w-[140px]">
          <p className="text-sm font-bold text-texto">
            {overlay.emoji} {overlay.nombre}
          </p>
          <p className="text-[11px] text-texto-suave mt-1">
            Estudiado {overlay.veces} {overlay.veces === 1 ? 'vez' : 'veces'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 text-[10px] text-texto-suave hover:text-texto transition-colors min-h-0 min-w-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // Suggested node
  return (
    <div ref={popoverRef} style={style} className="animate-fade-in">
      <div className="rounded-2xl bg-superficie border border-amarillo/40 shadow-lg px-3 py-2.5 text-center min-w-[160px]">
        <p className="text-xs text-texto-suave">
          Quieres una historia sobre
        </p>
        <p className="text-sm font-bold text-texto mt-0.5">
          {overlay.emoji} {overlay.nombre}?
        </p>
        <div className="mt-2.5 flex items-center justify-center gap-2">
          <Link
            href={`/jugar/lectura?topic=${encodeURIComponent(overlay.slug)}`}
            className="rounded-xl bg-turquesa px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all min-h-0 min-w-0"
          >
            Si, vamos!
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-neutro/10 px-3 py-1.5 text-xs font-semibold text-texto-suave hover:bg-neutro/20 transition-colors min-h-0 min-w-0"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

interface Props {
  data: DashboardPadreData;
}

export function SeccionRutaAprendizaje({ data }: Props) {
  const [overlay, setOverlay] = useState<NodeOverlay | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const rutaMapa = data.techTree.historialTopics.slice(0, 6).reverse();
  const sugerenciasMapa = data.techTree.sugerencias.slice(0, 4);
  const rutaPaso = rutaMapa.length > 1 ? 440 / (rutaMapa.length - 1) : 0;
  const rutaNodes = rutaMapa.map((node, idx) => ({
    ...node,
    x: 90 + (idx * rutaPaso),
    y: 66,
  }));
  const currentNode = rutaNodes[rutaNodes.length - 1];
  const sugerenciaPaso = sugerenciasMapa.length > 1 ? 440 / (sugerenciasMapa.length - 1) : 0;
  const sugerenciaNodes = sugerenciasMapa.map((node, idx) => ({
    ...node,
    x: 90 + (idx * sugerenciaPaso),
    y: 175,
  }));

  const handleCompletedClick = useCallback((node: { nombre: string; emoji: string; veces: number; x: number; y: number }) => {
    setOverlay({
      kind: 'completed',
      nombre: node.nombre,
      emoji: node.emoji,
      veces: node.veces,
      x: node.x,
      y: node.y,
    });
  }, []);

  const handleSuggestedClick = useCallback((node: { nombre: string; emoji: string; slug: string; x: number; y: number }) => {
    setOverlay({
      kind: 'suggested',
      nombre: node.nombre,
      emoji: node.emoji,
      slug: node.slug,
      x: node.x,
      y: node.y,
    });
  }, []);

  const closeOverlay = useCallback(() => setOverlay(null), []);

  return (
    <SeccionCard titulo="Ruta de aprendizaje" icon={<Network size={18} className="text-turquesa" />}>
      <div className="rounded-2xl bg-turquesa/10 p-3">
        <p className="text-xs text-texto">
          Topics tocados recientemente: <span className="font-bold">{data.techTree.historialTopics.length}</span>
        </p>
      </div>

      {/* SVG Tech Tree Map */}
      <div
        ref={svgContainerRef}
        className="relative mt-3 overflow-hidden rounded-2xl border border-neutro/15 bg-fondo p-3"
      >
        <p className="text-[11px] font-semibold text-texto-suave">
          Mapa visual (ruta reciente + proximas ramas)
        </p>
        <svg viewBox="0 0 620 220" className="mt-2 w-full" style={{ aspectRatio: '620 / 220' }}>
            {rutaNodes.length === 0 && (
              <text x="310" y="100" textAnchor="middle" fontSize="12" fill="#7a868d">
                Aun no hay ruta suficiente. Completa 1-2 lecturas para ver el mapa.
              </text>
            )}

            {/* Ruta links */}
            {rutaNodes.map((node, idx) => {
              const next = rutaNodes[idx + 1];
              if (!next) return null;
              return (
                <line
                  key={`ruta-link-${node.slug}-${next.slug}`}
                  x1={node.x}
                  y1={node.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="#4ECDC4"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Suggestion branch links */}
            {currentNode && sugerenciaNodes.map((node) => (
              <line
                key={`sug-link-${node.slug}`}
                x1={currentNode.x}
                y1={currentNode.y + 12}
                x2={node.x}
                y2={node.y - 14}
                stroke="#9AA0A6"
                strokeDasharray="5 4"
                strokeWidth="1.8"
              />
            ))}

            {/* Completed topic nodes (turquesa) - clickable */}
            {rutaNodes.map((node) => (
              <g
                key={`ruta-node-${node.slug}`}
                className="cursor-pointer"
                onClick={() => handleCompletedClick(node)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCompletedClick(node); }}
              >
                <circle cx={node.x} cy={node.y} r="15" fill="#4ECDC4" opacity="0.2" />
                <circle cx={node.x} cy={node.y} r="11" fill="#4ECDC4" />
                {/* Hover ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="17"
                  fill="none"
                  stroke="#4ECDC4"
                  strokeWidth="1.5"
                  opacity="0"
                  className="transition-opacity duration-150"
                  style={{ opacity: 0 }}
                >
                  <set attributeName="opacity" to="0.4" begin="mouseover" end="mouseout" />
                </circle>
                <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="10" fill="#fff" style={{ pointerEvents: 'none' }}>
                  {node.emoji}
                </text>
                <text x={node.x} y={node.y - 22} textAnchor="middle" fontSize="10" fill="#5c6b73" style={{ pointerEvents: 'none' }}>
                  {recortarLabel(node.nombre, 15)}
                </text>
              </g>
            ))}

            {/* Suggested topic nodes (amarillo) - clickable */}
            {sugerenciaNodes.map((node) => (
              <g
                key={`sug-node-${node.slug}`}
                className="cursor-pointer"
                onClick={() => handleSuggestedClick(node)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSuggestedClick(node); }}
              >
                <circle cx={node.x} cy={node.y} r="13" fill="#FFE66D" opacity="0.2" />
                <circle cx={node.x} cy={node.y} r="9.5" fill="#FFE66D" />
                {/* Hover ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="15"
                  fill="none"
                  stroke="#FFE66D"
                  strokeWidth="1.5"
                  opacity="0"
                >
                  <set attributeName="opacity" to="0.5" begin="mouseover" end="mouseout" />
                </circle>
                <text x={node.x} y={node.y + 3} textAnchor="middle" fontSize="9.5" fill="#2f3a3f" style={{ pointerEvents: 'none' }}>
                  {node.emoji}
                </text>
                <text x={node.x} y={node.y + 24} textAnchor="middle" fontSize="9.5" fill="#5c6b73" style={{ pointerEvents: 'none' }}>
                  {recortarLabel(node.nombre, 14)}
                </text>
              </g>
            ))}
        </svg>

        {/* Floating overlay for clicked nodes */}
        {overlay && (
          <NodePopover
            overlay={overlay}
            onClose={closeOverlay}
            containerRef={svgContainerRef}
          />
        )}
      </div>

      {/* Recent Topics carousel - contained horizontal scroll with compact cards */}
      <div className="mt-3 overflow-x-auto overflow-y-hidden rounded-xl scrollbar-thin">
        <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
          {data.techTree.historialTopics.slice(0, 12).map((h) => (
            <div
              key={h.slug}
              className="min-w-0 w-[136px] shrink-0 rounded-xl bg-fondo px-2.5 py-2"
            >
              <p className="text-xs font-semibold text-texto truncate">
                {h.emoji} {h.nombre}
              </p>
              <p className="text-[10px] text-texto-suave mt-0.5 truncate">
                {h.veces} veces · {h.fecha}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Domain progress - grid layout, no overflow */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {data.techTree.dominiosTocados.map((d) => (
          <div key={d.dominio} className="min-w-0 rounded-xl bg-fondo p-2">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] font-semibold text-texto truncate min-w-0">
                {d.emoji} {d.nombre}
              </p>
              <p className="text-[10px] text-texto-suave shrink-0">
                {d.tocados}/{d.total}
              </p>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-neutro/10">
              <div
                className="h-1.5 rounded-full bg-turquesa"
                style={{ width: `${Math.min(100, Math.round((d.tocados / Math.max(1, d.total)) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Suggested routes */}
      <div className="mt-3 space-y-2">
        <p className="text-[11px] font-semibold text-texto-suave">Siguientes rutas sugeridas</p>
        {data.techTree.sugerencias.length === 0 ? (
          <p className="text-[11px] text-texto-suave">Aun no hay sugerencias (faltan sesiones).</p>
        ) : (
          data.techTree.sugerencias.map((sug) => (
            <div key={sug.slug} className="min-w-0 rounded-xl bg-fondo p-2.5">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-semibold text-texto truncate min-w-0">
                  {sug.emoji} {sug.nombre}
                </p>
                <span className="shrink-0 rounded-full bg-neutro/10 px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
                  {sug.tipo}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-texto-suave">{sug.motivo}</p>
            </div>
          ))
        )}
      </div>
    </SeccionCard>
  );
}
