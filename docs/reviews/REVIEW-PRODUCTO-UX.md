# Review de Producto y UX - OmegaRead

Fecha: 2026-02-20
Revisor: Product/UX Review Agent
Spec de referencia: `docs/design/SPEC-OMEGAREAD-CORE-ADAPTATIVO-2026-02-20.md`

---

## 1. MAPA COMPLETO DE ESTADOS Y FLUJOS

### 1.1 Diagrama de estados ASCII

```
ENTRADA: /jugar/lectura
         |
         v
   [CARGANDO] ---- !estudiante || cargando ----> Spinner "Cargando..."
         |
         v
   {obtenerEstadoLectura()}
         |
         +--- null/error ---> "No se encontro el perfil."
         |
         v
   [ROUTER DE ONBOARDING]
         |
         +--- perfil-incompleto ----> [FORMULARIO PERFIL] (3 pasos)
         |                                  |
         |                                  +--- onComplete() ---> {cargarEstado()} ---> vuelve a ROUTER
         |
         +--- sin-intereses ---------> [SELECTOR INTERESES]
         |                                  |
         |                                  +--- onComplete() ---> {cargarEstado()} ---> vuelve a ROUTER
         |
         +--- sin-baseline ----------> [TEST BASELINE]
         |                                  |
         |                                  +--- intro -> leyendo -> preguntas -> resultado
         |                                  |                                       |
         |                                  +--- onComplete() ---> {cargarEstado()} ---> vuelve a ROUTER
         |
         +--- listo -----------------> [SESION LECTURA - Maquina de estados interna]
                                             |
                                             v
                                       [ELEGIR-TOPIC]
                                             |
                                             +--- onStart(topicSlug) ---> {generarHistoria()}
                                             |
                                             v
                                       [GENERANDO] ---- error ---> [ELEGIR-TOPIC] + msg error
                                             |
                                             +--- ok
                                             v
                                       [LEYENDO]
                                             |
                                             +--- handleAjusteManual() ---> {reescribirHistoria()}
                                             |         |
                                             |         +--- ok ---> [LEYENDO] (historia actualizada)
                                             |         +--- error ---> silencioso, sigue leyendo
                                             |
                                             +--- handleTerminarLectura()
                                             v
                                       [PREGUNTAS] (1 a la vez, con feedback)
                                             |
                                             +--- handleRespuestasCompletas()
                                             |         ---> {finalizarSesionLectura()}
                                             |                ---> {calcularAjusteDificultad()}
                                             v
                                       [RESULTADO]
                                             |
                                             +--- handleLeerOtra() ---> reset ---> [ELEGIR-TOPIC]
                                             +--- handleVolver() ---> /jugar
```

### 1.2 Estados del baseline (sub-maquina)

```
[INTRO] ---> click "Empezar"
   |
   v
[LEYENDO texto N] ---> click "Ya termine de leer"
   |
   v
[PREGUNTAS texto N] ---> responde 3-4 preguntas (auto-advance con 1.2s feedback)
   |
   +--- acierto < 30% ---> [FINALIZAR TEST]
   +--- no hay mas textos ---> [FINALIZAR TEST]
   +--- hay mas textos ---> [LEYENDO texto N+1]
   |
[RESULTADO] ---> click "Continuar" ---> onComplete() ---> vuelve al router
```

### 1.3 Verificacion contra spec

| Spec dice | Implementado | Estado |
|-----------|-------------|--------|
| Perfil y nivel actual -> Generar historia | Si (router onboarding + elegir-topic + generarHistoria) | OK |
| Nino lee historia | Si (PantallaLectura) | OK |
| Preguntas de comprension | Si (PantallaPreguntas, 4 tipos) | OK |
| Scoring de sesion | Si (calcularSessionScore, formula v1) | OK |
| Alto -> subir, Medio -> mantener, Bajo -> bajar | Si (determinarAjuste) | OK |
| Boton "Hazlo mas facil" / "Hazlo mas desafiante" | Si (PantallaLectura, Sprint 4) | OK |
| Reescritura inmediata | Si (reescribirHistoria) | OK |
| Dashboard nino (4 widgets) | Si (obtenerDashboardNino) | OK |
| Dashboard padre (4 widgets + recomendaciones) | Si (DashboardPadreDetalle, 7 secciones) | OK |
| QA automatico de seguridad | Si (qa-rubric.ts, palabras prohibidas + longitud) | PARCIAL |
| Trazabilidad de decisiones de dificultad | Si (difficultyAdjustments con evidencia) | OK |
| Scoring por tipo para diagnostico de skill | Si (responses con tipoEjercicio, desgloseTipos) | OK |
| Skill por topic (ej. ciencia, deportes) | Si (comparativaTopics en dashboard padre) | OK |

### 1.4 Issues encontrados

**I1.1 [P1] Estado muerto: sesionActiva null en paso 'leyendo'/'preguntas'/'resultado'**
- `page.tsx:309-351` - Los guards `pasoSesion === 'leyendo' && sesionActiva` funcionan, pero si `sesionActiva` es null mientras `pasoSesion` es 'leyendo', el componente cae al `return` final (elegir-topic) sin feedback de error. Esto puede ocurrir si hay un race condition en el state update.

