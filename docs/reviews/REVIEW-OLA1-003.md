# REVIEW-OLA1-003 — Code Review Ola 1: OmegaAnywhere

**Fecha:** 2026-02-20  
**Revisor:** Claude (agente de revisión de código)  
**Alcance:** Implementación completa de Ola 1  
**Base:** `~/CodeProjects/djinn/omegaread/` @ commit actual  
**Docs de referencia:**
- `OLA-1-SPRINT.md` — Sprint spec
- `SPEC-ux-design.md` — UX spec
- `DECISIONES-CERRADAS.md` — Decisiones canónicas

---

## Resumen Ejecutivo

La Ola 1 está **sustancialmente completa**. Se ha construido un fundamento sólido: monorepo funcional, modelo de datos extensible, sistema audio-first con mascota, tres actividades de vocales con mastery, diagnóstico invisible, gamificación con estrellas y stickers, y dashboard de padre con datos accionables. La arquitectura es limpia y la calidad del código es alta para una primera ola.

Sin embargo, hay **problemas de seguridad importantes** en la autenticación del flujo del niño, **inconsistencias en el modelo de guardado** entre cliente y servidor, y varias mejoras necesarias para que la UX sea verdaderamente usable por un niño de 4-5 años sin asistencia.

**Nota global: 7.5 / 10** — Cimientos fuertes con gaps concretos que corregir antes de poner esto delante de niños reales.

---

## 1. Completitud

### ✅ Qué está bien

- **Todos los entregables del sprint están implementados:**
  - ✅ Monorepo con pnpm workspaces
  - ✅ Next.js 15 + TypeScript + Tailwind CSS 4
  - ✅ PostgreSQL + Drizzle ORM
  - ✅ Modelo de datos completo (6 tablas)
  - ✅ Auth de padres (registro + login con JWT)
  - ✅ Mascota SVG animada con TTS
  - ✅ Mapa de aventuras con 4 zonas
  - ✅ 3 actividades de vocales (reconocer, sonido, completar)
  - ✅ Mastery tracker (90%+ con ventana deslizante)
  - ✅ Diagnóstico invisible con 3 mini-juegos
  - ✅ Gamificación: estrellas + stickers + álbum
  - ✅ Dashboard padre v0.1 con métricas
  - ✅ Auto-cierre de sesión a 10 minutos
  - ✅ ESLint + Prettier configurados
  - ✅ README con instrucciones de setup

- **DoD cumplido:**
  - El niño puede ver mascota, navegar mapa, jugar vocales, ganar estrellas/stickers
  - La sesión se cierra automáticamente
  - El padre puede registrarse, crear hijo, ver progreso
  - El proyecto se levanta con `pnpm install && pnpm dev`

### 🟡 Qué hay que mejorar

- **Audios pre-grabados para instrucciones:** El sprint spec dice "TTS nativo del browser + audios pre-grabados para instrucciones". La implementación solo usa Web Speech API (TTS sintético). Para niños de 4-5, la voz sintetizada puede ser difícil de entender y varía mucho entre dispositivos. No hay fallback si el dispositivo no soporta `speechSynthesis` o no tiene voz en español.
  - **Severidad:** 🟡 importante

- **El sprint spec menciona "¿Conoce colores?" como parte del diagnóstico invisible**, pero la implementación solo incluye letras, conteo y rimas. Falta el tercer mini-juego de colores.
  - **Severidad:** 🟢 menor (las rimas evalúan conciencia fonológica, que es más relevante)

---

## 2. Calidad de Código

### ✅ Qué está bien

- **Código muy bien documentado.** JSDoc en todas las funciones exportadas, comentarios explicativos donde hace falta. Los archivos tienen headers claros que explican su propósito.
- **Componentes bien decomposados.** `SesionVocales`, `ReconocerVocal`, `SonidoVocal`, `CompletarVocal`, `LetraGrande` — cada uno con responsabilidad única. El UI kit (`BotonGrande`, `BarraProgreso`, `Estrellas`, `Celebracion`) es reutilizable.
- **Naming excelente.** Mezcla coherente de español para el dominio (`manejarSeleccion`, `vocalActual`, `avanzarFase`) e inglés para lo técnico (`useCallback`, `Progress`). Esto refleja bien el dominio del producto.
- **Sin código muerto notable.** No hay imports sin usar, funciones huérfanas ni bloques comentados.
- **Tipado correcto.** TypeScript estricto, tipos explícitos para props, estados y datos. `$type<>()` en Drizzle para columnas JSONB.
- **Separación limpia server/client.** `'use server'` y `'use client'` bien aplicados. No hay lógica de servidor en componentes ni viceversa.

