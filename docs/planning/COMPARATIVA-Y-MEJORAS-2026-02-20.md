# Comparativa y Mejoras: Docs Nuevos vs Repo Existente

Fecha: 2026-02-20  
Estado: Análisis completo para decisión  
Autor: Análisis generado por agente  

## Contexto

Se comparan dos conjuntos de documentación sobre el mismo proyecto (plataforma educativa open source tipo Alpha School):

- **Conjunto A (Repo)**: OmegaRead/OmegaAnywhere — backlog de 48 items, 14 épicas, 5 olas, stack TS+Python, arquitectura multi-app.
- **Conjunto B (Nuevo)**: Research pedagógico exhaustivo + UX spec para 4-8 años (~2100 líneas) + arquitectura alternativa SvelteKit + SQLite local-first.

También se incorpora el curriculum existente (lectura bilingüe 6-8, mates 6-8) y el research original sobre Alpha School.

---

## 1. Tabla de Divergencias Técnicas

| Decisión | Conjunto A (repo) | Conjunto B (nuevo) | **Mejor opción** | Por qué |
|---|---|---|---|---|
| **Framework** | Next.js + TypeScript + Tailwind | SvelteKit 2 + Vite + Tailwind | **SvelteKit (B)** | Bundle 4-5x más pequeño (7-10KB vs 40KB+ gzip). Para una PWA offline-first en tablets baratas (el dispositivo real de familias target), cada KB importa. Svelte compila a JS vanilla: rendimiento superior en animaciones (crítico para UX infantil). Curva de aprendizaje menor para contribuidores OSS. SvelteKit tiene service workers nativos, ideal para PWA. Next.js brilla en apps enterprise con SSR pesado, pero aquí el 95% es cliente. |
| **Base de datos** | PostgreSQL + Redis + S3 | SQLite local-first (wa-sqlite + OPFS) + sync opcional | **SQLite local-first (B)** | El usuario target es "un padre español con un niño de 5 años que va retrasado". Este padre NO va a deployar PostgreSQL. El 95% de la lógica debe correr en el cliente. SQLite en el browser (OPFS) permite funcionar sin servidor. Los datos son mayormente append-only (sesiones, respuestas), los conflictos son rarísimos (un niño no edita su progreso en dos dispositivos a la vez). PostgreSQL queda como opción para hosting en nube multi-familia, no como requisito. Redis es sobreingeniería para MVP. |
| **AI Layer** | Híbrido TS+Python con FastAPI para ASR/scoring | 3 capas: algoritmos → LLM local → cloud API | **3 capas (B), pero con Python disponible para ASR (de A)** | La capa 1 (FSRS, IRT, CAT — puro algoritmo) cubre el 70-80% de la "inteligencia" sin coste ni conexión. Esto es genial. La capa 2 (LLM local vía WebLLM) da generación de variaciones offline. La capa 3 (cloud) es para lo excepcional. Pero B ignora que el ASR para lectura oral (feature P1 en el spec de A) necesita Python: STT con timestamps, VAD, alineación fonética. FastAPI de Python sigue siendo necesario para este pipeline, pero como servicio opcional, no como requisito del core. |
| **Offline-first** | No explícito. Asume servidor siempre disponible. | Requisito core #1. La app DEBE funcionar sin internet. | **Offline-first obligatorio (B)** | El caso de uso real: un pueblo sin fibra óptica, una familia en el coche, una tablet sin datos. Si la app no funciona offline, pierde al 30-40% de las familias target. Además, offline-first fuerza buenas decisiones de arquitectura (local-first data, pre-generación de contenido, degradación elegante). El repo A asume un mundo always-connected que no es la realidad de muchas familias españolas/latinas. |
| **Gamificación** | XP numérico por mastery, badges por skill, leaderboard opcional, streaks | Mapa de Aventuras + Mascota personalizable + Stickers coleccionables + Estrellas visuales (sin números para 4-5) | **Mapa + Mascota (B) para 4-8. XP numérico (A) para 9+.** | Un niño de 4-5 años no entiende "47 XP". Ni siquiera uno de 6. Los stickers coleccionables y la mascota que evoluciona son el equivalente perfecto para esta edad. El Mapa de Aventuras como navegación visual es brillante: el niño toca una zona, no navega menús. El leaderboard de A es directamente dañino para menores de 8 (genera ansiedad). Los XP numéricos y streaks de A son correctos para la Fase 2 (9-14 años), pero no para el foco actual 4-8. |
| **Sesiones** | No definidas explícitamente. Referencia indirecta a Pomodoro de 25 min (Alpha). | 10-20 min adaptadas por edad: 10 min (4y), 12 (5y), 15 (6y), 18 (7y), 20 (8y). Max 3 sesiones/día. | **Sesiones adaptadas por edad (B)** | La investigación sobre atención infantil es contundente: un niño de 4 años aguanta 8-12 min sostenidos. 25 min de Pomodoro a esa edad es garantía de frustración y abandono. Las sesiones de B están basadas en evidencia real de capacidad atencional. Además, B añade algo clave: el sistema TERMINA la sesión, no el niño. Esto es diseño responsable de screen time. |
| **Licencia** | Private until quality gate. Luego decidir AGPL/Apache. | AGPL-3.0 desde día 1 (código). CC-BY-SA 4.0 (contenido). | **AGPL desde día 1 (B)** | Si el proyecto es "open source tipo Alpha School", empezar cerrado contradice la tesis. Los contribuidores OSS no invierten tiempo en repos privados con promesas futuras de apertura. AGPL protege contra que alguien cierre el código y venda un SaaS sin devolver. La excusa de "esperar calidad" es un antipatrón: la calidad mejora MÁS RÁPIDO con contribuidores que con secrecía. Abrir el repo el día 1 con un README honesto ("alpha, bienvenidas las contribuciones") es mejor que el gate de D-005/D-006 del repo A. |
| **UX paradigma** | Dashboard-centric. Sesiones de lectura con quiz. Vista de skills. | Audio-first. Sin texto para pre-lectores. Mascota como interfaz. Mapa de aventuras. | **Audio-first + Mapa (B)** | Para niños de 4-5 que NO leen, un dashboard con texto es inutilizable. B diseña desde la restricción real: la interfaz HABLA, los botones son iconos enormes (60-80pt), la mascota da instrucciones orales. Esto no es un "nice to have"; es EL requisito de accesibilidad #1 para la edad target. A diseña para un usuario que ya lee, lo cual excluye a la mitad del rango 4-8. |
| **Lectura español** | Taxonomía de skills genérica. Sin detalle fonético. Pipeline de generación por LLM + QA. | Método mixto silábico detallado: conciencia fonológica → vocales → sílabas directas → inversas → trabadas → combinaciones. Dialectos configurables. | **Método mixto detallado (B), con pipeline de QA de A** | El español es fonéticamente transparente (~95% regular grafema-fonema). La sílaba es la unidad natural, no el fonema aislado. B lo entiende y diseña la progresión correcta para español. A trata la lectura como genérica (generada por LLM), sin metodología fonética específica. Pero A tiene algo valioso que B no tiene: el pipeline de QA de contenido (rubrica 5 dimensiones, score ≥4.2, ninguna crítica <4.0). Combinar ambos: método silábico de B + pipeline QA de A. |
| **Target de edad** | 4-9 años (D-001) | 4-8 años (Fase 1), 9-14 (Fase 2) | **4-8 foco principal (B)** | Los 4-8 y los 9-14 tienen necesidades UX radicalmente diferentes (audio-first vs texto, stickers vs XP, 10 min vs 25 min). Intentar servir a ambos desde el inicio garantiza que no sirves bien a ninguno. B acierta al focalizar: hacer la mejor app posible para 4-8 y luego expandir. El curriculum existente (sujito00/alpha) ya cubre 6-8 en detalle para lectura y mates. |
| **Monorepo** | pnpm workspaces (web, services, libs) | pnpm + Turborepo. Un solo `git clone` para contribuir. | **pnpm + Turborepo (B)** | Ambos coinciden en monorepo con pnpm. Turborepo de B añade caching de builds y tasks, que acelera CI. Un solo `git clone` y el contribuidor está dentro. Correcto. |
| **Backend language** | TypeScript (Next.js route handlers) + Python (FastAPI) obligatorio | TypeScript only (Hono). Backend minimal, solo para sync. | **TypeScript primary (Hono) + Python opcional para ASR** | Para el 95% del producto (UI, lógica de dominio, gamificación, mastery), TypeScript solo es más simple. Python es necesario SOLO para el pipeline ASR de lectura oral (STT, VAD, alineación). Esto puede ser un servicio separado y opcional, no un requisito del core. Hono de B (14KB, portable) es perfecto para el servidor ligero de sync. |
| **Contenido educativo** | LLM genera + pipeline QA evalúa | Contenido curado en Markdown/JSON en el repo + LLM para variaciones | **Híbrido: curado en repo (B) + pipeline QA (A)** | El contenido fonético para 4-6 años no se puede generar por LLM fiablemente. La progresión silábica (ma-me-mi-mo-mu, luego pa-pe-pi-po-pu) debe ser curada por humanos/pedagogos. Para 7-8 años con textos de comprensión lectora, LLM + QA de A es correcto. B acierta en que "contenido es código" (vive en el repo, pasa por PR review). |
| **Arquitectura multi-app** | Elaborada: AppDomainContract, Event Schema, Dashboard reutilizable, Scoring Adapter | No contemplada. App monolítica. | **Simplificar A, no ignorar** | La visión multi-app de A (OmegaRead → OmegaMath → OmegaScience) es correcta a largo plazo pero sobreingeniería para Ola 1-2. No necesitas un AppDomainContract formal cuando solo tienes una app. Pero el diseño de A (event schema, skill graph compartido) es valioso para no tener que reescribir después. Propuesta: mantener la estructura de eventos como pattern interno, pero no formalizar contratos cross-app hasta que exista la segunda app. |
| **Privacy/Audio infantil** | Política detallada: consent → analizar → borrar ≤15 min. Cuarentena 24h si falla. Solo derivados persistentes. | Principio genérico: "datos son sagrados", self-hosting, sin tracking. | **Política concreta de A** | La política de audio de A es una de las mejores piezas del repo. Es específica, auditable, implementable. B se queda en principios genéricos. Para un producto que procesa voz de niños, necesitas la especificidad de A: tiempos de retención, protocolo de borrado, evidencia de cumplimiento. |
| **Observabilidad** | OpenTelemetry + trazas por session_id | No mencionada | **OpenTelemetry (A), pero post-MVP** | Para debugging y calidad pedagógica, saber POR QUÉ el sistema eligió un contenido es crucial. Las trazas de A son correctas pero son Ola 3-4, no Ola 1. |
| **ASR / Lectura oral** | Pipeline completo: VAD → STT → alineación → métricas (oral_wpm, pausas, repeticiones, WER proxy). Gating de confianza. | No contemplado para 4-8. Solo TTS mencionado. | **Pipeline ASR de A para 6-8, adaptar para 4-5** | La lectura en voz alta es CRÍTICA para 4-8 años (el curriculum existente lo confirma: 30-110 ppm como hito). B ignora esto completamente. El pipeline ASR de A (heurístico V1, sin modelo propio) es correcto. Para 4-5 años que están en pre-lectura, TTS guiado es suficiente. Para 6-8 que leen, ASR midiendo fluidez es clave. |
| **Diagnóstico inicial** | Baseline reading check con mini pasaje + quiz + estimación WPM | Diagnóstico "invisible" mediante juegos: reconocimiento letras, conteo, rimas. 6 min total. | **Diagnóstico invisible (B) para 4-6, formal (A) para 7+** | Un "test" para un niño de 4 años es absurdo. El diagnóstico de B (disfrazado de juego, 2 min por área, la mascota guía) es perfecto para esa edad. Para 7-8 años que ya leen, el baseline de A (mini pasaje + quiz) es más preciso. CAT de B (Computerized Adaptive Testing con modelo de Rasch) es el enfoque correcto para ambos, pero la UX debe adaptarse a la edad. |
| **Detección de dificultades** | Anti-patterns: rushing, gaming, baja consistencia. Alertas accionables. | Detección temprana de riesgo: confusión b/d, segmentación fonémica débil, RAN lento. Alertas empáticas y no-diagnósticas. | **Detección temprana de B + anti-patterns de A** | B aporta algo que A no tiene: detección de indicadores de dislexia y TDAH (confusión b/d persistente, segmentación fonémica pobre, velocidad de nombrado lenta). Esto es enormemente valioso para padres con niños de 4-8. A aporta anti-patterns de sesión (rushing, gaming) que B no cubre. Combinar ambos: el sistema detecta TANTO problemas de desarrollo (B) COMO problemas de engagement (A). |