**I1.2 [P2] No hay estado "sesion-abandonada"**
- Si el nino cierra el tab o navega fuera durante el paso 'leyendo' o 'preguntas', la sesion queda `completada: false` en DB indefinidamente. No hay recovery, la sesion se pierde.

**I1.3 [P2] El spec menciona "Tiempo de lectura (inicio y fin)" como senal de rendimiento, pero el tiempo solo se mide desde el render del componente (Date.now()), no se persiste en DB hasta finalizarSesionLectura**
- `PantallaLectura.tsx:49` - Si la reescritura resetea el timer (linea 65), el tiempo final no refleja el tiempo total real de lectura.

**I1.4 [P3] El flujo no tiene "volver atras" desde GENERANDO**
- Si la generacion tarda mucho (OpenAI lento), el nino ve un spinner indefinido sin opcion de cancelar.

### Score seccion: 7/10

---

## 2. FLUJO DEL PADRE (registro -> dashboard)

### 2.1 Estado actual

El flujo completo es:

```
/padre/registro ---> actionRegistro() ---> redirect a /padre/dashboard
/padre/login ----> actionLogin() ----> redirect a /padre/dashboard
/padre/dashboard ---> requireAuth() ---> lista hijos + resumen + dashboard detallado
/padre/nuevo-hijo ---> crearEstudiante() ---> redirect a /padre/dashboard
```

**Puede un padre nuevo registrarse, crear un hijo, y llegar al dashboard?** Si, el flujo principal funciona:
1. Registro: nombre + email + password + confirmar password
2. Redirect a dashboard (vacio)
3. CTA "Anadir hijo" visible cuando no hay hijos
4. Crear hijo: nombre + fecha de nacimiento
5. Redirect a dashboard con tarjeta del hijo

**Los datos del dashboard son correctos y utiles?** Si, cuando hay datos:
- Tarjeta por hijo: sesiones hoy, tiempo, racha, estrellas, calendario semanal
- Dashboard detallado: 7 secciones (evolucion semanal, dificultad, radar tipos, comparativa topics, historial sesiones, recomendaciones, timeline nivel)

**Las recomendaciones offline tienen sentido?** Si, son especificas y accionables:
- Basadas en tipo de pregunta debil (inferencia, vocabulario, etc.)
- Basadas en topic debil
- Basadas en frecuencia de uso

**Puede un padre con 2+ hijos gestionar ambos?** Si:
- `SelectorHijoDashboard` aparece cuando `hijos.length > 1`
- Query param `?hijo=` para seleccionar hijo
- Dashboard detallado carga por hijo seleccionado

### 2.2 Issues encontrados

**I2.1 [P1] No hay vinculo padre-hijo para que el nino acceda a su sesion de lectura**
- El `StudentProgressContext` usa `sessionStorage` para guardar el `estudianteActivo`, pero no hay UI en el flujo del padre para "lanzar" una sesion para un hijo especifico. El padre registra al hijo, pero como llega el nino a `/jugar/lectura`? Falta un boton "Empezar a leer" o "Abrir sesion de [nombre]" en el dashboard del padre, o un flujo de seleccion de hijo en `/jugar`.

**I2.2 [P1] No hay "forgot password"**
- `login/page.tsx` - No hay enlace ni funcionalidad de recuperacion de password. Bloqueante para retencion.

**I2.3 [P2] Dashboard vacio sin CTA de onboarding claro**
- Cuando el hijo existe pero no tiene sesiones, la seccion de dashboard detallado dice "Aun no hay datos suficientes" pero no dice que hacer (no link a `/jugar/lectura`, no instrucciones claras).

**I2.4 [P2] No hay forma de editar el perfil del hijo despues de crearlo**
- `nuevo-hijo/page.tsx` solo pide nombre + fecha nacimiento. El perfil enriquecido (FormularioPerfil) se llena en el flujo de lectura, pero no hay forma de editarlo despues desde el dashboard del padre.

**I2.5 [P3] El padre no puede ver/configurar la API key de OpenAI desde el UI**
- La API key esta en `.env.local`, lo cual requiere acceso al servidor. Un padre normal no puede hacer esto.

**I2.6 [P3] No hay validacion de edad minima/maxima en nuevo-hijo**
- `nuevo-hijo/page.tsx` acepta cualquier fecha de nacimiento. Un bebe de 1 ano o un adolescente de 15 podria ser registrado sin warning.

### Score seccion: 5/10

---

## 3. FLUJO DEL NINO (seleccion -> lectura -> comprension -> resultado)

### 3.1 Estado actual

El flujo interno de sesion de lectura es solido:
1. **Elegir topic**: Grid visual con emojis, favoritos primero, "Empezar a leer"
2. **Generando**: Spinner con "Creando tu historia..."
3. **Leyendo**: Historia con tipografia grande, botones de ajuste (10s delay), "He terminado de leer"
4. **Preguntas**: Una a la vez, feedback inmediato (correcto/incorrecto + explicacion), sonidos
5. **Resultado**: Aciertos visuales, estrellas, cambio de nivel, mensaje motivacional, "Leer otra"

### 3.2 Analisis de usabilidad infantil

