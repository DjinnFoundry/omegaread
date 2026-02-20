# README de limpieza de código (reboot)

Fecha: 2026-02-20
Estado: pendiente de ejecución
Objetivo: eliminar código que no aporta al core definido en `docs/design/SPEC-OMEGAREAD-CORE-ADAPTATIVO-2026-02-20.md`.

## 1. Qué sí es core ahora

1. Perfil enriquecido del niño.
2. Historias personalizadas por nivel e intereses.
3. Preguntas de comprensión.
4. Ajuste automático de dificultad.
5. Ajuste manual en sesión (`Hazlo más fácil`, `Hazlo más desafiante`).
6. Dashboard niño y padre con métricas claras.

## 2. Qué quedó fuera de foco y debemos limpiar

### 2.1 Flujo prelector y gamificación temprana

Eliminar o archivar:
- `apps/web/src/app/jugar/vocales/page.tsx`
- `apps/web/src/app/jugar/silabas/page.tsx`
- `apps/web/src/app/jugar/diagnostico/page.tsx`
- `apps/web/src/app/jugar/mapa/page.tsx`
- `apps/web/src/app/jugar/stickers/page.tsx`
- `apps/web/src/components/actividades/vocales/*`
- `apps/web/src/components/actividades/silabas/*`
- `apps/web/src/components/diagnostico/*`
- `apps/web/src/components/mapa/*`
- `apps/web/src/components/mascota/*`
- `apps/web/src/lib/actividades/generadorVocales.ts`
- `apps/web/src/lib/actividades/generadorSilabas.ts`
- `apps/web/src/lib/actividades/masteryTracker.ts`
- `apps/web/src/lib/actividades/trazadoLetras.ts`

Nota: `apps/web/src/lib/actividades/fsrs.ts` solo se conserva si se reutiliza para revisión espaciada de comprensión por topic. Si no, eliminar.

### 2.2 Modelo de progreso acoplado a vocales/sílabas

Refactor obligatorio:
- `apps/web/src/contexts/StudentProgressContext.tsx`
- `apps/web/src/server/actions/session-actions.ts`
- `apps/web/src/server/actions/student-actions.ts`
- `apps/web/src/components/dashboard/DashboardHijo.tsx`

Cambiar de:
- `vocalesDominadas`, `silabasDominadas`, `vocalActual`, `silabaActual`.

A:
- `readingLevel`, `readingComprehensionTrend`, `topicProgress`, `nextReadingGoal`.

### 2.3 Datos de estudiante orientados a la UX anterior

En `packages/db/src/schema.ts`, revisar y migrar:
- mantener: `intereses`, `accesibilidad`, estructura base de `sessions` y `responses`.
- despriorizar o quitar si no se usa: `mascotaNombre`, `mascotaTipo`, `mascotaColor`, `nivelDiagnostico`, `diagnosticoCompletado`.

Agregar entidades o campos para el nuevo core:
- perfil ampliado (`familia`, `cole`, `contexto`),
- estado de nivel lector,
- metadata de historia (dificultad, topic, objetivo),
- score de comprensión por sesión,
- razón de ajuste de dificultad.

## 3. Plan de limpieza por PRs

### PR 1: corte de rutas legacy

1. Quitar navegación `mapa/vocales/silabas/diagnostico/stickers`.
2. Dejar una ruta principal provisional para el nuevo loop de lectura.
3. Eliminar componentes huérfanos relacionados con mapa y mascota.

Criterio de salida:
- no existe referencia a `/jugar/vocales`, `/jugar/silabas`, `/jugar/mapa`, `/jugar/diagnostico`.

### PR 2: refactor de dominio y server actions

1. Reescribir `session-actions` y `student-actions` al nuevo modelo.
2. Eliminar categorías de skill heredadas (`vocales`, `silabas`).
3. Sustituir sugerencias offline basadas en vocales por recomendaciones de lectura/topic.

Criterio de salida:
- no hay lógica de negocio que dependa de vocales/sílabas.

### PR 3: migración de schema y datos

1. Nueva migración Drizzle para campos/tablas del core adaptativo.
2. Migración de datos existentes o estrategia de reset controlado.
3. Limpiar columnas legacy no usadas.

Criterio de salida:
- schema consistente con spec canónico.

### PR 4: tests y limpieza final

Eliminar o reemplazar tests legacy:
- `tests/generadorVocales.test.ts`
- `tests/generadorSilabas.test.ts`
- `tests/masteryTracker.test.ts`
- `tests/fsrs.test.ts` (solo si FSRS no se reutiliza)

Crear tests nuevos del core:
- scoring de comprensión,
- decisión de dificultad,
- trazabilidad de ajuste,
- progreso por topic.

Criterio de salida:
- suite de tests describe el producto actual, no el producto descartado.

## 4. Comandos de control para verificar limpieza

```bash
rg -n "vocal|silaba|mapa|mascota|diagnostico" apps/web/src packages/db/src tests
rg -n "cueva-silabas|bosque-letras|sticker" apps/web/src
pnpm test
pnpm lint
pnpm typecheck
```

Objetivo final de grep:
- solo apariciones justificadas en migraciones o notas de compatibilidad temporal.

## 5. Definición de Done de la limpieza

1. El código no empuja al equipo hacia el flujo prelector anterior.
2. Rutas, modelos y métricas reflejan el core adaptativo actual.
3. Cualquier agente nuevo puede inferir la dirección del producto sin ambigüedad.