---

## 2. Mejoras Concretas al Backlog Existente

### 2.1 Items nuevos que FALTAN (añadir al backlog)

| ID propuesto | Pri | Épica | Item | Justificación |
|---|---|---|---|---|
| B-050 | **P0** | E0 | Definir requisito offline-first como constraint de arquitectura | Sin esto, cada decisión técnica posterior puede romper el uso sin conexión. Es P0 porque afecta al stack completo. |
| B-051 | **P0** | E4 | Definir UX audio-first para pre-lectores (4-5 años) | La mitad del rango target NO lee. Sin audio-first, el producto es inutilizable para ellos. |
| B-052 | **P0** | E4 | Definir sesiones adaptadas por edad (10-20 min) con auto-cierre | Un niño de 4 no aguanta 25 min. Las sesiones deben cortarse automáticamente. |
| B-053 | **P1** | E4 | Definir mascota/compañero como interfaz de navegación | La mascota no es gamificación: es la INTERFAZ. Da instrucciones, celebra, consuela. Reemplaza texto. |
| B-054 | **P1** | E4 | Definir mapa de aventuras como navegación principal | Los niños de 4-6 no navegan menús. Navegan un mundo visual donde tocan zonas. |
| B-055 | **P1** | E3 | Definir progresión silábica para español (método mixto) | Vocales → sílabas directas → inversas → trabadas → combinaciones. Con dialectos configurables. |
| B-056 | **P1** | E3 | Definir conciencia fonológica como módulo de pre-lectura | Rimas, segmentación silábica, manipulación fonémica. Predictor #1 de éxito lector. |
| B-057 | **P1** | E2 | Definir detección temprana de riesgo de dislexia/TDAH | Confusión b/d persistente, segmentación fonémica débil, RAN lento. Alertas empáticas al padre. |
| B-058 | **P1** | E7 | Rediseñar gamificación por sub-rango de edad | Stickers + mascota (4-6), estrellas + coleccionismo (6-8), XP numérico solo para 9+. |
| B-059 | **P1** | E8 | Definir sugerencias offline para padres | "Diego practicó PA. Busquen cosas con PA: papa, pato, pan." Enorme valor, coste cero. |
| B-060 | **P2** | E4 | Definir módulo de motricidad fina (trazado de letras) | Para 4-6 años, trazar letras con el dedo es aprendizaje + desarrollo motor. |
| B-061 | **P2** | E4 | Definir módulo de pre-matemáticas (conteo, formas, patrones) | Para 4-5 años: correspondencia 1:1, conteo con objetos, reconocimiento de formas. |
| B-062 | **P1** | E9 | Rediseñar dashboard niño como mapa visual (no dashboard de datos) | El dashboard de A es para adultos. El niño de 4-8 necesita un mundo visual, no gráficas. |