### 🟡 Qué hay que mejorar

- **Función `mezclar()` (Fisher-Yates) duplicada en 3 archivos:**
  - `generadorVocales.ts` (línea ~101)
  - `ReconocerVocal.tsx` (línea ~28)
  - `DiagnosticoInvisible.tsx` (línea ~73)
  
  Debería extraerse a un `@/lib/utils/random.ts` compartido.
  - **Severidad:** 🟡 importante (DRY)

- **Type assertions en `SesionVocales.tsx` para distinguir tipos de ejercicio:**
  ```tsx
  {actividadActual === 'sonido' && 'vocalCorrecta' in ejercicio && 'opciones' in ejercicio && !('palabra' in ejercicio) && (
    <SonidoVocal
      key={ejercicioKey}
      vocalCorrecta={(ejercicio as { vocalCorrecta: Vocal; opciones: Vocal[] }).vocalCorrecta}
      opciones={(ejercicio as { vocalCorrecta: Vocal; opciones: Vocal[] }).opciones}
  ```
  
  El `useMemo` que genera el ejercicio devuelve un tipo unión. Sería más limpio usar un discriminated union con campo `tipo`:
  ```ts
  type Ejercicio = 
    | { tipo: 'reconocimiento'; vocal: Vocal; distractores: string[] }
    | { tipo: 'sonido'; vocalCorrecta: Vocal; opciones: Vocal[] }
    | { tipo: 'completar'; palabra: PalabraVocal; opciones: Vocal[] }
  ```
  - **Severidad:** 🟡 importante (type safety)

- **`eslint-disable` comments en `SesionVocales.tsx`:** Hay dos `eslint-disable-next-line react-hooks/exhaustive-deps`. Si las dependencias no son correctas, hay que arreglarlo, no silenciarlo. Específicamente, `finalizarSesion` no está en el dependency array del `useEffect` del timer, lo que podría causar stale closures.
  - **Severidad:** 🟡 importante

- **Cálculo de edad duplicado** en `DashboardHijo.tsx` y `student-actions.ts` (`crearEstudiante`). Extraer a util compartido.
  - **Severidad:** 🟢 menor

---

## 3. Arquitectura

### ✅ Qué está bien

- **Modelo de datos extensible y bien pensado:**
  - 6 tablas con relaciones claras y cascade correcto
  - Campos JSONB para configuración flexible (`config`, `metadata`, `accesibilidad`)
  - Índices en columnas de búsqueda frecuente
  - Tipos auxiliares tipados (`ParentConfig`, `DiagnosticoNivel`, `AccesibilidadConfig`)
  - Campos para spaced repetition (`proximaRevision`), dialecto, intereses — preparado para Ola 2+

- **Estructura de carpetas escalable:**
  ```
  apps/web/src/
  ├── app/           # Rutas (Page Router)
  ├── components/    # Por dominio (mascota, mapa, actividades, gamificacion, dashboard, ui)
  ├── contexts/      # Estado compartido
  ├── lib/           # Lógica pura (audio, actividades)
  └── server/        # Server actions + auth
  packages/db/       # Schema compartido
  ```
  Esto escala bien para añadir sílabas, números, etc.

- **MasteryTracker como clase pura** separada de React. Es testeable, reutilizable y tiene lógica sofisticada (ventana deslizante, mínimo de intentos, patrón de errores).

- **Guardado progresivo de datos:** Las respuestas se guardan una a una en la DB conforme ocurren, no en batch al final. Esto es crítico — si el niño cierra la app, no se pierde nada.

- **Context bien diseñado:** `StudentProgressContext` con optimistic updates locales + sync con DB. Patrón correcto para UX responsive.

### 🟡 Qué hay que mejorar

