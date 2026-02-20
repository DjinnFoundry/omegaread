# Code Review: OmegaAnywhere — Ola 1
**Fecha:** 2026-02-20  
**Revisor:** dhh (agente autónomo)  
**Scope:** Implementación completa de Ola 1 ("Un niño de 5 puede usarlo")  
**Archivos revisados:** ~6,000 líneas en 40+ archivos  

---

## 1. Completitud

### ✅ Qué está bien
- **Todos los entregables del sprint están implementados.** Setup monorepo, modelo de datos, auth de padres, mascota + mapa, módulo de vocales (3 actividades), diagnóstico invisible, gamificación base (estrellas + stickers), dashboard de padre v0.1.
- El DoD del niño se cumple: abrir → ver mascota → navegar mapa → jugar vocales → ganar estrellas/sticker → auto-cierre a 10 min.
- El DoD del padre se cumple: registrarse, crear perfil de hijo, ver resumen de progreso.

### ⚠️ Qué falta o es incompleto
- 🟡 **ESLint + Prettier NO están configurados.** El sprint dice explícitamente "ESLint + Prettier configurados" y no hay ni `.eslintrc`, ni `.prettierrc`, ni dependencias de estos en ningún `package.json`. Esto es parte del DoD técnico.
- 🟡 **No hay tests.** Cero archivos `*.test.*` o `*.spec.*`. El sprint no los exige explícitamente, pero para "código limpio y bien estructurado" (DoD técnico punto 1), tests unitarios del `MasteryTracker` y `generadorVocales` serían esperables.
- 🟡 **Dashboard padre: falta "Próxima meta: aprender la letra E".** El sprint lo lista explícitamente y no está implementado — solo muestra vocales dominadas pero no sugiere la siguiente meta.
- 🟡 **Dashboard padre: falta "Días de uso esta semana".** El sprint pide esto, se implementó racha (consecutiva) pero no la vista semanal con los días específicos.
- 🟢 **No hay `manifest.json`** referenciado en `layout.tsx` metadata. Falta el archivo para PWA básica.
- 🟢 **No hay directorio `public/`** visible. No hay favicon, ni manifest, ni assets estáticos.

**Severidad:** 🟡 ESLint/Prettier es importante para un proyecto open source que busca contribuidores.

---

## 2. Calidad de código

### ✅ Qué está bien
- **Naming excelente.** Mezcla español/inglés intencionada y consistente: español para dominio (vocales, mascota, diagnóstico), inglés para técnico (MasteryTracker, SesionTracker). Los nombres son auto-descriptivos.
- **Documentación en código magnífica.** JSDoc en todas las funciones públicas, interfaces y tipos bien documentados. Los comentarios de cabecera explican el "por qué", no solo el "qué".
- **Componentes razonablemente pequeños y reutilizables.** `LetraGrande`, `BotonGrande`, `BarraProgreso`, `Estrellas`, `Celebracion` — primitivos bien abstraídos.
- **Separación de concerns clara:** `lib/` para lógica pura, `components/` para UI, `server/` para backend, `app/` para routing.
- **No hay código muerto ni commented-out code.**

### ⚠️ Qué hay que mejorar

- 🟡 **Duplicación significativa entre `SesionVocales.tsx` y `vocales/page.tsx`.** Ambos implementan el flujo completo de sesión de vocales con lógica de mastery, progresión A→E→I→O→U, auto-cierre por tiempo, y generación de ejercicios. `SesionVocales.tsx` (150+ líneas) es un componente standalone bien hecho, pero la `page.tsx` (250+ líneas) reimplementa todo desde cero con su propia versión de mastery, progresión y estado. **Uno de los dos sobra.** Esto es un smell serio — un contribuidor no sabría cuál usar.

  ```
  # Lógica duplicada:
  SesionVocales.tsx: líneas ~40-200 (MasteryTracker, CICLO_ACTIVIDADES, DURACION_MAX_MS)
  vocales/page.tsx:  líneas ~30-180 (calcularMastery manual, ACTIVIDADES, DURACION_MAX_MS)
  ```

- 🟡 **`vocales/page.tsx` tiene una implementación inferior de mastery.** Usa `respuestas.slice(-5)` con lógica manual en vez del `MasteryTracker` que ya existe y es más sofisticado (ventana deslizante de 10, mínimo 5 intentos). La page reimplementa mal lo que el componente hace bien.

