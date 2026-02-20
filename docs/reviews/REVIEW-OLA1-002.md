# Code Review: OmegaAnywhere — Ola 1 (Post-Fix)

**Fecha:** 2026-02-20  
**Revisor:** dhh (agente autónomo)  
**Scope:** Revisión post-fix de la Ola 1, evaluando las correcciones a los 3 blockers de REVIEW-OLA1-001  
**Archivos revisados:** ~7,500 líneas en 45+ archivos  
**Review anterior:** [REVIEW-OLA1-001.md](./REVIEW-OLA1-001.md)

---

## Estado de los Blockers Anteriores

| # | Blocker original | Estado | Notas |
|---|---|---|---|
| 1 | Sin estado compartido entre pantallas del niño | ✅ **RESUELTO** | `StudentProgressContext` con provider en `/jugar/layout.tsx` |
| 2 | Pérdida total de datos al cerrar la app | ✅ **RESUELTO** | Guardado progresivo con `iniciarSesion` → `guardarRespuestaIndividual` → `finalizarSesionDB` |
| 3 | Firma JWT criptográficamente insegura | ✅ **RESUELTO** | Migrado a `jose` con HS256, `AUTH_SECRET` obligatorio en producción |

**Los tres blockers de la review anterior están correctamente resueltos.** Esto es un avance significativo.

---

## 1. Completitud

### ✅ Qué está bien
- **Todos los entregables del sprint están implementados**: monorepo, modelo de datos, auth, mascota+mapa, vocales (3 actividades), diagnóstico invisible, gamificación (estrellas+stickers), dashboard padre v0.1.
- **ESLint + Prettier ahora configurados.** `eslint.config.mjs` con typescript-eslint, react, react-hooks, prettier como override. `.prettierrc` con singleQuote, trailing commas. Esto cierra el gap del DoD técnico.
- **Tests implementados.** 3 archivos de tests con Vitest: `generadorVocales.test.ts`, `masteryTracker.test.ts`, `sessionAutoClose.test.ts`. Cubren la lógica de negocio principal. Vitest configurado con jsdom, path aliases, etc.
- **DoD del niño cumplido**: abrir → ver mascota → navegar mapa → jugar vocales → ganar estrellas/sticker → auto-cierre a 10 min → progreso persiste al volver.
- **DoD del padre cumplido**: registrarse, crear perfil de hijo, ver resumen de progreso, ver vocales aprendidas.

### ⚠️ Qué falta o es incompleto

- 🟡 **Dashboard padre: falta "Próxima meta: aprender la letra E".** El sprint lo pide explícitamente. El dashboard muestra vocales dominadas como círculos coloreados pero no indica cuál es la siguiente meta. Implementarlo es trivial: leer `vocalActual` del progreso.

- 🟡 **Dashboard padre: falta "Días de uso esta semana".** El sprint pide esto. Se implementó racha (días consecutivos) pero no la vista semanal. La racha es útil, pero no es lo mismo que "L M X J V S D" con indicadores.

- 🟢 **No hay `manifest.json` ni directorio `public/`.** `layout.tsx` referencia `manifest: '/manifest.json'` en metadata, pero el archivo no existe. Tampoco hay favicon. Para una PWA educativa que se usará en tablets, el manifest es importante.

**Severidad:** 🟡 Los ítems del dashboard son parte explícita del DoD del sprint y deberían estar.

---

## 2. Calidad de código

### ✅ Qué está bien
- **La duplicación SesionVocales / vocales/page.tsx está resuelta.** Ahora `vocales/page.tsx` delega toda la lógica de sesión al componente `SesionVocales`, que es la única fuente de verdad para mastery, progresión y generación de ejercicios. La page se encarga exclusivamente de la integración (contexto, persistencia DB, navegación). Esto es exactamente lo correcto.
- **Naming sigue siendo excelente.** Bilingüe consistente: español para dominio (`vocalActual`, `estrellasGanadas`, `guardarRespuestaIndividual`), inglés para patrones técnicos (`MasteryTracker`, `SesionTracker`, `StudentProgressContext`).
- **JSDoc completo en todas las funciones públicas, interfaces y tipos.** Comentarios de cabecera en cada archivo explicando propósito.
- **Componentes UI reutilizables y bien abstraídos:** `LetraGrande`, `BotonGrande`, `BarraProgreso`, `Estrellas`, `Celebracion`, `StickerReveal` — primitivos sólidos.
- **No hay código muerto ni commented-out code.**
- **La stickers page ahora lee del contexto real** (no datos hardcodeados). Combina stickers ganados del DB con un pool visual de stickers no ganados.

### ⚠️ Qué hay que mejorar

