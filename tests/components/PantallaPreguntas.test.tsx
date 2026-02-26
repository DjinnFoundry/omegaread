/**
 * Tests para PantallaPreguntas component.
 * Verifica que el componente de preguntas de comprension
 * funciona correctamente: navegacion, feedback, y recopilacion de respuestas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PantallaPreguntas, { RespuestaPregunta } from '@/components/lectura/PantallaPreguntas';

// Mock de sonidos
vi.mock('@/lib/audio/sonidos', () => ({
  click: vi.fn(),
  celebracion: vi.fn(),
}));

/**
 * Datos de prueba
 */
const PREGUNTAS_MOCK = [
  {
    id: 'q1',
    tipo: 'literal' as const,
    pregunta: 'Donde vivia Luna?',
    opciones: ['En una ciudad', 'En un pueblo pequeno', 'En el bosque', 'En la playa'],
    respuestaCorrecta: 1,
    explicacion: 'El texto dice que Luna vivia en un pueblo pequeno.',
  },
  {
    id: 'q2',
    tipo: 'inferencia' as const,
    pregunta: 'Por que crees que la familia estaba esperando?',
    opciones: ['Estaban preocupados', 'Tenian hambre', 'Querian jugar', 'Tenian sueno'],
    respuestaCorrecta: 0,
    explicacion: 'Si Luna se fue al bosque, su familia se preocupo.',
  },
  {
    id: 'q3',
    tipo: 'vocabulario' as const,
    pregunta: 'Que significa cristalino?',
    opciones: ['Oscuro', 'Transparente y claro', 'Frio', 'Profundo'],
    respuestaCorrecta: 1,
    explicacion: 'Cristalino quiere decir muy claro.',
  },
  {
    id: 'q4',
    tipo: 'resumen' as const,
    pregunta: 'De que trata esta historia?',
    opciones: [
      'Una gatita explora el bosque y regresa',
      'Un rio con peces de colores',
      'Una familia que busca a su gato',
      'Un pueblo con muchos gatos',
    ],
    respuestaCorrecta: 0,
    explicacion: 'La historia cuenta la aventura de Luna.',
  },
];