- **Divergencia MasteryTracker cliente vs servidor:** El `MasteryTracker` del cliente (en-memoria, dentro de `SesionVocales`) y el `actualizarProgresoInmediato` del servidor calculan mastery independientemente. Ambos usan ventana deslizante de 10, pero el del servidor guarda el historial en `metadata.historialReciente` y el del cliente recalcula desde su array en memoria. Si hay una desconexión temporal o un error de guardado (el catch silencia errores), pueden diverger: el cliente puede considerar una vocal "dominada" cuando el servidor aún no lo registró.
  - **Recomendación:** El servidor debería ser la fuente de verdad. Cuando `actualizarProgresoInmediato` retorna `dominada: true`, el cliente debería reaccionar a eso, no decidir por su cuenta.
  - **Severidad:** 🔴 blocker (el progreso persistido puede no coincidir con lo que el niño experimentó)

- **Acoplamiento `SesionVocales` a `VocalesPage`:** La página `vocales/page.tsx` tiene ~180 líneas con mucha lógica (crear sesión, callbacks de respuesta, estados de mascota, guardado en DB). Esto es un "fat page component". Sería mejor extraer los hooks de sesión a un custom hook `useSesionVocales()`.
  - **Severidad:** 🟡 importante (mantenibilidad)

- **No hay middleware de auth.** El acceso a `/padre/*` no está protegido por middleware de Next.js. La protección es por `requireAuth()` en cada page/action. Funciona pero es frágil — si alguien añade una nueva page sin `requireAuth()`, queda desprotegida. Un `middleware.ts` que proteja `/padre/*` sería más robusto.
  - **Severidad:** 🟡 importante

---

## 4. UX para Niños de 4-5 años

### ✅ Qué está bien

- **Audio-first implementado correctamente:**
  - La mascota habla al llegar al mapa, al entrar en actividades, al acertar/fallar
  - TTS con velocidad reducida (0.85) y pitch ligeramente alto (1.1) — apropiado para niños
  - Búsqueda inteligente de voz española con prioridad (es-MX → es-ES → es-* → spanish)
  - Sonidos programáticos para acierto, error, click y celebración sin depender de archivos de audio

- **Touch targets correctos:**
  - `LetraGrande`: mínimo 70×70px (size lg) o 90×90px (size xl) ✅
  - `ZonaMapa`: 150×150px ✅
  - CSS global: `button, a, [role="button"]` con `min-height: 48px; min-width: 48px` ✅
  - `touch-manipulation` aplicado en toda la app ✅

- **Mascota como interfaz central:**
  - SVG animado con 5 estados emocionales (feliz, pensando, celebrando, durmiendo, triste)
  - Ojos con parpadeo automático, boca expresiva, bigotes, efectos según estado
  - Reacciona a aciertos (celebra) y errores consecutivos (anima)
  - Burbuja de diálogo con indicador de "hablando"
  - `aria-label` descriptivo: `${nombre} está ${estado}`

- **Sesiones auto-cierre a 10 minutos** con timer visual (minutos restantes) y barra de progreso sin números.

- **Diagnóstico invisible** bien disfrazado: nunca muestra puntuación, la mascota reacciona igual a aciertos y errores, timeout de 5s si no responde.

- **Feedback no punitivo:** Los errores dicen "¡Casi!" o "Inténtalo otra vez", nunca "Incorrecto". La opción incorrecta no se penaliza visualmente de forma agresiva.

### 🟡 Qué hay que mejorar

- **El flujo del niño no requiere autenticación para empezar a jugar.** La página `/jugar` hace un `fetch('/api/estudiantes')` que devuelve `[]` si no hay padre autenticado. Un niño podría abrir `/jugar` y ver "¡Primero un padre debe crear tu perfil!" — lo cual es correcto, pero la ruta `/jugar/mapa` o `/jugar/vocales` podrían cargarse con un `sessionStorage` manipulado. No hay verificación server-side de que el `estudianteActivo` en sessionStorage corresponde a un estudiante real del padre autenticado en las rutas del niño.
  - **Severidad:** 🔴 blocker — ver sección 9 (Seguridad) para detalles

- **No hay indicación visual de que la mascota está hablando** antes de que aparezca la burbuja. Si el dispositivo no tiene Web Speech API (o está en mute), el niño no recibe instrucción ninguna. No hay fallback visual para las instrucciones habladas.
  - **Severidad:** 🟡 importante

- **La mascota solo es un gato.** El schema tiene `mascotaTipo` (gato, perro, buho, dragon), la selección está en el formulario de nuevo-hijo, pero el componente `Mascota.tsx` siempre renderiza un gato SVG. Los props `tipo` y `nombre` se aceptan pero no afectan el render.
  - **Severidad:** 🟡 importante (el niño/padre elige un animal y siempre ve un gato)

