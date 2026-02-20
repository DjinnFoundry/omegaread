# Ola 1: Cimientos — "Un niño de 5 puede usarlo"

Semanas: 1-3 (16 semanas total del proyecto)
Estado: EN PROGRESO

## Objetivo
Construir el esqueleto funcional de la app: un niño de 5 años puede abrirla, conocer su mascota, jugar con letras 10 minutos, ganar un sticker, y el padre ve un resumen básico.

## Stack (decisiones cerradas)
- **Framework**: Next.js + TypeScript + Tailwind CSS
- **DB**: PostgreSQL (Prisma/Drizzle ORM)
- **Monorepo**: pnpm workspaces
- **Audio**: TTS nativo del browser + audios pre-grabados para instrucciones
- **i18n**: español (es-ES) como idioma principal
- **Licencia**: AGPL-3.0

## Entregables

### 1. Setup del proyecto
- Monorepo con pnpm workspaces
- Next.js app con TypeScript + Tailwind
- PostgreSQL con ORM (Prisma o Drizzle, elegir uno)
- Estructura de carpetas limpia: `/app`, `/components`, `/lib`, `/server`
- ESLint + Prettier configurados
- README.md con instrucciones de setup para contribuidores

### 2. Modelo de datos base
- `Student` (nombre, edad, idioma, fecha_creacion)
- `Parent` (email, password_hash, relacion con students)
- `Session` (student_id, tipo_actividad, duracion, fecha, completada)
- `Response` (session_id, pregunta, respuesta, correcta, tiempo_respuesta)
- `Achievement` (student_id, tipo, fecha_ganado, metadata)
- `SkillProgress` (student_id, skill_id, nivel_mastery, ultima_practica)
- Auth básica para padres (registro + login)

### 3. UX Audio-first: Mascota + Mapa
- **Mascota**: personaje animado simple (puede ser SVG/Lottie) que:
  - Saluda al niño por su nombre (TTS)
  - Da instrucciones habladas ("¡Vamos a jugar con las letras!")
  - Celebra aciertos (animación + sonido)
  - Consuela errores ("¡Casi! Inténtalo otra vez" — sin penalizar)
- **Mapa de Aventuras**: pantalla principal con zonas tocables (sin texto)
  - Zona 1: Letras (activa en Ola 1)
  - Zona 2: Sílabas (bloqueada, "próximamente")
  - Zona 3: Números (bloqueada)
  - Cada zona es un área visual grande que el niño toca
- **Navegación sin texto**: todo por iconos + audio

### 4. Módulo Pre-lectura: Vocales
- **Actividad 1: Reconocimiento de vocales**
  - La mascota dice "¿Dónde está la A?" → muestra 3-4 letras grandes
  - El niño toca la correcta → celebración
  - Feedback inmediato con sonido (acierto/fallo)
  - Progresión: A → E → I → O → U (una a una, mastery antes de siguiente)
  
- **Actividad 2: Sonido de vocales**
  - La mascota reproduce el sonido de una vocal
  - El niño debe elegir cuál es
  - Asociación fonema-grafema

- **Actividad 3: Completar la vocal**
  - Palabra con vocal faltante mostrada como imagen + audio
  - Ej: _SO (imagen de oso, mascota dice "ooooso") → el niño elige O
  
- **Mastery**: 90%+ en cada vocal antes de desbloquear la siguiente
- **Sesión**: auto-cierre a los 10-12 minutos para edad 4-5

### 5. Diagnóstico invisible
- Al primer uso, la mascota "juega" con el niño para evaluar nivel:
  - ¿Reconoce letras? (muestra 5 letras, pide identificar)
  - ¿Cuenta hasta 10? (muestra objetos, pide contar)
  - ¿Conoce colores? (asociación)
- Duración: ~5-6 minutos, disfrazado de juego
- Resultado: nivel inicial asignado internamente (no mostrado al niño)
- Datos guardados para dashboard del padre

### 6. Gamificación base
- **Estrellas** por actividad completada (no XP numérico)
- **Primer sticker** al completar primera sesión
- **Colección de stickers** visible en una pantalla del mapa
- **Sonidos de celebración** variados (no repetitivos)

### 7. Dashboard padre (v0.1)
- Login separado del niño
- Vista simple:
  - Nombre del niño + edad
  - Días de uso esta semana
  - Letras reconocidas (progreso visual)
  - Tiempo de uso hoy
  - "Próxima meta: aprender la letra E"
- Sin gráficas complejas — solo datos claros y accionables

## Criterio de Done (DoD)

✅ Un niño de 5 años puede:
1. Abrir la app y ver su mascota
2. Navegar el mapa tocando zonas
3. Jugar con vocales durante 10 min
4. Ganar estrellas y un sticker
5. La sesión se cierra automáticamente

✅ Un padre puede:
1. Registrarse y crear perfil del niño
2. Ver resumen básico de progreso
3. Ver qué letras ha aprendido

✅ Técnicamente:
1. El código está limpio y bien estructurado
2. El proyecto se puede clonar y levantar con `pnpm install && pnpm dev`
3. Modelo de datos soporta extensión futura (sesiones, skills, achievements)
4. Responsive: funciona en tablet y móvil
5. Español (es-ES) como idioma por defecto

## Fuera de scope (Ola 2+)
- Sílabas y palabras (Ola 2)
- ASR / lectura en voz alta (Ola 3)
- Matemáticas (Ola 4)
- Sync multi-dispositivo
- App stores
- Múltiples idiomas