**Puede un nino de 6 anos navegar esto solo?**
- El selector de topics usa emojis grandes y texto corto: SI, funciona.
- "Empezar a leer" es claro.
- La pantalla de lectura tiene tipografia `text-lg leading-relaxed`: BIEN.
- "He terminado de leer" esta siempre visible: BIEN, pero un nino podria pulsarlo sin haber leido (no hay control).
- Las preguntas tienen opciones A/B/C/D con feedback visual claro: BIEN.
- Los botones "Hazlo mas facil" / "Hazlo mas desafiante" aparecen despues de 10s: BIEN, pero el texto asume que un nino de 5-6 entiende "desafiante" (vocabulario dificil para esa edad).

**Los textos de instruccion son comprensibles para un nino?**
- "Elige sobre que quieres leer hoy": SI
- "He terminado de leer": SI
- "Hazlo mas desafiante": NO para 5-6 anos. Mejor: "Quiero algo mas dificil" o icono con texto simple.
- "Dificultad ajustada" (indicador): NEUTRO, no necesita entenderlo.
- "Comprension" / "Razonamiento" / "Vocabulario" / "Idea principal" (labels de tipo): MARGINAL, un nino de 6 no entiende "Razonamiento" ni "Vocabulario en contexto".

**El feedback es inmediato y motivacional?**
- SI: feedback visual inmediato al seleccionar opcion (verde/rojo + explicacion)
- SI: sonidos (click + celebracion)
- SI: mensajes motivacionales diferenciados (excelente/bien/regular/bajo)
- SI: cuando falla, dice "Casi! No te preocupes." + explicacion (tono positivo)
- PROBLEMA: cuando el resultado es "bajo" (0-1 aciertos), el mensaje dice "No pasa nada!" pero el emoji es solo un pufo flexionando (no hay celebracion). El contraste emocional entre 4/4 y 0/4 es demasiado grande.

### 3.3 Issues encontrados

**I3.1 [P1] Que pasa si la API de OpenAI falla durante la generacion?**
- `story-generator.ts:70-139` - Hay 3 reintentos (MAX_REINTENTOS = 2, loop 0..2). Si todos fallan, devuelve `ok: false` con error descriptivo. El UI lo muestra como banner de error en `page.tsx:357-362` y vuelve a elegir-topic.
- PROBLEMA: El error mostrado al nino dice "No se pudo crear la historia. [mensaje tecnico]". El `errorGeneracion` puede contener "No se pudo generar historia despues de 3 intentos. Ultimo error: Error de API: 429 rate limit exceeded". Un nino no deberia ver esto.

**I3.2 [P1] Que pasa si el nino cierra la app a mitad de sesion?**
- La sesion queda `completada: false` en DB. No hay recovery. Al volver, el flujo empieza de nuevo desde elegir-topic con una sesion huerfana en DB.
- No hay guardado de progreso parcial (ni respuestas parciales a preguntas).

**I3.3 [P2] Que pasa si el nino no responde ninguna pregunta correctamente (0/4)?**
- `finalizarSesionLectura`: comprensionScore = 0 -> determinarAjuste(0) = 'bajar' -> nivelNuevo = max(nivel - 0.5, 1)
- Estrellas = 0 (no hay celebracion).
- `ResultadoSesion`: emoji es el pufo, mensaje es "No pasa nada! La lectura es como un superpoder: se entrena."
- FUNCIONA pero: el nino ve 4 cuadrados vacios (sin check) + 0 estrellas + "bajar". Puede ser desmotivador para un nino sensible. No hay "segundo intento" ni opcion de releer.

**I3.4 [P2] Primera sesion vs sesion 20: no hay diferenciacion**
- La misma pantalla de InicioSesion se muestra siempre. No hay "bienvenida especial" para la primera sesion, ni celebracion de milestone (sesion 10, 20, etc.), ni progresion visual de "carrera" o "viaje".

**I3.5 [P2] El boton "He terminado de leer" no tiene proteccion contra lectura instantanea**
- Un nino puede pulsar "He terminado" a los 2 segundos. El tiempo se registra (2000ms) pero no hay feedback de "Leiste muy rapido, quieres releer?" ni proteccion. El ritmoNormalizado penalizaria, pero el nino no entiende por que su score baja.

**I3.6 [P3] No hay forma de releer la historia despues de pasar a preguntas**
- Una vez se pulsa "He terminado de leer", no hay vuelta atras. Un nino que olvido un detalle no puede consultar el texto para responder.

### Score seccion: 6/10

---

## 4. LOGICA DE ADAPTACION

### 4.1 Formula de scoring

```
session_score = 0.65 * comprension + 0.25 * ritmo_normalizado + 0.10 * estabilidad
```

- `comprension`: aciertos/total (0-1)
- `ritmo_normalizado`: 1 - |1 - (tiempo_lectura / tiempo_esperado)| * 0.5 (0-1)
- `estabilidad`: basada en varianza de ultimas 5 sesiones (default 0.5 si < 3 sesiones)

**Tiene sentido pedagogico?**
- SI: comprension domina al 65% (correcto, es lo que importa).
- RAZONABLE: ritmo al 25% evita premiar velocidad bruta, pero la formula penaliza TANTO al nino rapido como al lento de forma simetrica. Un nino que lee mas lento por ser cuidadoso no deberia ser penalizado igual que uno que pulsa "terminar" sin leer.
- CORRECTO: estabilidad al 10% suaviza el ruido. Pero con < 3 sesiones vale 0.5, lo cual es un "bonus" arbitrario.