- 🟡 **Duplicación significativa entre `student-actions.ts` y `session-actions.ts`.** Hay dos implementaciones paralelas de las mismas operaciones:

  | Operación | `student-actions.ts` | `session-actions.ts` |
  |---|---|---|
  | Guardar sesión | `guardarSesion()` (batch) | `iniciarSesion()` + `guardarRespuestaIndividual()` + `finalizarSesionDB()` (progresivo) |
  | Actualizar progreso | `actualizarProgreso()` | `actualizarProgresoInmediato()` |

  Las implementaciones de actualización de progreso son **casi idénticas** (misma lógica de mastery, mismos cálculos). La versión batch de `guardarSesion` ya no se usa desde que la vocales page migró a guardado progresivo. Esto es deuda técnica heredada del pre-fix que debería limpiarse.

  ```typescript
  // student-actions.ts — actualizarProgreso()
  const nivelMastery = totalIntentos >= 5 ? totalAciertos / totalIntentos : 0;
  const dominada = nivelMastery >= 0.9 && totalIntentos >= 5;

  // session-actions.ts — actualizarProgresoInmediato()
  const nivelMastery = totalIntentos >= 5 ? totalAciertos / totalIntentos : 0;
  const dominada = nivelMastery >= 0.9 && totalIntentos >= 5;
  ```

  Si la lógica de mastery cambia (ej: ventana deslizante en DB), hay que cambiarla en dos sitios. **La versión batch (`guardarSesion`, `actualizarProgreso`) debería eliminarse o marcarse como deprecated.**

- 🟡 **Inline `<style>` tags en prácticamente todos los componentes.** `LetraGrande`, `ZonaMapa`, `Celebracion`, `Estrellas`, `StickerReveal`, `ReconocerVocal`, `SonidoVocal`, `CompletarVocal`, `BarraProgreso`, `Mascota`, `MascotaDialogo`, `AlbumStickers`, `DiagnosticoInvisible` — todos inyectan `@keyframes` con `<style>{...}</style>`. Problemas:
  1. Animaciones idénticas con nombres ligeramente distintos (`vuela-estrella`, `vuela-estrella-sonido`, `vuela-completar` — las tres son la misma animación)
  2. Se inyectan en cada render, creando `<style>` duplicados en el DOM
  3. Hay ~15 bloques de `<style>` que deberían centralizarse en `globals.css` (donde ya hay varias animaciones definidas: `bounce-suave`, `pulse-brillo`, `shake`, `estrella-vuela`, `confetti-cae`, `scale-in`, `float`)
  
  De hecho, `globals.css` ya define `@keyframes estrella-vuela` y la clase `.animate-estrella-vuela`, pero los componentes no la usan — definen las suyas propias. Es un gap de integración.

- 🟢 **`Mascota.tsx` ignora la prop `tipo`.** El SVG siempre renderiza un gato naranja sin importar si se pasa `tipo="perro"`, `tipo="buho"` o `tipo="dragon"`. El `nombre` se usa solo en `aria-label`. Es aceptable para v0.1 (solo un tipo de mascota disponible), pero la API del componente promete algo que no entrega.

**Severidad:** 🟡 La duplicación student-actions/session-actions debería resolverse antes de Ola 2.

---

## 3. Arquitectura

### ✅ Qué está bien
- **`StudentProgressContext` resuelve el problema de estado compartido.** Es un Context Provider que:
  - Mantiene el estudiante activo y su progreso
  - Sincroniza con `sessionStorage` para persistencia entre recargas
  - Carga progreso de DB al seleccionar estudiante
  - Provee optimistic updates (`addEstrellas`, `addSticker`, `marcarVocalDominada`)
  - Expone `recargarProgreso()` para re-sync con DB
  - Se monta en `/jugar/layout.tsx` envolviendo todas las rutas del niño
  
  Esto es la solución correcta. Las estrellas ganadas en `/jugar/vocales` ahora se reflejan en el mapa al volver. Los stickers se sincronizan. El estado es coherente.

- **Guardado progresivo bien diseñado.** El flujo en `session-actions.ts` es:
  1. `iniciarSesion()` → crea sesión en DB al inicio (devuelve sessionId)
  2. `guardarRespuestaIndividual()` → guarda cada respuesta inmediatamente
  3. `actualizarProgresoInmediato()` → actualiza skill_progress tras cada respuesta
  4. `actualizarSesionEnCurso()` → actualiza estrellas periódicamente
  5. `finalizarSesionDB()` → marca sesión como completada
  
  Si el niño cierra a mitad de sesión, las respuestas y el progreso de habilidades ya están en la DB. La sesión queda `completada: false` pero los datos persisten. `cargarProgresoEstudiante()` detecta sesiones sin finalizar.

