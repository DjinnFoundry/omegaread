'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** Internal viewBox state in graph-space coordinates. */
interface VBState {
  vx: number;
  vy: number;
  vw: number;
  vh: number;
}

export interface UsePanZoomOptions {
  minScale?: number;
  maxScale?: number;
  graphWidth: number;
  graphHeight: number;
}

export interface UsePanZoomReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** Ready-to-use SVG viewBox string: "vx vy vw vh" */
  viewBox: string;
  /** Derived zoom scale: containerWidth / viewBoxWidth */
  scale: number;
  /** Whether full labels should show (scale >= threshold). Stable boolean for memo(). */
  showFullLabels: boolean;
  resetView: () => void;
  zoomTo: (targetScale: number, screenCenterX?: number, screenCenterY?: number) => void;
  /** Convert graph-space point to screen-space pixel position (for HTML overlays). */
  toScreenPoint: (graphX: number, graphY: number) => { x: number; y: number };
}

// ─────────────────────────────────────────────
// Touch helpers
// ─────────────────────────────────────────────

function getTouchCenter(touches: TouchList): { x: number; y: number } {
  if (touches.length === 0) return { x: 0, y: 0 };
  if (touches.length === 1) {
    return { x: touches[0].clientX, y: touches[0].clientY };
  }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    'a,button,input,select,textarea,label,[role="button"],[data-panzoom-ignore="true"]',
  );
}

// ─────────────────────────────────────────────
// ViewBox helpers
// ─────────────────────────────────────────────

function vbToString(vb: VBState): string {
  return `${vb.vx} ${vb.vy} ${vb.vw} ${vb.vh}`;
}

/** Compute the viewBox that fits the entire graph centered within the container. */
function computeFitAll(gw: number, gh: number, cw: number, ch: number): VBState {
  if (cw <= 0 || ch <= 0 || gw <= 0 || gh <= 0) {
    return { vx: 0, vy: 0, vw: gw || 600, vh: gh || 400 };
  }
  const containerAspect = cw / ch;
  const graphAspect = gw / gh;

  if (containerAspect > graphAspect) {
    // Container is wider: expand viewBox horizontally, graph height fills
    const vh = gh;
    const vw = vh * containerAspect;
    return { vx: -(vw - gw) / 2, vy: 0, vw, vh };
  }
  // Container is taller: expand viewBox vertically, graph width fills
  const vw = gw;
  const vh = vw / containerAspect;
  return { vx: 0, vy: -(vh - gh) / 2, vw, vh };
}

const SHOW_FULL_LABELS_THRESHOLD = 1.3;

// ─────────────────────────────────────────────
// Hook
//
// SVG viewBox model: instead of CSS transform: scale() (which rasterizes
// and pixelates), we track a viewBox {vx, vy, vw, vh} in graph-space
// coordinates. Shrinking vw/vh = zoom in, expanding = zoom out.
// Everything renders as crisp vectors at any zoom level.
//
// Performance: During high-frequency gestures (wheel, drag, pinch),
// we mutate the SVG viewBox attribute directly via ref (0 re-renders).
// React state is synced only on gesture end (mouseup/touchend).
// ─────────────────────────────────────────────

