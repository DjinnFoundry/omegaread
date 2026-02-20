# Backlog Inicial Reenfocado (OmegaRead First)

Fecha: 2026-02-20
Estado: Draft v2 (reemplaza backlog inicial de alcance disperso)

## Contexto

Este backlog prioriza OmegaRead como primera app de OmegaAnywhere.
Objetivo: lectura adaptativa por identidad, intereses y comprensión.

## Prioridades

- P0: bloquea construcción del loop principal.
- P1: MVP obligatorio para lanzar piloto.
- P2: mejora cercana post-MVP.

## Épicas

1. E1 Perfil e identidad del niño
2. E2 Motor de generación de historias
3. E3 Comprensión y scoring
4. E4 Adaptación de dificultad
5. E5 Dashboard niño con gráficas
6. E6 Dashboard padre accionable
7. E7 Calidad, seguridad y benchmark AlphaRead

## Backlog por items

| ID | Pri | Épica | Item | Acceptance Criteria |
|---|---|---|---|---|
| R-001 | P0 | E1 | Definir esquema de perfil enriquecido | Incluye identidad, contexto, intereses, temas evitados |
| R-002 | P0 | E1 | Diseñar onboarding de intereses | Completado en <7 min, abandono bajo |
| R-003 | P0 | E1 | Baseline de lectura inicial | Nivel inicial + confianza guardada |
| R-004 | P0 | E2 | Pipeline `generate -> evaluate -> publish` | Historia sale con metadata de dificultad |
| R-005 | P0 | E2 | Rubrica QA de seguridad y edad | Bloquea contenido fuera de política |
| R-006 | P0 | E3 | Banco de preguntas de comprensión | 4 tipos de pregunta por sesión |
| R-007 | P0 | E3 | Scoring de comprensión por sesión | Score trazable y reproducible |
| R-008 | P0 | E4 | Regla de subida/bajada de nivel | Ajuste automático funciona y se explica |
| R-009 | P1 | E4 | Botones `más fácil`/`más desafiante` | Reescritura en sesión preserva objetivo |
| R-010 | P1 | E5 | Dashboard niño con gráficas simples | Estado + tendencia + objetivo claros |
| R-011 | P1 | E6 | Dashboard padre con recomendaciones | Incluye acción concreta por skill/topic |
| R-012 | P1 | E7 | Benchmark funcional contra AlphaRead | Checklist aprobado con gaps y plan |
| R-013 | P1 | E7 | Observabilidad de decisiones adaptativas | Cada cambio de nivel con causa registrada |
| R-014 | P2 | E4 | Personalización por preferencia cognitiva | Ajustes finos por comportamiento real |
| R-015 | P2 | E6 | Exportable de progreso para familias | Reporte mensual legible y útil |

## Orden de ejecución sugerido

1. R-001 a R-008 (loop mínimo funcional).
2. R-009 a R-013 (producto usable y explicable).
3. R-014 a R-015 (optimización y escalado).

## Riesgos principales

1. Mala calidad de perfil inicial reduce valor de personalización.
2. Scoring opaco rompe confianza de familias.
3. Dashboard bonito pero no accionable no cambia aprendizaje.