### 2.2 Items que deben CAMBIAR de prioridad

| ID | Prioridad actual | Prioridad propuesta | Razón |
|---|---|---|---|
| B-010 (Event schema común v1) | P0 | **P1** | Sobreingeniería para Ola 1. No necesitas event schema formal cuando solo hay una app. Un patrón interno basta. |
| B-011 (AppDomainContract v1) | P0 | **P2** | No hay segunda app. El contrato cross-app no se necesita hasta que OmegaMath exista realmente. |
| B-032 (Dashboard docente v1) | P2 | **P3** | El foco es B2C familias (D-003). El dashboard docente es para cuando haya escuelas usando el producto. Prematuro. |
| B-035-037 (OmegaMath domain) | P2 | **P3** | Primero hacer OmegaRead excelente. La expansión a mates viene después de validar lectura con pilotos reales. El curriculum de mates ya existe (sujito00/alpha/MATH-CURRICULUM.md) pero la implementación es posterior. |
| B-046 (UX lectura voz alta guiada) | P1 | **P0** | Para niños de 4-6 que no leen solos, la lectura guiada con TTS es EL FEATURE. Sin esto, no hay producto para la mitad del rango. |
| B-023 (XP por mastery) | P1 | **P2** | XP numérico no aplica para 4-6 años. Rediseñar como stickers/estrellas para 4-8 (B-058). |