### 4.2 Umbrales de adaptacion

```
>= 80%: subir    -> nivelNuevo = min(nivel + 0.5, 10)
60-79%: mantener -> nivelNuevo = nivel
< 60%: bajar    -> nivelNuevo = max(nivel - 0.5, 1)
```

**Observaciones:**
- Los umbrales son SOLO sobre comprensionScore (aciertos/total), NO sobre session_score. `reading-actions.ts:183` usa `determinarAjuste(datos.comprensionScore)`.
- El session_score se calcula pero NO se usa para decidir la direccion del ajuste! Se guarda en la evidencia pero no influye en la decision.

### 4.3 Issues encontrados

**I4.1 [P0] El session_score se calcula pero NO determina el ajuste de nivel**
- `reading-actions.ts:183` - `determinarAjuste(datos.comprensionScore)` usa comprension cruda, no el session_score compuesto. Toda la logica de ritmo y estabilidad es decorativa, no funcional.
- El spec dice: "session_score = 0.65 * comprension + 0.25 * ritmo + 0.10 * estabilidad" como la METRICA, pero luego las reglas de ajuste solo miran comprension. Contradiccion interna del spec (seccion 5 vs seccion 8), pero la implementacion deberia resolverla.
- **Recomendacion**: Decidir si el ajuste mira session_score (integrando ritmo/estabilidad) o solo comprension. Si solo comprension, eliminar el calculo de session_score o usarlo solo para dashboard.

**I4.2 [P1] El nivel maximo del spec es 4 pero el codigo permite hasta 10**
- `reading-actions.ts:186` - `nivelNuevo = Math.min(nivelAnterior + 0.5, 10)` pero `NIVELES_CONFIG` en `prompts.ts` solo define configs para niveles 1-4. `getNivelConfig(nivel)` hace `Math.max(1, Math.min(4, Math.round(nivel)))`, asi que niveles > 4 se clampean a 4 en la generacion de historias, pero el nivel del estudiante en DB puede subir hasta 10.
- Resultado: un nino en nivel 8 recibe historias de nivel 4. El nivel mostrado al nino es 8, pero la dificultad real es 4. Engano.

**I4.3 [P1] El nino puede subir nivel con solo 4 preguntas**
- Con 4 preguntas (4/4 = 100%), el nino sube de nivel cada sesion. En 8 sesiones pasa de nivel 1 a nivel 5 (que se clampea a 4). No hay proteccion de "necesitas N sesiones consecutivas buenas para subir".
- `dashboard-utils.ts:26-49` calcula `sesionesNecesarias = 3`, pero esto es solo un WIDGET de UI, no una regla del sistema de ajuste. El ajuste real sube con UNA sola sesion buena.

**I4.4 [P2] Los pasos de nivel son de 0.5 pero las historias usan niveles enteros**
- `reading-actions.ts:186-187` sube/baja 0.5. Un nino puede estar en nivel 2.5. `getNivelConfig(2.5)` hace `Math.round(2.5) = 3` (JavaScript rounds .5 up). Asi que un nino en 2.5 recibe historias de nivel 3. Pero un nino en 2.4 recibe nivel 2. La diferencia entre 2.4 y 2.5 es un salto brusco.
- El baseline tambien genera niveles con .5 (`calcularBaseline:171` puede devolver `resultado.nivelTexto + 0.5`).

**I4.5 [P2] El modificador manual no afecta la direccion, solo el session_score (que no se usa)**
- `reading-actions.ts:158-170` - Si el nino pidio "mas facil", el modificador resta 0.10 del session_score. Pero como la direccion se decide por comprensionScore crudo (I4.1), el modificador no tiene efecto real.

**I4.6 [P2] Un nino puede quedar atrapado en nivel 1**
- Si comprension < 60% en nivel 1, `nivelNuevo = max(1 - 0.5, 1) = 1`. Correcto que no baje de 1, pero no hay mecanismo para ayudarlo: misma dificultad de nivel 1 cada vez, misma frustracion, sin intervencion del padre ni cambio de estrategia.

### Score seccion: 4/10

---

## 5. GENERACION DE CONTENIDO

### 5.1 Estado actual

Pipeline: `prompt -> OpenAI (gpt-4o-mini) -> parse JSON -> QA rubric -> return/retry`

**Prompts:**
- System prompt: autor de cuentos educativos, espanol es-ES, 4 tipos de pregunta, JSON obligatorio
- User prompt: parametrizado por edad, nivel, topic, intereses, personajes favoritos
- Rewrite prompt: mantener personajes/trama, ajustar complejidad

**Niveles de dificultad:**
| Nivel | Palabras | Oracion | Tiempo esperado |
|-------|----------|---------|-----------------|
| 1 | 50-70 | 5-8 | 60s |
| 2 | 80-110 | 6-10 | 90s |
| 3 | 120-160 | 8-14 | 120s |
| 4 | 160-220 | 10-18 | 150s |

