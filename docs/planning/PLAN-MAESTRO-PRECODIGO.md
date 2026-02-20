# Plan Maestro Pre-Codigo (OmegaRead -> OmegaAnywhere)

Fecha: 2026-02-20  
Estado: Draft para validacion

## Objetivo de este plan

Definir decisiones y entregables de planificacion antes de escribir codigo de producto.
El objetivo es reducir retrabajo, proteger calidad pedagogica y asegurar reutilizacion multi-app.

## Regla operativa

No arrancar implementacion hasta cerrar los gates G1, G2 y G3.

## Gates de planificacion

### G1. Product Scope Gate

Se cierra cuando:
1. Segmento inicial definido (edad/grado).
2. Canal inicial definido (familias, escuela o hibrido).
3. KPI principal confirmado (`CARF`) y KPIs secundarios definidos.
4. Politica de gamificacion validada (evitar farming y sobrepresion).

Entregable:
- `PRD` base congelado para MVP.

### G2. Learning Quality Gate

Se cierra cuando:
1. Rubrica de QA de contenido definida (nivel, claridad, seguridad).
2. Taxonomia de skills de lectura definida para dashboard.
3. Politica de mastery definida (`>=80%` inicial y revisable por cohorte).
4. Criterio anti-pattern definido (`rushing`, respuestas aleatorias, baja constancia).

Entregable:
- Blueprint de motor pedagogico y quality pipeline.

### G3. Platform Reuse Gate

Se cierra cuando:
1. Contrato `AppDomainContract` v1 definido para futuras apps (math, science).
2. Event schema comun y versionado definidos.
3. Modelo de datos comun del dashboard (padres/ninos) definido.
4. Frontera entre servicios compartidos y servicios por dominio definida.

Entregable:
- Arquitectura objetivo de `OmegaAnywhere` aprobada.

## Plan de trabajo pre-codigo (3 semanas)

### Semana 1 (Descubrimiento guiado)

1. Revisar y validar backlog inicial por valor social y riesgo.
2. Cerrar decisiones criticas abiertas del PRD.
3. Disenar taxonomia de skills para lectura.
4. Definir scorecard de calidad de contenido.

### Semana 2 (Arquitectura y datos)

1. Cerrar contrato multi-app y event schema.
2. Disenar arquitectura de dashboard reutilizable.
3. Definir dominio de datos minimo para perfil, sesiones, skills y rewards.
4. Definir gobernanza de privacidad infantil y auditoria.

### Semana 3 (Plan de ejecucion)

1. Partir backlog en epics/sprints con dependencias reales.
2. Definir estrategia de pruebas por capa (unit, integration, e2e, pedagogic QA).
3. Preparar riesgos de lanzamiento piloto y plan de mitigacion.
4. Definir criterio de "go/no-go" para Sprint 1 de implementacion.

## Artefactos que quedan listos al final de pre-codigo

1. Backlog inicial completo y priorizado.
2. Arquitectura multi-app con diagramas.
3. Dossier de referencias con implicaciones al producto.
4. Lista de decisiones abiertas y propuesta de default para cada una.

## Decisiones abiertas (requieren confirmacion)

1. Segmento inicial:
   - Opcion A (recomendada): 6-9 anos
   - Opcion B: 5-12 anos
2. Idioma inicial:
   - Opcion A (recomendada): ES primero
   - Opcion B: ES + EN simultaneo
3. Distribucion:
   - Opcion A (recomendada): B2C familias para ciclo rapido
   - Opcion B: B2B escuelas
   - Opcion C: Hibrido
4. Licencia del core:
   - Opcion A (recomendada): AGPL
   - Opcion B: Apache-2.0
5. Prioridad de voz/ASR:
   - Opcion A (recomendada): post MVP
   - Opcion B: dentro de MVP

## Criterio de salida pre-codigo

Entramos a implementacion solo cuando:
1. 100% de items P0 tienen owner y acceptance criteria.
2. 0 decisiones criticas sin resolver.
3. Arquitectura multi-app y dashboard comparten contrato de datos v1.
4. Riesgos P1 tienen mitigacion operativa definida.