### 2.3 Items que SOBRAN para el foco 4-8 años (diferir)

| ID | Item | Por qué sobra en Ola 1-3 |
|---|---|---|
| B-032 | Dashboard docente | B2C familias primero, escuelas después. |
| B-034 | Objetivos cross-app | No hay segunda app. |
| B-035-037 | OmegaMath domain bootstrap | Lectura primero. Mates como Fase 2. |
| B-038 | Vista familiar multi-app | Una sola app por ahora. |
| B-042 | Benchmark público anónimo | Prematuro sin pilotos completados. |
| B-044 | Economía de recompensas no monetaria | Para 4-8 con stickers basta. Alpha Bucks es concepto de 9+. |

---

## 3. Mejoras a las Olas/Sprints

### 3.1 Olas actuales del repo (5 olas, 12 semanas)

| Ola | Semanas | Contenido actual | Problema |
|---|---|---|---|
| Ola 1 | 1-2 | Contratos v1 + loop lectura base + quiz + mastery | Los contratos v1 son sobreingeniería. No hay UX para pre-lectores. |
| Ola 2 | 3-4 | ASR V1 heurístico + política audio | ASR es correcto pero depende de UX que no está definida. |
| Ola 3 | 5-6 | Dashboard padres v1 + alertas anti-pattern | Falta detección de dificultades de desarrollo (dislexia/TDAH). |
| Ola 4 | 7-8 | Hardening calidad contenido + CARF robusto | OK, pero CARF no aplica a pre-lectores. |
| Ola 5 | 9-12 | Reuso para OmegaMath + dashboard multi-app | Prematuro. Sin pilotos de lectura validados. |

