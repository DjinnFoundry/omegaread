/**
 * Tests de componentes React con @testing-library/react.
 *
 * Verifica rendering, estados, accesibilidad y props
 * de los componentes UI principales.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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
    expect(screen.getByText('Ups, algo salio mal')).toBeDefined();
  });

  it('tiene link para volver a /jugar por defecto', () => {
    render(
      <ErrorBoundaryNino>
        <ComponenteQueExplota />
      </ErrorBoundaryNino>
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/jugar');
  });

  it('usa rutaVolver custom cuando se proporciona', () => {
    render(
      <ErrorBoundaryNino rutaVolver="/padre/dashboard">
        <ComponenteQueExplota />
      </ErrorBoundaryNino>
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/padre/dashboard');
  });
});