**QA Rubric:**
1. Palabras prohibidas (29 palabras: muerte, arma, droga, sexo, odio, etc.)
2. Longitud dentro de rango (30% tolerancia)
3. 4 tipos de pregunta presentes (literal, inferencia, vocabulario, resumen)
4. Opciones validas (4 por pregunta, no vacias)
5. Titulo no vacio (>= 3 chars)

**Reintentos:** MAX_REINTENTOS = 2 (total 3 intentos)

### 5.2 Issues encontrados

**I5.1 [P1] La QA rubric no atrapa contenido emocionalmente inapropiado**
- La lista de palabras prohibidas es basica. No detecta:
  - Temas de abandono, divorcio, acoso escolar (pueden surgir en contexto de "aventura" o "misterio")
  - Situaciones de miedo intenso (pesadillas, monstruos reales, persecuciones violentas)
  - Conceptos de enfermedad grave (cancer, hospital, operacion)
- Las 29 palabras son un minimo, no una cobertura real de seguridad infantil.

**I5.2 [P1] No hay proteccion contra historias repetitivas**
- El prompt no recibe historial de historias previas del nino. Un nino que elige "Animales" 10 veces puede recibir 10 historias sobre gatos o perros. No hay seed de variedad ni contexto de historias anteriores.

**I5.3 [P2] No hay retry diferenciado**
- Si la QA rechaza por contenido inseguro, el retry usa el mismo prompt. La temperatura 0.8 da variabilidad, pero no hay instruccion explicita de "evita X que fallo antes".

**I5.4 [P2] gpt-4o-mini puede generar preguntas con opciones ambiguas**
- No hay validacion de que las 3 opciones incorrectas sean claramente distintas de la correcta. Un LLM puede generar opciones trampa demasiado similares o preguntas con 2 respuestas validas.

**I5.5 [P3] El spec dice "es-ES" pero no hay validacion de idioma**
- El prompt pide "espanol correcto (es-ES)" pero no hay check de que la historia este realmente en espanol. Un fallo del LLM podria generar en ingles o mezclar idiomas.

**I5.6 [P3] Rate limit de 20 historias/dia es por estudiante, no por padre**
- `MAX_HISTORIAS_DIA = 20`. Un padre con 3 hijos tiene 60 historias/dia. Podria generar un coste alto de API. No hay rate limit a nivel de padre/cuenta.

### Score seccion: 6/10

---

## 6. EDGE CASES CRITICOS

### 6.1 Nino sin internet a mitad de sesion

**Estado actual:** No hay manejo offline. Si la conexion se pierde:
- Durante `generarHistoria()`: el fetch falla, server action lanza error, se muestra como error generico en elegir-topic.
- Durante lectura: no hay problema (todo esta en memoria client-side).
- Durante `reescribirHistoria()`: falla silenciosamente (`page.tsx:174-177`), el nino sigue con la historia original. BIEN.
- Durante `finalizarSesionLectura()`: las respuestas se pierden. No hay retry, no hay guardado local. El nino contesto 4 preguntas y el resultado no se guarda. **P1: CRITICO.**
- Durante `handleRespuestasCompletas` si falla: `page.tsx:203` - si `result.ok` es false, NO se hace nada. No hay feedback de error. El nino queda en el paso 'preguntas' con las preguntas ya contestadas, sin poder avanzar.

**Recomendacion:** Guardar respuestas en localStorage como backup. Retry automatico al recuperar conexion.

### 6.2 Padre sin API key de OpenAI

**Estado actual:** `hasOpenAIKey()` chequea `process.env.OPENAI_API_KEY`. Si falta:
- `generarHistoria()` devuelve error con codigo 'NO_API_KEY' y mensaje tecnico: "Para generar historias personalizadas necesitas configurar una API key de OpenAI. Anade OPENAI_API_KEY en el archivo .env.local y reinicia la app."
- El nino ve este mensaje en el banner de error.

**Problema [P1]:** Un padre normal no sabe que es un `.env.local` ni una API key. El mensaje es de desarrollador, no de usuario. Ademas, el nino llega al selector de topics, elige un tema, espera, y ENTONCES descubre que no funciona. Mala experiencia.

**Recomendacion:** Detectar la ausencia de API key ANTES del flujo de lectura (en obtenerEstadoLectura o en la landing) y mostrar instrucciones claras al PADRE.

### 6.3 Nino que acierta todo (nivel 4, que pasa despues?)

**Estado actual:**
- Nivel 4 con comprension >= 80% -> `nivelNuevo = min(4 + 0.5, 10) = 4.5`
- `getNivelConfig(4.5)` -> `Math.round(4.5) = 5` -> no existe -> fallback a `NIVELES_CONFIG[2]` (nivel 2!)
- **BUG [P0]:** Un nino que domina nivel 4 recibe historias de nivel 2 porque `getNivelConfig` hace fallback a nivel 2 cuando el nivel redondeado no esta en el mapa.

Despues:
- Nivel 4.5 con comprension >= 80% -> nivel 5.0 -> getNivelConfig(5) -> clamp a 4 -> config nivel 4. OK (el fallback solo aplica para valores no-enteros entre 4 y 5).
- PERO: `getNivelConfig` hace `Math.min(4, Math.round(nivel))`. Para 4.5: Math.round(4.5) = 5, Math.min(4, 5) = 4. OK en este caso especifico.
- Para 5.0+: Math.round(5) = 5, Math.min(4, 5) = 4. OK.
- El fallback `?? NIVELES_CONFIG[2]` solo se activaria si el record lookup falla, lo cual no pasa porque el clamp asegura 1-4.