### 3.2 Olas propuestas (incorporando research y foco 4-8)

**Ola 1 (Semanas 1-3): Cimientos — "Un niño de 5 puede usarlo"**

1. Setup monorepo SvelteKit + Turborepo + wa-sqlite
2. Modelo de datos local-first (SQLite en browser via OPFS)
3. UX audio-first: mascota que habla + mapa de aventuras (solo navegación)
4. Módulo pre-lectura: reconocimiento de vocales + conciencia silábica (2-3 actividades funcionales)
5. Sesiones con auto-cierre por edad (10-15 min)
6. Diagnóstico invisible disfrazado de juego (reconocimiento letras, conteo, rimas)
7. Gamificación base: estrellas + primer sticker al completar sesión

**DoD Ola 1**: Un niño de 5 años puede abrir la app, conocer su mascota, jugar con letras 10 minutos, ganar un sticker, y el padre ve un resumen en el dashboard.

**Ola 2 (Semanas 4-6): Lectura — "De las letras a las sílabas"**

1. Progresión silábica completa: vocales → sílabas directas (M, P, L, S, T, N) → primeras palabras
2. Actividades de fusión silábica (M + A = MA, animación visual)
3. Construir palabras arrastrando sílabas
4. TTS para lectura guiada ("lee conmigo")
5. Módulo de trazado de letras (motricidad fina)
6. Mastery tracking con FSRS (sin mostrar al niño)
7. Dashboard padres v0.1: letras reconocidas, sílabas dominadas, tiempo de uso, sugerencias offline

**DoD Ola 2**: Un niño de 6 años puede aprender sílabas nuevas, leer sus primeras palabras, y el padre ve progreso real.

**Ola 3 (Semanas 7-9): Comprensión y Fluidez — "Leer de verdad"**

1. Lectura de frases y párrafos cortos (6-8 años)
2. Comprensión oral para pre-lectores (escuchar cuento + preguntas con imágenes)
3. Preguntas de comprensión post-lectura (guiding + quiz, del spec A)
4. ASR V1 heurístico para lectura oral (6-8 años): STT → alineación → oral_wpm, pausas, repeticiones
5. Política de audio: consent → analizar → borrar ≤15 min (del spec A)
6. Pipeline QA de contenido (rubrica del spec A)
7. Detección temprana de riesgo: confusión b/d, segmentación fonémica, alertas empáticas
8. Anti-patterns: rushing, gaming (del spec A)

**DoD Ola 3**: Un niño de 7 años puede leer un texto, responder preguntas, recibir feedback de fluidez oral. El padre recibe alertas si hay patrones atípicos.

**Ola 4 (Semanas 10-12): Pre-mates + Hardening — "Más que lectura"**

1. Módulo pre-mates (4-5): conteo con objetos, correspondencia 1:1, formas, patrones
2. Módulo mates básicas (6-8): sumas y restas con visuales, intro multiplicación (8 años)
3. Historias interactivas personalizadas por intereses (con LLM + QA)
4. Motor de recomendación de siguiente actividad (adaptar dificultad, priorizar skill gaps)
5. CARF para 7-8 años (WPM * comprensión)
6. Dashboard padres v1 completo: tendencias semanales, comparación consigo mismo, exportar PDF
7. Accesibilidad: OpenDyslexic, modo TDAH (sesiones más cortas, menos estímulos), alto contraste

**DoD Ola 4**: App completa para 4-8 con lectura + mates. Dashboard padres accionable. Accesible para TDAH/dislexia.

**Ola 5 (Semanas 13-16): Piloto + Calidad**

1. Piloto con 20-30 familias reales (diversidad de edades y niveles)
2. Hardening de calidad de contenido (≥95% score QA)
3. Calibración ASR por cohorte de edad
4. Configuración de dialectos (España peninsular, Latam neutro)
5. Sync multi-dispositivo (padre ve progreso en móvil)
6. Backend Hono para sync + distribución de contenido
7. Documentación para contribuidores OSS

**DoD Ola 5**: 20-30 niños usan la app durante 2+ semanas. Datos de CARF y progreso recopilados. El repo es abierto y documentado para contribuidores.

### 3.3 Cambios clave respecto a las olas originales

