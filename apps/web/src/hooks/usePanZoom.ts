'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PanZoomState {
  x: number;
  y: number;
  scale: number;
}

export interface UsePanZoomOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  initialX?: number;
  initialY?: number;
}

interface UsePanZoomReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  state: PanZoomState;
  resetView: () => void;
  zoomTo: (scale: number, centerX?: number, centerY?: number) => void;
}

// ─────────────────────────────────────────────
// Touch helpers
// ─────────────────────────────────────────────

function getTouchCenter(touches: TouchList): { x: number; y: number } {
  if (touches.length === 1) {
    return { x: touches[0].clientX, y: touches[0].clientY };
  }
  const x = (touches[0].clientX + touches[1].clientX) / 2;
  const y = (touches[0].clientY + touches[1].clientY) / 2;
  return { x, y };
}

function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function usePanZoom(options: UsePanZoomOptions = {}): UsePanZoomReturn {
  const {
    minScale = 0.5,
    maxScale = 3,
    initialScale = 1,
    initialX = 0,
    initialY = 0,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<PanZoomState>({
    x: initialX,
    y: initialY,
    scale: initialScale,
  });

  // Refs to track gestures without triggering re-renders
  const stateRef = useRef(state);
  stateRef.current = state;

  const gestureRef = useRef<{
    isPanning: boolean;
    isPinching: boolean;
    startX: number;
    startY: number;
    startStateX: number;
    startStateY: number;
    startScale: number;
    startDistance: number;
    lastTapTime: number;
    lastTapX: number;
    lastTapY: number;
  }>({
    isPanning: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    startStateX: 0,
    startStateY: 0,
    startScale: 1,
    startDistance: 0,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
  });

  const clampScale = useCallback(
    (s: number) => Math.min(maxScale, Math.max(minScale, s)),
    [minScale, maxScale],
  );

  const resetView = useCallback(() => {
    setState({ x: initialX, y: initialY, scale: initialScale });
  }, [initialX, initialY, initialScale]);

  const zoomTo = useCallback(
    (targetScale: number, centerX?: number, centerY?: number) => {
      const container = containerRef.current;
      if (!container) {
        setState((prev) => ({ ...prev, scale: clampScale(targetScale) }));
        return;
      }

      const rect = container.getBoundingClientRect();
      const cx = centerX ?? rect.width / 2;
      const cy = centerY ?? rect.height / 2;

      setState((prev) => {
        const newScale = clampScale(targetScale);
        const ratio = newScale / prev.scale;
        // Zoom towards the center point
        const newX = cx - ratio * (cx - prev.x);
        const newY = cy - ratio * (cy - prev.y);
        return { x: newX, y: newY, scale: newScale };
      });
    },
    [clampScale],
  );

  // ── Mouse handlers ──

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Mouse wheel zoom
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = container!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setState((prev) => {
        const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
        const newScale = clampScale(prev.scale * zoomFactor);
        const ratio = newScale / prev.scale;
        return {
          x: mouseX - ratio * (mouseX - prev.x),
          y: mouseY - ratio * (mouseY - prev.y),
          scale: newScale,
        };
      });
    }

    // Mouse drag
    function handleMouseDown(e: MouseEvent) {
      // Ignore clicks on interactive elements (buttons, links, etc.)
      const target = e.target as HTMLElement;
      if (target.closest('button, a, [role="button"]')) return;

      e.preventDefault();
      const g = gestureRef.current;
      g.isPanning = true;
      g.startX = e.clientX;
      g.startY = e.clientY;
      g.startStateX = stateRef.current.x;
      g.startStateY = stateRef.current.y;
      container!.style.cursor = 'grabbing';
    }

    function handleMouseMove(e: MouseEvent) {
      const g = gestureRef.current;
      if (!g.isPanning) return;
      e.preventDefault();
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      setState((prev) => ({
        ...prev,
        x: g.startStateX + dx,
        y: g.startStateY + dy,
      }));
    }

    function handleMouseUp() {
      gestureRef.current.isPanning = false;
      container!.style.cursor = 'grab';
    }

    // ── Touch handlers ──

    function handleTouchStart(e: TouchEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, [role="button"]')) return;

      const g = gestureRef.current;

      if (e.touches.length === 1) {
        // Check double-tap
        const now = Date.now();
        const touch = e.touches[0];
        const dt = now - g.lastTapTime;
        const dx = Math.abs(touch.clientX - g.lastTapX);
        const dy = Math.abs(touch.clientY - g.lastTapY);

        if (dt < 300 && dx < 30 && dy < 30) {
          // Double-tap: zoom in/out toggle
          e.preventDefault();
          const rect = container!.getBoundingClientRect();
          const cx = touch.clientX - rect.left;
          const cy = touch.clientY - rect.top;
          const currentScale = stateRef.current.scale;
          const targetScale = currentScale > 1.5 ? 1 : 2;
          zoomTo(targetScale, cx, cy);
          g.lastTapTime = 0;
          return;
        }

        g.lastTapTime = now;
        g.lastTapX = touch.clientX;
        g.lastTapY = touch.clientY;

        // Single finger: pan
        g.isPanning = true;
        g.isPinching = false;
        const center = getTouchCenter(e.touches);
        g.startX = center.x;
        g.startY = center.y;
        g.startStateX = stateRef.current.x;
        g.startStateY = stateRef.current.y;
      } else if (e.touches.length === 2) {
        e.preventDefault();
        // Two-finger: pinch zoom + pan
        g.isPanning = false;
        g.isPinching = true;
        g.startDistance = getTouchDistance(e.touches);
        g.startScale = stateRef.current.scale;
        const center = getTouchCenter(e.touches);
        g.startX = center.x;
        g.startY = center.y;
        g.startStateX = stateRef.current.x;
        g.startStateY = stateRef.current.y;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      const g = gestureRef.current;

      if (g.isPinching && e.touches.length === 2) {
        e.preventDefault();
        const newDistance = getTouchDistance(e.touches);
        const ratio = newDistance / g.startDistance;
        const newScale = clampScale(g.startScale * ratio);
        const scaleRatio = newScale / g.startScale;

        const center = getTouchCenter(e.touches);
        const rect = container!.getBoundingClientRect();
        const cx = g.startX - rect.left;
        const cy = g.startY - rect.top;

        // Pan delta from center movement
        const panDx = center.x - g.startX;
        const panDy = center.y - g.startY;

        setState({
          x: cx - scaleRatio * (cx - g.startStateX) + panDx,
          y: cy - scaleRatio * (cy - g.startStateY) + panDy,
          scale: newScale,
        });
      } else if (g.isPanning && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - g.startX;
        const dy = touch.clientY - g.startY;

        // Start pan only after a small threshold to avoid interfering with taps
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          e.preventDefault();
          setState((prev) => ({
            ...prev,
            x: g.startStateX + dx,
            y: g.startStateY + dy,
          }));
        }
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      const g = gestureRef.current;
      if (e.touches.length === 0) {
        g.isPanning = false;
        g.isPinching = false;
      } else if (e.touches.length === 1) {
        // Went from 2 to 1 finger, restart single-finger pan
        g.isPinching = false;
        g.isPanning = true;
        const touch = e.touches[0];
        g.startX = touch.clientX;
        g.startY = touch.clientY;
        g.startStateX = stateRef.current.x;
        g.startStateY = stateRef.current.y;
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    container.style.cursor = 'grab';

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [clampScale, zoomTo]);

  // Apply transform to content
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    content.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    content.style.transformOrigin = '0 0';
  }, [state]);

  return { containerRef, contentRef, state, resetView, zoomTo };
}