- **No hay navegación de vuelta desde el diagnóstico.** Si el niño empieza el diagnóstico y quiere salir, no hay botón de home ni forma de abandonar. Está atrapado hasta completar los 3 mini-juegos.
  - **Severidad:** 🟡 importante

- **La burbuja de MascotaDialogo tiene un bug con `onFinish`:** En el `useEffect`, tanto el `hablar()` callback como el `fallbackTimer` pueden llamar a `onFinish?.()` — potencialmente doble invocación. El `finalizarDialogo` tiene un `setTimeout` de 800ms, y el `fallbackTimer` usa `texto.length * 100`. Si ambos disparan, el estado padre puede corromperse.
  - **Severidad:** 🟡 importante

- **La palabra con hueco en CompletarVocal puede confundir.** `_RBOL` para "ÁRBOL" — un niño de 4-5 años que no lee no entiende qué es "\_RBOL". La actividad depende mucho del TTS y la imagen. Si el TTS falla, la actividad es incomprensible. Debería haber mayor prominencia visual del emoji/imagen como pista primaria.
  - **Severidad:** 🟢 menor (el diseño es correcto, solo necesita refinamiento visual)

---

## 5. UX para Padres

### ✅ Qué está bien

- **Dashboard con datos accionables:**
  - Vocales dominadas (indicador visual A E I O U con verde/gris)
  - Tiempo de uso hoy (en minutos)
  - Racha de días consecutivos
  - Estrellas totales
  - Sesiones hoy (con indicador verde)
  - Días de uso esta semana (L-D visual)
  - Próxima meta ("aprender la letra E")
  - Sugerencia offline personalizada ("busquen objetos que empiecen con A")
  - Stickers recientes

- **Formulario de nuevo hijo bien diseñado:** Selector visual de mascota con emojis, fecha de nacimiento, validación de edad (3-10 años).

- **Auth con login/registro separado** del flujo del niño. JWT en cookie HTTP-only. Confirmación de contraseña en registro.

### 🟡 Qué hay que mejorar

- **El dashboard no muestra "qué letras ha aprendido"** como pide el DoD. Muestra vocales dominadas (A-U) pero no letras reconocidas del diagnóstico. Los datos del diagnóstico (`nivelDiagnostico.letrasReconocidas`) se guardan pero no se muestran en el dashboard.
  - **Severidad:** 🟡 importante (DoD explícito)

- **No hay forma de editar o eliminar un perfil de hijo** desde el dashboard. Solo se pueden añadir.
  - **Severidad:** 🟢 menor (no en el DoD explícito, pero esperable)

- **El dashboard no tiene refresh automático.** Si un padre tiene el dashboard abierto mientras el niño juega, no ve cambios hasta que recarga la página.
  - **Severidad:** 🟢 menor

- **Las sugerencias offline son estáticas** — siempre el mismo patrón ("busquen objetos que empiecen con X"). Sería mejor variar: a veces trazado de letras, a veces juegos de rimas, etc.
  - **Severidad:** 🟢 menor

---

## 6. Pedagogía

### ✅ Qué está bien

- **Progresión de vocales correcta:** A → E → I → O → U, que es el orden estándar en español.
- **Mastery bien implementado:** 90%+ en ventana deslizante de últimas 10 respuestas, con mínimo de 5 intentos. Esto evita falsos positivos (3 de 3 = 100% no cuenta) y permite recuperación de errores tempranos.
- **Tres tipos de actividad complementarios:**
  - Reconocimiento visual (busca la letra) — grafema
  - Asociación fonológica (qué vocal suena) — fonema
  - Contexto léxico (completa la palabra) — significado
  Esto cubre las tres dimensiones de la conciencia fonológica.
- **Dificultad adaptativa:** Nivel 1 (consonantes fáciles como distractores) → Nivel 2 (otras vocales) → Nivel 3 (mayúsculas/minúsculas). Sube cuando el niño alcanza 70%+ en 3+ intentos.
- **Pool de palabras rico** con 6 palabras por vocal, pronunciación enfatizada ("aaárbol"), emojis representativos.
- **Anti-repetición** con `SesionTracker` que evita repetir ejercicios dentro de una sesión.
- **Feedback apropiado para la edad:** Frases variadas ("¡Genial!", "¡Muy bien!", "¡Bravo!"), nunca punitivas. Los errores consecutivos generan ánimo ("¡Tú puedes!").

