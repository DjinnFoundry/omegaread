/**
 * Tests de componentes React para Sprint 4.
 * PantallaLectura: botones de ajuste manual, estados de reescritura.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import PantallaLectura from '@/components/lectura/PantallaLectura';

// Mock del modulo de audio
vi.mock('@/lib/audio/sonidos', () => ({
  click: vi.fn(),
  celebracion: vi.fn(),
}));

const defaultProps = {
  titulo: 'El viaje de Luna',
  contenido: 'Luna era una gatita curiosa.\n\nUn dia fue al bosque.',
  topicEmoji: '🐱',
  topicNombre: 'Animales',
  nivel: 2,
  onTerminar: vi.fn(),
  onAjusteManual: vi.fn(),
  reescribiendo: false,
  ajusteUsado: false,
};

describe('PantallaLectura', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza titulo y contenido', () => {
    render(<PantallaLectura {...defaultProps} />);
    expect(screen.getByText('El viaje de Luna')).toBeDefined();
    expect(screen.getByText('Luna era una gatita curiosa.')).toBeDefined();
  });

  it('muestra topic y nivel', () => {
    render(<PantallaLectura {...defaultProps} />);
    expect(screen.getByText('Animales')).toBeDefined();
    expect(screen.getByText('Nivel 2')).toBeDefined();
  });

  it('no muestra botones de ajuste antes de 10 segundos', () => {
    render(<PantallaLectura {...defaultProps} />);
    expect(screen.queryByText('Hazlo mas facil')).toBeNull();
    expect(screen.queryByText('Hazlo mas desafiante')).toBeNull();
  });

  it('muestra botones de ajuste despues de 10 segundos', () => {
    render(<PantallaLectura {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(10_001);
    });
    expect(screen.getByText('Hazlo mas facil')).toBeDefined();
    expect(screen.getByText('Hazlo mas desafiante')).toBeDefined();
  });

  it('no muestra botones si ajusteUsado es true', () => {
    render(<PantallaLectura {...defaultProps} ajusteUsado={true} />);
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.queryByText('Hazlo mas facil')).toBeNull();
    expect(screen.queryByText('Hazlo mas desafiante')).toBeNull();
  });

  it('muestra indicador "Dificultad ajustada" cuando ajusteUsado', () => {
    render(<PantallaLectura {...defaultProps} ajusteUsado={true} />);
    expect(screen.getByText('Dificultad ajustada')).toBeDefined();
  });

  it('muestra spinner durante reescritura', () => {
    render(<PantallaLectura {...defaultProps} reescribiendo={true} />);
    expect(screen.getByText('Reescribiendo tu historia...')).toBeDefined();
  });

  it('deshabilita boton terminar durante reescritura', () => {
    render(<PantallaLectura {...defaultProps} reescribiendo={true} />);
    const btn = screen.getByLabelText('He terminado de leer');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('boton terminar funciona normalmente', () => {
    const onTerminar = vi.fn();
    render(<PantallaLectura {...defaultProps} onTerminar={onTerminar} />);
    const btn = screen.getByLabelText('He terminado de leer');
    btn.click();
    expect(onTerminar).toHaveBeenCalledTimes(1);
    expect(onTerminar).toHaveBeenCalledWith(expect.any(Number));
  });

  it('botones de ajuste tienen aria-labels correctos', () => {
    render(<PantallaLectura {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(10_001);
    });
    expect(screen.getByLabelText('Hazlo mas facil')).toBeDefined();
    expect(screen.getByLabelText('Hazlo mas desafiante')).toBeDefined();
  });

  it('boton mas_facil llama onAjusteManual con direccion correcta', () => {
    const onAjusteManual = vi.fn();
    render(
      <PantallaLectura {...defaultProps} onAjusteManual={onAjusteManual} />
    );
    act(() => {
      vi.advanceTimersByTime(10_001);
    });
    screen.getByLabelText('Hazlo mas facil').click();
    expect(onAjusteManual).toHaveBeenCalledWith('mas_facil', expect.any(Number));
  });

  it('boton mas_desafiante llama onAjusteManual con direccion correcta', () => {
    const onAjusteManual = vi.fn();
    render(
      <PantallaLectura {...defaultProps} onAjusteManual={onAjusteManual} />
    );
    act(() => {
      vi.advanceTimersByTime(10_001);
    });
    screen.getByLabelText('Hazlo mas desafiante').click();
    expect(onAjusteManual).toHaveBeenCalledWith('mas_desafiante', expect.any(Number));
  });

  it('no muestra botones si onAjusteManual no esta definido', () => {
    render(
      <PantallaLectura
        titulo={defaultProps.titulo}
        contenido={defaultProps.contenido}
        topicEmoji={defaultProps.topicEmoji}
        topicNombre={defaultProps.topicNombre}
        nivel={defaultProps.nivel}
        onTerminar={defaultProps.onTerminar}
      />
    );
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.queryByText('Hazlo mas facil')).toBeNull();
  });

  it('renderiza multiples parrafos correctamente', () => {
    const multiParrafo = ['Primer parrafo.', 'Segundo parrafo.', 'Tercer parrafo.'].join('\n\n');
    render(
      <PantallaLectura
        {...defaultProps}
        contenido={multiParrafo}
      />
    );
    expect(screen.getByText('Primer parrafo.')).toBeDefined();
    expect(screen.getByText('Segundo parrafo.')).toBeDefined();
    expect(screen.getByText('Tercer parrafo.')).toBeDefined();
  });
});