**Correccion:** El bug del fallback no se activa en la practica gracias al clamp. Pero el nivel en DB sigue subiendo (4.5, 5.0, 5.5...) mostrando un nivel falso al nino. **P1: El nivel mostrado no refleja la dificultad real.**

### 6.4 Nino que falla todo (nivel 1, que pasa?)

- Nivel 1, comprension < 60% -> nivelNuevo = max(1 - 0.5, 1) = 1
- Sigue en nivel 1 indefinidamente.
- No hay mecanismo de intervencion: no avisa al padre, no cambia la estrategia, no ofrece pistas.
- **P2: Bucle de frustracion sin salida.**

### 6.5 Nino que solo usa "mas facil" siempre

- Solo puede usar 1 vez por sesion (`ajusteUsado` flag). BIEN.
- El modificador resta 0.10 del session_score, pero no afecta la direccion del ajuste (I4.5).
- Si el nino pide "mas facil" en CADA sesion, el sistema registra `mas_facil` en manualAdjustments pero no acumula este patron como senal. Un nino que SIEMPRE pide "mas facil" deberia trigger una bajada proactiva de nivel o alerta al padre.

### 6.6 Primera vez sin datos en dashboard

- `DashboardHijo`: muestra "Aun no hay datos de progreso. Es hora de empezar a leer!" BIEN, pero no hay CTA para empezar.
- `DashboardPadreDetalle`: "Aun no hay datos suficientes para mostrar el dashboard detallado." BIEN.
- No hay empty states con ilustraciones ni guia paso a paso. Funcional pero poco motivacional.

### 6.7 Sesion abandonada a mitad

- Sesion queda `completada: false` en DB.
- No hay limpieza. Las sesiones huerfanas se acumulan.
- No afectan al calculo de estabilidad (que solo mira sesiones con metadata de comprension).
- Pero SI afectan al conteo de rate limit (`contarHistoriasHoy` cuenta stories, no sesiones).
- **P3:** Sesiones huerfanas son data pollution pero no son bloqueantes.

### Score seccion: 4/10

---

## 7. GAPS DE PRODUCTO

### 7.1 Spec no implementado

| Feature del spec | Estado |
|-----------------|--------|
| "Sin perfil suficiente, no se habilita generacion personalizada completa" | IMPLEMENTADO (router de onboarding) |
| "Registrar evento de ajuste manual con motivo y resultado" | IMPLEMENTADO (manualAdjustments table) |
| "Comparativa por topics" en dashboard padre | IMPLEMENTADO |
| "Top 3 topics fuertes y 1 topic a reforzar" en dashboard nino | IMPLEMENTADO en server pero NO visible en UI nino (solo en dashboard padre) |
| "Tendencia de comprension (7 sesiones)" en dashboard nino | IMPLEMENTADO en server pero dashboard nino NO tiene UI propia (solo padre lo ve) |
| "Ritmo lector (tiempo por lectura vs objetivo)" en dashboard nino | IMPLEMENTADO en server pero SIN UI de dashboard nino |
| "Nivel actual y siguiente objetivo" en dashboard nino | IMPLEMENTADO en server pero SIN UI de dashboard nino |

**GAP CRITICO [P0]: No existe dashboard del nino como pantalla.**
- `obtenerDashboardNino()` esta implementado en `dashboard-actions.ts:127-213`, pero NO hay ninguna ruta ni componente que lo consuma.
- El spec requiere 4 widgets para el nino: tendencia, ritmo, nivel, topics. La data existe pero no se muestra.

### 7.2 Implementado pero no en spec

| Feature implementada | Valoracion |
|---------------------|------------|
| Test de baseline (4 textos crecientes) | EXCELENTE, buen diagnostico inicial |
| Celebracion visual (confetti?) | BIEN, refuerzo positivo |
| Sonidos (click + celebracion) | BIEN, feedback multimodal |
| Timeline de cambios de nivel | BIEN, trazabilidad para el padre |
| Calendario semanal L-D | BIEN, visualizacion de habito |
| Rate limit 20 historias/dia | NECESARIO |

### 7.3 Que haria que un padre lo deje despues de 1 semana?

1. **No entender si funciona.** El dashboard padre es rico en datos, pero no hay un "resumen ejecutivo": "Tu hijo ha mejorado un X% esta semana" vs "Tu hijo necesita mas practica en inferencias". Las 7 secciones son muchas; un padre necesita 1 frase clave al abrir.

2. **No poder configurar la API key.** Si esto requiere acceso al servidor, el 99% de padres no pueden usarlo. Bloqueante para distribucion.

3. **No recibir notificaciones/recordatorios.** Si el nino no lee en 3 dias, nada pasa. No hay push, no hay email, no hay recordatorio in-app.

4. **No hay "sesion guiada con el padre".** El spec menciona "acompanamiento" como dato del perfil, pero no hay modo de lectura en voz alta, ni lectura compartida, ni "lee con tu padre hoy".