### 🟡 Qué hay que mejorar

- **No hay scaffolding progresivo en caso de fallo repetido.** Si un niño falla 5 veces seguidas la misma vocal, la app sigue presentando ejercicios al mismo nivel de dificultad. Debería: (a) reducir el número de distractores, (b) dar más pistas visuales, o (c) la mascota debería modelar la respuesta correcta antes de pedirle al niño que lo intente.
  - **Severidad:** 🟡 importante (la frustración repetida puede hacer que el niño abandone)

- **El diagnóstico invisible no tiene ruta de escape** si el niño falla todo. En `JuegoLetras`, si no responde en 5s, la mascota dice "¡Esta es la A!" y avanza. Pero en `JuegoConteo`, si falla 2 veces consecutivas se detiene. Esto está bien, pero en `JuegoRimas`, SIEMPRE avanza incluso con todos incorrectos — no hay early termination si el niño claramente no entiende rimas. Debería detenerse tras 2 fallos consecutivos, igual que conteo.
  - **Severidad:** 🟢 menor

- **No hay revisión espaciada (spaced repetition).** El schema tiene el campo `proximaRevision` en `skillProgress`, pero nunca se usa. Una vez que una vocal se marca como dominada, no se revisa. En la próxima sesión, el niño empieza donde lo dejó sin reforzar lo aprendido.
  - **Severidad:** 🟡 importante (pero aceptable para Ola 1, planificado para futuro)

---

## 7. Robustez

### ✅ Qué está bien

- **Guardado progresivo:** Cada respuesta se guarda inmediatamente en la DB vía server action. Si la app se cierra a mitad de sesión, las respuestas ya están guardadas. La sesión queda marcada como no completada (`completada: false`) pero los datos no se pierden.

- **Graceful degradation:** Si la DB falla al crear sesión, el niño puede jugar sin guardado (`setReady(true)` en el catch). Si falla el guardado de una respuesta, se hace `console.warn` y el juego continúa.

- **`sessionStorage` para estado del estudiante activo** con rehidratación en los `useEffect` de las páginas del juego. Sobrevive a recargas de página dentro de la pestaña.

- **Zod validation en todos los server actions.** UUIDs, strings, números, booleanos — todo validado antes de tocar la DB.

- **Ownership verification** en cada server action con `requireStudentOwnership()`.

### 🟡 Qué hay que mejorar

- **No hay manejo de sesiones abandonadas.** Si un niño empieza una sesión y cierra la app sin completarla, queda una sesión huérfana (`completada: false`, `finalizadaEn: null`). `cargarProgresoEstudiante` la detecta (`sesionEnCurso`) pero nadie actúa sobre ello. En la siguiente visita, se crea una nueva sesión sin finalizar la anterior. Esto puede inflar métricas (sesiones sin duración, estrellas parciales).
  - **Recomendación:** Al detectar `sesionEnCurso`, finalizarla automáticamente con los datos que se tienen.
  - **Severidad:** 🟡 importante

- **Race condition en `MascotaDialogo`:** El `useEffect` que maneja `texto` crea un `fallbackTimer` y llama a `hablar()` con `onEnd`. Si el componente se desmonta y remonta rápidamente (ej: navegación rápida), el `detenerHabla()` del cleanup puede interferir con el nuevo utterance. El return del effect llama `detenerHabla()` pero el nuevo `hablar()` del siguiente render puede llegar antes que el cleanup.
  - **Severidad:** 🟢 menor

- **`sessionStorage` no sobrevive a cierre de pestaña/browser.** Si el padre cierra la pestaña y la reabre, el niño tiene que reseleccionar perfil. Esto es aceptable pero podría ser `localStorage` para mejor persistencia.
  - **Severidad:** 🟢 menor (el spec dice "online-first", no offline)

- **Error boundary ausente.** Si un componente de actividad lanza un error en runtime, toda la app se rompe con la pantalla blanca de error de React. Debería haber un `ErrorBoundary` al menos alrededor de `SesionVocales` que muestre un fallback amigable ("¡Ups! Algo salió mal. Vamos a volver al mapa.") y redirija al mapa.
  - **Severidad:** 🟡 importante

---

## 8. Performance

### ✅ Qué está bien

