/**
 * Tests para DashboardHijo component.
 * Verifica el dashboard de seguimiento de lectura de un hijo.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardHijo } from '@/components/dashboard/DashboardHijo';

// Mock de next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));

// Mock de utilidades de fecha
vi.mock('@/lib/utils/fecha', () => ({
  calcularEdad: (fecha: Date | string) => {
    // Parse fecha if it's a string
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    // Fixed date: 2026-02-25
    const hoy = new Date('2026-02-25');
    let edad = hoy.getFullYear() - fechaObj.getFullYear();
    const m = hoy.getMonth() - fechaObj.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fechaObj.getDate())) {
      edad--;
    }
    return edad;
  },
}));

describe('DashboardHijo', () => {
  // ─────────────────────────────────────────────
  // Estado vacio (sin datos)
  // ─────────────────────────────────────────────

  it('renderiza estado vacio cuando resumen es null', () => {
    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={null}
      />
    );

    expect(screen.getByText(/Aun no hay datos de progreso/i)).toBeDefined();
  });

  it('muestra el nombre del nino en estado vacio', () => {
    render(
      <DashboardHijo
        nombre="Maria"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={null}
      />
    );

    const heading = screen.getByRole('heading');
    expect(heading.textContent).toContain('Maria');
  });

  it('muestra boton para empezar a leer en estado vacio', () => {
    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={null}
      />
    );

    expect(screen.getByRole('link', { name: /Empezar a leer/i })).toBeDefined();
  });

  it('el boton de empezar apunta a /jugar/lectura', () => {
    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={null}
      />
    );

    const link = screen.getByRole('link', { name: /Empezar a leer/i });
    expect(link.getAttribute('href')).toBe('/jugar/lectura');
  });

  // ─────────────────────────────────────────────
  // Renderizado con datos
  // ─────────────────────────────────────────────

  it('renderiza tarjeta con datos cuando resumen es valido', () => {
    const resumen = {
      sesionesHoy: 2,
      tiempoHoyMin: 45,
      totalEstrellas: 12,
      racha: 5,
      totalSesiones: 24,
      actividadMes: {
        '2026-02-01': 1,
        '2026-02-02': 0,
        '2026-02-03': 2,
      },
    };

    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    const heading = screen.getByRole('heading');
    expect(heading.textContent).toContain('Juan');
  });

  // ─────────────────────────────────────────────
  // Informacion del nino
  // ─────────────────────────────────────────────

  it('muestra el nombre del nino con su edad', () => {
    const resumen = {
      sesionesHoy: 0,
      tiempoHoyMin: 0,
      totalEstrellas: 5,
      racha: 0,
      totalSesiones: 3,
      actividadMes: {},
    };

    render(
      <DashboardHijo
        nombre="Carlos"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    // Debe mostrar nombre y edad (hoy 2026-02-25, cumpleaños en 2018-06-15, aun no cumple 8)
    expect(screen.getByText(/Carlos.*7.*anos/)).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Sesiones de hoy
  // ─────────────────────────────────────────────

  it('muestra sesiones realizadas hoy', () => {
    const resumen = {
      sesionesHoy: 2,
      tiempoHoyMin: 30,
      totalEstrellas: 10,
      racha: 3,
      totalSesiones: 15,
      actividadMes: {},
    };

    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    expect(screen.getByText(/2 sesiones hoy/i)).toBeDefined();
  });

  it('muestra indicador verde cuando hay sesiones hoy', () => {
    const resumen = {
      sesionesHoy: 1,
      tiempoHoyMin: 10,
      totalEstrellas: 3,
      racha: 1,
      totalSesiones: 5,
      actividadMes: {},
    };

    const { container } = render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    const greenIndicator = container.textContent?.includes('🟢');
    expect(greenIndicator).toBe(true);
  });

  it('muestra indicador gris cuando no hay sesiones hoy', () => {
    const resumen = {
      sesionesHoy: 0,
      tiempoHoyMin: 0,
      totalEstrellas: 5,
      racha: 0,
      totalSesiones: 10,
      actividadMes: {},
    };

    const { container } = render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    const grayIndicator = container.textContent?.includes('⚪');
    expect(grayIndicator).toBe(true);
  });

  // ─────────────────────────────────────────────
  // Metricas principales
  // ─────────────────────────────────────────────

  it('muestra tiempo dedicado hoy en minutos', () => {
    const resumen = {
      sesionesHoy: 2,
      tiempoHoyMin: 45,
      totalEstrellas: 15,
      racha: 4,
      totalSesiones: 20,
      actividadMes: {},
    };

    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    expect(screen.getByText('45')).toBeDefined();
    expect(screen.getByText(/min/)).toBeDefined();
  });

  it('muestra racha de dias consecutivos', () => {
    const resumen = {
      sesionesHoy: 1,
      tiempoHoyMin: 20,
      totalEstrellas: 8,
      racha: 7,
      totalSesiones: 12,
      actividadMes: {},
    };

    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText(/dias/i)).toBeDefined();
  });

  it('muestra total de estrellas ganadas', () => {
    const resumen = {
      sesionesHoy: 1,
      tiempoHoyMin: 15,
      totalEstrellas: 28,
      racha: 5,
      totalSesiones: 18,
      actividadMes: {},
    };

    const { container } = render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    expect(container.textContent).toContain('28');
    expect(container.textContent).toContain('⭐');
  });

  it('muestra total de sesiones completadas', () => {
    const resumen = {
      sesionesHoy: 0,
      tiempoHoyMin: 0,
      totalEstrellas: 10,
      racha: 0,
      totalSesiones: 16,
      actividadMes: {},
    };

    const { container } = render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    expect(container.textContent).toContain('16');
    expect(container.textContent).toContain('📚');
  });

  // ─────────────────────────────────────────────
  // Heatmap mensual
  // ─────────────────────────────────────────────

  it('renderiza heatmap mensual', () => {
    const resumen = {
      sesionesHoy: 1,
      tiempoHoyMin: 20,
      totalEstrellas: 5,
      racha: 1,
      totalSesiones: 5,
      actividadMes: {
        '2026-02-01': 1,
        '2026-02-02': 2,
        '2026-02-03': 0,
        '2026-02-04': 1,
      },
    };

    const { container } = render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    // El heatmap debe tener celdas (divs con clase que indique el color)
    const celdas = container.querySelectorAll('[class*="bg-"]');
    expect(celdas.length).toBeGreaterThan(0);
  });

  it('heatmap incluye titulo del mes', () => {
    const resumen = {
      sesionesHoy: 0,
      tiempoHoyMin: 0,
      totalEstrellas: 0,
      racha: 0,
      totalSesiones: 0,
      actividadMes: {},
    };

    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    // Debe mostrar uno de los meses
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const meshown = meses.find(mes => screen.queryByText(mes));
    expect(meshown).toBeDefined();
  });

  it('heatmap muestra leyenda de intensidad', () => {
    const resumen = {
      sesionesHoy: 0,
      tiempoHoyMin: 0,
      totalEstrellas: 0,
      racha: 0,
      totalSesiones: 0,
      actividadMes: {},
    };

    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    expect(screen.getByText('Menos')).toBeDefined();
    expect(screen.getByText('Mas')).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Botones y navegacion
  // ─────────────────────────────────────────────

  it('muestra boton para ir a leer', () => {
    const resumen = {
      sesionesHoy: 1,
      tiempoHoyMin: 20,
      totalEstrellas: 5,
      racha: 1,
      totalSesiones: 3,
      actividadMes: {},
    };

    render(
      <DashboardHijo
        nombre="Sofia"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    expect(screen.getByRole('link', { name: /Ir a leer con Sofia/i })).toBeDefined();
  });

  it('boton leer apunta a /jugar/lectura', () => {
    const resumen = {
      sesionesHoy: 0,
      tiempoHoyMin: 0,
      totalEstrellas: 0,
      racha: 0,
      totalSesiones: 0,
      actividadMes: {},
    };

    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    const link = screen.getByRole('link', { name: /Ir a leer/i });
    expect(link.getAttribute('href')).toBe('/jugar/lectura');
  });

  // ─────────────────────────────────────────────
  // Casos especiales
  // ─────────────────────────────────────────────

  it('maneja racha de 0 correctamente', () => {
    const resumen = {
      sesionesHoy: 0,
      tiempoHoyMin: 0,
      totalEstrellas: 5,
      racha: 0,
      totalSesiones: 10,
      actividadMes: {},
    };

    const { container } = render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    expect(container.textContent).toContain('0');
  });

  it('maneja tiempos altos (100+ minutos hoy)', () => {
    const resumen = {
      sesionesHoy: 5,
      tiempoHoyMin: 180,
      totalEstrellas: 50,
      racha: 10,
      totalSesiones: 100,
      actividadMes: {},
    };

    render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    expect(screen.getByText('180')).toBeDefined();
  });

  it('renderiza correctamente con nombres largos', () => {
    const resumen = {
      sesionesHoy: 1,
      tiempoHoyMin: 20,
      totalEstrellas: 5,
      racha: 1,
      totalSesiones: 5,
      actividadMes: {},
    };

    const { container } = render(
      <DashboardHijo
        nombre="Juan Carlos Maria Rodriguez Garcia"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    expect(container.textContent).toContain('Juan Carlos Maria Rodriguez Garcia');
  });

  it('muestra emojis de metricas (iconos)', () => {
    const resumen = {
      sesionesHoy: 1,
      tiempoHoyMin: 20,
      totalEstrellas: 5,
      racha: 3,
      totalSesiones: 10,
      actividadMes: {},
    };

    const { container } = render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    // Debe haber emojis para tiempo, racha, estrellas, sesiones
    const content = container.textContent || '';
    expect(content).toContain('⏱️');
    expect(content).toContain('🔥');
    expect(content).toContain('⭐');
    expect(content).toContain('📚');
  });

  it('maneja actividad mes vacia', () => {
    const resumen = {
      sesionesHoy: 0,
      tiempoHoyMin: 0,
      totalEstrellas: 0,
      racha: 0,
      totalSesiones: 0,
      actividadMes: {},
    };

    const { container } = render(
      <DashboardHijo
        nombre="Juan"
        fechaNacimiento={new Date('2018-06-15')}
        resumen={resumen}
      />
    );

    // No debe crashear
    expect(container.textContent).toContain('Juan');
  });
});