| Cambio | Justificación |
|---|---|
| Pre-lectores desde Ola 1 (no solo lectura quiz) | La mitad del rango 4-8 no lee. Si Ola 1 requiere leer, excluyes al 50% del target. |
| Mates diferido a Ola 4 (no Ola 5 como OmegaMath separado) | Mates básicas (conteo, sumas) son parte natural de 4-8. No necesita app separada. El curriculum ya existe. |
| Contratos multi-app eliminados de Ola 1 | Sobreingeniería. Se reintroducen cuando haya segunda app real. |
| ASR movido a Ola 3 (no Ola 2) | ASR depende de que la UX de lectura exista. Primero el niño lee, luego medimos fluidez. |
| Piloto movido a Ola 5 (no Ola 4) | El piloto necesita app más madura. 20 familias con producto a medias genera datos malos y mala reputación. |
| Timeline extendido a 16 semanas (no 12) | 12 semanas para cubrir 4-8 años con pre-lectura, lectura, mates, ASR, dashboard, accesibilidad y piloto es irreal. 16 semanas es ambicioso pero factible. |

---

## 4. Decisiones que Deben Reabrirse

### D-001: Segmento inicial "4-9 años" → **Cambiar a "4-8 años (Fase 1)"**

**Por qué reabrir:** El research de B y el UX spec demuestran que 4-8 y 9+ tienen necesidades UX radicalmente diferentes. Un niño de 9 puede usar texto, teclado, XP numérico, Pomodoro de 25 min. Un niño de 4 necesita audio-first, stickers, 10 min de sesión. Intentar servir a ambos diluye el producto.

**Propuesta:** Fase 1 = 4-8 años (como B). Fase 2 = 9-14 años. El diseño de A para 9+ se reserva para Fase 2.

### D-005/D-006: "Private until quality" → **Cambiar a AGPL-3.0 desde día 1**

**Por qué reabrir:** Un proyecto open source que empieza cerrado no atrae contribuidores. El gate de calidad (QA ≥95%, ASR estable, privacidad auditada) tiene sentido como criterio de "production-ready", pero no como criterio de "abierto". Muchos proyectos OSS exitosos (Linux, Kolibri, Anki) fueron abiertos desde antes de estar "listos".

**Propuesta:** AGPL-3.0 desde día 1 para código. CC-BY-SA 4.0 para contenido educativo. README explícito: "Alpha — bienvenidas contribuciones, no apto para uso en producción todavía". El gate de calidad se mantiene como criterio para "publicar en app stores" y "recomendar a familias", no para abrir el repo.

### D-004: "MVP incluye TTS + ASR" → **Matizar: TTS desde Ola 1, ASR desde Ola 3**

**Por qué reabrir:** TTS es imprescindible desde el primer día (audio-first para pre-lectores). ASR (reconocimiento de voz) requiere que el niño ya lea en voz alta, lo cual no ocurre hasta 6+ años y no es necesario hasta que la UX de lectura esté madura.

**Propuesta:** TTS = Ola 1 obligatorio. ASR = Ola 3 (cuando hay textos que leer en voz alta y pipeline de audio definido).

### Decisión implícita: Next.js como framework → **Cambiar a SvelteKit**

**Por qué reabrir:** Next.js no está formalizado en las decisiones cerradas pero permea toda la propuesta de stack. El research de B argumenta convincentemente a favor de SvelteKit para PWA offline-first: bundle 4-5x menor, compilación a JS vanilla (mejor rendimiento en animaciones), service workers nativos, curva de aprendizaje menor para contribuidores OSS.

**Propuesta:** SvelteKit 2 como framework principal. Si el equipo tiene más experiencia con React, Next.js sigue siendo viable, pero la decisión debe ser explícita y documentada.

### Decisión implícita: PostgreSQL como DB primaria → **Cambiar a SQLite local-first**

**Por qué reabrir:** PostgreSQL requiere un servidor. El usuario target no va a deployar PostgreSQL. El principio offline-first (nuevo P0) requiere que los datos vivan en el cliente.

**Propuesta:** wa-sqlite + OPFS como DB primaria del cliente. SQLite para self-hosting del servidor de sync. PostgreSQL como opción para hosting en nube multi-familia (decisión diferida a cuando haya hosting compartido real).

---

## 5. Stack Final Recomendado

### 5.1 Stack principal