- **Stack ligero:** Next.js 15 con Turbopack en dev, Tailwind CSS 4 (compilado, sin runtime), Drizzle ORM (ligero vs Prisma). Sin librerías de animación pesadas — todo es CSS nativo + SVG.
- **Sonidos generados programáticamente** con AudioContext API, sin archivos de audio que cargar. Brillante decisión.
- **Mascota en SVG puro** — vectorial, ligero, no Lottie ni canvas pesado. Las animaciones son CSS (`animate-sway`, `animate-blink`).
- **Confetti con CSS puro** (40 divs con keyframes) — no canvas ni WebGL.
- **`next/font/google` con Nunito** — self-hosted, sin FOUT, con `display: swap`.
- **Viewport lock:** `userScalable: false, maximumScale: 1` — previene zoom accidental en tablets.
- **`touch-action: manipulation`** en body — elimina delay de 300ms en taps.

### 🟡 Qué hay que mejorar

- **`cargarProgresoEstudiante` hace 3 queries separadas** a la DB (habilidades, logros, sesiones) sin ningún tipo de caché. Si el mapa se carga muchas veces en una sesión, son 3+ queries cada vez. Para Ola 1 con pocos datos es aceptable, pero debería cachearse o combinarse.
  - **Severidad:** 🟢 menor

- **La query de sesiones en `cargarProgresoEstudiante` carga TODAS las sesiones** del estudiante (sin limit) para calcular `totalEstrellas`. Con el tiempo, esto puede ser lento. Mejor tener un campo acumulador o usar `SUM()`.
  - **Severidad:** 🟢 menor (no afecta en Ola 1 con pocas sesiones)

- **El `MasteryTracker` del cliente recalcula todo on every render** dentro de `useMemo` — no es un problema ahora pero con más datos podría notarse. La dependencia de `ejercicioKey` en el `useMemo` de `progreso` fuerza recálculos frecuentes.
  - **Severidad:** 🟢 menor

---

## 9. Seguridad

### ✅ Qué está bien

- **JWT correctamente implementado:**
  - HS256 con `jose` (no `jsonwebtoken` que tiene vulnerabilidades conocidas)
  - Cookie HTTP-only, Secure en producción, SameSite=Lax
  - Expiración de 7 días
  - Verificación de secreto en producción (`throw` si no existe)
  - El secreto de dev (`dev-secret-no-usar-en-produccion`) es claramente marcado

- **bcrypt con cost factor 12** para hashing de contraseñas — apropiado.

- **Ownership verification exhaustiva:** `requireStudentOwnership()` verifica en cada server action que el padre autenticado es dueño del estudiante. Las queries usan `AND(studentId, parentId)`.

- **Validación Zod en todos los server actions** — inputs validados en runtime, no solo en tipos.

- **`.env` en `.gitignore`**, `.env.example` con instrucciones claras para generar secreto con `openssl rand -base64 32`.

### 🔴 Qué hay que mejorar

- **CRÍTICO: El flujo del niño (`/jugar/*`) NO verifica autenticación server-side de forma correcta.**
  
  Veamos la cadena:
  1. `/jugar` → `fetch('/api/estudiantes')` → `GET` handler usa `obtenerPadreActual()` → si no hay cookie de auth, devuelve `[]` (no 401!)
  2. El niño selecciona perfil → se guarda en `sessionStorage` → navega a `/jugar/mapa`
  3. `/jugar/vocales` → `iniciarSesion()` server action → llama `requireStudentOwnership()` → **AQUÍ sí hay verificación de auth**
  
  Pero hay un problema: **el endpoint `GET /api/estudiantes` devuelve `[]` en vez de 401 cuando no hay auth.** Esto significa que la selección de perfil del niño depende de que haya una cookie de padre activa. Si la cookie expiró o el padre cerró sesión, el niño ve "Primero un padre debe crear tu perfil" — que es confuso, no indica que el problema es auth.
  
  **Peor: las server actions fallarán con un error no manejado** cuando el niño intente jugar y `requireStudentOwnership` lance una redirección a `/padre/login` — dentro de un componente `'use client'` del niño. El `redirect()` de Next.js lanza un error especial que probablemente se tragará o causará comportamiento inesperado.
  
  **Recomendación:**
  - Separar claramente el flujo del niño del flujo del padre
  - El endpoint `/api/estudiantes` debería devolver 401, no `[]`
  - Las server actions del niño necesitan un modelo de auth diferente: o bien el padre "inicia" la sesión del niño y eso crea un token temporal, o bien las rutas del niño están protegidas de otra forma
  - O como mínimo, manejar el caso de auth fallida gracefully en VocalesPage (redirect a `/jugar` con mensaje apropiado en vez de crash)
  - **Severidad:** 🔴 blocker