describe('PantallaPreguntas', () => {
  let onCompleteMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onCompleteMock = vi.fn();
  });

  // ─────────────────────────────────────────────
  // Rendering basico
  // ─────────────────────────────────────────────

  it('renderiza la primera pregunta al montar', () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    expect(screen.getByText('Donde vivia Luna?')).toBeDefined();
    expect(screen.getByText('En una ciudad')).toBeDefined();
  });


  // ─────────────────────────────────────────────
  // Contador de preguntas
  // ─────────────────────────────────────────────

  it('muestra el contador de preguntas (1/4)', () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    expect(screen.getByText('Pregunta 1 de 4')).toBeDefined();
  });

  it('actualiza el contador al avanzar (2/4)', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    // Responder la primera pregunta correctamente
    const opcion = screen.getByText('En un pueblo pequeno');
    fireEvent.click(opcion);

    // Esperar feedback y hacer clic en siguiente
    await waitFor(() => {
      expect(screen.getByText('Correcto!')).toBeDefined();
    });

    const btnSiguiente = screen.getByRole('button', { name: /Siguiente/i });
    fireEvent.click(btnSiguiente);

    // Verificar que paso a la pregunta 2
    await waitFor(() => {
      expect(screen.getByText('Pregunta 2 de 4')).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────
  // Seleccion de opciones
  // ─────────────────────────────────────────────

  it('permite seleccionar una opcion', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    const opcion = screen.getByText('En un pueblo pequeno');
    fireEvent.click(opcion);

    await waitFor(() => {
      expect(screen.getByText('Correcto!')).toBeDefined();
    });
  });

  it('deshabilita opciones despues de responder', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    const opcion = screen.getByText('En un pueblo pequeno');
    fireEvent.click(opcion);

    await waitFor(() => {
      const opciones = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('En')
      );
      opciones.forEach(btn => {
        expect(btn.hasAttribute('disabled')).toBe(true);
      });
    });
  });

  // ─────────────────────────────────────────────
  // Feedback inmediato
  // ─────────────────────────────────────────────

  it('muestra "Correcto!" cuando la respuesta es correcta', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    const opcionCorrecta = screen.getByText('En un pueblo pequeno');
    fireEvent.click(opcionCorrecta);

    await waitFor(() => {
      expect(screen.getByText('Correcto!')).toBeDefined();
    });
  });

  it('muestra feedback cuando la respuesta es incorrecta', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    const opcionIncorrecta = screen.getByText('En una ciudad');
    fireEvent.click(opcionIncorrecta);

    await waitFor(() => {
      expect(screen.getByText('Casi! No te preocupes.')).toBeDefined();
    });
  });

  it('muestra la explicacion despues de responder', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    const opcion = screen.getByText('En un pueblo pequeno');
    fireEvent.click(opcion);

    await waitFor(() => {
      expect(screen.getByText('El texto dice que Luna vivia en un pueblo pequeno.')).toBeDefined();
    });
  });

  it('resalta la opcion correcta tras responder', async () => {
    const { container } = render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    const opcionCorrecta = screen.getByText('En un pueblo pequeno');
    fireEvent.click(opcionCorrecta);

    await waitFor(() => {
      const botones = container.querySelectorAll('button');
      const botonCorrecta = Array.from(botones).find(btn =>
        btn.textContent?.includes('En un pueblo pequeno')
      );
      // Debe tener clase de correcto (bosque/green)
      expect(botonCorrecta?.className).toContain('bosque');
    });
  });

  // ─────────────────────────────────────────────
  // Navegacion entre preguntas
  // ─────────────────────────────────────────────

  it('muestra boton "Siguiente" tras responder', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    const opcion = screen.getByText('En un pueblo pequeno');
    fireEvent.click(opcion);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDefined();
    });
  });

  it('avanza a la siguiente pregunta al hacer clic en Siguiente', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    // Responder pregunta 1
    fireEvent.click(screen.getByText('En un pueblo pequeno'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Verificar que cambia a pregunta 2
    await waitFor(() => {
      expect(screen.getByText('Por que crees que la familia estaba esperando?')).toBeDefined();
    });
  });

  it('limpia el estado al avanzar a nueva pregunta', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    // Responder pregunta 1
    fireEvent.click(screen.getByText('En un pueblo pequeno'));

    await waitFor(() => {
      expect(screen.getByText('Correcto!')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // El feedback debe desaparecer
    await waitFor(() => {
      expect(screen.queryByText('Correcto!')).toBeNull();
    });

    // Ahora deberia mostrar la segunda pregunta sin feedback
    expect(screen.getByText('Por que crees que la familia estaba esperando?')).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Completar cuestionario
  // ─────────────────────────────────────────────

  it('llama onComplete cuando se responden todas las preguntas', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    // Responder todas las preguntas
    for (let i = 0; i < PREGUNTAS_MOCK.length; i++) {
      const opcionCorrecta = PREGUNTAS_MOCK[i].opciones[PREGUNTAS_MOCK[i].respuestaCorrecta];
      fireEvent.click(screen.getByText(opcionCorrecta));

      if (i < PREGUNTAS_MOCK.length - 1) {
        // Non-final questions show "Siguiente" button
        await waitFor(() => {
          expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDefined();
        });
        fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
      }
      // Last question triggers onComplete immediately on selection
    }

    await waitFor(() => {
      expect(onCompleteMock).toHaveBeenCalled();
    });
  });

  it('onComplete recibe array de respuestas con campo correcta', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    // Responder todas
    for (let i = 0; i < PREGUNTAS_MOCK.length; i++) {
      const opcionCorrecta = PREGUNTAS_MOCK[i].opciones[PREGUNTAS_MOCK[i].respuestaCorrecta];
      fireEvent.click(screen.getByText(opcionCorrecta));

      if (i < PREGUNTAS_MOCK.length - 1) {
        await waitFor(() => {
          expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDefined();
        });
        fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
      }
      // Last question triggers onComplete immediately on selection
    }

    await waitFor(() => {
      expect(onCompleteMock).toHaveBeenCalledWith(expect.any(Array));
      const respuestas = onCompleteMock.mock.calls[0][0] as RespuestaPregunta[];
      expect(respuestas.length).toBe(4);
      respuestas.forEach((r) => {
        expect(r).toHaveProperty('preguntaId');
        expect(r).toHaveProperty('correcta');
        expect(r).toHaveProperty('tipo');
        expect(r).toHaveProperty('respuestaSeleccionada');
        expect(r).toHaveProperty('tiempoMs');
      });
    });
  });

  it('registra respuestas incorrectas en el array final', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    // Responder incorrectamente la primera
    fireEvent.click(screen.getByText('En una ciudad')); // Incorrecta

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Responder correctamente las demas
    for (let i = 1; i < PREGUNTAS_MOCK.length; i++) {
      const opcionCorrecta = PREGUNTAS_MOCK[i].opciones[PREGUNTAS_MOCK[i].respuestaCorrecta];
      fireEvent.click(screen.getByText(opcionCorrecta));

      if (i < PREGUNTAS_MOCK.length - 1) {
        await waitFor(() => {
          expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDefined();
        });
        fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
      }
      // Last question triggers onComplete immediately on selection
    }

    await waitFor(() => {
      const respuestas = onCompleteMock.mock.calls[0][0] as RespuestaPregunta[];
      expect(respuestas[0].correcta).toBe(false);
      expect(respuestas[1].correcta).toBe(true);
      expect(respuestas[2].correcta).toBe(true);
      expect(respuestas[3].correcta).toBe(true);
    });
  });

  // ─────────────────────────────────────────────
  // Tipos de preguntas
  // ─────────────────────────────────────────────

  it('muestra el tipo de pregunta (Comprension, Razonamiento, etc)', () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    // Primera es literal
    expect(screen.getByText('Comprension')).toBeDefined();
  });

  it('muestra el emoji correspondiente al tipo de pregunta', () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    // Primera pregunta es literal (📝)
    expect(screen.getByText('📝')).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Visualizacion de historia
  // ─────────────────────────────────────────────

  it('muestra boton para volver a leer la historia si se proporciona', () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
        historiaContenido="Luna era una gatita..."
        historiaTitulo="El viaje de Luna"
      />
    );

    expect(screen.getByText('Volver a leer la historia')).toBeDefined();
  });

  it('no muestra boton de historia si no se proporciona contenido', () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    expect(screen.queryByText('Volver a leer la historia')).toBeNull();
  });

  it('muestra/oculta el contenido de la historia al hacer clic', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
        historiaContenido="Parrafo uno.\n\nParrafo dos."
        historiaTitulo="El viaje de Luna"
      />
    );

    const btnHistoria = screen.getByText('Volver a leer la historia');
    fireEvent.click(btnHistoria);

    await waitFor(() => {
      expect(screen.getByText('El viaje de Luna')).toBeDefined();
    });

    // Debe mostrar "Ocultar historia"
    expect(screen.getByText('Ocultar historia')).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Boton final
  // ─────────────────────────────────────────────

  it('muestra "Siguiente" en la penultima pregunta pero no en la ultima', async () => {
    render(
      <PantallaPreguntas
        preguntas={PREGUNTAS_MOCK}
        onComplete={onCompleteMock}
      />
    );

    // Responder las primeras 2 preguntas
    for (let i = 0; i < 2; i++) {
      const opcionCorrecta = PREGUNTAS_MOCK[i].opciones[PREGUNTAS_MOCK[i].respuestaCorrecta];
      fireEvent.click(screen.getByText(opcionCorrecta));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    }

    // Penultima pregunta (index 2) - should show "Siguiente"
    const opcionPenultima = PREGUNTAS_MOCK[2].opciones[PREGUNTAS_MOCK[2].respuestaCorrecta];
    fireEvent.click(screen.getByText(opcionPenultima));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    // Ultima pregunta (index 3) - should NOT show "Siguiente";
    // onComplete fires immediately on answer selection
    const opcionUltima = PREGUNTAS_MOCK[3].opciones[PREGUNTAS_MOCK[3].respuestaCorrecta];
    fireEvent.click(screen.getByText(opcionUltima));

    await waitFor(() => {
      // No "Siguiente" button on the last question
      expect(screen.queryByRole('button', { name: /Siguiente/i })).toBeNull();
      // onComplete was called directly
      expect(onCompleteMock).toHaveBeenCalled();
    });
  });
});
