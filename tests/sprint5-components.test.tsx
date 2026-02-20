/**
 * Tests de componentes React para Sprint 5.
 * Charts SVG/CSS y widgets de dashboard.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarraComprension } from '@/components/charts/BarraComprension';
import { LineaEvolucion } from '@/components/charts/LineaEvolucion';
import { RadarTipos, formatearDatosTipos } from '@/components/charts/RadarTipos';
import { LineaNivel } from '@/components/charts/LineaNivel';

// ─────────────────────────────────────────────
// BarraComprension
// ─────────────────────────────────────────────

describe('BarraComprension', () => {
  it('renderiza sin datos (estado vacio)', () => {
    render(<BarraComprension datos={[]} />);
    expect(screen.getByText('Aun no hay sesiones para mostrar')).toBeDefined();
  });

  it('renderiza barras para cada dato', () => {
    const datos = [
      { porcentaje: 90, emoji: '🐱' },
      { porcentaje: 60, emoji: '🚀' },
      { porcentaje: 40, emoji: '🎨' },
    ];
    const { container } = render(<BarraComprension datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();

    // Debe tener 3 grupos de barras (fondo + valor)
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(6); // 3 fondo + 3 valor
  });

  it('tiene atributo aria-label para accesibilidad', () => {
    const datos = [{ porcentaje: 80, emoji: '📖' }];
    const { container } = render(<BarraComprension datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toContain('comprension');
  });

  it('muestra maximo 7 barras', () => {
    const datos = Array.from({ length: 10 }, (_, i) => ({
      porcentaje: 50 + i * 5,
      emoji: '📖',
    }));
    const { container } = render(<BarraComprension datos={datos} />);
    const groups = container.querySelectorAll('g');
    expect(groups.length).toBeLessThanOrEqual(7);
  });
});

// ─────────────────────────────────────────────
// LineaEvolucion
// ─────────────────────────────────────────────

describe('LineaEvolucion', () => {
  it('renderiza sin datos (estado vacio)', () => {
    render(<LineaEvolucion datos={[]} />);
    expect(screen.getByText('Sin datos todavia')).toBeDefined();
  });

  it('renderiza un SVG con datos', () => {
    const datos = [
      { label: 'S1', valor: 60 },
      { label: 'S2', valor: 75 },
      { label: 'S3', valor: 80 },
    ];
    const { container } = render(<LineaEvolucion datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();

    // Debe tener un path para la linea
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2); // linea + area
  });

  it('renderiza puntos (circulos) por cada dato', () => {
    const datos = [
      { label: 'S1', valor: 50 },
      { label: 'S2', valor: 70 },
    ];
    const { container } = render(<LineaEvolucion datos={datos} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('muestra labels cuando mostrarValores=true', () => {
    const datos = [
      { label: 'S1', valor: 75 },
    ];
    const { container } = render(
      <LineaEvolucion datos={datos} mostrarValores />
    );
    // Debe mostrar el valor como texto
    const textos = container.querySelectorAll('text');
    const tieneValor = Array.from(textos).some(t =>
      t.textContent?.includes('75%')
    );
    expect(tieneValor).toBe(true);
  });
});

// ─────────────────────────────────────────────
// RadarTipos
// ─────────────────────────────────────────────

describe('RadarTipos', () => {
  it('renderiza sin datos (estado vacio)', () => {
    render(<RadarTipos datos={[]} />);
    expect(screen.getByText('Sin datos de preguntas todavia')).toBeDefined();
  });

  it('renderiza barras para cada tipo', () => {
    const datos = [
      { tipo: 'literal', label: 'Literal', porcentaje: 80, total: 10 },
      { tipo: 'inferencia', label: 'Inferencia', porcentaje: 60, total: 8 },
    ];
    render(<RadarTipos datos={datos} />);
    expect(screen.getByText('Literal')).toBeDefined();
    expect(screen.getByText('Inferencia')).toBeDefined();
  });

  it('muestra porcentaje y total', () => {
    const datos = [
      { tipo: 'literal', label: 'Literal', porcentaje: 75, total: 12 },
    ];
    render(<RadarTipos datos={datos} />);
    expect(screen.getByText('75% (12 preg.)')).toBeDefined();
  });

  it('tiene role list para accesibilidad', () => {
    const datos = [
      { tipo: 'literal', label: 'Literal', porcentaje: 80, total: 5 },
    ];
    const { container } = render(<RadarTipos datos={datos} />);
    const list = container.querySelector('[role="list"]');
    expect(list).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// formatearDatosTipos
// ─────────────────────────────────────────────

describe('formatearDatosTipos', () => {
  it('convierte desglose a formato de componente', () => {
    const desglose = {
      literal: { total: 10, aciertos: 8, porcentaje: 80 },
      inferencia: { total: 5, aciertos: 3, porcentaje: 60 },
      vocabulario: { total: 7, aciertos: 2, porcentaje: 29 },
      resumen: { total: 3, aciertos: 3, porcentaje: 100 },
    };

    const result = formatearDatosTipos(desglose);
    expect(result).toHaveLength(4);
    expect(result[0].tipo).toBe('literal');
    expect(result[0].label).toBe('Literal');
    expect(result[0].porcentaje).toBe(80);
    expect(result[0].total).toBe(10);
  });

  it('usa labels en espanol', () => {
    const desglose = {
      inferencia: { total: 1, aciertos: 1, porcentaje: 100 },
      resumen: { total: 1, aciertos: 0, porcentaje: 0 },
    };

    const result = formatearDatosTipos(desglose);
    const infResult = result.find(r => r.tipo === 'inferencia');
    expect(infResult?.label).toBe('Inferencia');
    const resResult = result.find(r => r.tipo === 'resumen');
    expect(resResult?.label).toBe('Idea principal');
  });
});

// ─────────────────────────────────────────────
// LineaNivel
// ─────────────────────────────────────────────

describe('LineaNivel', () => {
  it('renderiza sin datos (estado vacio)', () => {
    render(<LineaNivel datos={[]} />);
    expect(screen.getByText('Sin cambios de nivel todavia')).toBeDefined();
  });

  it('renderiza SVG con puntos', () => {
    const datos = [
      { fecha: '2026-01-01', nivel: 2, direccion: 'subir', razon: 'Buena comprension' },
      { fecha: '2026-01-15', nivel: 2.5, direccion: 'subir', razon: 'Sigue mejorando' },
    ];
    const { container } = render(<LineaNivel datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('tiene atributo aria-label', () => {
    const datos = [
      { fecha: '2026-01-01', nivel: 3, direccion: 'mantener', razon: 'Estable' },
    ];
    const { container } = render(<LineaNivel datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toContain('nivel');
  });
});
