/**
 * Tests de componentes React para PantallaLectura.
 * Cubre UX actual: menu compacto, proteccion anti finish instantaneo
 * y preferencias de accesibilidad.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import PantallaLectura from '@/components/lectura/PantallaLectura';

const baseProps = {
  titulo: 'El viaje de Luna',
  contenido: 'Luna era una gatita curiosa.\n\nUn dia fue al bosque.',
  nivel: 2,
  onTerminar: vi.fn(),
};

describe('PantallaLectura', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza titulo y contenido por parrafos', () => {
    render(<PantallaLectura {...baseProps} />);
    expect(screen.getByText('El viaje de Luna')).toBeDefined();
    expect(screen.getByText('Luna era una gatita curiosa.')).toBeDefined();
    expect(screen.getByText('Un dia fue al bosque.')).toBeDefined();
  });

  it('muestra indicador de pagina y boton de menu', () => {
    render(<PantallaLectura {...baseProps} />);
    expect(screen.getAllByText('1 / 1').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Abrir opciones de lectura')).toBeDefined();
  });

  it('no permite terminar inmediatamente', () => {
    render(<PantallaLectura {...baseProps} />);
    expect(screen.queryByLabelText('He terminado de leer')).toBeNull();
    expect(screen.getByText('Tomate tu tiempo para leer...')).toBeDefined();
  });

  it('habilita terminar tras el delay y llama onTerminar con wpmData', () => {
    const calls: Array<[number, unknown]> = [];
    const onTerminar = (tiempoMs: number, wpmData: unknown) => {
      calls.push([tiempoMs, wpmData]);
    };
    render(<PantallaLectura {...baseProps} onTerminar={onTerminar} />);

    act(() => {
      vi.advanceTimersByTime(16_000);
    });

    fireEvent.click(screen.getByLabelText('He terminado de leer'));

    expect(calls.length).toBe(1);
    expect(calls[0]?.[0]).toEqual(expect.any(Number));
    expect(calls[0]?.[1]).toEqual(
      expect.objectContaining({
        wpmPromedio: expect.any(Number),
        wpmPorPagina: expect.any(Array),
        totalPaginas: expect.any(Number),
      }),
    );
  });

  it('abre el menu y permite cambiar fuente', () => {
    render(<PantallaLectura {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Abrir opciones de lectura'));
    expect(screen.getByText('Opciones de lectura')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Dislexia' }));
    expect(window.localStorage.setItem).toHaveBeenCalledWith('omegaread.reading-font', 'dislexia');
  });

  it('aplica preferencia de fuente dislexia desde perfil', () => {
    render(<PantallaLectura {...baseProps} preferenciaFuente="dislexia" />);
    const primerParrafo = screen.getByText('Luna era una gatita curiosa.');
    expect(primerParrafo.getAttribute('style')).toContain('var(--font-lectura-dislexia)');
  });

  it('aplica estilos de accesibilidad para modo TDAH y alto contraste', () => {
    const { container } = render(
      <PantallaLectura
        {...baseProps}
        preferenciasAccesibilidad={{ modoTDAH: true, altoContraste: true }}
      />,
    );

    const primerParrafo = screen.getByText('Luna era una gatita curiosa.');
    expect(primerParrafo.getAttribute('style')).toContain('line-height: 2.05');
    expect(primerParrafo.getAttribute('style')).toContain('letter-spacing: 0.02em');

    const bloqueLectura = container.querySelector('.border-black');
    expect(bloqueLectura).toBeDefined();
  });

  it('ya no muestra controles de ajuste manual de dificultad', () => {
    render(
      <PantallaLectura
        {...baseProps}
        // Props legacy ignoradas en la UX actual
        onAjusteManual={vi.fn()}
        ajusteUsado={false}
        reescribiendo={false}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(16_000);
    });
    expect(screen.queryByText('Hazlo mas facil')).toBeNull();
    expect(screen.queryByText('Hazlo mas desafiante')).toBeNull();
  });
});
