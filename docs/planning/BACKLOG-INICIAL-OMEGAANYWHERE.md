# Backlog Inicial (Planificacion) OmegaRead + OmegaAnywhere

Fecha: 2026-02-20  
Estado: Draft v1  
Alcance: backlog de producto y plataforma (sin codigo aun)

## Convenciones

Prioridad:
- `P0` bloquea inicio de implementacion
- `P1` MVP obligatorio
- `P2` post-MVP cercano
- `P3` evolucion

Estado inicial:
- `todo`

## Epicas

1. E0 Product Decisions and Governance
2. E1 Identity, Consent and Child Safety
3. E2 Learner Model and Skill Graph
4. E3 Reading Content Factory
5. E4 Reading Session UX
6. E5 Assessment, Mastery and Fluency
7. E6 Adaptation and Recommendation Engine
8. E7 Motivation, XP and Healthy Gamification
9. E8 Parent Dashboard (cross-app)
10. E9 Child Dashboard (cross-app)
11. E10 Teacher Dashboard
12. E11 Shared Data and Event Platform
13. E12 Multi-App Contract (OmegaAnywhere)
14. E13 OmegaMath Domain Bootstrap
15. E14 Operations, QA and Pilot Readiness

## Backlog por items

| ID | Pri | Epic | Item | Why this matters | Acceptance Criteria | Depends |
|---|---|---|---|---|---|---|
| B-001 | P0 | E0 | Definir ICP y segmento inicial | Evita producto ambiguo | Segmento, edad y canal definidos por escrito | none |
| B-002 | P0 | E0 | Definir North Star y metricas | Alinea decisiones de producto | CARF + metricas secundarias cerradas | B-001 |
| B-003 | P0 | E0 | Definir licencia open source del core | Afecta contribuciones y adopcion | Licencia elegida y rationale documentado | B-001 |
| B-004 | P0 | E0 | Definir politica de contenido infantil | Seguridad y confianza | Lista de restricciones y contenido prohibido | B-001 |
| B-005 | P0 | E0 | Definir politicas anti-gaming | Evita incentivos daninos | Regla XP + anti-rush + limites de streak | B-002 |
| B-006 | P0 | E1 | Definir flujo de consentimiento parental | Requisito legal y etico | Flujo e historial de consent versionados | B-004 |
| B-007 | P0 | E1 | Definir politica de retencion y borrado | Privacidad infantil | SLA de borrado/export definidos | B-006 |
| B-008 | P0 | E2 | Definir taxonomia de skills lectura v1 | Base de dashboard y adaptacion | Lista de skills y niveles de dominio | B-002 |
| B-009 | P0 | E2 | Definir score de mastery por skill | Necesario para recomendacion | Formula y threshold inicial documentados | B-008 |
| B-010 | P0 | E11 | Definir event schema comun v1 | Permite dashboards reutilizables | Catalogo de eventos versionado | B-002, B-008 |
| B-011 | P0 | E12 | Definir AppDomainContract v1 | Escalar a math/science sin rehacer | Contrato comun firmado por arquitectura | B-010 |
| B-012 | P0 | E14 | Definir quality rubric de contenido | Controla calidad pedagogica | Rubrica con umbrales y checks | B-004, B-008 |
| B-013 | P1 | E3 | Disenar pipeline de creacion de lectura | Core de OmegaRead | Flujo generate -> evaluate -> publish definido | B-012 |
| B-014 | P1 | E3 | Definir metadata de dificultad de texto | Ajuste de nivel confiable | Campos y escalas de dificultad cerrados | B-013 |
| B-015 | P1 | E3 | Definir plantilla de preguntas por lectura | Estandariza evaluacion | 4 guiding + quiz final configurable | B-013 |
| B-016 | P1 | E4 | Disenar UX de sesion por secciones | Mejora foco y comprension | Wireflow y estados de sesion definidos | B-015 |
| B-017 | P1 | E4 | Definir modo lectura corta y estandar | Ajuste por edad y energia | Duraciones/longitudes por modo aprobadas | B-016 |
| B-018 | P1 | E5 | Definir calculo de WPM y CARF | Evita optimizar solo velocidad | Formula + validacion por cohortes | B-002 |
| B-019 | P1 | E5 | Definir deteccion de rushing | Mejora integridad del dato | Umbral de tiempo y reglas de bandera | B-018 |
| B-020 | P1 | E5 | Definir feedback inmediato por respuesta | Aumenta aprendizaje activo | Plantillas de feedback por tipo de error | B-015 |
| B-021 | P1 | E6 | Disenar motor de ajuste de dificultad | Motor adaptativo del producto | Reglas de subida/bajada por sesion | B-009, B-018 |
| B-022 | P1 | E6 | Disenar recomendador de siguiente lectura | Mantiene continuidad pedagogica | Ranking de opciones por skill gap/interes | B-021 |
| B-023 | P1 | E7 | Definir reglas de XP por mastery | Motivacion saludable | XP solo con mastery y anti-spam activo | B-005, B-019 |
| B-024 | P1 | E7 | Definir badges de progreso por skill | Refuerza logros reales | Badge map aprobado y trazable | B-008, B-023 |
| B-025 | P1 | E8 | Definir dashboard padres v1 | Valor inmediato para familia | KPIs minimos: CARF, mastery, tiempo, alertas | B-010, B-018 |
| B-026 | P1 | E8 | Definir alertas accionables para padres | Sin accion no hay impacto | Alerta incluye causa y sugerencia concreta | B-025 |
| B-027 | P1 | E9 | Definir dashboard nino v1 | Cierra loop de motivacion | Mision diaria, progreso y proximos pasos | B-023 |
| B-028 | P1 | E11 | Definir modelo analitico de sesiones | Base de metricas | Esquema de hechos y dimensiones documentado | B-010 |
| B-029 | P1 | E11 | Definir trazabilidad de decisiones IA | Auditoria y depuracion | Registro de por que se asigno contenido | B-013, B-021 |
| B-030 | P1 | E14 | Definir suite de pruebas MVP | Reduce regresiones | Plan unit/integration/e2e + QA pedagogico | B-013..B-029 |
| B-031 | P1 | E14 | Definir piloto 20-50 ninos | Validacion real | Protocolo de piloto y metricas de salida | B-030 |
| B-032 | P2 | E10 | Definir dashboard docente v1 | Escalado a escuela | Vista por cohorte + alumnos en riesgo | B-010, B-025 |
| B-033 | P2 | E12 | Definir componentes UI compartidos | Reuso real cross-app | Libreria de cards y patrones dashboard | B-011, B-025 |
| B-034 | P2 | E12 | Definir sistema de objetivos cross-app | Unifica experiencia nino | "Misiones" que mezclan dominios | B-027, B-033 |
| B-035 | P2 | E13 | Definir skill map de OmegaMath | Preparar segunda app | Taxonomia math conectada a grafo comun | B-011 |
| B-036 | P2 | E13 | Definir activity contract de OmegaMath | Reuso del core | Actividades math publican eventos comunes | B-010, B-035 |
| B-037 | P2 | E13 | Definir scoring adapter de OmegaMath | Dash unificado comparables | CARF equivalente para math definido | B-036 |
| B-038 | P2 | E8 | Definir vista familiar multi-app | Valor de plataforma | Dashboard agrega progreso read+math | B-033, B-037 |
| B-039 | P2 | E9 | Definir progresion narrativa multi-app | Engagement sin fatiga | Camino de progreso por mundos/retos | B-034 |
| B-040 | P2 | E14 | Definir marco de fairness y sesgo | Calidad y confianza | Checklist de sesgo por contenido y scoring | B-012 |
| B-041 | P3 | E3 | Definir pipeline curado por comunidad | Escalado open source | Flujo contribution -> review -> release | B-012 |
| B-042 | P3 | E11 | Definir benchmark publico anonimo | Transparencia de impacto | Dataset anonimo y protocolo de benchmark | B-028 |
| B-043 | P3 | E6 | Definir personalizacion por preferencia cognitiva | Mejor adaptacion | Variables de estilo de aprendizaje validadas | B-021 |
| B-044 | P3 | E7 | Definir economia de recompensas no monetaria | Evitar incentivos toxicos | Rewards intrinsecos con limites claros | B-023 |
| B-045 | P3 | E14 | Definir playbook de incidentes pedagogicos | Respuesta rapida a errores | SOP para retirar contenido o regla fallida | B-029, B-040 |

## Priorizacion por fases

### Fase A (pre-codigo obligatorio)

`B-001` a `B-012`

### Fase B (MVP build planning)

`B-013` a `B-031`

### Fase C (post-MVP inmediato)

`B-032` a `B-040`

### Fase D (escala y comunidad)

`B-041` a `B-045`

## Riesgos de backlog

1. Sobrecargar MVP con features de escuela demasiado pronto.
2. Definir metricas sin normalizacion cross-app y luego romper comparabilidad.
3. Lanzar gamificacion antes de anti-gaming robusto.
4. Lanzar dashboard sin recomendaciones accionables.

## Definicion de Ready (para iniciar implementacion de un item)

1. Problem statement claro.
2. Acceptance criteria medibles.
3. Dependencias identificadas.
4. Riesgo principal identificado con mitigacion.

## Definicion de Done (para cerrar item)

1. Cumple acceptance criteria.
2. Tiene pruebas definidas para su capa.
3. Tiene observabilidad minima (metric/event/log).
4. Tiene nota de impacto en UX y aprendizaje.