- 🟡 **Inline `<style>` tags repetidos.** Prácticamente todos los componentes inyectan CSS inline con `<style>{...}</style>`. `LetraGrande`, `ZonaMapa`, `Celebracion`, `Estrellas`, `StickerReveal`, `ReconocerVocal`, `SonidoVocal`, `CompletarVocal` — todos tienen sus propias `@keyframes`. Esto:
  1. Duplica animaciones idénticas (ej: `vuela-estrella` aparece en 3 componentes con nombres ligeramente distintos)
  2. Se inyecta en cada render, creando `<style>` tags duplicados en el DOM
  3. Debería estar en `globals.css` o en un archivo de animaciones compartido

- 🟢 **`stickers/page.tsx` usa datos hardcodeados.** Los stickers `ganado: true/false` están en el código fuente. No consulta la DB ni usa `sessionStorage` del estudiante activo. Es un placeholder, no funcionalidad real.

- 🟢 **`Mascota.tsx` ignora las props `nombre` y `tipo`.** El SVG siempre renderiza un gato naranja, sin importar el `tipo` pasado como prop. El nombre se usa solo en el `aria-label`. Esto está bien como v0.1, pero el prop sugiere funcionalidad que no existe.

**Severidad:** 🟡 La duplicación `SesionVocales`/`page.tsx` es el issue más grave — código duplicado divergente es deuda técnica peligrosa.

---

## 3. Arquitectura

### ✅ Qué está bien
- **Monorepo bien estructurado.** `apps/web` + `packages/db` con pnpm workspaces. La separación es correcta y escalable.
- **Drizzle ORM como elección.** Tipo-seguro, ligero, mejor DX que Prisma para este caso. El schema es limpio y usa tipos auxiliares TypeScript (`ParentConfig`, `DiagnosticoNivel`, `AccesibilidadConfig`).
- **Modelo de datos excelente.** Las 6 tablas cubren todo lo necesario para Olas 1-5. `skillProgress` con campos para spaced repetition (`proximaRevision`) muestra visión a futuro. Los `jsonb` para metadata/config son extensibles sin migraciones.
- **Índices correctos.** `sessions_student_idx`, `sessions_fecha_idx`, `skill_id_idx` — los queries más frecuentes estarán cubiertos.
- **Server Actions de Next.js bien usadas.** `auth-actions.ts` y `student-actions.ts` separan la lógica de mutación correctamente.
- **Estructura de carpetas de componentes clara y escalable:** `actividades/vocales/`, `mascota/`, `mapa/`, `gamificacion/`, `diagnostico/`, `dashboard/`, `ui/`.

### ⚠️ Qué hay que mejorar

- 🔴 **No hay capa de estado compartido para la sesión del niño.** El `estudianteActivo` se guarda en `sessionStorage` y cada página lo lee independientemente con `JSON.parse(sessionStorage.getItem(...))`. No hay:
  - Context provider
  - Store (Zustand, Jotai)
  - Ni siquiera un hook reutilizable `useEstudianteActivo()`
  
  Esto significa que:
  1. Las estrellas ganadas en `/jugar/vocales` **no se reflejan** en el mapa al volver (el mapa siempre muestra `estrellas={0}`)
  2. No hay forma de mantener estado entre pantallas sin duplicar reads de `sessionStorage`
  3. Los stickers ganados no se sincronizan con la página de stickers (que tiene datos hardcoded)
  
  Para una app educativa infantil, **la persistencia de estado entre pantallas es fundamental** — el niño necesita ver que sus logros se mantienen.

- 🟡 **`/api/estudiantes` es una API route que debería ser un Server Action o RSC.** Mezcla dos patrones: la mayoría de la app usa Server Actions, pero la selección de perfiles usa una API route con `fetch()` en el cliente. Esto crea inconsistencia y añade un endpoint público innecesario.

- 🟡 **Falta una capa de validación de datos.** No hay Zod ni ningún schema validation en server actions ni API routes. `crearEstudiante` confía ciegamente en `formData.get('nombre') as string`. Un padre podría crear un estudiante con nombre vacío (la validación es solo "truthy", no comprueba longitud, caracteres especiales, etc.).