5. **No hay objetivos/metas.** No hay "meta de esta semana: 3 sesiones" ni "llegar a nivel 3 antes de marzo". Sin meta, no hay urgencia.

### 7.4 Que haria que un nino diga "no quiero leer mas"?

1. **Historias repetitivas.** Sin historial de historias previas en el prompt (I5.2), el nino puede recibir tramas similares.

2. **Bajar de nivel sin entender por que.** El nino ve "Nivel 3 -> 2.5" y lee "Vamos a practicar con historias un poquito mas sencillas." No entiende que hizo mal. Se siente castigado.

3. **No hay elementos de juego.** No hay avatares, medallas, logros, coleccionables, ni narrativa envolvente ("tu mision es..."). Solo estrellas y nivel. Insuficiente para engagement a largo plazo.

4. **No puede elegir dificultad libremente.** El nino no puede decir "quiero una historia larga hoy" o "quiero una facil para relajarme". El sistema decide por el.

5. **El baseline es demasiado largo para un primer contacto.** Un nino que llega por primera vez tiene que pasar: perfil del padre (3 pasos) + seleccionar intereses + test baseline (4 textos con preguntas). Eso son ~15-20 minutos ANTES de la primera historia personalizada. Muchos ninos abandonaran.

---

## DIAGRAMA DE ESTADOS ASCII COMPLETO

```
                        ==========================================
                        |            /jugar/lectura              |
                        ==========================================
                                        |
                                        v
                               [Loading: spinner]
                                        |
                        +--- no estudiante/error ---> "No se encontro perfil"
                        |
                        v
                 {obtenerEstadoLectura}
                        |
          +-------------+-------------+-------------+
          |             |             |             |
          v             v             v             v
    [PERFIL         [INTERESES    [BASELINE     [LISTO]
    INCOMPLETO]     FALTANTES]    FALTANTE]        |
          |             |             |             v
    [FormularioPerfil]  |     [TestBaseline]   [SESION]
     Paso 1: curso      |      intro            |
     Paso 2: rutina     |      leyendo N1       |
     Paso 3: senales    |      preguntas N1     |
          |             |      (N2, N3, N4)     |
          |             |      resultado        |
          |             |             |          |
    [SelectorIntereses] |             |          |
          |             |             |          |
          +------+------+------+------+          |
                 |                               |
                 v                               v
          {cargarEstado}                  +-----------+
                 |                        | elegir-   |
                 +----> vuelve al ------> | topic     |<--------+
                        router            +-----------+         |
                                               |                |
                                    onStart(topic)              |
                                               |                |
                                               v                |
                                         +-----------+          |
                                         | generando |          |
                                         +-----------+          |
                                          |         |           |
                                        error       ok          |
                                          |         |           |
                                          v         v           |
                                     [error msg] +-----------+  |
                                          |      | leyendo   |  |
                                          |      +-----------+  |
                                          |        |    |       |
                                          |  ajuste-   terminar |
                                          |  manual     lectura |
                                          |    |         |      |
                                          |    v         v      |
                                          | [rewrite] +-----------+
                                          |    |      | preguntas |
                                          |    v      +-----------+
                                          | [leyendo     |        |
                                          |  actualiz.]  v        |
                                          |       {finalizar}     |
                                          |              |        |
                                          |              v        |
                                          |        +-----------+  |
                                          |        | resultado |  |
                                          |        +-----------+  |
                                          |          |      |     |
                                          |     leer-otra  volver |
                                          |          |      |     |
                                          +----------+   /jugar   |
                                          |                       |
                                          +-----------------------+
```

---

## RESUMEN DE ISSUES POR PRIORIDAD

### P0 (Bloqueante)

| ID | Issue | Archivo:Linea | Impacto |
|----|-------|---------------|---------|
| I4.1 | session_score se calcula pero NO determina el ajuste de nivel | reading-actions.ts:183 | Ritmo y estabilidad son decorativos |
| I7.1 | Dashboard del nino no tiene UI (data existe, pantalla no) | N/A - falta ruta/componente | Spec incumplido: 4 widgets del nino no visibles |
| I4.2 | Nivel puede subir hasta 10 pero solo hay configs 1-4 | reading-actions.ts:186 | Nivel mostrado no refleja dificultad real |

### P1 (Alto)

| ID | Issue | Archivo:Linea | Impacto |
|----|-------|---------------|---------|
| I2.1 | No hay vinculo padre->sesion de lectura del hijo | N/A | El nino no puede llegar a leer |
| I2.2 | No hay "forgot password" | login/page.tsx | Retencion bloqueada |
| I3.1 | Errores tecnicos mostrados al nino | page.tsx:357-362 | UX infantil rota |
| I3.2 | Sesion abandonada pierde respuestas | page.tsx:193-208 | Frustracion del nino |
| I4.3 | Sube de nivel con 1 sola sesion buena | reading-actions.ts:186 | Nivel inestable |
| I5.1 | QA no atrapa contenido emocionalmente inapropiado | qa-rubric.ts:31-38 | Riesgo de seguridad infantil |
| I5.2 | Historias repetitivas (sin historial en prompt) | story-actions.ts:105-114 | Desenganche |
| I6.1 | Perder conexion en finalizarSesion pierde todo | page.tsx:196-208 | Respuestas perdidas |
| I6.2 | API key requiere .env.local (inaccesible para padres) | openai.ts:10, story-actions.ts:67-73 | Producto inutilizable sin dev |

