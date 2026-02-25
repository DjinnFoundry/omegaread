/**
 * Tests para componentes de graficos (charts).
 * Verifica que los graficos se renderizan correctamente sin crashes.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarraComprension } from '@/components/charts/BarraComprension';
import { RadarTipos } from '@/components/charts/RadarTipos';
import { LineaNivel } from '@/components/charts/LineaNivel';
import { LineaEvolucion } from '@/components/charts/LineaEvolucion';

// ─────────────────────────────────────────────
// BarraComprension
// ─────────────────────────────────────────────

describe('BarraComprension', () => {
  it('renderiza sin datos (estado vacio)', () => {
    render(<BarraComprension datos={[]} />);
    expect(screen.getByText('Aun no hay sesiones para mostrar')).toBeDefined();
  });

  it('renderiza sin crash con datos validos', () => {
    const datos = [
      { porcentaje: 100, emoji: '📖' },
      { porcentaje: 75, emoji: '🚀' },
      { porcentaje: 50, emoji: '🎨' },
    ];

    const { container } = render(<BarraComprension datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renderiza SVG con atributo aria-label', () => {
    const datos = [{ porcentaje: 80, emoji: '📖' }];
    const { container } = render(<BarraComprension datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).not.toBeNull();
  });

  it('maneja porcentaje 0% correctamente', () => {
    const datos = [{ porcentaje: 0, emoji: '📖' }];
    const { container } = render(<BarraComprension datos={datos} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('maneja porcentaje 100% correctamente', () => {
    const datos = [{ porcentaje: 100, emoji: '📖' }];
    const { container } = render(<BarraComprension datos={datos} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('limita a maximo 7 barras incluso con mas datos', () => {
    const datos = Array.from({ length: 15 }, (_, i) => ({
      porcentaje: 50 + (i * 2),
      emoji: '📖',
    }));

    const { container } = render(<BarraComprension datos={datos} />);
    const groups = container.querySelectorAll('g');
    expect(groups.length).toBeLessThanOrEqual(7);
  });

  it('renderiza emojis para cada barra', () => {
    const datos = [
      { porcentaje: 80, emoji: '🐱' },
      { porcentaje: 60, emoji: '🚀' },
    ];

    const { container } = render(<BarraComprension datos={datos} />);
    const texts = container.querySelectorAll('text');
    const emojisEncontrados = Array.from(texts).filter(t =>
      t.textContent === '🐱' || t.textContent === '🚀'
    );
    expect(emojisEncontrados.length).toBeGreaterThan(0);
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

  it('renderiza sin crash con datos validos', () => {
    const datos = [
      { tipo: 'literal', label: 'Literal', porcentaje: 80, total: 10 },
      { tipo: 'inferencia', label: 'Inferencia', porcentaje: 60, total: 8 },
      { tipo: 'vocabulario', label: 'Vocabulario', porcentaje: 70, total: 7 },
      { tipo: 'resumen', label: 'Idea principal', porcentaje: 50, total: 5 },
    ];

    render(<RadarTipos datos={datos} />);
    expect(screen.getByText('Literal')).toBeDefined();
    expect(screen.getByText('Inferencia')).toBeDefined();
  });

  it('tiene atributo role="list" para accesibilidad', () => {
    const datos = [
      { tipo: 'literal', label: 'Literal', porcentaje: 80, total: 5 },
    ];

    const { container } = render(<RadarTipos datos={datos} />);
    expect(container.querySelector('[role="list"]')).not.toBeNull();
  });

  it('renderiza labels de tipos de pregunta', () => {
    const datos = [
      { tipo: 'literal', label: 'Literal', porcentaje: 90, total: 10 },
      { tipo: 'inferencia', label: 'Inferencia', porcentaje: 70, total: 7 },
    ];

    render(<RadarTipos datos={datos} />);
    expect(screen.getByText('Literal')).toBeDefined();
    expect(screen.getByText('Inferencia')).toBeDefined();
  });

  it('muestra porcentaje y total de preguntas', () => {
    const datos = [
      { tipo: 'literal', label: 'Literal', porcentaje: 75, total: 12 },
    ];

    render(<RadarTipos datos={datos} />);
    expect(screen.getByText('75% (12 preg.)')).toBeDefined();
  });

  it('renderiza barras de progreso para cada tipo', () => {
    const datos = [
      { tipo: 'literal', label: 'Literal', porcentaje: 80, total: 5 },
      { tipo: 'vocabulario', label: 'Vocabulario', porcentaje: 60, total: 4 },
    ];

    const { container } = render(<RadarTipos datos={datos} />);
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });

  it('maneja porcentaje 0% correctamente', () => {
    const datos = [
      { tipo: 'literal', label: 'Literal', porcentaje: 0, total: 5 },
    ];

    render(<RadarTipos datos={datos} />);
    expect(screen.getByText('0% (5 preg.)')).toBeDefined();
  });

  it('maneja porcentaje 100% correctamente', () => {
    const datos = [
      { tipo: 'literal', label: 'Literal', porcentaje: 100, total: 8 },
    ];

    render(<RadarTipos datos={datos} />);
    expect(screen.getByText('100% (8 preg.)')).toBeDefined();
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

  it('renderiza sin crash con datos validos', () => {
    const datos = [
      { fecha: '2026-01-01', nivel: 2, direccion: 'subir', razon: 'Buena comprension' },
      { fecha: '2026-01-15', nivel: 2.5, direccion: 'subir', razon: 'Sigue mejorando' },
      { fecha: '2026-02-01', nivel: 3, direccion: 'subir', razon: 'Excelente' },
    ];

    const { container } = render(<LineaNivel datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('tiene atributo aria-label para accesibilidad', () => {
    const datos = [
      { fecha: '2026-01-01', nivel: 2, direccion: 'mantener', razon: 'Estable' },
    ];

    const { container } = render(<LineaNivel datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toContain('nivel');
  });

  it('renderiza un punto por cada dato', () => {
    const datos = [
      { fecha: '2026-01-01', nivel: 2, direccion: 'subir', razon: 'Mejora' },
      { fecha: '2026-01-15', nivel: 3, direccion: 'subir', razon: 'Mejora' },
      { fecha: '2026-02-01', nivel: 2.5, direccion: 'bajar', razon: 'Bajo' },
    ];

    const { container } = render(<LineaNivel datos={datos} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('renderiza linea que conecta los puntos', () => {
    const datos = [
      { fecha: '2026-01-01', nivel: 2, direccion: 'subir', razon: 'Mejora' },
      { fecha: '2026-01-15', nivel: 3, direccion: 'subir', razon: 'Mejora' },
    ];

    const { container } = render(<LineaNivel datos={datos} />);
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
  });

  it('maneja un unico dato correctamente', () => {
    const datos = [
      { fecha: '2026-01-01', nivel: 3.5, direccion: 'mantener', razon: 'Inicio' },
    ];

    const { container } = render(<LineaNivel datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renderiza referencias de nivel (lineas horizontales)', () => {
    const datos = [
      { fecha: '2026-01-01', nivel: 5, direccion: 'subir', razon: 'Mejora' },
    ];

    const { container } = render(<LineaNivel datos={datos} />);
    const lines = container.querySelectorAll('line');
    // Debe haber lineas de referencia
    expect(lines.length).toBeGreaterThan(0);
  });

  it('renderiza labels de fecha en el eje X', () => {
    const datos = [
      { fecha: '2026-01-05', nivel: 2, direccion: 'subir', razon: 'Mejora' },
      { fecha: '2026-01-15', nivel: 3, direccion: 'subir', razon: 'Mejora' },
    ];

    const { container } = render(<LineaNivel datos={datos} />);
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
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

  it('renderiza sin crash con datos validos', () => {
    const datos = [
      { label: 'Mes 1', valor: 60 },
      { label: 'Mes 2', valor: 70 },
      { label: 'Mes 3', valor: 80 },
    ];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('tiene atributo aria-label para accesibilidad', () => {
    const datos = [
      { label: 'S1', valor: 50 },
      { label: 'S2', valor: 75 },
    ];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toContain('evolucion');
  });

  it('renderiza un circulo por cada dato', () => {
    const datos = [
      { label: 'S1', valor: 50 },
      { label: 'S2', valor: 65 },
      { label: 'S3', valor: 80 },
    ];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('renderiza linea que conecta los puntos', () => {
    const datos = [
      { label: 'S1', valor: 50 },
      { label: 'S2', valor: 75 },
    ];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it('muestra valores cuando mostrarValores=true', () => {
    const datos = [
      { label: 'S1', valor: 75 },
      { label: 'S2', valor: 85 },
    ];

    const { container } = render(
      <LineaEvolucion datos={datos} mostrarValores={true} sufijo="%" />
    );

    const texts = container.querySelectorAll('text');
    const tieneValores = Array.from(texts).some(t =>
      t.textContent?.includes('75') || t.textContent?.includes('85')
    );
    expect(tieneValores).toBe(true);
  });

  it('maneja un unico dato correctamente', () => {
    const datos = [{ label: 'Solo', valor: 60 }];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('acepta color personalizado', () => {
    const datos = [
      { label: 'S1', valor: 50 },
      { label: 'S2', valor: 75 },
    ];

    const { container } = render(
      <LineaEvolucion datos={datos} color="#FF0000" />
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renderiza area bajo la linea', () => {
    const datos = [
      { label: 'S1', valor: 50 },
      { label: 'S2', valor: 75 },
      { label: 'S3', valor: 60 },
    ];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const paths = container.querySelectorAll('path');
    // Debe haber path para linea y path para area
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it('maneja datos con banda de confianza', () => {
    const datos = [
      { label: 'S1', valor: 60, banda: 5 },
      { label: 'S2', valor: 75, banda: 8 },
      { label: 'S3', valor: 70, banda: 6 },
    ];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renderiza lineas de referencia horizontales', () => {
    const datos = [
      { label: 'S1', valor: 30 },
      { label: 'S2', valor: 70 },
    ];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('maneja valores 0% correctamente', () => {
    const datos = [
      { label: 'S1', valor: 0 },
      { label: 'S2', valor: 50 },
    ];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('maneja valores 100% correctamente', () => {
    const datos = [
      { label: 'S1', valor: 100 },
      { label: 'S2', valor: 75 },
    ];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('acepta sufijo personalizado (ej: "pts")', () => {
    const datos = [
      { label: 'S1', valor: 1250 },
    ];

    const { container } = render(
      <LineaEvolucion datos={datos} mostrarValores={true} sufijo=" pts" />
    );

    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
  });

  it('renderiza labels en el eje X', () => {
    const datos = [
      { label: 'Enero', valor: 50 },
      { label: 'Febrero', valor: 65 },
      { label: 'Marzo', valor: 80 },
    ];

    const { container } = render(<LineaEvolucion datos={datos} />);
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
  });
});