| Componente | Elección | Justificación |
|---|---|---|
| **Monorepo** | pnpm + Turborepo | Consenso de ambos. Un solo `git clone`. Caching de builds. |
| **Frontend** | SvelteKit 2 + Vite | Bundle mínimo, offline-first natural, animaciones superiores, curva baja para OSS. |
| **Estilos** | Tailwind CSS 4 | Práctico, tree-shakeable, comunidad masiva. Consenso. |
| **Animaciones** | Rive (mascota, celebraciones) + CSS (transiciones UI) | Rive permite state machines interactivas. Perfecto para mascota que reacciona. Lottie como fallback. |
| **Audio** | Pre-grabado (instrucciones fijas) + TTS nativo (contenido dinámico) | Audio es LA interfaz para 4-5. Pre-carga agresiva. Latencia <100ms. |
| **DB Cliente** | wa-sqlite + OPFS (via Drizzle ORM) | SQLite en browser con persistencia real. Drizzle para type-safety. |
| **DB Servidor** | SQLite (self-host) / PostgreSQL (nube) | SQLite para simplicidad. PG solo cuando hay multi-tenant cloud hosting. |
| **ORM** | Drizzle ORM | Type-safe, ligero, soporta SQLite + PG. Consenso razonable de ambos. |
| **Backend** | Hono (sync + distribución contenido) | Ultra-ligero, TypeScript nativo, portable. El servidor es OPCIONAL. |
| **Auth** | mejor-auth (si se necesita sync multi-dispositivo) | Open source, simple. Solo para familias multi-dispositivo, no para MVP single-device. |
| **AI Tier 1** | FSRS (ts-fsrs) + IRT simplificado + CAT | Algoritmos, no ML. Siempre disponible, gratis, offline. Cubre 70-80% de la "inteligencia". |
| **AI Tier 2** | WebLLM (Phi-3.5/Llama 3.2 cuantizado Q4) | LLM local para generar variaciones, adaptar textos. Requiere WebGPU. Degradación elegante si no disponible. |
| **AI Tier 3** | Claude Haiku / Gemini Flash (via Vercel AI SDK) | Para generación de contenido de alta calidad, evaluación de escritura. ~$0.50-1/estudiante/mes. |
| **ASR** | Python (FastAPI) como servicio opcional | STT con timestamps (Whisper o similar), VAD, alineación texto esperado vs reconocido. Servicio separado, no en el core. |
| **Spaced Rep** | ts-fsrs | Algoritmo FSRS v5, state-of-the-art, open source. Usado en Anki moderno. |
| **i18n** | Paraglide.js (de Inlang) | Compilado, type-safe, runtime tiny. Dialectos: es-ES, es-MX, es-AR, es-CO, es-neutro. |
| **Testing** | Vitest + Playwright | Unit + E2E. Vitest es rápido, Playwright para testing real de PWA. |
| **Linting** | Biome | Más rápido que ESLint + Prettier, todo en uno. |
| **CI** | GitHub Actions | Gratis para open source. |
| **Licencia** | AGPL-3.0 (código) + CC-BY-SA 4.0 (contenido) | Protege contra cierre. Permite uso libre y contribución. |

### 5.2 Lo que se toma de cada conjunto

**Del Conjunto A (repo):**
- ✅ Pipeline de QA de contenido (rubrica 5 dimensiones, scores, guardrails por edad)
- ✅ Política de audio infantil (consent → analizar → borrar ≤15 min)
- ✅ Pipeline ASR V1 heurístico (VAD → STT → alineación → métricas)
- ✅ CARF como North Star (WPM × Comprensión) — para 7+ años
- ✅ Anti-patterns (rushing, gaming, inconsistencia)
- ✅ DoR/DoD para trabajo con subagentes
- ✅ Flujo continuo por olas (no sprint único)
- ✅ Carriles paralelos (discovery, plataforma, dominio, calidad)
- ✅ Trazabilidad de decisiones de IA
- ✅ OpenTelemetry (post-MVP)
- ✅ Event schema como patrón interno (simplificado, sin formalismo cross-app)

**Del Conjunto B (nuevo):**
- ✅ Offline-first como requisito #1
- ✅ SQLite local-first (wa-sqlite + OPFS)
- ✅ SvelteKit como framework
- ✅ Audio-first como paradigma UX
- ✅ Mascota como interfaz (no decoración)
- ✅ Mapa de aventuras como navegación
- ✅ Sesiones adaptadas por edad (10-20 min)
- ✅ Gamificación por sub-rango (stickers 4-6, estrellas 6-8, XP 9+)
- ✅ Método mixto silábico para español
- ✅ Conciencia fonológica como módulo core
- ✅ Diagnóstico invisible (juego para 4-6, CAT formal para 7+)
- ✅ Detección temprana de dislexia/TDAH
- ✅ AI en 3 capas (algoritmos → local LLM → cloud)
- ✅ AGPL-3.0 desde día 1
- ✅ Sugerencias offline para padres
- ✅ Accesibilidad: OpenDyslexic, modo TDAH, alto contraste
- ✅ Dialectos configurables
- ✅ Personas detalladas (Lucía 4, Diego 6, Valentina 8, Ana madre, Roberto padre escéptico)