- **El `sessionStorage` del estudiante activo puede ser manipulado.** Cualquiera puede poner un JSON con un `id` diferente en `sessionStorage`. Las server actions verifican ownership, así que no se pueden hackear datos de OTRO padre, pero sí podría causar errores confusos.
  - **Severidad:** 🟡 importante

- **El secreto de dev en `.env` tiene 54 caracteres** (`dev-secret-no-usar-en-produccion-12345678901234567890`) — el `.env.example` dice "at least 32 characters" y da instrucciones de `openssl rand`. Bien documentado, pero el check en runtime solo verifica existencia en producción, no longitud mínima.
  - **Severidad:** 🟢 menor

- **No hay rate limiting** en login ni registro. Un atacante podría brute-force contraseñas. Para Ola 1 es aceptable si es solo dev, pero debe añadirse antes de cualquier despliegue.
  - **Severidad:** 🟡 importante (para cuando se despliegue)

---

## 10. Developer Experience

### ✅ Qué está bien

- **README excelente:** Estructura clara, instrucciones de setup en 6 pasos, árbol de directorios, explicación de la Ola 1 con DoD, guía de contribución.
- **`.env.example`** con todos los valores necesarios y comentarios sobre seguridad.
- **Monorepo bien configurado:** `pnpm workspaces` con alias `workspace:*`, scripts centralizados (`pnpm dev`, `pnpm db:push`, `pnpm lint`, `pnpm test`).
- **ESLint + Prettier configurados** con reglas sensatas: React hooks, no unused vars (con prefix `_`), no explicit any como warning.
- **TypeScript estricto** en todo el proyecto.
- **4 suites de tests con 45+ tests:**
  - `generadorVocales.test.ts` — generación de ejercicios (19 tests)
  - `masteryTracker.test.ts` — lógica de mastery (18 tests)
  - `ownership.test.ts` — validación Zod + estructura de auth (17 tests)
  - `sessionAutoClose.test.ts` — auto-cierre temporal (5 tests)
- **Vitest configurado** con jsdom, aliases de path, y globals.
- **Total ~7,600 líneas de código** bien distribuidas — razonable para el scope.

### 🟡 Qué hay que mejorar

- **No hay tests de componentes React.** Los tests actuales son excelentes para lógica pura, pero no hay ni un solo test de rendering de componentes con `@testing-library/react` (que está instalado como devDependency). Al menos debería haber tests para:
  - `LetraGrande` — verifica que renderiza la letra, estados correcta/incorrecta
  - `Mascota` — verifica que renderiza los diferentes estados
  - `BarraProgreso` — verifica clamping y aria attributes
  - **Severidad:** 🟡 importante

- **No hay `pnpm typecheck` en CI** ni como pre-commit hook. Se puede correr manualmente pero no está automatizado.
  - **Severidad:** 🟢 menor

- **No hay `manifest.json`** referenciado en el layout (`manifest: '/manifest.json'` en metadata) pero el archivo no existe en `/public/`. Esto causa un 404 silencioso.
  - **Severidad:** 🟢 menor

- **No hay ni `LICENSE` ni `LICENSE.md`** en la raíz del proyecto. El README dice AGPL-3.0 pero el archivo no existe.
  - **Severidad:** 🟢 menor

---

## Resumen por Severidad

### 🔴 Blockers (2)

| # | Dimensión | Issue |
|---|---|---|
| B1 | Seguridad | El flujo del niño no maneja correctamente la ausencia de auth. `/api/estudiantes` devuelve `[]` en vez de 401. Las server actions con `requireStudentOwnership` pueden causar crashes en componentes client del niño cuando redirect a `/padre/login`. |
| B2 | Arquitectura | Divergencia MasteryTracker cliente vs servidor. El mastery calculado en el navegador puede no coincidir con el persistido en DB, especialmente con errores de red silenciados. |

### 🟡 Importantes (12)

