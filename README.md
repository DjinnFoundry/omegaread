# OmegaRead

Lectura adaptativa para ninos de 5 a 9 anos. Historias personalizadas por LLM que se ajustan al nivel e intereses de cada nino, con preguntas de comprension y metricas de progreso para padres. Open source bajo AGPL-3.0.

## Screenshot

> _Placeholder: agrega un screenshot de la landing page aqui._

## Requisitos

- **Node.js** 20+
- **pnpm** 9+
- **PostgreSQL** 14+
- **OpenAI API key** (para generacion de historias)

## Setup

```bash
# 1. Clonar el repositorio
git clone https://github.com/juancartagena/omegaread.git
cd omegaread

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tu DATABASE_URL, AUTH_SECRET y OPENAI_API_KEY

# 4. Crear las tablas en la base de datos
pnpm db:push

# 5. Arrancar el servidor de desarrollo
pnpm dev
```

La app estara disponible en `http://localhost:3000`.

## Estructura del proyecto

```
omegaread/
├── apps/
│   └── web/              # Next.js 15, Tailwind CSS 4, React 19
│       ├── src/app/       # Rutas (App Router)
│       ├── src/components/ # Componentes UI, charts, dashboards
│       ├── src/server/    # Server actions, auth
│       └── src/lib/       # AI (OpenAI), utilidades
├── packages/
│   └── db/               # Drizzle ORM, schema PostgreSQL, migraciones
├── tests/                # Vitest, Testing Library
└── docs/                 # Specs de diseno, planning, decisiones
```

## Scripts principales

| Comando | Descripcion |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo (Turbopack) |
| `pnpm build` | Build de produccion |
| `pnpm test` | Ejecutar tests (Vitest) |
| `pnpm typecheck` | Verificar tipos TypeScript |
| `pnpm lint` | Linting con ESLint |
| `pnpm db:push` | Sincronizar schema con la BD |
| `pnpm db:studio` | Abrir Drizzle Studio (explorar BD) |

## Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Turbopack)
- **UI**: React 19, Tailwind CSS 4, SVG charts propios
- **Base de datos**: PostgreSQL + Drizzle ORM
- **AI**: OpenAI API (generacion de historias y preguntas)
- **Auth**: JWT con jose (cookies HTTP-only)
- **Testing**: Vitest + Testing Library
- **Monorepo**: pnpm workspaces

## Como contribuir

1. Fork del repo
2. Crea una rama para tu feature (`git checkout -b feat/mi-feature`)
3. Haz commit de tus cambios
4. Push a tu fork y abre un Pull Request

Lee el spec de diseno en `docs/design/` para entender la arquitectura y decisiones del producto.

## Licencia

- **Codigo**: [AGPL-3.0](LICENSE)
- **Contenido educativo**: CC-BY-SA 4.0
