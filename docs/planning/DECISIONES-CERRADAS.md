# Decisiones Cerradas (Canonicas)

Fecha de ultima actualizacion: 2026-02-20  
Estado: fuente unica de verdad para decisiones de producto/plataforma.

## Como usar este documento

1. Si una decision cambia, se actualiza aqui primero.
2. Los demas documentos deben referenciar este archivo en lugar de duplicar bloques.
3. Toda decision nueva debe tener fecha y rationale breve.

## Decisiones activas

| ID | Fecha | Decision | Estado |
|---|---|---|---|
| D-001 | 2026-02-20 | Segmento inicial `4-8 anos` (Fase 1). 9-14 es Fase 2. | activa (revisada) |
| D-002 | 2026-02-20 | Idioma inicial `ES primero` | activa |
| D-003 | 2026-02-20 | Go-to-market inicial `B2C familias` | activa |
| D-004 | 2026-02-20 | MVP incluye `TTS desde Ola 1`, `ASR desde Ola 3` | activa (revisada) |
| D-005 | 2026-02-20 | Repositorio abierto desde dia 1 con `AGPL-3.0` (codigo) + `CC-BY-SA 4.0` (contenido) | activa (revisada) |
| D-006 | 2026-02-20 | Gate de calidad aplica para "publicar en app stores", no para abrir repo | activa (revisada) |
| D-007 | 2026-02-20 | Politica de audio: consentimiento + analizar y borrar audio crudo | activa |
| D-008 | 2026-02-20 | Modelo operativo: flujo continuo por olas, no sprint unico | activa |
| D-009 | 2026-02-20 | Framework: `Next.js` + TypeScript + Tailwind | activa (nueva) |
| D-010 | 2026-02-20 | DB: `PostgreSQL` + Redis. Online-first, any device. Offline es P3. | activa (nueva) |
| D-011 | 2026-02-20 | UX ninos: `Audio-first + Mascota + Mapa`. UX padres: `Dashboard con datos`. | activa (nueva) |
| D-012 | 2026-02-20 | 5 olas en 16 semanas. Pre-lectores desde Ola 1. Mates en Ola 4. Piloto en Ola 5. | activa (nueva) |

## Notas de implementacion

1. D-007 exige evidencia de borrado para cualquier historia que procese audio infantil.
2. D-008 no elimina releases quincenales, solo evita planificacion rigida de un unico sprint.
3. D-005/D-006 revisadas: el repo es abierto desde dia 1 (AGPL). El gate de calidad aplica para publicacion en stores y recomendacion a familias, no para visibilidad del codigo.
4. D-001 revisada: foco 4-8 anos (Fase 1). 9-14 queda para Fase 2 con UX diferente (XP numerico, Pomodoro 25 min, texto).
5. D-004 revisada: TTS es obligatorio desde Ola 1 (audio-first). ASR para lectura oral entra en Ola 3.
6. D-009: Next.js elegido por familiaridad del equipo y ecosistema. Bundle mayor que SvelteKit pero aceptable para online-first.
7. D-010: PostgreSQL porque vamos online-first, any device. Offline-first diferido a P3.
8. D-011: Los ninos de 4-5 NO leen, la interfaz HABLA. Dashboard de datos es para padres.
9. D-012: Pre-lectores desde Ola 1, mates integradas en Ola 4 (no app separada), piloto real con familias en Ola 5.