| # | Dimensión | Issue |
|---|---|---|
| I1 | Completitud | No hay audios pre-grabados ni fallback si TTS no está disponible |
| I2 | Código | `mezclar()` duplicada en 3 archivos — violar DRY |
| I3 | Código | Type assertions inseguras en SesionVocales para discriminar tipos de ejercicio |
| I4 | Código | `eslint-disable` en dependencias de hooks — posible stale closure |
| I5 | Arquitectura | Fat page component en vocales/page.tsx — extraer a custom hook |
| I6 | Arquitectura | No hay middleware de auth para `/padre/*` |
| I7 | UX Niños | Mascota siempre es gato — ignora selección de tipo (perro, buho, dragon) |
| I8 | UX Niños | No hay botón de salir/volver en el diagnóstico |
| I9 | UX Niños | Bug de doble-invocación en MascotaDialogo onFinish |
| I10 | UX Padres | Dashboard no muestra letras reconocidas del diagnóstico (DoD) |
| I11 | Pedagogía | No hay scaffolding ante fallo repetido — misma dificultad siempre |
| I12 | Robustez | Sesiones abandonadas quedan huérfanas — no se finalizan automáticamente |
| I13 | Robustez | No hay ErrorBoundary — errores de runtime rompen toda la app |
| I14 | DX | No hay tests de componentes React |

### 🟢 Menores (11)

| # | Dimensión | Issue |
|---|---|---|
| M1 | Completitud | Diagnóstico no incluye juego de colores (spec lo menciona) |
| M2 | Código | `calcularEdad()` duplicada |
| M3 | UX Niños | Fallback visual cuando TTS está en mute |
| M4 | UX Niños | Palabra con hueco puede ser confusa sin TTS |
| M5 | UX Padres | No se puede editar/eliminar perfil de hijo |
| M6 | UX Padres | Dashboard no se refresca automáticamente |
| M7 | UX Padres | Sugerencias offline estáticas |
| M8 | Pedagogía | Rimas no tiene early termination por fallos consecutivos |
| M9 | Pedagogía | Spaced repetition no implementado (campo existe) |
| M10 | Robustez | sessionStorage vs localStorage |
| M11 | Robustez | Race condition en MascotaDialogo en desmontajes rápidos |
| M12 | Performance | Queries sin caché en cargarProgresoEstudiante |
| M13 | Performance | Carga todas las sesiones para sumar estrellas |
| M14 | DX | manifest.json referenciado pero no existe |
| M15 | DX | Falta archivo LICENSE |
| M16 | Seguridad | Rate limiting ausente en auth endpoints |

---

## Nota Global: 7.5 / 10

### Justificación

**Lo que eleva la nota:**
- Modelo de datos excelente, extensible y bien tipado
- Arquitectura de componentes limpia y escalable
- MasteryTracker y generadores de ejercicios son piezas de software de alta calidad
- El sistema de gamificación (sonidos programáticos, confetti CSS, stickers) es creativamente resuelto
- Guardado progresivo de datos — la decisión correcta para una app para niños
- Tests de lógica de negocio sólidos
- Documentación ejemplar (README, JSDoc, comentarios)

**Lo que baja la nota:**
- 2 blockers de seguridad/consistencia que necesitan resolverse antes de testing con usuarios reales
- La mascota — que es la interfaz central según el spec — solo funciona como gato
- La UX del niño depende excesivamente de que TTS funcione correctamente
- Falta test coverage en la capa de presentación

**En contexto:** Para una Ola 1 de ~3 semanas, esto es un trabajo impresionante. El fundamento es fuerte. Los problemas identificados son todos resolubles en una iteración corta (1-2 días para los blockers, 3-5 días para los importantes). La nota refleja que **es un buen cimiento que necesita pulido** antes de llegar a manos de niños.

### Priorización recomendada

1. **Primero (1 día):** Resolver B1 (auth del flujo del niño) y B2 (divergencia mastery)
2. **Segundo (2 días):** I7 (mascota multi-tipo), I9 (bug MascotaDialogo), I13 (ErrorBoundary), I12 (sesiones huérfanas)
3. **Tercero (2-3 días):** I1 (fallback TTS), I3 (discriminated unions), I5 (custom hook), I11 (scaffolding pedagogía), I14 (tests componentes)
4. **Backlog Ola 2:** Los items menores + I6 (middleware) + rate limiting

---

*Review completado 2026-02-20. Código revisado: ~7,600 líneas en 35 archivos.*