### P2 (Medio)

| ID | Issue | Archivo:Linea | Impacto |
|----|-------|---------------|---------|
| I1.2 | No hay estado "sesion-abandonada" | N/A | Data pollution |
| I1.3 | Tiempo de lectura post-rewrite no refleja tiempo total | PantallaLectura.tsx:65 | Ritmo incorrecto |
| I2.3 | Dashboard vacio sin CTA de onboarding | dashboard/page.tsx:103-110 | Padre perdido |
| I2.4 | No se puede editar perfil del hijo | N/A | Datos obsoletos |
| I3.3 | 0/4 aciertos sin mecanismo de ayuda | page.tsx + ResultadoSesion | Frustracion |
| I3.4 | Sin diferenciacion primera sesion vs sesion 20 | InicioSesion.tsx | Sin engagement |
| I3.5 | Sin proteccion contra lectura instantanea | PantallaLectura.tsx | Gaming the system |
| I3.6 | No se puede releer historia durante preguntas | page.tsx:329-338 | Comprension penalizada |
| I4.4 | Niveles .5 causan saltos bruscos de dificultad | reading-actions.ts:186-187, prompts.ts:61 | Experiencia inconsistente |
| I4.5 | Modificador manual no afecta direccion de ajuste | reading-actions.ts:158-170 | Feature sin efecto |
| I4.6 | Bucle de frustracion en nivel 1 | reading-actions.ts:187 | Nino atrapado |

### P3 (Bajo)

| ID | Issue | Archivo:Linea | Impacto |
|----|-------|---------------|---------|
| I1.4 | Sin cancelar generacion en progreso | page.tsx:292-306 | UX menor |
| I2.5 | API key no configurable desde UI | N/A | Solo afecta self-hosted |
| I2.6 | Sin validacion de edad en nuevo-hijo | nuevo-hijo/page.tsx | Edge case |
| I5.3 | Retry sin contexto del error anterior | story-generator.ts:70 | Eficiencia |
| I5.4 | Preguntas con opciones ambiguas | prompts.ts | Calidad variable |
| I5.5 | Sin validacion de idioma | prompts.ts:78 | Raro pero posible |
| I5.6 | Rate limit por estudiante, no por padre | story-actions.ts:33 | Coste |

---

## SCORES POR SECCION

| Seccion | Score | Comentario |
|---------|-------|------------|
| 1. Mapa de estados y flujos | 7/10 | Flujo principal solido, falta recovery de errores |
| 2. Flujo del padre | 5/10 | Funcional pero incompleto (no link hijo->lectura, no forgot pwd) |
| 3. Flujo del nino | 6/10 | Buen UX base, faltan protecciones y engagement |
| 4. Logica de adaptacion | 4/10 | session_score decorativo, nivel desbordado, subida rapida |
| 5. Generacion de contenido | 6/10 | Pipeline funcional, QA basica, falta variedad |
| 6. Edge cases | 4/10 | Sin offline, sesiones perdidas, API key bloqueante |
| 7. Gaps de producto | 5/10 | Dashboard nino falta, sin gamificacion, onboarding largo |

**Score total: 5.3/10**

---

## VEREDICTO DE PRODUCTO

OmegaRead tiene una **base tecnica solida** con un flujo de lectura adaptativa bien pensado, buena trazabilidad de decisiones, y un dashboard padre rico en datos. La arquitectura de onboarding (perfil -> intereses -> baseline -> lectura) es correcta y el spec esta bien reflejado en la implementacion con pocas excepciones.

**Sin embargo, hay 3 problemas estructurales que impiden que sea un producto real:**

1. **El sistema de adaptacion esta roto.** El session_score (formula v1 del spec) se calcula pero no se usa para ajustar nivel. El nivel puede subir indefinidamente mas alla de las configs existentes. Un nino sube de nivel con una sola sesion. El core del producto (adaptacion inteligente) no funciona como se diseno.

2. **No hay dashboard del nino.** La data esta computada en server pero no hay UI. El nino no ve su progreso, sus topics fuertes, ni su racha. 4 widgets del spec estan implementados en backend sin frontend.

3. **La distribucion esta bloqueada por la API key.** El producto requiere que el padre configure `OPENAI_API_KEY` en `.env.local`. Esto limita el uso a desarrolladores. No hay plan de proxy, gestion de credenciales, ni modelo de monetizacion que resuelva esto.

**Recomendaciones priorizadas (top 5):**

1. **Fijar la adaptacion de nivel:** usar session_score para determinar direccion, limitar nivel max a 4, requerir N sesiones consecutivas para subir.
2. **Crear UI del dashboard del nino:** la data ya existe, solo falta el componente.
3. **Resolver la distribucion de API key:** proxy con creditos, o modelo freemium con key propia.
4. **Anadir recovery de sesion:** guardar estado parcial, retry de finalizacion, sesion resumible.
5. **Anadir historial de historias al prompt:** evitar repeticion, aumentar variedad.
