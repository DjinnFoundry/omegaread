'use client';

/**
 * Interactive zoomable learning map - full-screen layout.
 * Position-based zoom: nodes stay at native resolution (no CSS scale pixelation).
 * Dynamic suggestion edges originate from the focused (clicked) completed topic.
 *
 * Below the map: compact domain progress bars, suggested routes.
 */
import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { usePanZoom, type PanZoomState } from '@/hooks/usePanZoom';
import {
  computeGraphLayout,
  getDomainColor,
  type PositionedNode,
  type GraphLayout,
} from '@/lib/graph/layout';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function truncateLabel(value: string, max = 12): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

/** Convert graph-space coordinates to screen-space using pan/zoom state. */
function toScreen(
  nodeX: number,
  nodeY: number,
  pz: PanZoomState,
): { x: number; y: number } {
  return {
    x: nodeX * pz.scale + pz.x,
    y: nodeY * pz.scale + pz.y,
  };
}

// ─────────────────────────────────────────────
// Popover types
// ─────────────────────────────────────────────

interface CompletedPopover {
  kind: 'completed';
  node: PositionedNode;
}

interface SuggestedPopover {
  kind: 'suggested';
  node: PositionedNode;
}

type PopoverData = CompletedPopover | SuggestedPopover;

// ─────────────────────────────────────────────
// NodePopover (floating overlay, positioned in screen space)
// ─────────────────────────────────────────────