- **Monorepo bien estructurado** con `apps/web` + `packages/db`. El schema Drizzle es excelente: tipos TypeScript para configs (`ParentConfig`, `DiagnosticoNivel`, `AccesibilidadConfig`), índices correctos, relaciones explícitas.

- **Modelo de datos extensible.** `skillProgress` con `proximaRevision` (spaced repetition), `accesibilidad` (dislexia, TDAH, alto contraste), `intereses` (personalización) — todo listo para Olas futuras sin migraciones.

### ⚠️ Qué hay que mejorar

- 🔴 **`session-actions.ts` no valida autenticación ni ownership.** Las funciones `iniciarSesion()`, `guardarRespuestaIndividual()`, `actualizarProgresoInmediato()`, `finalizarSesionDB()`, `actualizarSesionEnCurso()` y `cargarProgresoEstudiante()` **no llaman `requireAuth()`** ni verifican que el `studentId` pertenezca al padre autenticado.

  Esto significa que cualquier llamada del cliente puede:
  - Crear sesiones para cualquier estudiante
  - Inyectar respuestas en sesiones de otros niños
  - Modificar el progreso de habilidades de cualquier estudiante
  - Leer el progreso completo de cualquier estudiante

  En contraste, `student-actions.ts` SÍ valida con `requireAuth()` en las funciones de padre. El gap está específicamente en el módulo de sesiones (el más sensible, porque maneja datos de menores).

  **Fix mínimo:** Añadir `requireAuth()` a cada función de `session-actions.ts` y verificar `students.parentId === padre.id` para el `studentId` recibido. Alternativamente, crear un helper `requireStudentOwnership(studentId)` que combine ambas validaciones.

- 🟡 **Falta validación de datos con schema (Zod o similar).** Los server actions confían en el tipo TypeScript del parámetro, pero estos tipos no se validan en runtime. `crearEstudiante` acepta `formData.get('nombre') as string` sin validar longitud, caracteres especiales, ni que la fecha de nacimiento esté en rango razonable (3-10 años). `guardarRespuestaIndividual` acepta cualquier `sessionId` sin validar formato UUID.

- 🟡 **`/api/estudiantes` es inconsistente con el patrón de Server Actions.** Toda la app usa Server Actions excepto este endpoint que usa API Route con `fetch()`. Es el único endpoint REST público. Debería ser un Server Action o los datos deberían cargarse en un Server Component.

- 🟢 **No hay middleware de Next.js para proteger rutas.** Las rutas `/padre/*` dependen de que cada page/action llame `requireAuth()`. Un middleware centralizaría la protección y sería más robusto ante olvidos.

**Severidad:** 🔴 La falta de auth en session-actions es un blocker de seguridad que permite manipulación de datos de menores.

---

## 4. UX para niños de 4-5 años

### ✅ Qué está bien
- **Audio-first correctamente implementado.** Cada pantalla tiene TTS integrado:
  - Mapa: "¡Hola [nombre]! ¡Vamos al Bosque de las Letras!"
  - Vocales: "¡Busca la A!", "¿Qué vocal suena?", "¡Completa la palabra!"
  - Diagnóstico: "¿Sabes cuál es la A?", "¡Contamos juntos!", "¿Cuál suena parecido?"
  - Feedback: "¡Muy bien!" / "¡Casi! Inténtalo otra vez"
  
  El `tts.ts` prioriza voces españolas inteligentemente (es-MX → es-ES → es-*).

- **Touch targets generosos.** Mediciones verificadas:
  - `LetraGrande` XL: 90×90px (~24mm) ✅
  - `ZonaMapa`: 150×150px (~40mm) ✅
  - `BotonGrande` normal: 64×64px (~17mm) ✅
  - CSS global: `button, a, [role="button"] { min-height: 48px; min-width: 48px }` ✅
  - Los objetivos de conteo en diagnóstico: 60×60px ✅
  
  Cumple con el spec (60-80pt para 4-5 años) en los ejercicios principales.

- **Anti-spam de toques.** Todos los ejercicios usan `bloqueado/setBloqueado(true)` al responder. Un niño que toca todo rápido solo registra la primera selección.

- **Sesión auto-cierre a 10 min.** Timer con verificación cada segundo. Al alcanzar `DURACION_MAX_MS`, llama `finalizarSesion()` con celebración completa.

- **Feedback multisensorial excelente.** Sonidos programáticos con AudioContext (do-mi-sol para acierto, tono suave para error, click táctil, fanfarria para celebración, twinkle para estrella). Sin archivos externos.

- **Diagnóstico invisible bien disfrazado.** 3 mini-juegos que parecen juegos reales: reconocimiento de letras (6 letras con timeout de 5s), conteo con objetos tocables (progresivo hasta 10), rimas con emojis (4 pares). Sin puntuación visible. Timeout inteligente si el niño no responde.