- 🟡 **El mastery tracker vive solo en memoria del cliente.** `MasteryTracker` es una clase instanciada con `useRef` que se pierde al cerrar la página. Si el niño cierra a mitad de sesión, todo el progreso de mastery desaparece. El `skillProgress` en DB existe pero nunca se consulta para restaurar estado.

- 🟢 **No hay middleware de auth.** Las rutas `/padre/*` no están protegidas a nivel de middleware — dependen de que cada page llame `requireAuth()`. Un middleware en Next.js sería más robusto y centralizado.

**Severidad:** 🔴 La falta de estado compartido entre pantallas es un blocker para UX real. Un niño gana estrellas y al volver al mapa ve 0.

---

## 4. UX para niños de 4-5 años

### ✅ Qué está bien
- **Audio-first implementado correctamente.** Cada interacción tiene TTS: la mascota saluda, da instrucciones ("¡Busca la A!"), celebra aciertos ("¡Muy bien!"), consuela errores ("¡Casi!"). El `tts.ts` es limpio y busca voces españolas con prioridad inteligente (es-MX → es-ES → es-* → spanish).
- **Touch targets generosos.** `LetraGrande` tiene `min-w-[90px] min-h-[90px]` para tamaño XL. `ZonaMapa` es `150x150px`. `BotonGrande` mínimo 64px. El CSS global aplica `min-height: 48px; min-width: 48px` a todos los botones/links. Esto cumple con el spec (60-80pt para 4-5 años).
- **`touch-manipulation` en body y en botones.** Previene zoom accidental y doble-tap delays. Excelente para tablets.
- **`user-select: none` global.** Previene selección accidental de texto. Los inputs permiten selección con override.
- **`-webkit-tap-highlight-color: transparent`.** Elimina el flash azul/gris en taps de iOS/Android.
- **Feedback multisensorial.** Sonido `acierto()` (do-mi-sol ascendente), `error()` (tono suave descendente), `click()` (feedback táctil). Los sonidos son generados programáticamente con AudioContext — no requieren archivos descargados.
- **Sesión auto-cierre a 10 min.** `DURACION_MAX_MS = 10 * 60 * 1000` con timer que verifica cada segundo/10 segundos.
- **Diagnóstico invisible bien disfrazado.** Los 3 mini-juegos parecen juegos reales. Sin puntuación visible. Timeout de 5s si el niño no responde (la mascota da la respuesta y avanza).
- **Celebraciones ricas.** Confetti con 40 piezas en CSS puro, flip card para sticker reveal, estrellas animadas.
- **Mascota expresiva.** 5 estados emocionales con SVG animado (ojos, boca, accesorios cambian). Animaciones `sway`, `blink`, `zzz`, `bounce`.

### ⚠️ Qué hay que mejorar

- 🟡 **La mascota NO funciona como interfaz real.** En el spec se describe como el punto central de interacción — "la mascota habla al niño como un amigo". En la implementación:
  1. En el **mapa**, la mascota está arriba pero es pequeña (120px) y no saluda al llegar
  2. En **vocales/page.tsx**, la mascota está en un rincón (size `sm` = 80px) como decoración, no como guía principal
  3. El diálogo de la mascota desaparece después de hablar y no hay forma de que el niño le pida que repita
  4. **No hay saludo inicial personalizado** al llegar al mapa (la mascota debería decir "¡Hola [nombre]!")
  
  La mascota debería ser el elemento dominante de la pantalla en las transiciones y saludos.

- 🟡 **La navegación `/jugar` requiere que el padre haya hecho login previamente.** Si el padre no está logueado, el endpoint `/api/estudiantes` devuelve `[]` y el niño ve "¡Primero un padre debe crear tu perfil!" — lo cual es texto que un niño de 4 años NO puede leer. Debería hablar esta instrucción o redirigir directamente.

- 🟡 **El diagnóstico intro necesita que el niño lea "¡Sí, a jugar!"** — hay un botón con texto `🎮 ¡Sí, a jugar!`. Para un niño de 4 años, este botón debería ser solo el emoji gigante con TTS al renderizar que diga "¡Toca aquí para empezar!".

