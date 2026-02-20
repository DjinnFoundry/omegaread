# OmegaRead — Olas Actualizadas

Fecha: 2026-02-20
Cambio: Eliminada Ola 4 (mates). Foco 100% en lectura adaptativa.

## Visión Core de OmegaRead

El niño elige qué le gusta (Messi, Bluey, dinosaurios, Minecraft, lo que sea).
La app genera textos específicos para su edad con esas historias.
Al final: preguntas de comprensión.
- Si acierta → siguiente texto un poco más difícil
- Si falla → texto más fácil, letra más grande, historia más corta

Eso es OmegaRead. Lectura adaptativa personalizada por intereses.

---

## Ola 1 (Sem 1-3) — "Un niño de 5 puede usarlo" ← EN CURSO
- Setup monorepo Next.js + PostgreSQL + Drizzle
- Mascota animada + Mapa de Aventuras (audio-first, sin texto)
- Módulo pre-lectura: vocales (3 actividades, mastery 90%)
- Diagnóstico invisible disfrazado de juego
- Gamificación: estrellas + stickers
- Dashboard padre v0.1

**DoD:** Un niño de 5 abre la app, ve su mascota, juega con vocales 10 min, gana sticker. Padre ve progreso.

---

## Ola 2 (Sem 4-6) — "De las letras a las sílabas"
- Progresión silábica: vocales → sílabas directas (M, P, L, S, T, N) → primeras palabras
- Fusión silábica (M + A = MA, animación visual)
- Construir palabras arrastrando sílabas
- TTS lectura guiada ("lee conmigo")
- Trazado de letras (motricidad fina)
- Mastery tracking con FSRS
- Dashboard padres: letras reconocidas, sílabas dominadas, sugerencias offline

**DoD:** Un niño de 6 aprende sílabas nuevas, lee primeras palabras, padre ve progreso real.

---

## Ola 3 (Sem 7-9) — "Leer de verdad"
- Lectura de frases y párrafos cortos (6-8 años)
- Comprensión oral para pre-lectores (escuchar cuento + preguntas con imágenes)
- Preguntas de comprensión post-lectura (guiding + quiz)
- ASR V1 para lectura oral: STT → alineación → WPM, pausas
- Política de audio: consent → analizar → borrar ≤15 min
- Pipeline QA de contenido (rubrica 5 dimensiones)
- Detección temprana riesgo (dislexia/TDAH) + alertas empáticas
- Anti-patterns: rushing, gaming

**DoD:** Un niño de 7 lee un texto, responde preguntas, recibe feedback de fluidez. Padre recibe alertas si hay patrones atípicos.

---

## Ola 4 (Sem 10-13) — "Lectura que engancha" ← NUEVA (antes era mates)

**Esta es la ola core de la visión de OmegaRead.**

### Onboarding de intereses
- El niño (con ayuda del padre o la mascota) elige sus intereses:
  - Personajes favoritos (Messi, Bluey, Spider-Man, Cristiano...)
  - Temas (dinosaurios, espacio, animales, coches, princesas, cocina...)
  - Deportes, series, juegos, lo que sea
- Los intereses se guardan en el perfil y se pueden cambiar en cualquier momento

### Generación de textos personalizados
- LLM genera textos con los intereses del niño como protagonistas/tema
- Ajustados a su nivel exacto de lectura (Lexile/nivel silábico)
- Pipeline QA verifica calidad, seguridad, nivel apropiado antes de servir
- Pool de textos pre-generados + generación bajo demanda

### Adaptación dinámica por rendimiento
- **Acierta comprensión (>80%)** → siguiente texto:
  - Un poco más largo
  - Vocabulario ligeramente más complejo
  - Frases más elaboradas
  - Preguntas de inferencia (no solo literales)
- **Falla comprensión (<60%)** → siguiente texto:
  - Más corto
  - Letra más grande
  - Vocabulario más simple
  - Frases más directas
  - Más imágenes de apoyo
  - Preguntas más literales (respuesta está en el texto)
- **Zona intermedia (60-80%)** → mantener nivel, variar tema

### Preguntas de comprensión adaptativas
- 3-5 preguntas por texto
- Tipos: literal, inferencia, vocabulario, opinión
- Para pre-lectores: preguntas orales con imágenes como opciones
- Para lectores: texto con opciones
- Feedback inmediato con la mascota

### Historias interactivas ("Choose your own adventure")
- Inspirado en TeachTales de Alpha
- El niño elige qué pasa en la historia
- Sus amigos/intereses son personajes
- Métrica: tiempo de engagement (queremos que se "pierda" leyendo)

### Dashboard padre v1 completo
- Tendencias semanales de lectura
- Nivel de lectura actual vs hace 1 mes
- Temas que más le enganchan
- Tiempo de lectura diario/semanal
- Comparación consigo mismo (nunca con otros)
- Exportar PDF de progreso
- Sugerencias: "A tu hijo le encantan los dinosaurios. Prueba con [libro físico X]"

### Accesibilidad
- OpenDyslexic como opción de fuente
- Modo TDAH (sesiones más cortas, menos estímulos)
- Alto contraste
- Sílabas coloreadas para lectores emergentes

**DoD:** Un niño elige "me gusta Messi y los dinosaurios", la app le genera un cuento de Messi explorando un mundo de dinosaurios, al nivel correcto, con preguntas. Si acierta, el siguiente es más difícil. Si falla, más fácil. El padre ve el progreso y sabe qué temas le enganchan.

---

## Ola 5 (Sem 14-16) — "Piloto + Calidad"
- Piloto con 20-30 familias reales
- Hardening calidad contenido (≥95% QA)
- Calibración ASR por edad
- Dialectos (España peninsular, Latam neutro)
- Sync multi-dispositivo
- Documentación para contribuidores OSS

**DoD:** 20-30 niños usan la app 2+ semanas. Datos de progreso recopilados. Repo abierto y documentado.

---

## Resumen

| Ola | Semanas | Foco | Builder default |
|-----|---------|------|-----------------|
| 1 | 1-3 | Cimientos + pre-lectura | Ender 🎯 |
| 2 | 4-6 | Sílabas y primeras palabras | Ender 🎯 |
| 3 | 7-9 | Lectura real + ASR + comprensión | Ender/Zuck |
| 4 | 10-13 | Lectura adaptativa por intereses (CORE) | Zuck 💻 |
| 5 | 14-16 | Piloto con familias reales | Ender 🎯 |

Ola 4 es la más compleja (generación LLM + adaptación) → probablemente necesite Zuck o incluso pair Zuck+Ender.
