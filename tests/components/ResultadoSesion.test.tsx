/**
 * Tests para ResultadoSesion component.
 * Verifica la pantalla final con estrellas, mensaje y opciones para compartir.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResultadoSesion from '@/components/lectura/ResultadoSesion';

// Mock de Celebracion
vi.mock('@/components/ui/Celebracion', () => ({
  Celebracion: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="celebracion">Celebración</div> : null,
}));

describe('ResultadoSesion', () => {
  let onLeerOtraMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onLeerOtraMock = vi.fn();
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    });
  });

  // ─────────────────────────────────────────────
  // Renderizado basico
  // ─────────────────────────────────────────────

  it('renderiza componente correctamente', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    const { container } = render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(container.textContent).toContain('Juan');
  });

  // ─────────────────────────────────────────────
  // Estrellas
  // ─────────────────────────────────────────────

  it('renderiza el numero correcto de estrellas llenas', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    const { container } = render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    const estrellas = container.querySelectorAll('span');
    const estrellasEmoji = Array.from(estrellas).filter(s => s.textContent === '⭐');
    // Deberia haber 3 estrellas totales: 2 llenas + 1 vacia
    expect(estrellasEmoji.length).toBe(3);
  });

  it('muestra 3 estrellas cuando aciertos = 4/4', () => {
    const resultado = {
      aciertos: 4,
      totalPreguntas: 4,
      estrellas: 3,
    };

    const { container } = render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    // Debe haber 3 estrellas
    const estrellas = container.querySelectorAll('span');
    const estrellasEmoji = Array.from(estrellas).filter(s => s.textContent === '⭐');
    expect(estrellasEmoji.length).toBe(3);
  });

  it('muestra estrellas grises cuando el conteo es bajo', () => {
    const resultado = {
      aciertos: 1,
      totalPreguntas: 4,
      estrellas: 0,
    };

    const { container } = render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    // Debe mostrar estrellas con opacidad
    const estrellas = container.querySelectorAll('span');
    const estrellasVacias = Array.from(estrellas).filter(s =>
      s.className.includes('opacity-20')
    );
    expect(estrellasVacias.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────
  // Mensajes motivacionales
  // ─────────────────────────────────────────────

  it('muestra un mensaje motivacional que incluye el nombre del estudiante', () => {
    const resultado = {
      aciertos: 4,
      totalPreguntas: 4,
      estrellas: 3,
    };

    const { container } = render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Carlos"
        onLeerOtra={onLeerOtraMock}
      />
    );

    // El nombre está embebido en el mensaje de motivación
    expect(container.textContent).toContain('Carlos');
  });

  it('muestra diferentes mensajes para diferentes desempenios', () => {
    // Excelente (4/4)
    const { unmount } = render(
      <ResultadoSesion
        resultado={{ aciertos: 4, totalPreguntas: 4, estrellas: 3 }}
        studentNombre="Maria"
        onLeerOtra={onLeerOtraMock}
      />
    );

    const textContent1 = document.body.textContent;
    expect(textContent1?.toLowerCase()).toMatch(/increible|fantastico|genial/i);

    unmount();

    // Regular (1/4)
    render(
      <ResultadoSesion
        resultado={{ aciertos: 1, totalPreguntas: 4, estrellas: 0 }}
        studentNombre="Maria"
        onLeerOtra={onLeerOtraMock}
      />
    );

    const textContent2 = document.body.textContent;
    expect(textContent2?.toLowerCase()).toMatch(/bien intentado|sigue leyendo|esfuerzo/i);
  });

  // ─────────────────────────────────────────────
  // Contador de respuestas
  // ─────────────────────────────────────────────

  it('muestra el numero de aciertos y total', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.getByText('3 de 4 correctas')).toBeDefined();
  });

  it('muestra correctamente cuando todas son correctas (4/4)', () => {
    const resultado = {
      aciertos: 4,
      totalPreguntas: 4,
      estrellas: 3,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.getByText('4 de 4 correctas')).toBeDefined();
  });

  it('muestra correctamente cuando ninguna es correcta (0/4)', () => {
    const resultado = {
      aciertos: 0,
      totalPreguntas: 4,
      estrellas: 0,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.getByText('0 de 4 correctas')).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Emoji segun desempenio
  // ─────────────────────────────────────────────

  it('muestra emoji de trofeo para desempenio perfecto', () => {
    const resultado = {
      aciertos: 4,
      totalPreguntas: 4,
      estrellas: 3,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.getByText('🏆')).toBeDefined();
  });

  it('muestra emoji de estrella para desempenio excelente (75%+)', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.getByText('🌟')).toBeDefined();
  });

  it('muestra emoji de aplauso para desempenio bueno (50-74%)', () => {
    const resultado = {
      aciertos: 2,
      totalPreguntas: 4,
      estrellas: 1,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.getByText('👏')).toBeDefined();
  });

  it('muestra emoji de fuerza para desempenio bajo (<50%)', () => {
    const resultado = {
      aciertos: 1,
      totalPreguntas: 4,
      estrellas: 0,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.getByText('💪')).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Boton "Otra historia"
  // ─────────────────────────────────────────────

  it('renderiza boton "Otra historia!"', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.getByRole('button', { name: /Otra historia/i })).toBeDefined();
  });

  it('llama a onLeerOtra cuando se hace clic en el boton', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    const btn = screen.getByRole('button', { name: /Otra historia/i });
    fireEvent.click(btn);

    expect(onLeerOtraMock).toHaveBeenCalledOnce();
  });

  // ─────────────────────────────────────────────
  // Boton WhatsApp
  // ─────────────────────────────────────────────

  it('renderiza boton para compartir por WhatsApp', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        historiaContenido="Una historia..."
        historiaTitulo="El viaje"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.getByRole('button', { name: /Compartir por WhatsApp/i })).toBeDefined();
  });

  it('desabilita el boton WhatsApp si no hay historia', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    const btn = screen.getByRole('button', { name: /Compartir por WhatsApp/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('habilita el boton WhatsApp si hay historia completa', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        historiaContenido="Una historia con contenido"
        historiaTitulo="Un titulo valido"
        onLeerOtra={onLeerOtraMock}
      />
    );

    const btn = screen.getByRole('button', { name: /Compartir por WhatsApp/i });
    expect(btn.getAttribute('disabled')).toBeNull();
  });


  // ─────────────────────────────────────────────
  // Celebracion
  // ─────────────────────────────────────────────

  it('muestra celebracion cuando desempenio es excelente (75%+)', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.getByTestId('celebracion')).toBeDefined();
  });

  it('no muestra celebracion cuando desempenio es bajo (<75%)', () => {
    const resultado = {
      aciertos: 2,
      totalPreguntas: 4,
      estrellas: 1,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    expect(screen.queryByTestId('celebracion')).toBeNull();
  });

  // ─────────────────────────────────────────────
  // Manejo de casos especiales
  // ─────────────────────────────────────────────

  it('maneja total de preguntas = 0 correctamente', () => {
    const resultado = {
      aciertos: 0,
      totalPreguntas: 0,
      estrellas: 0,
    };

    render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre="Juan"
        onLeerOtra={onLeerOtraMock}
      />
    );

    // No debe crashear
    expect(screen.getByText(/Juan/i)).toBeDefined();
  });

  it('renderiza correctamente con nombres largos', () => {
    const resultado = {
      aciertos: 3,
      totalPreguntas: 4,
      estrellas: 2,
    };

    const nombreLargo = 'Juan Carlos Maria de los Angeles Rodriguez';

    const { container } = render(
      <ResultadoSesion
        resultado={resultado}
        studentNombre={nombreLargo}
        onLeerOtra={onLeerOtraMock}
      />
    );

    // El nombre está embebido en el mensaje de motivación
    expect(container.textContent).toContain(nombreLargo);
  });
});