- **Mascota ahora saluda al niño en el mapa.** `MapaPage` muestra `MascotaDialogo` con saludo personalizado ("¡Hola [nombre]! ¡Ya tienes X estrellas!"). El componente `MapaAventuras` genera saludos con zona recomendada.

- **Celebraciones ricas y variadas.** Confetti CSS (40 piezas, 3 formas, 7 colores), sticker reveal con flip card, estrellas SVG animadas con brillo.

### ⚠️ Qué hay que mejorar

- 🟡 **La mascota sigue siendo más decoración que interfaz central.** Comparando con el spec:
  
  | Spec dice | Implementación actual |
  |---|---|
  | "La mascota habla al niño como un amigo" | ✅ Habla al llegar al mapa y durante ejercicios |
  | "La mascota es el punto central de interacción" | ⚠️ En vocales, la mascota es `size="sm"` (80px) en un rincón |
  | "El niño puede pedir que repita" | ❌ No hay botón/gesto para que el niño pida repetición de lo que dijo la mascota |
  | "Celebra aciertos con animación" | ⚠️ La mascota no cambia de estado durante los ejercicios — el feedback es solo sonoro |
  
  En `SesionVocales`, la mascota no aparece en absoluto. En `vocales/page.tsx`, está como `size="sm"` estático con `estado="feliz"` fijo. Debería cambiar a `estado="celebrando"` al acertar y `estado="pensando"` al errar.

- 🟡 **La landing page tiene texto que niños de 4 años no pueden leer.** Los botones "¡A jugar!" y "Soy padre/madre" son texto con emoji. El spec dice "4-5 años: NINGÚN texto. Solo iconos + audio." Los botones deberían tener emojis prominentes y audio al renderizar que diga "¡Toca el control para jugar!" o similar.

- 🟡 **El diagnóstico intro tiene botón con texto "¡Sí, a jugar!".** Un niño de 4 años no puede leer esto. El emoji 🎮 es bueno, pero el botón debería ser más grande (actualmente tiene padding generoso pero el texto domina). Mejor: emoji gigante + TTS "¡Toca aquí para empezar!".

- 🟢 **El error cuenta como fallo inmediato sin segundo intento.** En `ReconocerVocal`, al errar se llama `onError()` y se registra el error al instante. El spec sugiere que para 4-5 años, un error debería dar 2 intentos antes de contar. Actualmente el niño puede reintentar (se desbloquea), pero el error ya se registró en el tracker.

- 🟢 **No hay fallback visible si TTS no está disponible.** `hablar()` simplemente no hace nada si `window.speechSynthesis` no existe. Para una app audio-first, debería al menos mostrar un indicador visual o sugerir al padre que active TTS.

**Severidad:** 🟡 La mascota debería evolucionar hacia interfaz central progresivamente.

---

## 5. UX para padres

### ✅ Qué está bien
- **Auth correcta y segura.** JWT con `jose` HS256, cookie HTTP-only, Secure en producción, SameSite=lax, expiración 7 días. bcrypt cost 12 para passwords. `AUTH_SECRET` obligatorio en producción (el app lanza error explícito si falta).
- **Dashboard Server Component** — se renderiza en servidor, correcto para datos sensibles.
- **Datos accionables en DashboardHijo:** vocales dominadas (visual), tiempo hoy (min), racha (días), estrellas totales, stickers recientes. La tarjeta es limpia y legible.
- **Formulario de nuevo hijo bien pensado:** nombre, fecha nacimiento, selector visual de mascota (4 opciones con emojis), nombre de mascota. Los touch targets del selector de mascota son generosos.
- **Sugerencia offline.** "Practiquen las vocales en casa: busquen objetos que empiecen con A". Alineado con el spec.
- **Registro con confirmación de contraseña.** Validación client-side de que coincidan.

### ⚠️ Qué hay que mejorar

- 🟡 **Falta "Próxima meta" en el dashboard.** Dato ya disponible en `obtenerResumenProgreso()` → `vocalesDominadas`. Calcular la siguiente vocal no dominada es trivial (el mismo cálculo que hace `StudentProgressContext`). Debería mostrarse como: "🎯 Próxima meta: aprender la letra E".

- 🟡 **Falta validación de edad.** Un padre puede crear un perfil con fecha de nacimiento de ayer (0 años) o de hace 50 años. Debería validarse que la edad esté entre 3-10 años. `calcularEdad()` en `DashboardHijo` ya calcula la edad — esa lógica debería replicarse en la validación del server action.

- 🟡 **La sugerencia offline no es personalizada.** Siempre dice lo de la A sin importar el progreso real del niño. Si el niño ya está en la I, la sugerencia debería decir "busquen objetos que empiecen con I".