function NodePopover({
  data,
  onClose,
  pz,
}: {
  data: PopoverData;
  onClose: () => void;
  pz: PanZoomState;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  const { node } = data;
  const screen = toScreen(node.x, node.y, pz);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${screen.x}px`,
    top: `${screen.y - node.radius - 8}px`,
    transform: 'translate(-50%, -100%)',
    transformOrigin: 'bottom center',
    zIndex: 50,
  };

  if (data.kind === 'completed') {
    return (
      <div ref={ref} style={style} className="animate-fade-in">
        <div className="rounded-2xl bg-superficie border border-turquesa/30 shadow-lg px-3 py-2.5 text-center min-w-[140px]">
          <p className="text-sm font-bold text-texto">
            {node.emoji} {node.nombre}
          </p>
          <p className="text-[11px] text-texto-suave mt-1">
            Estudiado {node.veces} {node.veces === 1 ? 'vez' : 'veces'}
          </p>
          <p className="text-[10px] text-texto-suave mt-0.5 capitalize">
            {node.dominio}
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

  return (
    <div ref={ref} style={style} className="animate-fade-in">
      <div className="rounded-2xl bg-superficie border border-amarillo/40 shadow-lg px-3 py-2.5 text-center min-w-[160px]">
        <p className="text-xs text-texto-suave">
          Quieres una historia sobre
        </p>
        <p className="text-sm font-bold text-texto mt-0.5">
          {node.emoji} {node.nombre}?
        </p>
        <div className="mt-2.5 flex items-center justify-center gap-2">
          <Link
            href={`/jugar/lectura?topic=${encodeURIComponent(node.slug)}`}
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
// Graph node (positioned at screen coords, native resolution)
// ─────────────────────────────────────────────

const GraphNode = memo(function GraphNode({
  node,
  onClick,
  isActive,
  isFocused,
  isDimmed,
  pz,
}: {
  node: PositionedNode;
  onClick: () => void;
  isActive: boolean;
  isFocused: boolean;
  isDimmed: boolean;
  pz: PanZoomState;
}) {
  const color = getDomainColor(node.dominio);
  const size = node.radius * 2;
  const screen = toScreen(node.x, node.y, pz);
  const isSuggestion = node.isSuggestion;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={[
        'absolute flex flex-col items-center justify-center rounded-full transition-all duration-200',
        'min-h-0 min-w-0',
        'hover:brightness-110 hover:scale-105 active:scale-95',
        isActive ? 'ring-2 ring-offset-2 ring-offset-fondo' : '',
        isFocused && !isActive ? 'ring-2 ring-offset-1 ring-offset-fondo ring-turquesa/60' : '',
        isSuggestion && !isDimmed ? 'animate-pulse-suggestion' : '',
      ].join(' ')}
      style={{
        left: `${screen.x - node.radius}px`,
        top: `${screen.y - node.radius}px`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: isSuggestion ? '#FFE66D' : color,
        opacity: isDimmed ? 0.35 : 1,
        boxShadow: isDimmed ? 'none' : isSuggestion
          ? '0 0 12px rgba(255, 230, 109, 0.5)'
          : `0 2px 8px ${color}44`,
        border: isSuggestion ? '2px dashed #D4880B' : `2px solid ${color}`,
        '--tw-ring-color': color,
      } as React.CSSProperties}
      aria-label={`${node.emoji} ${node.nombre}${isSuggestion ? ' (sugerido)' : ''}`}
    >
      <span className="text-base leading-none" style={{ fontSize: `${Math.max(12, node.radius * 0.65)}px` }}>
        {node.emoji}
      </span>
    </button>
  );
});

// ─────────────────────────────────────────────
// Node label (below node, screen-space positioned)
// ─────────────────────────────────────────────

const NodeLabel = memo(function NodeLabel({ node, pz }: { node: PositionedNode; pz: PanZoomState }) {
  const screen = toScreen(node.x, node.y, pz);

  return (
    <div
      className="absolute pointer-events-none text-center"
      style={{
        left: `${screen.x}px`,
        top: `${screen.y + node.radius + 4}px`,
        transform: 'translateX(-50%)',
        width: `${Math.max(60, node.radius * 3)}px`,
      }}
    >
      <span className="text-[10px] font-semibold text-texto leading-tight block truncate">
        {truncateLabel(node.nombre)}
      </span>
    </div>
  );
});

// ─────────────────────────────────────────────
// SVG connection lines layer (screen-space coordinates)
// ─────────────────────────────────────────────

const ConnectionLines = memo(function ConnectionLines({
  layout,
  suggestionEdges,
  pz,
  containerWidth,
  containerHeight,
}: {
  layout: GraphLayout;
  suggestionEdges: Array<{ from: PositionedNode; to: PositionedNode }>;
  pz: PanZoomState;
  containerWidth: number;
  containerHeight: number;
}) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, PositionedNode>();
    for (const n of layout.nodes) m.set(n.slug, n);
    return m;
  }, [layout.nodes]);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={containerWidth}
      height={containerHeight}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
    >
      {/* Domain cluster background circles */}
      {layout.clusters.map((cluster) => {
        if (cluster.nodes.length === 0) return null;
        const center = toScreen(cluster.centerX, cluster.centerY, pz);

        let maxDist = 0;
        for (const n of cluster.nodes) {
          const ns = toScreen(n.x, n.y, pz);
          const dx = ns.x - center.x;
          const dy = ns.y - center.y;
          const d = Math.sqrt(dx * dx + dy * dy) + n.radius + 20;
          if (d > maxDist) maxDist = d;
        }
        const clusterRadius = Math.max(60, maxDist);

        return (
          <circle
            key={`cluster-bg-${cluster.dominio}`}
            cx={center.x}
            cy={center.y}
            r={clusterRadius}
            fill={cluster.color}
            opacity={0.06}
            stroke={cluster.color}
            strokeWidth={1}
            strokeOpacity={0.15}
            strokeDasharray="6 4"
          />
        );
      })}

      {/* Intra-domain edges (solid) */}
      {layout.intraEdges.map((edge) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;
        const fromS = toScreen(from.x, from.y, pz);
        const toS = toScreen(to.x, to.y, pz);
        const color = getDomainColor(edge.dominio);
        return (
          <line
            key={`edge-${edge.from}-${edge.to}`}
            x1={fromS.x}
            y1={fromS.y}
            x2={toS.x}
            y2={toS.y}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.35}
            strokeLinecap="round"
          />
        );
      })}

      {/* Suggestion edges (dashed, dynamic based on focused topic) */}
      {suggestionEdges.map((edge) => {
        const fromS = toScreen(edge.from.x, edge.from.y, pz);
        const toS = toScreen(edge.to.x, edge.to.y, pz);
        return (
          <line
            key={`sug-edge-${edge.from.slug}-${edge.to.slug}`}
            x1={fromS.x}
            y1={fromS.y}
            x2={toS.x}
            y2={toS.y}
            stroke="#9AA0A6"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            strokeOpacity={0.4}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
});

// ─────────────────────────────────────────────
// Cluster label (screen-space positioned)
// ─────────────────────────────────────────────

const ClusterLabel = memo(function ClusterLabel({
  cluster,
  pz,
}: {
  cluster: GraphLayout['clusters'][number];
  pz: PanZoomState;
}) {
  if (cluster.nodes.length === 0) return null;

  let minY = Infinity;
  for (const n of cluster.nodes) {
    const screen = toScreen(n.x, n.y, pz);
    const top = screen.y - n.radius;
    if (top < minY) minY = top;
  }
  const center = toScreen(cluster.centerX, cluster.centerY, pz);

  return (
    <div
      className="absolute pointer-events-none text-center"
      style={{
        left: `${center.x}px`,
        top: `${minY - 32}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <span
        className="text-xs font-bold font-datos px-2 py-0.5 rounded-full"
        style={{
          color: cluster.color,
          backgroundColor: `${cluster.color}15`,
        }}
      >
        {cluster.emoji} {cluster.nombre}
      </span>
    </div>
  );
});