- 🟡 **La página de inicio (landing) tiene texto que el niño no puede leer.** Los botones "¡A jugar!" y "Soy padre/madre" son texto sobre fondo de color. El spec dice: "4-5 años: NINGÚN texto. Solo iconos + audio." Los botones deberían tener emojis más prominentes y audio al renderizar.

- 🟢 **El sonido de error es suave pero la experiencia no es completamente "sin penalizar".** Después de un error, `ReconocerVocal` llama `onError()` inmediatamente, lo que registra el error en el tracker. El niño obtiene un nuevo intento pero el error ya se contó. El spec dice "sin penalizar" — debería considerar dar 2 intentos antes de contar como error.

- 🟢 **Web Speech API puede no estar disponible en todos los dispositivos.** No hay fallback visible (el `hablar()` simplemente no hace nada si `window.speechSynthesis` no existe). Para un app audio-first, debería al menos mostrar un indicador visual de que el audio no está disponible o sugerir al padre activar TTS.

- 🟢 **`userScalable: false` en viewport.** Esto es correcto para prevenir zoom accidental de niños, pero en la UX spec de accesibilidad (P12), se menciona que padres con baja visión podrían necesitar zoom. Considerar habilitarlo solo en las rutas `/padre/*`.

**Severidad:** 🟡 La mascota como decoración vs como interfaz es una diferencia significativa respecto al spec.

---

## 5. UX para padres

### ✅ Qué está bien
- **Auth funcional:** Registro con nombre/email/password, login, logout, sesión con JWT en cookie HTTP-only.
- **Dashboard Server Component.** Se renderiza en servidor, lo que es correcto para datos sensibles y SEO.
- **Datos accionables en el dashboard:** vocales dominadas, tiempo hoy (min), racha (días consecutivos), estrellas totales, stickers recientes.
- **Formulario de nuevo hijo bien pensado:** nombre, fecha nacimiento, selección de mascota visual (4 opciones con emojis), nombre de mascota.
- **Sugerencia offline en el dashboard:** "Practiquen las vocales en casa: busquen objetos que empiecen con A". Esto es exactamente lo que el spec pide.
- **Estilos consistentes y profesionales** en las páginas de padre. Rounded corners, colores suaves, buen uso del espacio.

### ⚠️ Qué hay que mejorar

- 🟡 **Falta "Qué letras ha aprendido" de forma clara.** El DoD dice "Ver qué letras ha aprendido" — el dashboard muestra vocales dominadas como círculos coloreados pero no hay un indicador de "actualmente trabajando en la E" ni "próxima meta".
- 🟡 **No hay validación de edad en el perfil del hijo.** Un padre puede crear un perfil con fecha de nacimiento de ayer (niño de 0 años) o de hace 50 años. Debería validar que la edad esté entre 3-10 años.
- 🟡 **No se muestra la sugerencia offline de forma personalizada.** Siempre dice lo de la A sin importar qué vocal está practicando el niño. Debería usar el progreso real.
- 🟢 **El botón "Salir" del dashboard es muy discreto.** `bg-neutro/20` — podría confundirse con un elemento deshabilitado.

**Severidad:** 🟡 El dashboard cumple lo mínimo pero le faltan elementos del DoD.

---

## 6. Pedagogía

### ✅ Qué está bien
- **Método silábico-mixto correctamente implementado.** Progresión de vocales A → E → I → O → U antes de pasar a sílabas (Ola 2). Esto sigue la tradición pedagógica hispanoamericana.
- **3 tipos de actividad correctamente diseñados:**
  1. Reconocimiento grafema (visual → "¿Dónde está la A?")
  2. Asociación fonema-grafema (audio → "¿Qué vocal suena?")
  3. Conciencia fonológica contextual (palabra → "_SO" con 🐻 → O)
  
  Esto cubre las tres dimensiones necesarias del aprendizaje de vocales.
- **Mastery con ventana deslizante.** `MasteryTracker` usa las últimas 10 respuestas, requiere mínimo 5 intentos y ≥90% para considerar dominada. Esto evita el "acerté 2 de 2 = 100% = dominada".
- **Pool de palabras variado y bien curado.** 6 palabras por vocal con emojis descriptivos, pronunciación enfatizada ("aaaarbol", "ooooso"). Las palabras son de alta frecuencia y familiares para niños hispanos.
- **Niveles de dificultad progresivos en reconocimiento:**
  - Nivel 1: vocal vs consonantes muy diferentes (A vs M, S, P)
  - Nivel 2: vocal vs otras vocales (A vs E, O, U)
  - Nivel 3: mezcla mayúsculas/minúsculas
