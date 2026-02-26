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


describe('DashboardHijo', () => {
  // ─────────────────────────────────────────────
  // Estado vacio (sin datos)
  // ─────────────────────────────────────────────

  it('renderiza estado vacio cuando resumen es null', () => {
    render(
      <DashboardHijo
        nombre="Juan"
        resumen={null}
      />
    );

    expect(screen.getByText(/Aun no hay datos de progreso/i)).toBeDefined();
  });

  it('muestra el nombre del nino en estado vacio', () => {
    render(
      <DashboardHijo
        nombre="Maria"
        resumen={null}
      />
    );

    // Heading is now "Vamos a leer!" and name appears in the CTA button
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toContain('Vamos a leer!');
    expect(screen.getByRole('link', { name: /Maria/i })).toBeDefined();
  });

  it('muestra boton para empezar a leer en estado vacio', () => {
    render(
      <DashboardHijo
        nombre="Juan"
        resumen={null}
      />
    );

    expect(screen.getByRole('link', { name: /Empezar a leer/i })).toBeDefined();
  });

  it('el boton de empezar apunta a /jugar/lectura', () => {
    render(
      <DashboardHijo
        nombre="Juan"
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
        resumen={resumen}
      />
    );

    // Heading is now "Vamos a leer!" and name appears in the CTA button
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toContain('Vamos a leer!');
    expect(screen.getByRole('link', { name: /Juan/i })).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Informacion del nino
  // ─────────────────────────────────────────────

  it('muestra el nombre del nino en el boton de lectura', () => {
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
        resumen={resumen}
      />
    );

    // Name now appears in the CTA button, age is no longer displayed
    expect(screen.getByRole('link', { name: /Carlos/i })).toBeDefined();
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
        resumen={resumen}
      />
    );

    // Indicator is now a CSS dot with bg-acierto class
    const greenDot = container.querySelector('.bg-acierto');
    expect(greenDot).toBeDefined();
    expect(greenDot).not.toBeNull();
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
        resumen={resumen}
      />
    );

    // Indicator is now a CSS dot with bg-neutro/30 class
    const grayDot = container.querySelector('[class*="bg-neutro"]');
    expect(grayDot).toBeDefined();
    expect(grayDot).not.toBeNull();
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
        resumen={resumen}
      />
    );

    expect(container.textContent).toContain('28');
    // Component now uses Lucide Star icon instead of emoji
    expect(screen.getByText('Estrellas')).toBeDefined();
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
        resumen={resumen}
      />
    );

    expect(container.textContent).toContain('16');
    // Component now uses Lucide Library icon instead of emoji
    expect(screen.getByText('Sesiones')).toBeDefined();
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
        resumen={resumen}
      />
    );

    expect(container.textContent).toContain('Juan Carlos Maria Rodriguez Garcia');
  });

  it('muestra labels de metricas (Lucide icons)', () => {
    const resumen = {
      sesionesHoy: 1,
      tiempoHoyMin: 20,
      totalEstrellas: 5,
      racha: 3,
      totalSesiones: 10,
      actividadMes: {},
    };

    render(
      <DashboardHijo
        nombre="Juan"
        resumen={resumen}
      />
    );

    // Component now uses Lucide icons with text labels instead of emojis
    expect(screen.getByText('Tiempo hoy')).toBeDefined();
    expect(screen.getByText('Racha')).toBeDefined();
    expect(screen.getByText('Estrellas')).toBeDefined();
    expect(screen.getByText('Sesiones')).toBeDefined();
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
        resumen={resumen}
      />
    );

    // No debe crashear, name appears in CTA button
    expect(container.textContent).toContain('Juan');
  });
});