export function usePanZoom(options: UsePanZoomOptions): UsePanZoomReturn {
  const { minScale = 0.3, maxScale = 3, graphWidth, graphHeight } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Container pixel size: state for rendering, ref for gesture closures
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerSizeRef = useRef({ width: 0, height: 0 });

  // ViewBox state (graph-space coordinates)
  // React state is the "source of truth" for rendering; vbRef is always up-to-date
  // (including mid-gesture values that skip React).
  const [vb, setVb] = useState<VBState>(() =>
    computeFitAll(graphWidth, graphHeight, 350, 500),
  );
  const vbRef = useRef(vb);

  // Track graph dimensions for resets
  const graphRef = useRef({ width: graphWidth, height: graphHeight });
  graphRef.current = { width: graphWidth, height: graphHeight };

  // Clamp viewBox width to enforce scale limits
  const clampVw = useCallback(
    (newVw: number): number => {
      const cw = containerSizeRef.current.width || 350;
      const minVw = cw / maxScale;
      const maxVw = cw / minScale;
      return Math.min(maxVw, Math.max(minVw, newVw));
    },
    [minScale, maxScale],
  );

  /** Apply a viewBox to the SVG DOM element directly (no React re-render). */
  const applySvgViewBox = useCallback((newVb: VBState) => {
    vbRef.current = newVb;
    svgRef.current?.setAttribute('viewBox', vbToString(newVb));
  }, []);

  /** Sync vbRef to React state (triggers 1 re-render). Call on gesture end. */
  const syncToReact = useCallback(() => {
    setVb(vbRef.current);
  }, []);

  // ResizeObserver: track container size, fit-all on first measure
  const hasInitialized = useRef(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        containerSizeRef.current = { width, height };
        setContainerSize({ width, height });

        if (!hasInitialized.current && width > 0 && height > 0) {
          hasInitialized.current = true;
          const fitVb = computeFitAll(graphRef.current.width, graphRef.current.height, width, height);
          setVb(fitVb);
          vbRef.current = fitVb;
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Re-fit when graph dimensions change
  useEffect(() => {
    if (hasInitialized.current && graphWidth > 0 && graphHeight > 0) {
      const { width, height } = containerSizeRef.current;
      if (width > 0 && height > 0) {
        const fitVb = computeFitAll(graphWidth, graphHeight, width, height);
        setVb(fitVb);
        vbRef.current = fitVb;
      }
    }
  }, [graphWidth, graphHeight]);

  const resetView = useCallback(() => {
    const { width, height } = containerSizeRef.current;
    const g = graphRef.current;
    const fitVb = computeFitAll(g.width, g.height, width, height);
    applySvgViewBox(fitVb);
    setVb(fitVb);
  }, [applySvgViewBox]);

  const zoomTo = useCallback(
    (targetScale: number, screenCenterX?: number, screenCenterY?: number) => {
      const cw = containerSizeRef.current.width || 350;
      const ch = containerSizeRef.current.height || 350;
      const cx = screenCenterX ?? cw / 2;
      const cy = screenCenterY ?? ch / 2;

      const prev = vbRef.current;
      const newVw = clampVw(cw / targetScale);
      const newVh = newVw * (ch / cw);

      // Keep the point under (cx, cy) fixed in graph space
      const gx = prev.vx + (cx / cw) * prev.vw;
      const gy = prev.vy + (cy / ch) * prev.vh;

      const newVb: VBState = {
        vx: gx - (cx / cw) * newVw,
        vy: gy - (cy / ch) * newVh,
        vw: newVw,
        vh: newVh,
      };
      applySvgViewBox(newVb);
      setVb(newVb);
    },
    [clampVw, applySvgViewBox],
  );

  const toScreenPoint = useCallback(
    (graphX: number, graphY: number): { x: number; y: number } => {
      const cw = containerSizeRef.current.width || 350;
      const ch = containerSizeRef.current.height || 350;
      const cur = vbRef.current;
      return {
        x: ((graphX - cur.vx) / cur.vw) * cw,
        y: ((graphY - cur.vy) / cur.vh) * ch,
      };
    },
    [],
  );

  // ── Gesture refs ──
  const gestureRef = useRef({
    isPanning: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    startVb: { vx: 0, vy: 0, vw: 600, vh: 400 } as VBState,
    startDistance: 0,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
  });

  // ── Mouse & touch event handlers ──
  useEffect(() => {
    const elOrNull = containerRef.current;
    if (!elOrNull) return;
    const el: HTMLDivElement = elOrNull;

    // High-frequency: mutate SVG directly, NO setVb()
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const cw = rect.width;
      const ch = rect.height;
      if (cw <= 0 || ch <= 0) return;

      const prev = vbRef.current;
      const factor = e.deltaY > 0 ? 1 / 0.92 : 1 / 1.08;
      const newVw = clampVw(prev.vw * factor);
      const newVh = newVw * (ch / cw);

      const gx = prev.vx + (mouseX / cw) * prev.vw;
      const gy = prev.vy + (mouseY / ch) * prev.vh;

      applySvgViewBox({
        vx: gx - (mouseX / cw) * newVw,
        vy: gy - (mouseY / ch) * newVh,
        vw: newVw,
        vh: newVh,
      });
      // Debounced sync: wheel events stop naturally, sync after brief pause
      clearTimeout(wheelSyncTimer);
      wheelSyncTimer = window.setTimeout(syncToReact, 120);
    }

    let wheelSyncTimer = 0;

    function handleMouseDown(e: MouseEvent) {
      if (isInteractiveTarget(e.target)) return;

      e.preventDefault();
      const g = gestureRef.current;
      g.isPanning = true;
      g.startX = e.clientX;
      g.startY = e.clientY;
      g.startVb = { ...vbRef.current };
      el.style.cursor = 'grabbing';
    }

    // High-frequency: mutate SVG directly, NO setVb()
    function handleMouseMove(e: MouseEvent) {
      const g = gestureRef.current;
      if (!g.isPanning) return;
      e.preventDefault();
      const cw = containerSizeRef.current.width || 350;
      const ch = containerSizeRef.current.height || 350;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;

      applySvgViewBox({
        vx: g.startVb.vx - dx * (g.startVb.vw / cw),
        vy: g.startVb.vy - dy * (g.startVb.vh / ch),
        vw: g.startVb.vw,
        vh: g.startVb.vh,
      });
    }

    // Gesture end: sync to React state (1 re-render)
    function handleMouseUp() {
      if (gestureRef.current.isPanning) {
        gestureRef.current.isPanning = false;
        syncToReact();
      }
      el.style.cursor = 'grab';
    }

    // ── Touch handlers ──

    function handleTouchStart(e: TouchEvent) {
      if (isInteractiveTarget(e.target)) return;

      const g = gestureRef.current;

      if (e.touches.length === 1) {
        // Double-tap detection
        const now = Date.now();
        const touch = e.touches[0];
        const dt = now - g.lastTapTime;
        const tdx = Math.abs(touch.clientX - g.lastTapX);
        const tdy = Math.abs(touch.clientY - g.lastTapY);

        if (dt < 300 && tdx < 30 && tdy < 30) {
          e.preventDefault();
          const rect = el.getBoundingClientRect();
          const cx = touch.clientX - rect.left;
          const cy = touch.clientY - rect.top;
          const cw = containerSizeRef.current.width || 350;
          const currentScale = cw / vbRef.current.vw;
          // Toggle between fit-all and 2x zoom
          const fitVb = computeFitAll(
            graphRef.current.width, graphRef.current.height,
            containerSizeRef.current.width, containerSizeRef.current.height,
          );
          const fitScale = containerSizeRef.current.width / fitVb.vw;
          const target = currentScale > fitScale * 1.5 ? fitScale : fitScale * 2;
          zoomTo(target, cx, cy);
          g.lastTapTime = 0;
          return;
        }

        g.lastTapTime = now;
        g.lastTapX = touch.clientX;
        g.lastTapY = touch.clientY;

        g.isPanning = true;
        g.isPinching = false;
        const center = getTouchCenter(e.touches);
        g.startX = center.x;
        g.startY = center.y;
        g.startVb = { ...vbRef.current };
      } else if (e.touches.length === 2) {
        e.preventDefault();
        g.isPanning = false;
        g.isPinching = true;
        g.startDistance = getTouchDistance(e.touches);
        g.startVb = { ...vbRef.current };
        const center = getTouchCenter(e.touches);
        g.startX = center.x;
        g.startY = center.y;
      }
    }

    // High-frequency: mutate SVG directly, NO setVb()
    function handleTouchMove(e: TouchEvent) {
      const g = gestureRef.current;
      const cw = containerSizeRef.current.width || 350;
      const ch = containerSizeRef.current.height || 350;

      if (g.isPinching && e.touches.length === 2) {
        e.preventDefault();
        if (g.startDistance <= 0) return;
        const newDistance = getTouchDistance(e.touches);
        if (newDistance <= 0) return;
        const ratio = newDistance / g.startDistance;

        const newVw = clampVw(g.startVb.vw / ratio);
        const newVh = newVw * (ch / cw);

        const rect = el.getBoundingClientRect();
        const cx = g.startX - rect.left;
        const cy = g.startY - rect.top;
        const gx = g.startVb.vx + (cx / cw) * g.startVb.vw;
        const gy = g.startVb.vy + (cy / ch) * g.startVb.vh;

        const center = getTouchCenter(e.touches);
        const panDx = center.x - g.startX;
        const panDy = center.y - g.startY;

        applySvgViewBox({
          vx: gx - (cx / cw) * newVw - panDx * (newVw / cw),
          vy: gy - (cy / ch) * newVh - panDy * (newVh / ch),
          vw: newVw,
          vh: newVh,
        });
      } else if (g.isPanning && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - g.startX;
        const dy = touch.clientY - g.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          e.preventDefault();
          applySvgViewBox({
            vx: g.startVb.vx - dx * (g.startVb.vw / cw),
            vy: g.startVb.vy - dy * (g.startVb.vh / ch),
            vw: g.startVb.vw,
            vh: g.startVb.vh,
          });
        }
      }
    }

    // Gesture end/cancel: sync to React state (1 re-render)
    function handleTouchEndOrCancel(e: TouchEvent) {
      const g = gestureRef.current;
      if (e.touches.length === 0) {
        const wasGesturing = g.isPanning || g.isPinching;
        g.isPanning = false;
        g.isPinching = false;
        if (wasGesturing) syncToReact();
      } else if (e.touches.length === 1) {
        // Transition from pinch to pan
        g.isPinching = false;
        g.isPanning = true;
        const touch = e.touches[0];
        g.startX = touch.clientX;
        g.startY = touch.clientY;
        g.startVb = { ...vbRef.current };
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEndOrCancel);
    el.addEventListener('touchcancel', handleTouchEndOrCancel);

    el.style.cursor = 'grab';

    return () => {
      clearTimeout(wheelSyncTimer);
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEndOrCancel);
      el.removeEventListener('touchcancel', handleTouchEndOrCancel);
    };
  }, [clampVw, zoomTo, applySvgViewBox, syncToReact]);

  // Derived values
  const cw = containerSize.width;
  const scale = cw > 0 ? cw / vb.vw : 1;
  const showFullLabels = scale >= SHOW_FULL_LABELS_THRESHOLD;
  const viewBox = vbToString(vb);

  return { containerRef, svgRef, viewBox, scale, showFullLabels, resetView, zoomTo, toScreenPoint };
}