- **Diagnóstico invisible cubre 3 dimensiones:** reconocimiento de letras, conteo, conciencia fonológica (rimas). Es una evaluación legítima disfrazada de juego.

### ⚠️ Qué hay que mejorar

- 🟡 **El mastery en `vocales/page.tsx` es inferior al de `MasteryTracker`.** La page usa `slice(-5)` con solo 5 respuestas, sin ventana deslizante. Si un niño falla las primeras 3 y acierta 5 seguidas → el tracker ve 5/5=100% y marca como dominada demasiado pronto. El `MasteryTracker` con ventana de 10 es mejor. **Usar el componente `SesionVocales` o el tracker, no reimplementar.**

- 🟡 **Pronunciación enfatizada puede ser confusa con Web Speech API.** TTS va a pronunciar "aaaarbol" de forma robótica, no como un humano diría "ááááárbol" enfatizando. La decisión D-004 dice "TTS nativo" pero menciona "audios pre-grabados para instrucciones" — no hay ningún audio pre-grabado. Para las pronunciaciones enfatizadas de vocales, audio pregrabado sería significativamente mejor.

- 🟢 **El diagnóstico de conteo tiene un bug sutil.** En `JuegoConteo`, el niño debe tocar objetos EN ORDEN (`idx !== objetosTocados`) — si toca el segundo antes del primero, no pasa nada. Un niño de 4 años no entiende que hay un orden específico. Debería aceptar toques en cualquier orden o dar feedback de que necesita tocar el siguiente.

- 🟢 **Rimas del diagnóstico limitadas a 4 pares.** Para una evaluación de conciencia fonológica, 4 pares (GATO/PATO, SOL/COL, LUNA/CUNA, MESA/FRESA) pueden no ser suficientes para un diagnóstico preciso. Pero para Ola 1 es aceptable.

- 🟢 **No hay adaptación por resultado de diagnóstico.** El diagnóstico se guarda pero no se usa para ajustar el punto de partida de vocales. Un niño que reconoce todas las letras sigue empezando por la A. Esto es aceptable para Ola 1 pero debería documentarse como tarea pendiente.

**Severidad:** 🟡 El mastery duplicado con implementación inferior es el issue principal.

---

## 7. Robustez

### ✅ Qué está bien
- **Anti-spam de toques implementado.** Todos los ejercicios usan `bloqueado`/`setBloqueado(true)` al seleccionar una respuesta. Un niño que toque todo rápido solo registrará la primera selección.
- **Timer fallback en `MascotaDialogo`.** Si TTS falla o tarda mucho, se auto-oculta basado en la longitud del texto. Buen defensive coding.
- **`detenerHabla()` en cleanup.** `MascotaDialogo` llama `speechSynthesis.cancel()` en el return del `useEffect`. Evita speech superpuesto.
- **`SesionTracker` anti-repetición.** Evita que se repitan palabras dentro de la misma sesión de "completar vocal". Cuando se agotan, resetea y recicla.
- **Diagnóstico con timeout de 5s.** Si el niño no responde a la letra en el diagnóstico, la mascota da la respuesta y avanza. Previene que se quede atascado.

### ⚠️ Qué hay que mejorar

- 🔴 **Si el niño cierra la app a mitad de sesión, se pierde TODO.** El mastery (en `MasteryTracker` via `useRef`), las respuestas (en estado React), las estrellas — todo vive en memoria. `guardarResultados()` solo se llama en `finalizarSesion()`. Si el niño cierra la pestaña a los 5 minutos:
  - Las respuestas se pierden
  - No se guardan estrellas ni stickers
  - El mastery vuelve a 0 en la siguiente visita
  
  **Solución mínima:** guardar respuestas individuales progresivamente (cada N respuestas o cada 30s) con `actualizarProgreso()`.

- 🟡 **`sessionStorage` para estudiante activo es frágil.** Si el usuario abre la app en una nueva pestaña, `sessionStorage` está vacío y redirige a `/jugar`. Debería considerar `localStorage` o un parámetro en la URL.

