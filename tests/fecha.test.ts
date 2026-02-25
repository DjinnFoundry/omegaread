/**
 * Tests para utilidades de fecha.
 *
 * Verifica:
 * 1. calcularEdad: calculo correcto, cumpleanos, casos limites
 * 2. Entrada como Date o string
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { vi } from 'vitest';
import { calcularEdad } from '@/lib/utils/fecha';

// Freeze time at 2026-02-25 for all tests
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-25'));
});

afterAll(() => {
  vi.useRealTimers();
});

// ─────────────────────────────────────────────
// calcularEdad: Calculo basico
// ─────────────────────────────────────────────

describe('calcularEdad', () => {
  it('calcula edad correcta para nino nacido en 2019 (ahora en 2026)', () => {
    // Hoy es 2026-02-25 (segun memory)
    const nacimiento = new Date('2019-02-25');
    const edad = calcularEdad(nacimiento);

    // Deberia ser 7 anos si ya paso el cumpleanos (25 Feb)
    // o 6 anos si no paso aun (pero hoy es 25 Feb, asi que paso)
    expect(edad).toBe(7);
  });

  it('calcula edad correcta para nino nacido hace 6 anos', () => {
    // Hoy es 2026-02-25
    const hace6Anos = new Date('2020-02-25');
    const edad = calcularEdad(hace6Anos);

    expect(edad).toBe(6);
  });

  it('calcula edad correcta para nino muy joven (< 1 ano)', () => {
    // Hoy es 2026-02-25
    const nacimiento = new Date('2025-12-01'); // 3 meses atras
    const edad = calcularEdad(nacimiento);

    expect(edad).toBe(0);
  });

  it('retorna 0 para nino nacido hace pocas semanas', () => {
    // Hoy es 2026-02-25
    const nacimiento = new Date('2026-02-20'); // Hace 5 dias
    const edad = calcularEdad(nacimiento);

    expect(edad).toBe(0);
  });
});

// ─────────────────────────────────────────────
// calcularEdad: Cumpleanos
// ─────────────────────────────────────────────

describe('calcularEdad - Cumpleanos', () => {
  it('retorna edad correcta cuando ya paso el cumpleanos este ano', () => {
    // Hoy es 2026-02-25
    // Nino nacio el 2020-02-01 (cumpleanos ya paso)
    const nacimiento = new Date('2020-02-01');
    const edad = calcularEdad(nacimiento);

    expect(edad).toBe(6);
  });

  it('retorna edad - 1 cuando el cumpleanos todavia no llega este ano', () => {
    // Hoy es 2026-02-25
    // Nino nacio el 2020-03-25 (cumpleanos no ha llegado)
    const nacimiento = new Date('2020-03-25');
    const edad = calcularEdad(nacimiento);

    expect(edad).toBe(5); // No llego al cumpleanos, asi que 5 anos
  });

  it('retorna edad correcta en el dia exacto del cumpleanos', () => {
    // Hoy es 2026-02-25
    // Nino nacio el 2019-02-25 (hoy es su cumpleanos)
    const nacimiento = new Date('2019-02-25');
    const edad = calcularEdad(nacimiento);

    expect(edad).toBe(7); // Hoy completa 7 anos
  });

  it('retorna edad - 1 un dia antes del cumpleanos', () => {
    // Hoy es 2026-02-25
    // Nino nacio el 2020-02-26 (cumpleanos es manana)
    const nacimiento = new Date('2020-02-26');
    const edad = calcularEdad(nacimiento);

    expect(edad).toBe(5); // Manana cumple 6, pero aun no
  });
});

// ─────────────────────────────────────────────
// calcularEdad: Entrada como Date vs string
// ─────────────────────────────────────────────

describe('calcularEdad - Entrada como Date o string', () => {
  it('acepta entrada como Date', () => {
    const nacimiento = new Date('2019-02-25');
    const edad = calcularEdad(nacimiento);

    expect(typeof edad).toBe('number');
    expect(edad).toBe(7);
  });

  it('acepta entrada como string ISO', () => {
    const edad = calcularEdad('2019-02-25');

    expect(typeof edad).toBe('number');
    expect(edad).toBe(7);
  });

  it('acepta entrada como string con hora', () => {
    const edad = calcularEdad('2019-02-25T12:30:00');

    expect(typeof edad).toBe('number');
    expect(edad).toBe(7);
  });

  it('retorna el mismo resultado para Date y string equivalentes', () => {
    const edadDate = calcularEdad(new Date('2020-06-15'));
    const edadString = calcularEdad('2020-06-15');

    expect(edadDate).toBe(edadString);
  });
});

// ─────────────────────────────────────────────
// calcularEdad: Edge cases
// ─────────────────────────────────────────────

describe('calcularEdad - Edge cases', () => {
  it('maneja nino nacido el 29 de febrero (ano bisiesto)', () => {
    // Nino nacio el 2020-02-29 (ano bisiesto)
    // Hoy es 2026-02-25 (no ano bisiesto, cumpleanos es en 4 dias)
    const nacimiento = new Date('2020-02-29');
    const edad = calcularEdad(nacimiento);

    expect(edad).toBe(5); // Todavia no llego al 29 (o al 28 si es non-bisiesto)
  });

  it('calcula edad correcta para nino nacido hace muchos anos', () => {
    const nacimiento = new Date('1990-01-15');
    const edad = calcularEdad(nacimiento);

    expect(edad).toBeGreaterThan(30);
    expect(edad).toBeLessThanOrEqual(36);
  });

  it('retorna 0 para fecha de nacimiento hoy', () => {
    const hoy = new Date('2026-02-25');
    const edad = calcularEdad(hoy);

    expect(edad).toBe(0);
  });

  it('retorna numero entero siempre', () => {
    const nacimiento = new Date('2020-02-25');
    const edad = calcularEdad(nacimiento);

    expect(Number.isInteger(edad)).toBe(true);
  });

  it('retorna numero no negativo', () => {
    const nacimiento = new Date('2019-02-25');
    const edad = calcularEdad(nacimiento);

    expect(edad).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────
// calcularEdad: Casos especiales de mes y dia
// ─────────────────────────────────────────────

describe('calcularEdad - Casos especiales de mes y dia', () => {
  it('maneja enero (mes anterior actual)', () => {
    // Nino nacio el 2020-01-25 (enero, cumpleanos paso)
    const nacimiento = new Date('2020-01-25');
    const edad = calcularEdad(nacimiento);

    expect(edad).toBe(6);
  });

  it('maneja diciembre (mes siguiente actual en contexto circular)', () => {
    // Nino nacio el 2020-12-25 (diciembre, cumpleanos es en octubre)
    const nacimiento = new Date('2020-12-25');
    const edad = calcularEdad(nacimiento);

    // Hoy es 2026-02-25, nino nacio en 2020-12-25
    // Edad = 2026 - 2020 = 6, pero el cumpleanos (12-25) ya paso este ano
    expect(edad).toBe(5); // No, cumpleanos es en diciembre, que ya paso (Feb > Dic en el ano anterior)
  });

  it('calcula edad para nino nacido en ultimo dia del mes', () => {
    const nacimiento = new Date('2020-01-31');
    const edad = calcularEdad(nacimiento);

    expect(typeof edad).toBe('number');
  });
});