- 🟢 **`obtenerResumenProgreso` calcula `totalEstrellas` solo de las últimas 10 sesiones** (usa `limit: 10` en la query). Si un niño tiene 50 sesiones, el total de estrellas será incorrecto. Debería usar un aggregation query o quitar el limit.

**Severidad:** 🟡 Próxima meta y sugerencia personalizada son ítems del DoD.

---

## 6. Pedagogía

### ✅ Qué está bien
- **Progresión A → E → I → O → U correctamente implementada.** `ORDEN_VOCALES` en `generadorVocales.ts`, usado consistentemente por `MasteryTracker`, `SesionVocales` y `StudentProgressContext`.
- **Mastery bien implementado.** `MasteryTracker` usa ventana deslizante de últimas 10 respuestas, mínimo 5 intentos, umbral ≥90%. Esto evita tanto el "acerté 2 de 2 = dominada" como el "fallé mucho al principio y nunca llego a 90%".
- **3 tipos de actividad cubren las 3 dimensiones clave:**
  1. `ReconocerVocal` → grafema visual ("¿Dónde está la A?")
  2. `SonidoVocal` → fonema-grafema ("¿Qué vocal suena?")
  3. `CompletarVocal` → conciencia fonológica contextual ("_SO" + 🐻 → O)
- **Pool de 6 palabras por vocal, bien curadas.** Palabras de alta frecuencia con emojis descriptivos y pronunciación enfatizada. `SesionTracker` evita repeticiones.
- **Niveles de dificultad progresivos** en reconocimiento (consonantes → vocales → mayúscula/minúscula). La dificultad sube automáticamente cuando mastery ≥70% con ≥3 intentos.
- **vocales/page.tsx ahora delega correctamente a SesionVocales.** No hay doble implementación de mastery. El `MasteryTracker` es la única fuente de verdad.
- **Tests validan la lógica pedagógica.** `masteryTracker.test.ts` tiene 15 tests que cubren: mínimo de intentos, umbral 90%, ventana deslizante, progresión A→E→I→O→U, patrón de errores.

### ⚠️ Qué hay que mejorar

- 🟡 **El mastery en DB (`actualizarProgresoInmediato`) no usa ventana deslizante.** La lógica server-side calcula mastery como `totalAciertos / totalIntentos` (promedio global), no ventana deslizante de 10. Esto diverge del `MasteryTracker` del cliente que SÍ usa ventana deslizante. 

  Escenario problemático: un niño falla 20 veces, luego acierta 10 seguidas. 
  - **Cliente** (MasteryTracker): ve las últimas 10 → 10/10 = 100% → dominada ✅
  - **DB** (actualizarProgresoInmediato): ve todas → 10/30 = 33% → no dominada ❌
  
  Al recargar la app, el progreso de DB gana y el niño "pierde" su vocal dominada.

  **Fix:** O usar ventana deslizante también en DB (guardar historial reciente en metadata), o sincronizar el estado `dominada` desde el cliente al finalizar sesión.

- 🟡 **Pronunciación enfatizada subóptima con TTS.** Web Speech API pronunciará "aaaarbol" de forma robótica. Para las 5 vocales (30 palabras total), audio pregrabado sería significativamente mejor. Pero esto puede postergarse a Ola 2.

- 🟢 **Diagnóstico no ajusta punto de partida.** El resultado se guarda pero no se usa. Un niño que reconoce A, E, M, P, S, L sigue empezando por la A. Aceptable para Ola 1, pero debería documentarse como tarea de Ola 2.

- 🟢 **Conteo en diagnóstico requiere toque secuencial** sin feedback visual de orden. Un niño de 4 años no entiende que debe tocar "el siguiente". Debería aceptar toques en cualquier orden o mostrar una flecha visual.

**Severidad:** 🟡 La divergencia mastery cliente/servidor puede causar regresión de progreso percibido.

---

## 7. Robustez

### ✅ Qué está bien
- **Guardado progresivo implementado correctamente.** El flujo en `vocales/page.tsx`:
  1. `iniciarSesion()` al montar → obtiene `sessionId`
  2. Cada respuesta → `guardarRespuestaIndividual()` + `actualizarProgresoInmediato()` en paralelo
  3. Cada estrella → `actualizarSesionEnCurso()` con estrellas acumuladas
  4. Al finalizar → `finalizarSesionDB()` con duración, completada, sticker
  
  Si el niño cierra a mitad de sesión: las respuestas individuales y el progreso de habilidades ya están en DB. Solo se pierde el sticker y la marca de "completada".

- **Manejo graceful de fallos de DB.** En `vocales/page.tsx`:
  ```typescript
  }).catch(() => {
    // Si falla la DB, permitir jugar sin guardado
    if (!cancelled) setReady(true);
  });
  ```
  El niño puede jugar aunque la DB no esté disponible (modo offline-ish).