- 🟡 **AudioContext puede no resumirse correctamente.** `obtenerContexto()` intenta `audioCtx.resume()` si está suspended, pero en iOS Safari, el AudioContext solo puede resumirse desde un gesto del usuario. La primera vez que se reproduce un sonido podría fallar silenciosamente.

- 🟡 **Race condition en `MascotaDialogo`.** Si `texto` cambia rápidamente (ej: la mascota dice algo y luego otra cosa inmediatamente), el `useEffect` se dispara dos veces pero el `speechSynthesis.cancel()` del segundo corta el primer speech. El `finalizarDialogo` del primero podría ejecutarse incorrectamente por el `setTimeout` de 800ms que sigue vivo.

- 🟡 **`hablar()` siempre cancela el speech anterior.** Si la mascota está diciendo "¡Busca la A!" y el niño toca rápidamente una respuesta, el speech de feedback ("¡Muy bien!") cortará la instrucción. Debería considerar una cola de utterances.

- 🟢 **`calcularRacha` no maneja timezone.** Usa `new Date()` del servidor sin zona horaria explícita. Para un niño en es-MX, la racha podría romperse al cruzar la medianoche UTC.

**Severidad:** 🔴 La pérdida total de progreso al cerrar la app es un blocker funcional.

---

## 8. Performance

### ✅ Qué está bien
- **No hay dependencias pesadas.** Las animaciones son CSS puro (no Framer Motion, no GSAP). Los sonidos son AudioContext (no archivos MP3). La mascota es SVG inline (no Lottie). El confetti es CSS puro (no canvas-confetti).
- **Turbopack en desarrollo.** `next dev --turbopack` — builds más rápidos.
- **Componentes `'use client'` solo donde es necesario.** Las pages de padre como `dashboard/page.tsx` son Server Components. Buena separación.
- **Font Nunito con `display=swap`.** No bloquea el render inicial.
- **Sin imágenes pesadas.** Todo el arte es emoji + SVG inline.
- **Drizzle ORM es ligero** comparado con Prisma (sin engine separado).

### ⚠️ Qué hay que mejorar

- 🟡 **Google Fonts cargada desde CDN.** La fuente Nunito se carga desde `fonts.googleapis.com` en el `<head>`. Para una app infantil que podría usarse en conexiones lentas, debería usar `next/font` para self-hosting automático y font subsetting.

- 🟡 **Inline `<style>` en cada render.** Como mencionado en calidad de código, cada componente con animaciones inyecta `<style>` tags. En una sesión donde se renderiza `ReconocerVocal` 20 veces, hay 20 `<style>` tags idénticos en el DOM. El impacto es menor pero no es zero-cost.

- 🟢 **`BarraProgreso` tiene animación `shimmer` continua.** La animación `translateX(-100% → 100%)` corre infinitamente incluso cuando el progreso no cambia. Podría causar micro-jank en dispositivos lentos. Usar `will-change: transform` o pausar cuando no hay cambio.

- 🟢 **No hay lazy loading de rutas.** Todas las pages del niño cargan al navegar, lo cual es el comportamiento default de Next.js App Router y está bien. Pero para Ola 2+ con más módulos, considerar `loading.tsx` skeleton screens.

- 🟢 **No se puede evaluar el bundle size** sin hacer `pnpm build`. Recomendación: ejecutar un build y documentar el tamaño.

**Severidad:** 🟡 Google Fonts desde CDN es el issue más práctico. El resto es menor para Ola 1.

---

## 9. Seguridad

### ✅ Qué está bien
- **Passwords hasheados con bcrypt (cost 12).** Estándar correcto.
- **Cookie HTTP-only, Secure en producción, SameSite=lax.** Previene XSS y CSRF básico.
- **Token con expiración (7 días).** No es eterno.
- **`requireAuth()` en todas las acciones de padre.** Verificación de paternidad en `obtenerEstudiante` y `obtenerResumenProgreso` — un padre no puede ver datos de hijos de otro padre.
- **Cascade delete en DB.** Borrar un padre borra sus estudiantes, sesiones, etc. Limpio.
- **`.env.example` con aviso de cambiar el secreto.** Correcto.

### ⚠️ Qué hay que mejorar

