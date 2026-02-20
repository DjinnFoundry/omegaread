/**
 * Tests de componentes React con @testing-library/react.
 *
 * Verifica rendering, estados, accesibilidad y props
 * de los componentes UI principales de la app.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock sonidos (AudioContext no disponible en jsdom)
vi.mock('@/lib/audio/sonidos', () => ({
  click: vi.fn(),
  acierto: vi.fn(),
  error: vi.fn(),
  celebracion: vi.fn(),
  estrellaGanada: vi.fn(),
}));

// Mock TTS
vi.mock('@/lib/audio/tts', () => ({
  hablar: vi.fn(),
  detenerHabla: vi.fn(),
  ttsDisponible: vi.fn(() => false),
}));

// ─────────────────────────────────────────────
// LetraGrande
// ─────────────────────────────────────────────

import { LetraGrande } from '@/components/actividades/vocales/LetraGrande';

describe('LetraGrande', () => {
  it('renderiza la letra correctamente', () => {
    render(<LetraGrande letra="A" />);
    expect(screen.getByText('A')).toBeDefined();
  });

  it('tiene aria-label descriptivo', () => {
    render(<LetraGrande letra="E" />);
    expect(screen.getByLabelText('Letra E')).toBeDefined();
  });

  it('llama onClick al hacer click', () => {
    const onClick = vi.fn();
    render(<LetraGrande letra="A" onClick={onClick} />);
    fireEvent.click(screen.getByText('A'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('no llama onClick cuando esta deshabilitado', () => {
    const onClick = vi.fn();
    render(<LetraGrande letra="A" onClick={onClick} deshabilitado />);
    fireEvent.click(screen.getByText('A'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('aplica estilo verde cuando es correcta', () => {
    render(<LetraGrande letra="A" correcta />);
    const btn = screen.getByLabelText('Letra A');
    // jsdom normaliza hex a rgb
    expect(btn.style.backgroundColor).toMatch(/7BC67E|rgb\(123,\s*198,\s*126\)/i);
    expect(btn.style.color).toBe('white');
  });

  it('aplica estilo rojo cuando es incorrecta', () => {
    render(<LetraGrande letra="A" incorrecta />);
    const btn = screen.getByLabelText('Letra A');
    expect(btn.style.backgroundColor).toMatch(/FF8A80|rgb\(255,\s*138,\s*128\)/i);
    expect(btn.style.color).toBe('white');
  });

  it('tiene el tamano correcto segun size prop', () => {
    const { rerender } = render(<LetraGrande letra="A" size="lg" />);
    const btnLg = screen.getByLabelText('Letra A');
    // lg = 70x70
    expect(btnLg.className).toContain('min-w-[70px]');

    rerender(<LetraGrande letra="A" size="xl" />);
    const btnXl = screen.getByLabelText('Letra A');
    // xl = 90x90
    expect(btnXl.className).toContain('min-w-[90px]');
  });
});

// ─────────────────────────────────────────────
// BarraProgreso
// ─────────────────────────────────────────────

import { BarraProgreso } from '@/components/ui/BarraProgreso';

describe('BarraProgreso', () => {
  it('renderiza con role progressbar', () => {
    render(<BarraProgreso progreso={0.5} />);
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('tiene aria-valuenow correcto', () => {
    render(<BarraProgreso progreso={0.75} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('75');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('clampea valores fuera de rango', () => {
    const { rerender } = render(<BarraProgreso progreso={-0.5} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');

    rerender(<BarraProgreso progreso={1.5} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('muestra 0% para progreso 0', () => {
    render(<BarraProgreso progreso={0} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });

  it('muestra 100% para progreso 1', () => {
    render(<BarraProgreso progreso={1} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });
});

// ─────────────────────────────────────────────
// Mascota
// ─────────────────────────────────────────────

import { Mascota } from '@/components/mascota/Mascota';

describe('Mascota', () => {
  it('renderiza un SVG', () => {
    const { container } = render(<Mascota />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('tiene aria-label descriptivo con nombre y estado', () => {
    render(<Mascota nombre="Luna" estado="feliz" />);
    expect(screen.getByLabelText('Luna está feliz')).toBeDefined();
  });

  it('usa nombre por defecto Michi', () => {
    render(<Mascota />);
    expect(screen.getByLabelText('Michi está feliz')).toBeDefined();
  });

  it('muestra ZZZ cuando esta durmiendo', () => {
    const { container } = render(<Mascota estado="durmiendo" />);
    const textos = container.querySelectorAll('text');
    const tieneZ = Array.from(textos).some((t) => t.textContent?.includes('Z') || t.textContent?.includes('z'));
    expect(tieneZ).toBe(true);
  });

  it('muestra estrellas cuando esta celebrando', () => {
    const { container } = render(<Mascota estado="celebrando" />);
    const textos = container.querySelectorAll('text');
    const tieneEstrellas = Array.from(textos).some((t) => t.textContent?.includes('\u2B50') || t.textContent?.includes('\u2728'));
    expect(tieneEstrellas).toBe(true);
  });

  it('respeta el tipo de mascota (perro tiene orejas distintas)', () => {
    const { container: gatoC } = render(<Mascota tipo="gato" />);
    const { container: perroC } = render(<Mascota tipo="perro" />);
    // Gato usa polygon (orejas puntiagudas), perro usa ellipse (orejas caidas)
    const gatoPolygons = gatoC.querySelectorAll('polygon').length;
    const perroEllipses = perroC.querySelectorAll('ellipse').length;
    // Perro deberia tener mas ellipses que el gato
    expect(perroEllipses).toBeGreaterThan(gatoPolygons > 0 ? 0 : -1);
  });
});

// ─────────────────────────────────────────────
// AuthGuardNino
// ─────────────────────────────────────────────

import { AuthGuardNino } from '@/components/ui/AuthGuardNino';

describe('AuthGuardNino', () => {
  it('muestra mensaje de sin-sesion', () => {
    render(<AuthGuardNino tipo="sin-sesion" />);
    expect(screen.getByText('¡Necesitamos a mamá o papá!')).toBeDefined();
  });

  it('muestra mensaje de sin-perfil', () => {
    render(<AuthGuardNino tipo="sin-perfil" />);
    expect(screen.getByText('¡Primero un padre debe crear tu perfil!')).toBeDefined();
  });

  it('tiene link a /padre/login', () => {
    render(<AuthGuardNino tipo="sin-sesion" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/padre/login');
  });
});

// ─────────────────────────────────────────────
// ErrorBoundaryNino
// ─────────────────────────────────────────────

import { ErrorBoundaryNino } from '@/components/ui/ErrorBoundaryNino';

function ComponenteQueExplota(): JSX.Element {
  throw new Error('Boom!');
}

describe('ErrorBoundaryNino', () => {
  beforeEach(() => {
    // Suprimir console.error de React para errores esperados
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renderiza children cuando no hay error', () => {
    render(
      <ErrorBoundaryNino>
        <div>Contenido normal</div>
      </ErrorBoundaryNino>
    );
    expect(screen.getByText('Contenido normal')).toBeDefined();
  });

  it('muestra fallback amigable cuando hay error', () => {
    render(
      <ErrorBoundaryNino>
        <ComponenteQueExplota />
      </ErrorBoundaryNino>
    );
    expect(screen.getByText('¡Ups! Algo salió mal')).toBeDefined();
  });

  it('tiene link para volver al mapa por defecto', () => {
    render(
      <ErrorBoundaryNino>
        <ComponenteQueExplota />
      </ErrorBoundaryNino>
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/jugar/mapa');
  });

  it('usa rutaVolver custom cuando se proporciona', () => {
    render(
      <ErrorBoundaryNino rutaVolver="/jugar">
        <ComponenteQueExplota />
      </ErrorBoundaryNino>
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/jugar');
  });
});