**Lo que se DESCARTA:**
- ❌ Python obligatorio en el core (de A) — solo para ASR, como servicio separado
- ❌ PostgreSQL como DB primaria (de A) — SQLite local-first
- ❌ Redis (de A) — sobreingeniería
- ❌ AppDomainContract formal en Ola 1 (de A) — diferido
- ❌ Dashboard docente en Ola 1-3 (de A) — B2C familias primero
- ❌ OmegaMath como app separada en Ola 5 (de A) — mates básicas integradas en Ola 4
- ❌ Private until quality (de A) — abierto desde día 1
- ❌ XP numérico para 4-6 (de A) — stickers y estrellas
- ❌ Leaderboard (de A) — eliminado para menores de 8
- ❌ Flutter / React Native (mencionado en B como alternativa) — PWA con SvelteKit es más accesible, no requiere app stores
- ❌ Vision model / waste meter (referenciado de Alpha) — invasivo y contrario al principio de autonomía

### 5.3 Diagrama de arquitectura recomendada

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (PWA — SvelteKit)                  │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ UX Layer    │  │ Core Logic  │  │ SQLite (wa-sqlite)   │  │
│  │             │  │             │  │ via OPFS             │  │
│  │ • Mascota   │  │ • Mastery   │  │                      │  │
│  │ • Mapa      │  │ • FSRS      │  │ • student_profile    │  │
│  │ • Audio     │←→│ • CAT/IRT   │←→│ • knowledge_graph    │  │
│  │ • Stickers  │  │ • Content   │  │ • sessions           │  │
│  │ • Trazado   │  │ • Gamif     │  │ • responses          │  │
│  │             │  │ • Detect    │  │ • achievements       │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │
│                          │                                    │
│                    ┌─────┴──────┐                             │
│                    │ AI Router  │                             │
│                    │ Tier 1: ✅  │                             │
│                    │ Tier 2: ?  │ (WebLLM si WebGPU)         │
│                    └─────┬──────┘                             │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │ (cuando hay conexión)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SERVIDOR (Hono — OPCIONAL)                       │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌───────────┐ │
│  │ Sync     │  │ Content  │  │ AI Proxy   │  │ ASR       │ │
│  │ Engine   │  │ Distrib  │  │ (Tier 3)   │  │ (Python)  │ │
│  │          │  │          │  │ Claude/    │  │ FastAPI   │ │
│  │ LWW +    │  │ Paquetes │  │ Gemini     │  │ STT+VAD   │ │
│  │ cola ops │  │ .sqlite  │  │            │  │ (opcional) │ │
│  └──────────┘  └──────────┘  └────────────┘  └───────────┘ │
│                                                               │
│  DB: SQLite (self-host) / PostgreSQL (nube)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Resumen Ejecutivo para Decisión

### Las 5 decisiones más importantes que tomar:

1. **Framework: SvelteKit** — Bundle menor, offline-first natural, mejor para animaciones infantiles, contribuidores OSS más fáciles de onboardear.

2. **Datos: SQLite local-first** — El padre español con un niño de 5 no va a deployar PostgreSQL. Los datos viven en el dispositivo. El servidor es un bonus para sync, no un requisito.

3. **Offline-first como P0** — Sin esto, perdemos al 30-40% de familias target. Cada decisión técnica debe pasar el test: "¿funciona sin internet?"

4. **UX: Audio-first + Mascota + Mapa** — La mitad del rango target no lee. La mascota no es decoración, es la interfaz. El mapa de aventuras reemplaza menús que requieren leer.

5. **Abierto desde día 1 (AGPL-3.0)** — El proyecto se llama "open source tipo Alpha School". Empezar cerrado contradice la tesis y ahuyenta contribuidores.

### Lo que NO cambia:
- CARF como North Star (para 7+ que ya leen)
- Mastery learning (dominar antes de avanzar)
- Pipeline QA de contenido (rubrica + umbrales)
- Política de audio infantil (consent → analizar → borrar)
- Flujo continuo por olas
- Español primero
- B2C familias como go-to-market

---

*Este documento es la base para que Juan decida los cambios finales a los sprints. Cada recomendación está argumentada con razones técnicas Y pedagógicas, pensando en el usuario real (padre español con niño de 5 que va retrasado) y el contribuidor real (dev open source que quiere aportar).*
