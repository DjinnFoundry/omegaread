# 🌟 OmegaAnywhere

**Plataforma educativa open source para niños de 4 a 8 años.**

Lectura, números y aventuras — en español, audio-first, con mascota y mapa de aventuras.

## 🎯 ¿Qué es?

OmegaAnywhere es una app educativa diseñada **desde cero para niños pequeños**:

- 🔊 **Audio-first**: La mascota habla, da instrucciones y celebra. Los niños de 4-5 años no leen.
- 🗺️ **Mapa de aventuras**: Navegación visual sin texto — el niño toca zonas del mapa.
- 🐱 **Mascota compañera**: Un amigo que acompaña al niño, reacciona y evoluciona.
- 📖 **Lectura en español**: Método silábico-mixto (vocales → sílabas → palabras).
- ⭐ **Gamificación**: Estrellas, stickers coleccionables, celebraciones.
- 👨‍👩‍👧 **Dashboard de padres**: Progreso, tiempo de uso, sugerencias offline.

## 🛠️ Stack técnico

- **Framework**: Next.js 15 + TypeScript + Tailwind CSS 4
- **Base de datos**: PostgreSQL + Drizzle ORM
- **Monorepo**: pnpm workspaces
- **Audio**: Web Speech API (TTS nativo del browser)
- **Licencia**: AGPL-3.0

## 🚀 Setup rápido

### Requisitos

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL (local o Docker)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-org/omegaread.git
cd omegaread

# Instalar dependencias
pnpm install

# Crear base de datos
createdb omegaread

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL si es diferente

# Crear tablas en la base de datos
pnpm db:push

# Iniciar en modo desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del proyecto

```
omegaread/
├── apps/
│   └── web/                 # App Next.js principal
│       ├── src/
│       │   ├── app/         # Rutas (App Router)
│       │   │   ├── jugar/   # Interfaz del niño
│       │   │   │   ├── mapa/       # Mapa de aventuras
│       │   │   │   ├── vocales/    # Actividad de vocales
│       │   │   │   ├── diagnostico/# Diagnóstico invisible
│       │   │   │   └── stickers/   # Colección de stickers
│       │   │   └── padre/   # Interfaz del padre
│       │   │       ├── login/      # Login
│       │   │       ├── registro/   # Registro
│       │   │       ├── dashboard/  # Dashboard de progreso
│       │   │       └── nuevo-hijo/ # Crear perfil de hijo
│       │   ├── components/  # Componentes React
│       │   │   ├── mascota/       # Mascota animada
│       │   │   ├── mapa/          # Mapa de aventuras
│       │   │   ├── actividades/   # Componentes de actividades
│       │   │   ├── gamificacion/  # Stickers, estrellas
│       │   │   ├── diagnostico/   # Diagnóstico invisible
│       │   │   ├── dashboard/     # Dashboard padre
│       │   │   └── ui/            # Componentes UI base
│       │   ├── lib/         # Utilidades
│       │   │   ├── audio/         # TTS y efectos de sonido
│       │   │   └── actividades/   # Generadores y tracking
│       │   └── server/      # Lógica del servidor
│       │       ├── auth.ts        # Autenticación
│       │       └── actions/       # Server Actions
│       └── ...
├── packages/
│   └── db/                  # Schema de base de datos (Drizzle)
├── docs/                    # Documentación y planificación
└── ...
```

## 📋 Ola 1 — "Un niño de 5 puede usarlo"

### ✅ Entregables

1. **Setup monorepo** + Next.js + PostgreSQL + Drizzle ORM
2. **Modelo de datos**: Padres, estudiantes, sesiones, respuestas, logros, progreso
3. **Auth de padres**: Registro + login
4. **Mascota + Mapa de aventuras**: UX audio-first, navegación visual
5. **Módulo pre-lectura: Vocales**: 3 actividades (reconocer, sonido, completar)
6. **Diagnóstico invisible**: Evalúa nivel disfrazado de juego
7. **Gamificación**: Estrellas + stickers coleccionables
8. **Dashboard padre v0.1**: Progreso por hijo

### 🎯 Definition of Done

Un niño de 5 años puede:
- ✅ Abrir la app y ver su mascota
- ✅ Navegar el mapa tocando zonas
- ✅ Jugar con vocales durante 10 min
- ✅ Ganar estrellas y un sticker
- ✅ La sesión se cierra automáticamente

Un padre puede:
- ✅ Registrarse y crear perfil del niño
- ✅ Ver resumen básico de progreso

## 🌐 Idioma

Español (es-ES) como idioma por defecto. La estructura está preparada para i18n (más idiomas en el futuro).

## 🤝 Contribuir

Este proyecto es open source. Las contribuciones son bienvenidas:

1. Fork del repositorio
2. Crear branch: `git checkout -b feat/mi-mejora`
3. Commit: `git commit -m "feat: mi mejora"`
4. Push: `git push origin feat/mi-mejora`
5. Abrir Pull Request

## 📄 Licencia

- **Código**: [AGPL-3.0](LICENSE)
- **Contenido educativo**: CC-BY-SA 4.0

---

*Hecho con ❤️ para familias hispanohablantes*
