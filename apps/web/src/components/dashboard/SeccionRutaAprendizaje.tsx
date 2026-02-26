'use client';

/**
 * Interactive zoomable learning map - SVG-native rendering.
 * Uses SVG viewBox for pan/zoom so all elements (circles, text, lines)
 * render as crisp vectors at any zoom level (no CSS transform pixelation).
 * Dynamic suggestion edges originate from the focused (clicked) completed topic.
 *
 * Below the map: compact domain progress bars, suggested routes.
 */
import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { usePanZoom } from '@/hooks/usePanZoom';
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
  return `${value.slice(0, max - 1)}\u2026`;
}

/** Split text into lines that fit within maxChars per line (max 2 lines). */
function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (test.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length >= 2) break;
    } else {
      currentLine = test;
    }
  }
  if (currentLine && lines.length < 2) {
    lines.push(currentLine);
  }

  // Truncate last line if it overflows
  if (lines.length > 0) {
    const last = lines[lines.length - 1];
    if (last.length > maxChars) {
      lines[lines.length - 1] = `${last.slice(0, maxChars - 1)}\u2026`;
    }
  }

  return lines;
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
// NodePopover (screen-space HTML, OUTSIDE the SVG)
// ─────────────────────────────────────────────

function NodePopover({
  data,
  onClose,
  toScreenPoint,
  scale,
  nivelActual,
}: {
  data: PopoverData;
  onClose: () => void;
  toScreenPoint: (gx: number, gy: number) => { x: number; y: number };
  scale: number;
  nivelActual: number;
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
  const screen = toScreenPoint(node.x, node.y);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${screen.x}px`,
    top: `${screen.y - node.radius * scale - 8}px`,
    transform: 'translate(-50%, -100%)',
    transformOrigin: 'bottom center',
    zIndex: 50,
  };

  if (data.kind === 'completed') {
    const nivelDisplay = Math.floor(nivelActual);
    const nivelUp = Math.min(nivelDisplay + 1, Math.min(Math.floor(nivelActual) + 2, 4));
    const nivelDown = Math.max(nivelDisplay - 1, 1);
    const canGoUp = nivelUp > nivelDisplay;
    const canGoDown = nivelDown < nivelDisplay;
    const topicParam = encodeURIComponent(node.slug);

    return (
      <div
        ref={ref}
        style={style}
        className="animate-fade-in"
        data-panzoom-ignore="true"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl bg-superficie border border-turquesa/30 shadow-lg px-4 py-3 text-center min-w-[200px]">
          <p className="text-sm font-bold text-texto">
            {node.emoji} {node.nombre}
          </p>
          <p className="text-[11px] text-texto-suave mt-0.5 capitalize">
            {node.dominio}
          </p>
          <p className="text-[11px] text-texto-suave mt-0.5">
            Leido {node.veces} {node.veces === 1 ? 'vez' : 'veces'}
          </p>

          <div className="mt-3 flex flex-col gap-2">
            <Link
              href={`/jugar/lectura?topic=${topicParam}`}
              className="flex items-center justify-center rounded-xl bg-turquesa px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all min-h-[44px]"
            >
              Leer de nuevo
            </Link>

            {canGoUp && (
              <Link
                href={`/jugar/lectura?topic=${topicParam}&level=${nivelUp}`}
                className="flex items-center justify-center rounded-xl bg-turquesa/15 px-4 py-2.5 text-xs font-semibold text-turquesa hover:bg-turquesa/25 transition-colors min-h-[44px]"
              >
                Nivel {nivelDisplay} &rarr; {nivelUp}
              </Link>
            )}

            {canGoDown && (
              <Link
                href={`/jugar/lectura?topic=${topicParam}&level=${nivelDown}`}
                className="flex items-center justify-center rounded-xl bg-neutro/10 px-4 py-2.5 text-xs font-semibold text-texto-suave hover:bg-neutro/20 transition-colors min-h-[44px]"
              >
                Nivel {nivelDisplay} &rarr; {nivelDown}
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-2 text-[10px] text-texto-suave hover:text-texto transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // Suggested node popover
  return (
    <div
      ref={ref}
      style={style}
      className="animate-fade-in"
      data-panzoom-ignore="true"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="rounded-2xl bg-superficie border border-amarillo/40 shadow-lg px-4 py-3 text-center min-w-[200px]">
        <p className="text-xs text-texto-suave">
          Quieres una historia sobre
        </p>
        <p className="text-sm font-bold text-texto mt-0.5">
          {node.emoji} {node.nombre}?
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Link
            href={`/jugar/lectura?topic=${encodeURIComponent(node.slug)}`}
            className="flex items-center justify-center rounded-xl bg-turquesa px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all min-h-[44px]"
          >
            Si, vamos!
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-xl bg-neutro/10 px-4 py-2.5 text-xs font-semibold text-texto-suave hover:bg-neutro/20 transition-colors min-h-[44px]"
          >
            No, gracias
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SVG Graph node (circle + emoji text)
// ─────────────────────────────────────────────

const GraphNode = memo(function GraphNode({
  node,
  onNodeClick,
  isActive,
  isFocused,
  isDimmed,
}: {
  node: PositionedNode;
  onNodeClick: (node: PositionedNode) => void;
  isActive: boolean;
  isFocused: boolean;
  isDimmed: boolean;
}) {
  const color = getDomainColor(node.dominio);
  const isSuggestion = node.isSuggestion;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onNodeClick(node);
    },
    [node, onNodeClick],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNodeClick(node);
      }
    },
    [node, onNodeClick],
  );

  return (
    <g
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${node.emoji} ${node.nombre}${isSuggestion ? ' (sugerido)' : ''}`}
      style={{ cursor: 'pointer' }}
    >
      {/* Main circle */}
      <circle
        cx={node.x}
        cy={node.y}
        r={node.radius}
        fill={isSuggestion ? '#FFE66D' : color}
        stroke={isSuggestion ? '#D4880B' : color}
        strokeWidth={2}
        strokeDasharray={isSuggestion ? '6 4' : undefined}
        opacity={isDimmed ? 0.35 : 1}
        filter={isDimmed ? undefined : isSuggestion ? 'url(#suggestion-shadow)' : 'url(#node-shadow)'}
      />

      {/* Focus/active ring */}
      {(isActive || isFocused) && (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.radius + 4}
          fill="none"
          stroke={isActive ? color : 'rgba(78, 205, 196, 0.6)'}
          strokeWidth={2}
        />
      )}

      {/* Suggestion pulse animation */}
      {isSuggestion && !isDimmed && (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.radius}
          fill="none"
          stroke="rgba(255, 230, 109, 0.4)"
          strokeWidth={1}
        >
          <animate
            attributeName="r"
            from={String(node.radius)}
            to={String(node.radius + 8)}
            dur="2.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.6"
            to="0"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Emoji */}
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.max(12, node.radius * 0.65)}
        style={{ pointerEvents: 'none' }}
      >
        {node.emoji}
      </text>
    </g>
  );
});