- 🔴 **La implementación de JWT es insegura.** `crearToken()` en `auth.ts` usa una "firma" casera que es un simple hash con shift-and-add:
  ```typescript
  Array.from(new TextEncoder().encode(encoded + AUTH_SECRET))
    .reduce((acc, b) => ((acc << 5) - acc + b) | 0, 0)
    .toString(16)
  ```
  Esto es el equivalente de un `hashCode()` de Java — **NO es criptográficamente seguro.** Un atacante que conozca el formato puede forjar tokens trivialmente. El espacio de colisión de un entero de 32 bits (2^32) es ridículo para una firma.
  
  **Solución:** Usar `jose` (la librería JWT estándar), `crypto.createHmac('sha256', ...)`, o como mínimo `Web Crypto API` con HMAC-SHA256. Esto no es negociable para producción.

- 🟡 **El secreto por defecto es `'dev-secret'`** con fallback en código: `process.env.AUTH_SECRET ?? 'dev-secret'`. Si alguien despliega sin setear la variable de entorno, **todos los tokens son forjables con un secreto conocido**. Debería fallar ruidosamente si `AUTH_SECRET` no está seteado en producción.

- 🟡 **`/api/estudiantes` no tiene rate limiting.** Un atacante podría enumerar estudiantes rápidamente. Aunque devuelve `[]` sin auth, el endpoint existe y es descubrible.

- 🟡 **Los server actions no validan ownership del studentId.** `guardarSesion()` y `actualizarProgreso()` reciben `studentId` del cliente sin verificar que ese estudiante pertenece al padre autenticado. Un padre malicioso podría inyectar datos en la sesión de otro niño. `guardarDiagnostico()` tampoco valida.

- 🟢 **No hay protección CSRF explícita** más allá de `SameSite=lax`. Los Server Actions de Next.js tienen protección CSRF built-in, pero las API routes (como `/api/estudiantes`) no.

- 🟢 **Los datos del niño (nombre, fecha nacimiento) no están encriptados en DB.** Para GDPR/COPPA infantil esto podría ser un problema. Pero para Ola 1 es aceptable documentar como futuro.

**Severidad:** 🔴 La firma JWT casera es un blocker de seguridad. No se puede desplegar así.

---

## 10. Developer Experience

### ✅ Qué está bien
- **README excelente.** Estructura del proyecto visible, instrucciones de setup claras (4 comandos), prerrequisitos documentados. El README es de calidad para un proyecto open source.
- **Setup real con 4 comandos:** `pnpm install`, `createdb`, `cp .env`, `pnpm dev`. Simple y reproducible.
- **pnpm workspaces bien configurados.** `@omegaread/db` importable con `workspace:*`. Scripts de root delegan correctamente (`pnpm --filter`).
- **Drizzle con `db:push` para desarrollo.** No necesita migraciones para empezar. `db:studio` para inspeccionar datos.
- **Código TypeScript sin `any`.** Tipado fuerte en todas partes. Las interfaces son explícitas y útiles.
- **Documentación de planificación completa.** `/docs/planning/` tiene sprint spec, backlog, decisiones cerradas, arquitectura multi-app, propuesta de arranque. Un nuevo contribuidor puede entender el contexto.
- **Turbopack para dev.** Build rápido sin configuración extra.

### ⚠️ Qué hay que mejorar

- 🟡 **Sin ESLint ni Prettier.** Ya mencionado en Completitud. Para un proyecto open source que busca contribuidores, la falta de linting es problemática. Cada contribuidor usará su propio estilo.

- 🟡 **Sin tests ni testing framework.** No hay Vitest, Jest, ni Playwright configurados. Para la lógica pura (`MasteryTracker`, `generadorVocales`, `tts`, `sonidos`), los tests unitarios serían triviales de escribir y altamente valiosos.

- 🟡 **Sin `.gitignore` verificable** (no pude confirmar su existencia, pero si no tiene uno, `node_modules` y `.next` se commitean).

- 🟢 **No hay `CONTRIBUTING.md`.** El README menciona "contribuciones bienvenidas" con instrucciones de fork/branch/PR, pero un archivo dedicado con convenciones de código, proceso de review, y cómo testear sería valioso.

- 🟢 **No hay CI/CD.** Ni GitHub Actions ni ningún otro pipeline. Para Ola 1 es aceptable, pero debería planearse para Ola 2.

