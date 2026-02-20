# Decisiones Cerradas (Canónicas)

Fecha de última actualización: 2026-02-20
Estado: fuente única de verdad para producto, UX y plataforma.

## Cómo usar este documento

1. Si una decisión cambia, se actualiza aquí primero.
2. Los demás documentos deben referenciar este archivo.
3. Toda decisión nueva debe incluir fecha y rationale breve.

## Decisiones activas

| ID | Fecha | Decisión | Estado |
|---|---|---|---|
| D-001 | 2026-02-20 | Segmento inicial: `5+` (lectores emergentes que ya decodifican, pero leen lento o comprenden poco). | activa (revisada) |
| D-002 | 2026-02-20 | Idioma inicial `ES primero`. | activa |
| D-003 | 2026-02-20 | Go-to-market inicial `B2C familias`. | activa |
| D-004 | 2026-02-20 | MVP de OmegaRead se centra en lectura adaptativa y comprensión. ASR completo se mantiene para fase posterior. | activa (revisada) |
| D-005 | 2026-02-20 | Repositorio abierto desde día 1 con `AGPL-3.0` (código) + `CC-BY-SA 4.0` (contenido). | activa |
| D-006 | 2026-02-20 | Framework: `Next.js` + TypeScript + Tailwind. | activa |
| D-007 | 2026-02-20 | DB: `PostgreSQL` online-first. | activa |
| D-008 | 2026-02-20 | Modelo operativo: flujo continuo por olas + sprints quincenales. | activa |
| D-009 | 2026-02-20 | Core de producto: `perfil/identidad del niño + intereses + historias generadas + preguntas de comprensión + adaptación automática de dificultad`. | activa (nueva) |
| D-010 | 2026-02-20 | UX niño: no infantilizar métricas; usar gráficos simples y claros para mostrar estado actual y objetivo. | activa (nueva) |
| D-011 | 2026-02-20 | Dificultad adaptativa en 2 capas: automática por rendimiento + ajuste manual “más fácil / más desafiante”. | activa (nueva) |
| D-012 | 2026-02-20 | Progreso por `skill global de lectura` y por `topic/interés` (ej. dinosaurios, fútbol, espacio). | activa (nueva) |
| D-013 | 2026-02-20 | Referencias de diseño pedagógico: tomar patrones validados de AlphaRead (sin clonar UX literal). | activa (nueva) |

## Notas de implementación

1. D-009 implica que sílabas/vocales dejan de ser el eje del MVP.
2. D-010 no elimina motivación visual; la vuelve legible y educativa (gráficas sencillas, metas claras).
3. D-011 exige trazabilidad del motivo de cada subida/bajada de nivel.
4. D-012 requiere modelo de datos con histórico por sesión y por tópico.
5. D-013 implica benchmark continuo: decisiones de UX deben justificar por qué se adoptan o no patrones de AlphaRead.