// ─────────────────────────────────────────────
// SVG Node label (zoom-responsive: full text at high zoom)
// Now takes a stable boolean `showFullLabels` instead of numeric `scale`,
// so memo() prevents re-renders during pan/zoom gestures.
// ─────────────────────────────────────────────

const NodeLabel = memo(function NodeLabel({
  node,
  showFullLabels,
}: {
  node: PositionedNode;
  showFullLabels: boolean;
}) {
  const fontSize = 10;
  const maxWidth = Math.max(60, node.radius * 3);
  const charWidth = fontSize * 0.55;
  const maxChars = Math.floor(maxWidth / charWidth);

  const text = showFullLabels ? node.nombre : truncateLabel(node.nombre);

  const y = node.y + node.radius + 4 + fontSize;

  if (showFullLabels && text.length > maxChars) {
    const lines = wrapText(text, maxChars);
    return (
      <text
        x={node.x}
        y={y}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={600}
        fill="var(--color-texto)"
        style={{ pointerEvents: 'none' }}
      >
        {lines.map((line, i) => (
          <tspan key={i} x={node.x} dy={i === 0 ? 0 : fontSize * 1.2}>
            {line}
          </tspan>
        ))}
      </text>
    );
  }

  return (
    <text
      x={node.x}
      y={y}
      textAnchor="middle"
      fontSize={fontSize}
      fontWeight={600}
      fill="var(--color-texto)"
      style={{ pointerEvents: 'none' }}
    >
      {text}
    </text>
  );
});

// ─────────────────────────────────────────────
// SVG Cluster label (pill background + text)
// ─────────────────────────────────────────────

const ClusterLabel = memo(function ClusterLabel({
  cluster,
}: {
  cluster: GraphLayout['clusters'][number];
}) {
  if (cluster.nodes.length === 0) return null;

  let minY = Infinity;
  for (const n of cluster.nodes) {
    const top = n.y - n.radius;
    if (top < minY) minY = top;
  }

  const labelText = `${cluster.emoji} ${cluster.nombre}`;
  const fontSize = 12;
  const charWidth = fontSize * 0.6;
  const textWidth = labelText.length * charWidth;
  const paddingX = 8;
  const paddingY = 4;
  const rectWidth = textWidth + paddingX * 2;
  const rectHeight = fontSize + paddingY * 2;
  const cy = minY - 28;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={cluster.centerX - rectWidth / 2}
        y={cy - rectHeight / 2}
        width={rectWidth}
        height={rectHeight}
        rx={rectHeight / 2}
        fill={`${cluster.color}15`}
      />
      <text
        x={cluster.centerX}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={700}
        fill={cluster.color}
        fontFamily="var(--font-datos)"
      >
        {labelText}
      </text>
    </g>
  );
});

// ─────────────────────────────────────────────
// SVG Connection lines + cluster backgrounds
// ─────────────────────────────────────────────