**Severidad:** 🟡 ESLint + tests son los gaps más impactantes para DX.

---

## Resumen de Issues por Severidad

### 🔴 Blockers (3)
1. **Falta estado compartido entre pantallas del niño** — estrellas, stickers y progreso no persisten entre navegaciones (§3)
2. **Pérdida total de datos si se cierra la app a mitad de sesión** — ni respuestas, ni estrellas, ni mastery se guardan hasta `finalizarSesion()` (§7)
3. **Firma JWT criptográficamente insegura** — hash de 32 bits trivialmente forjable (§9)

### 🟡 Importantes (16)
4. ESLint + Prettier no configurados (§1)
5. Duplicación SesionVocales.tsx / vocales/page.tsx con mastery divergente (§2)
6. Inline `<style>` tags duplicados en cada render (§2)
7. Dashboard padre incompleto vs DoD (próxima meta, días semanales) (§1, §5)
8. API route `/api/estudiantes` inconsistente con patrón de Server Actions (§3)
9. Falta validación de datos (Zod o similar) en server actions (§3)
10. Mastery tracker solo en memoria del cliente (§3)
11. Mascota como decoración, no como interfaz principal (§4)
12. Navegación `/jugar` con texto que niños no pueden leer (§4)
13. Pronunciación enfatizada subóptima con TTS robótico (§6)
14. sessionStorage frágil para estado del estudiante (§7)
15. Race conditions en speech queue (§7)
16. Google Fonts desde CDN en vez de next/font (§8)
17. Secreto JWT por defecto si env no seteada (§9)
18. Server actions no validan ownership de studentId (§9)
19. Sin tests ni ESLint (§10)

### 🟢 Menores (11)
20. Falta manifest.json y directorio public/ (§1)
21. Stickers page con datos hardcodeados (§2)
22. Mascota ignora props nombre/tipo en el render (§2)
23. Sonido de error cuenta como fallo inmediato (§4)
24. Fallback visual ausente si TTS no disponible (§4)
25. userScalable false también en rutas de padre (§4)
26. Bug de conteo secuencial en diagnóstico (§6)
27. Diagnóstico no ajusta punto de partida (§6)
28. calcularRacha sin timezone explícita (§7)
29. Shimmer animation continua en BarraProgreso (§8)
30. Sin CONTRIBUTING.md ni CI/CD (§10)

---

## Nota Global: 6.5 / 10

### Justificación

**Lo que eleva la nota:**
- La cobertura funcional es completa — todos los entregables del sprint están implementados
- La calidad del código es alta: naming excelente, JSDoc completo, separación de concerns clara
- El modelo de datos es muy sólido y extensible para 5 olas
- Los componentes UI son reutilizables y bien abstraídos (LetraGrande, BotonGrande, etc.)
- El README y la documentación de planificación son de primera
- Los sonidos generados programáticamente son una solución elegante
- La experiencia de las 3 actividades de vocales es pedagógicamente sólida

**Lo que baja la nota:**
- Los 3 blockers son serios: sin persistencia de estado entre pantallas, un niño tiene una experiencia rota (gana estrellas → vuelve al mapa → 0 estrellas). La pérdida de datos al cerrar es igualmente grave. Y la firma JWT casera es inaceptable en cualquier software que maneje datos de menores.
- La duplicación de lógica entre `SesionVocales.tsx` y `vocales/page.tsx` es deuda técnica peligrosa en la semana 1
- La mascota — el diferenciador UX clave según el spec — funciona más como un adorno que como la interfaz central que debería ser
- La falta de ESLint/Prettier/tests en un proyecto open source es un gap significativo

**Para subir a 8+:**
1. Resolver los 3 blockers (Context/store para estado del niño, guardado progresivo, JWT con HMAC-SHA256)
2. Eliminar la duplicación SesionVocales/page.tsx
3. Configurar ESLint + Prettier
4. Añadir tests unitarios para MasteryTracker y generadorVocales
5. Hacer que la mascota sea el centro de la experiencia, no un decorativo

**Veredicto:** Es un fundamento sólido — el esqueleto está bien construido y las decisiones arquitectónicas son correctas. Pero tiene fisuras estructurales que deben cerrarse antes de avanzar a Ola 2. Los blockers son reparables en 2-3 días de trabajo enfocado.