// ─────────────────────────────────────────────
// Zoom controls overlay
// ─────────────────────────────────────────────

function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  scale,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  scale: number;
}) {
  return (
    <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onZoomIn}
        className="flex items-center justify-center w-8 h-8 min-h-0 min-w-0 rounded-lg bg-superficie/90 shadow-md border border-neutro/15 text-texto-suave hover:text-texto transition-colors"
        aria-label="Acercar"
      >
        <ZoomIn size={16} />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="flex items-center justify-center w-8 h-8 min-h-0 min-w-0 rounded-lg bg-superficie/90 shadow-md border border-neutro/15 text-texto-suave hover:text-texto transition-colors"
        aria-label="Alejar"
      >
        <ZoomOut size={16} />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="flex items-center justify-center w-8 h-8 min-h-0 min-w-0 rounded-lg bg-superficie/90 shadow-md border border-neutro/15 text-texto-suave hover:text-texto transition-colors"
        aria-label="Restablecer vista"
      >
        <RotateCcw size={14} />
      </button>
      <div className="text-center text-[9px] text-texto-suave font-datos mt-0.5">
        {Math.round(scale * 100)}%
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
  const [popover, setPopover] = useState<PopoverData | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(
    () => data.techTree.historialTopics[0]?.slug ?? null,
  );
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Compute graph layout (memoized)
  const layout = useMemo(
    () =>
      computeGraphLayout(
        data.techTree.historialTopics,
        data.techTree.sugerencias,
        data.techTree.dominiosTocados,
      ),
    [data.techTree.historialTopics, data.techTree.sugerencias, data.techTree.dominiosTocados],
  );

  // Compute initial transform so the graph fits within the visible area
  const initialTransform = useMemo(() => {
    // Use a reasonable default; the actual container size is set via ResizeObserver
    const containerW = containerSize.width || 350;
    const containerH = containerSize.height || 500;
    if (layout.width === 0 || layout.height === 0) {
      return { scale: 1, x: 0, y: 0 };
    }
    const scaleX = containerW / layout.width;
    const scaleY = containerH / layout.height;
    const scale = Math.min(scaleX, scaleY, 1);
    const scaledW = layout.width * scale;
    const scaledH = layout.height * scale;
    return {
      scale: Math.max(0.3, scale),
      x: (containerW - scaledW) / 2,
      y: (containerH - scaledH) / 2,
    };
  }, [layout.width, layout.height, containerSize.width, containerSize.height]);

  const { containerRef, state, resetView, zoomTo } = usePanZoom({
    minScale: 0.3,
    maxScale: 3,
    initialScale: initialTransform.scale,
    initialX: initialTransform.x,
    initialY: initialTransform.y,
  });

  // Track container size via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  // Dynamic suggestion edges from the focused completed topic (per-node map)
  const edgeMap = data.techTree.suggestionEdgeMap;
  const dynamicSuggestionEdges = useMemo(() => {
    if (!focusedSlug) return [];
    const focusedNode = layout.nodes.find(
      (n) => n.slug === focusedSlug && !n.isSuggestion,
    );
    if (!focusedNode) return [];
    const targetSlugs = new Set(edgeMap[focusedSlug] ?? []);
    return layout.nodes
      .filter((n) => n.isSuggestion && targetSlugs.has(n.slug))
      .map((n) => ({ from: focusedNode, to: n }));
  }, [focusedSlug, layout.nodes, edgeMap]);

  // Set of suggestion slugs connected to the focused node (for dimming others)
  const connectedSuggestionSlugs = useMemo(() => {
    return new Set(dynamicSuggestionEdges.map((e) => e.to.slug));
  }, [dynamicSuggestionEdges]);

  const handleNodeClick = useCallback(
    (node: PositionedNode) => {
      if (node.isSuggestion) {
        setPopover({ kind: 'suggested', node });
      } else {
        // Focus this completed topic: move suggestion edges to it
        setFocusedSlug(node.slug);
        setPopover({ kind: 'completed', node });
      }
    },
    [],
  );

  const closePopover = useCallback(() => setPopover(null), []);

  const handleZoomIn = useCallback(() => {
    zoomTo(state.scale * 1.3);
  }, [state.scale, zoomTo]);

  const handleZoomOut = useCallback(() => {
    zoomTo(state.scale * 0.75);
  }, [state.scale, zoomTo]);

  const isEmpty = layout.nodes.length === 0;

  return (
    <div>
      {/* Compact topic count badge */}
      <div className="rounded-2xl bg-turquesa/10 p-2.5 mb-2">
        <p className="text-xs text-texto">
          Topics explorados: <span className="font-bold">{data.techTree.historialTopics.length}</span>
          {data.techTree.sugerencias.length > 0 && (
            <span className="text-texto-suave">
              {' '}· {data.techTree.sugerencias.length} sugeridos
            </span>
          )}
        </p>
      </div>

      {/* Interactive Learning Map (full-screen height) */}
      <div
        className="relative rounded-2xl border border-neutro/15 bg-fondo overflow-hidden -mx-4 md:-mx-6"
        style={{ width: 'calc(100% + 2rem)' }}
      >
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <p className="text-[11px] font-semibold text-texto-suave">
            Mapa de aprendizaje
          </p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[9px] text-texto-suave">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-turquesa" />
              Explorado
            </span>
            <span className="flex items-center gap-1 text-[9px] text-texto-suave">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amarillo border border-dashed border-ambar" />
              Sugerido
            </span>
          </div>
        </div>

        {isEmpty ? (
          <div className="flex items-center justify-center h-48 px-4">
            <p className="text-sm text-texto-suave text-center">
              Completa lecturas para ver tu mapa de aprendizaje
            </p>
          </div>
        ) : (
          <>
            {/* Pan/Zoom container - fills most of the viewport */}
            <div
              ref={containerRef}
              className="relative w-full overflow-hidden"
              style={{
                height: 'calc(100vh - 200px)',
                minHeight: '320px',
                touchAction: 'none',
              }}
            >
              {/* SVG connection lines (behind everything, screen-space) */}
              <ConnectionLines
                layout={layout}
                suggestionEdges={dynamicSuggestionEdges}
                pz={state}
                containerWidth={containerSize.width || 800}
                containerHeight={containerSize.height || 500}
              />

              {/* Cluster labels */}
              {layout.clusters.map((cluster) => (
                <ClusterLabel key={`label-${cluster.dominio}`} cluster={cluster} pz={state} />
              ))}

              {/* Node labels */}
              {layout.nodes.map((node) => (
                <NodeLabel key={`label-${node.slug}`} node={node} pz={state} />
              ))}

              {/* Interactive nodes */}
              {layout.nodes.map((node) => (
                <GraphNode
                  key={`node-${node.slug}`}
                  node={node}
                  onClick={() => handleNodeClick(node)}
                  isActive={popover?.node.slug === node.slug}
                  isFocused={node.slug === focusedSlug && !node.isSuggestion}
                  isDimmed={node.isSuggestion && connectedSuggestionSlugs.size > 0 && !connectedSuggestionSlugs.has(node.slug)}
                  pz={state}
                />
              ))}

              {/* Popover */}
              {popover && (
                <NodePopover
                  data={popover}
                  onClose={closePopover}
                  pz={state}
                />
              )}
            </div>

            {/* Zoom controls */}
            <ZoomControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={resetView}
              scale={state.scale}
            />
          </>
        )}

        {/* Hint text */}
        {!isEmpty && (
          <p className="text-center text-[9px] text-texto-suave pb-2 pt-1">
            Arrastra para mover, pellizca para zoom, toca un nodo para detalles
          </p>
        )}
      </div>

      {/* Domain progress bars (compact, single row) */}
      {data.techTree.dominiosTocados.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {data.techTree.dominiosTocados.map((d) => (
            <div key={d.dominio} className="min-w-0 shrink-0 w-[120px] rounded-xl bg-fondo p-2">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] font-semibold text-texto truncate min-w-0">
                  {d.emoji} {d.nombre}
                </p>
                <p className="text-[9px] text-texto-suave shrink-0">
                  {d.tocados}/{d.total}
                </p>
              </div>
              <div className="mt-1 h-1 rounded-full bg-neutro/10">
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((d.tocados / Math.max(1, d.total)) * 100))}%`,
                    backgroundColor: getDomainColor(d.dominio),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested routes (compact) */}
      {data.techTree.sugerencias.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-texto-suave">Siguientes rutas sugeridas</p>
          {data.techTree.sugerencias.map((sug) => (
            <div key={sug.slug} className="min-w-0 rounded-xl bg-fondo p-2">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-semibold text-texto truncate min-w-0">
                  {sug.emoji} {sug.nombre}
                </p>
                <span className="shrink-0 rounded-full bg-neutro/10 px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
                  {sug.tipo}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-texto-suave">{sug.motivo}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