- **Anti-spam en todos los ejercicios.** `bloqueado`/`setBloqueado(true)` previene interacciones múltiples.
- **Timer fallback en MascotaDialogo.** Auto-hide basado en longitud del texto si TTS falla.
- **`SesionTracker` anti-repetición** con reseteo automático al agotar el pool.
- **Diagnóstico con timeout de 5s** si el niño no responde.

### ⚠️ Qué hay que mejorar

- 🟡 **Race condition en `MascotaDialogo`.** Si `texto` cambia rápidamente, el `useEffect` cancela el speech anterior pero el `setTimeout` de `finalizarDialogo` (800ms) del primer render puede ejecutarse después del segundo `speechSynthesis.cancel()`, causando un `onFinish` fuera de orden. 

  El fallback timer también puede dispararse si el speech termina normalmente pero antes del fallback. Ambos callbacks (`onEnd` del TTS y el fallback `setTimeout`) ejecutarán `onFinish`, causando doble ejecución.

  **Fix sugerido:** Usar un flag ref (`isActive`) que se invalide en el cleanup del `useEffect`.

- 🟡 **`hablar()` siempre cancela el speech anterior.** Si la mascota dice "¡Busca la A!" y el niño toca rápidamente, el feedback "¡Muy bien!" corta la instrucción. Para un app audio-first, esto puede ser confuso. Considerar una cola de utterances con prioridad (feedback > instrucciones).

- 🟡 **AudioContext en iOS Safari.** `obtenerContexto()` intenta `resume()` pero en iOS, el AudioContext solo puede resumirse desde un gesto directo del usuario. El primer sonido en una sesión podría fallar silenciosamente. La solución estándar es crear/resumir el AudioContext en el primer `touchstart` de la app.

- 🟢 **`sessionStorage` desaparece al abrir nueva pestaña.** Si el padre abre el link en una nueva pestaña, no hay estudiante activo y redirige a `/jugar`. `localStorage` sería más robusto para este caso.

- 🟢 **`calcularRacha` en `student-actions.ts` no considera timezone.** Usa `new Date()` sin timezone, lo que puede romper la racha al cruzar medianoche UTC para usuarios en Americas.

**Severidad:** 🟡 La race condition del diálogo y el AudioContext en iOS son los más impactantes para la experiencia real.

---

## 8. Performance

### ✅ Qué está bien
- **Dependencias mínimas.** Animaciones CSS puro (no Framer Motion), sonidos AudioContext (no MP3s), mascota SVG inline (no Lottie), confetti CSS (no canvas-confetti). `jose` es la librería JWT más ligera disponible.
- **Dashboard es Server Component.** Sin bundle JavaScript del lado del cliente para datos del padre.
- **Turbopack para desarrollo.** Builds sub-segundo.
- **Font Nunito con `display=swap`.** No bloquea render.
- **Sin imágenes pesadas.** Todo el arte es emoji + SVG inline.
- **Drizzle ORM sin engine separado** (a diferencia de Prisma).

### ⚠️ Qué hay que mejorar

- 🟡 **Google Fonts desde CDN.** Debería usar `next/font` para:
  1. Self-hosting automático (no depender de CDN externo)
  2. Font subsetting (solo cargar los glifos usados)
  3. Eliminación del flash de font swap
  4. Mejor performance en conexiones lentas (tablets de niños en zonas rurales)

  ```typescript
  // Recomendado:
  import { Nunito } from 'next/font/google';
  const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700', '800'] });
  ```

- 🟡 **~15 bloques `<style>` inline en componentes.** Cada render de `ReconocerVocal` inyecta un `<style>` idéntico. En una sesión de vocales con 20 ejercicios de reconocimiento, hay 20 `<style>` tags duplicados. El impacto en performance es menor, pero el impacto en mantenibilidad y limpieza del DOM es real. Mover `@keyframes` a `globals.css` y usar clases CSS.

- 🟢 **No se puede evaluar el bundle size** sin `pnpm build`. Recomiendo ejecutar un build y documentar el tamaño en el README.

**Severidad:** 🟡 Google Fonts y inline styles son los más prácticos.

---

## 9. Seguridad

### ✅ Qué está bien
- **JWT ahora usa `jose` con HS256.** `SignJWT` para crear, `jwtVerify` para verificar. Esto es criptográficamente correcto y la solución estándar.
- **`AUTH_SECRET` obligatorio en producción.** El código lanza `Error('AUTH_SECRET must be set in production (at least 32 characters)')`. Excelente — fail-fast en producción sin secreto configurado.
- **Cookie HTTP-only, Secure en prod, SameSite=lax, maxAge=7d.** Configuración correcta.
- **bcrypt cost 12.** Estándar para passwords.
- **Cascade delete en DB.** Borrar padre → borra estudiantes → borra sesiones/respuestas/logros/progreso.
- **`requireAuth()` + ownership check en student-actions.ts.** `obtenerEstudiante` y `obtenerResumenProgreso` verifican que el estudiante pertenece al padre autenticado.
- **`.env.example` con instrucciones claras** para generar secreto con `openssl rand -base64 32`.

