'use client';

import { Component, type ReactNode } from 'react';

/**
 * Props del ErrorBoundary para niños.
 */
interface ErrorBoundaryNinoProps {
  children: ReactNode;
  /** Ruta a la que redirigir al hacer clic en "volver" */
  rutaVolver?: string;
}

interface ErrorBoundaryNinoState {
  hasError: boolean;
}

/**
 * ErrorBoundary con UI amigable para niños.
 *
 * Captura errores de runtime en componentes hijos y muestra
 * una pantalla colorida y no-aterradora en vez del "white screen of death".
 *
 * Diseño: emoji grande, mensaje simple, botón para volver al mapa.
 */
export class ErrorBoundaryNino extends Component<ErrorBoundaryNinoProps, ErrorBoundaryNinoState> {
  constructor(props: ErrorBoundaryNinoProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryNinoState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log for debugging — never show to the kid
    console.error('[ErrorBoundaryNino] Error capturado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const rutaVolver = this.props.rutaVolver ?? '/jugar/mapa';

      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo p-6">
          <span className="text-7xl animate-bounce-suave" role="presentation">
            🌈
          </span>
          <h1
            className="text-2xl font-extrabold text-center"
            style={{ color: '#5D4037' }}
          >
            ¡Ups! Algo salió mal
          </h1>
          <p
            className="text-base text-center max-w-xs"
            style={{ color: '#8D6E63' }}
          >
            No te preocupes, ¡vamos a volver al mapa!
          </p>
          <a
            href={rutaVolver}
            className="rounded-3xl bg-turquesa px-8 py-4 text-lg font-bold text-white shadow-md active:scale-95 transition-transform"
          >
            🏠 Volver al mapa
          </a>
        </main>
      );
    }

    return this.props.children;
  }
}
