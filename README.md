# OmegaRead

OmegaRead es la primera app de OmegaAnywhere.

Foco actual (reboot): lectura adaptativa para niños `5+` que ya leen, pero necesitan mejorar comprensión y ritmo.

## Core del producto

1. Perfil enriquecido del niño (identidad, contexto, intereses).
2. Historias personalizadas por nivel e intereses.
3. Preguntas de comprensión al final de cada lectura.
4. Ajuste de dificultad automático según desempeño.
5. Ajuste manual en sesión: `Hazlo más fácil` / `Hazlo más desafiante`.
6. Dashboards de niño y padre con gráficas claras.

## Documentación canónica

Estos archivos son la fuente de verdad para cualquier agente/equipo:

- `docs/planning/DECISIONES-CERRADAS.md`
- `docs/design/SPEC-OMEGAREAD-CORE-ADAPTATIVO-2026-02-20.md`
- `docs/design/SPEC-DASHBOARD-NINO.md`
- `docs/planning/SPRINTS-OMEGAREAD-REBOOT-2026-02-20.md`
- `docs/planning/BACKLOG-OMEGAREAD-REBOOT-2026-02-20.md`

## Setup rápido

```bash
pnpm install
pnpm db:push
pnpm dev
```

## Stack

- Next.js + TypeScript + Tailwind
- PostgreSQL + Drizzle
- Monorepo con pnpm workspaces

## Licencia

- Código: AGPL-3.0
- Contenido educativo: CC-BY-SA 4.0