### ⚠️ Qué hay que mejorar

- 🔴 **`session-actions.ts` no tiene ninguna verificación de autenticación.** (Detallado en §3 Arquitectura). Seis funciones públicas que modifican datos de estudiantes sin verificar identidad ni ownership. Esto permite:
  - Crear sesiones falsas para cualquier estudiante
  - Inyectar respuestas en sesiones ajenas
  - Modificar el mastery de cualquier estudiante
  - Leer el progreso completo de cualquier estudiante

  En una app que maneja datos de menores, esto es particularmente grave. **Se necesita `requireAuth()` + verificación de ownership en cada función de session-actions.ts.**

- 🟡 **Server actions no validan formato de datos de entrada.** `iniciarSesion` acepta cualquier string como `studentId` sin validar que sea UUID. `guardarRespuestaIndividual` acepta cualquier `sessionId`. Sin Zod o validación similar, inputs malformados podrían causar errores inesperados en Drizzle o comportamientos no deseados.

- 🟢 **`/api/estudiantes` devuelve `[]` sin auth.** No es un leak de datos, pero el endpoint existe y es público. Mejor devolver `401` si no hay sesión.

- 🟢 **Password mínimo de 6 caracteres.** Para una app familiar es aceptable, pero 8 sería más estándar.

**Severidad:** 🔴 La falta de auth en session-actions es el único blocker de seguridad restante.

---

## 10. Developer Experience

### ✅ Qué está bien
- **README excelente.** Estructura del proyecto, instrucciones de setup claras (4 comandos), prerrequisitos documentados.
- **ESLint + Prettier configurados.** `eslint.config.mjs` con flat config moderno (ESLint 9), typescript-eslint, react/react-hooks, prettier. `.prettierrc` con singleQuote, trailing commas, printWidth 100.
- **Vitest configurado con 3 test suites:**
  - `generadorVocales.test.ts` — 14 tests (generación de ejercicios, SesionTracker anti-repetición)
  - `masteryTracker.test.ts` — 15 tests (registro, cálculo mastery, progresión, ventana deslizante)
  - `sessionAutoClose.test.ts` — 5 tests (timer de 10 min, preservación de mastery al cierre)
  
  Cubren la lógica de negocio más crítica. Son tests bien escritos con nombres descriptivos en español.
- **Setup reproducible:** `pnpm install`, `createdb`, `cp .env`, `pnpm dev`.
- **pnpm workspaces bien configurados.** Scripts de root delegan correctamente.
- **TypeScript strict sin `any`.** Tipado fuerte en todo el proyecto.
- **Documentación de planificación completa** en `/docs/planning/`.
- **`.gitignore` correcto.** Excluye `node_modules`, `.next`, `.env`, IDE files.
- **`.env.example` con documentación** sobre cómo generar el secreto.

### ⚠️ Qué hay que mejorar

- 🟡 **No hay tests de componentes React.** Los 34 tests existentes cubren lógica pura (`MasteryTracker`, `generadorVocales`). No hay tests de rendering para los componentes UI (`LetraGrande`, `Mascota`, `SesionVocales`). Para Ola 2, al menos los componentes críticos deberían tener tests con `@testing-library/react` (ya instalado como devDependency).

- 🟡 **No hay directorio `public/`.** Falta favicon, manifest.json (referenciado en layout), y cualquier asset estático. Para una app que se desplegará como PWA en tablets, el manifest y el icono son necesarios.

- 🟢 **No hay CI/CD.** Ni GitHub Actions ni pipeline. Los tests podrían ejecutarse automáticamente en cada push.

- 🟢 **No hay `CONTRIBUTING.md`.** El README menciona contribuciones pero no hay un archivo dedicado con convenciones, proceso de review y cómo testear.

**Severidad:** 🟡 Tests de componentes y directorio public serían las prioridades.

---

## Resumen de Issues por Severidad

### 🔴 Blockers (1)
1. **`session-actions.ts` sin autenticación ni ownership check** — permite crear sesiones, inyectar respuestas y modificar progreso de cualquier estudiante sin verificar identidad (§3, §9)