const ConnectionLines = memo(function ConnectionLines({
  layout,
  suggestionEdges,
}: {
  layout: GraphLayout;
  suggestionEdges: Array<{ from: PositionedNode; to: PositionedNode }>;
}) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, PositionedNode>();
    for (const n of layout.nodes) m.set(n.slug, n);
    return m;
  }, [layout.nodes]);

  return (
    <g>
      {/* Domain cluster background circles */}
      {layout.clusters.map((cluster) => {
        if (cluster.nodes.length === 0) return null;

        let maxDist = 0;
        for (const n of cluster.nodes) {
          const dx = n.x - cluster.centerX;
          const dy = n.y - cluster.centerY;
          const d = Math.sqrt(dx * dx + dy * dy) + n.radius + 20;
          if (d > maxDist) maxDist = d;
        }
        const clusterRadius = Math.max(60, maxDist);

        return (
          <circle
            key={`cluster-bg-${cluster.dominio}`}
            cx={cluster.centerX}
            cy={cluster.centerY}
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
        const color = getDomainColor(edge.dominio);
        return (
          <line
            key={`edge-${edge.from}-${edge.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.35}
            strokeLinecap="round"
          />
        );
      })}

      {/* Suggestion edges (dashed, dynamic based on focused topic) */}
      {suggestionEdges.map((edge) => (
        <line
          key={`sug-edge-${edge.from.slug}-${edge.to.slug}`}
          x1={edge.from.x}
          y1={edge.from.y}
          x2={edge.to.x}
          y2={edge.to.y}
          stroke="#9AA0A6"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          strokeOpacity={0.4}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
});

// ─────────────────────────────────────────────
// Zoom controls overlay (HTML, screen-space)
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

  // SVG viewBox pan/zoom (handles ResizeObserver internally)
  const { containerRef, svgRef, viewBox, scale, showFullLabels, resetView, zoomTo, toScreenPoint } = usePanZoom({
    minScale: 0.3,
    maxScale: 3,
    graphWidth: layout.width,
    graphHeight: layout.height,
  });

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
        setFocusedSlug(node.slug);
        setPopover({ kind: 'completed', node });
      }
    },
    [],
  );

  const closePopover = useCallback(() => setPopover(null), []);

  const handleZoomIn = useCallback(() => {
    zoomTo(scale * 1.3);
  }, [scale, zoomTo]);

  const handleZoomOut = useCallback(() => {
    zoomTo(scale * 0.75);
  }, [scale, zoomTo]);

  const isEmpty = layout.nodes.length === 0;

  return (
    <div>
      {/* Compact topic count badge */}
      <div className="rounded-2xl bg-turquesa/10 p-2.5 mb-2">
        <p className="text-xs text-texto">
          Topics explorados: <span className="font-bold">{data.techTree.historialTopics.length}</span>
          {data.techTree.sugerencias.length > 0 && (
            <span className="text-texto-suave">
              {' '}&middot; {data.techTree.sugerencias.length} sugeridos
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
            {/* Pan/Zoom container (captures gestures) */}
            <div
              ref={containerRef}
              className="relative w-full overflow-hidden"
              style={{
                height: 'calc(100vh - 200px)',
                minHeight: '320px',
                touchAction: 'none',
              }}
            >
              {/* SVG canvas with viewBox-driven pan/zoom (always crisp vectors) */}
              <svg
                ref={svgRef}
                viewBox={viewBox}
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                style={{ display: 'block' }}
              >
                <defs>
                  <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.12" />
                  </filter>
                  <filter id="suggestion-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#FFE66D" floodOpacity="0.5" />
                  </filter>
                </defs>

                {/* Layer 1+2: Cluster backgrounds + edges */}
                <ConnectionLines
                  layout={layout}
                  suggestionEdges={dynamicSuggestionEdges}
                />

                {/* Layer 3: Cluster labels */}
                <g>
                  {layout.clusters.map((cluster) => (
                    <ClusterLabel key={`label-${cluster.dominio}`} cluster={cluster} />
                  ))}
                </g>

                {/* Layer 4: Node labels */}
                <g>
                  {layout.nodes.map((node) => (
                    <NodeLabel key={`label-${node.slug}`} node={node} showFullLabels={showFullLabels} />
                  ))}
                </g>

                {/* Layer 5: Interactive nodes */}
                <g>
                  {layout.nodes.map((node) => (
                    <GraphNode
                      key={`node-${node.slug}`}
                      node={node}
                      onNodeClick={handleNodeClick}
                      isActive={popover?.node.slug === node.slug}
                      isFocused={node.slug === focusedSlug && !node.isSuggestion}
                      isDimmed={node.isSuggestion && connectedSuggestionSlugs.size > 0 && !connectedSuggestionSlugs.has(node.slug)}
                    />
                  ))}
                </g>
              </svg>

              {/* Popover (HTML, screen-space, outside SVG) */}
              {popover && (
                <NodePopover
                  data={popover}
                  onClose={closePopover}
                  toScreenPoint={toScreenPoint}
                  scale={scale}
                  nivelActual={data.nivelActual}
                />
              )}
            </div>

            {/* Zoom controls */}
            <ZoomControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={resetView}
              scale={scale}
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