### 🟡 Importantes (13)
2. Duplicación `student-actions.ts` / `session-actions.ts` (funciones de progreso y sesión paralelas) (§2)
3. Inline `<style>` tags en ~15 componentes (animaciones duplicadas) (§2)
4. Dashboard: falta "Próxima meta" (DoD explícito) (§1, §5)
5. Dashboard: falta "Días de uso esta semana" (DoD explícito) (§1)
6. Divergencia mastery cliente (ventana deslizante) vs servidor (promedio global) (§6)
7. Validación de datos ausente (Zod) en server actions (§3)
8. `/api/estudiantes` inconsistente con patrón Server Actions (§3)
9. Mascota como decoración vs interfaz central (no cambia de estado durante ejercicios) (§4)
10. Landing y diagnóstico intro con texto que niños no pueden leer (§4)
11. Race condition en MascotaDialogo (doble onFinish) (§7)
12. Google Fonts desde CDN en vez de `next/font` (§8)
13. No hay tests de componentes React (§10)
14. Falta validación de edad en perfil de hijo + sugerencia offline no personalizada (§5)

### 🟢 Menores (9)
15. Falta `manifest.json` y directorio `public/` (§1, §10)
16. `Mascota.tsx` ignora prop `tipo` (siempre gato) (§2)
17. Error cuenta como fallo sin segundo intento (§4)
18. Fallback visual ausente si TTS no disponible (§4)
19. AudioContext iOS Safari puede fallar silenciosamente en primer uso (§7)
20. `sessionStorage` vs `localStorage` para estudiante activo (§7)
21. `calcularRacha` sin timezone (§7)
22. Diagnóstico conteo secuencial sin feedback visual de orden (§6)
23. Sin CI/CD ni CONTRIBUTING.md (§10)

---

## Comparativa con Review Anterior

| Métrica | REVIEW-001 | REVIEW-002 | Delta |
|---|---|---|---|
| 🔴 Blockers | 3 | 1 | -2 ✅ |
| 🟡 Importantes | 16 | 13 | -3 ✅ |
| 🟢 Menores | 11 | 9 | -2 ✅ |
| ESLint/Prettier | ❌ | ✅ | Fixed |
| Tests | 0 | 34 (3 suites) | Fixed |
| Estado compartido | ❌ | ✅ Context | Fixed |
| Guardado progresivo | ❌ | ✅ | Fixed |
| JWT seguro | ❌ | ✅ jose/HS256 | Fixed |

**Las correcciones atacaron los problemas correctos.** Los 3 blockers originales se resolvieron con soluciones de calidad (no parches). La adición de ESLint, Prettier y tests cierra gaps significativos de DX.

---

## Nota Global: 7.5 / 10

### Justificación

**Lo que eleva la nota (desde el 6.5 anterior):**

- Los 3 blockers originales están resueltos con soluciones sólidas, no parches
- `StudentProgressContext` es una solución limpia y bien implementada para estado compartido
- El guardado progresivo es robusto: sesión creada upfront, respuestas individuales guardadas en tiempo real, manejo graceful de fallos de DB
- JWT con `jose` HS256 es la implementación estándar correcta, con fail-fast para producción sin secreto
- La vocales/page.tsx ya no reimplementa mastery — delega al componente SesionVocales (single source of truth)
- 34 tests que cubren la lógica de negocio principal
- ESLint + Prettier configurados correctamente
- La stickers page ahora lee datos reales del contexto

**Lo que impide llegar a 8+:**

- El blocker de auth en session-actions es serio: 6 funciones que modifican datos de menores sin verificar identidad
- La duplicación entre student-actions y session-actions crea confusión sobre qué funciones usar
- La divergencia mastery cliente/servidor puede causar regresión perceptible del progreso
- La mascota todavía no es la "interfaz central" que describe el spec
- Faltan ítems explícitos del DoD del dashboard (próxima meta, días semanales)
- Los inline `<style>` son deuda técnica que crece con cada componente nuevo

**Para subir a 9+:**

1. **Urgente:** Añadir `requireAuth()` + ownership check a `session-actions.ts`
2. Eliminar funciones duplicadas de `student-actions.ts` (guardarSesion, actualizarProgreso)
3. Alinear mastery DB con mastery cliente (ventana deslizante o sync de estado)
4. Completar ítems faltantes del DoD (próxima meta, días semanales)
5. Centralizar animaciones CSS en `globals.css`
6. Integrar la mascota como elemento reactivo durante los ejercicios
7. Migrar a `next/font` para Nunito
8. Añadir tests de componentes React (al menos LetraGrande, SesionVocales)

**Veredicto:** El proyecto ha mejorado significativamente. Las correcciones demuestran buen criterio técnico — los 3 problemas más graves se resolvieron con soluciones de calidad. Queda un blocker de seguridad claro (auth en session-actions) que es rápido de resolver (~30 min de trabajo). La base es sólida para avanzar a Ola 2 una vez resuelto.
