# SPEC: Dashboard del Niño — OmegaRead

**Versión:** 1.0  
**Fecha:** 2026-02-20  
**Autor:** Jony (agente de diseño)  
**Estado:** Borrador v1  
**Dependencias:** [SPEC-ux-design.md](~/clawd-chicho/projects/alpha-open/SPEC-ux-design.md), [OLAS-ACTUALIZADAS](../planning/OLAS-ACTUALIZADAS-2026-02-20.md)

---

## Tabla de Contenidos

1. [Visión y Propósito](#1-visión-y-propósito)
2. [Principios de Diseño](#2-principios-de-diseño)
3. [Sistema de Niveles y Progresión](#3-sistema-de-niveles-y-progresión)
4. [Sistema de Gamificación Completo](#4-sistema-de-gamificación-completo)
5. [La Mascota como Espejo del Progreso](#5-la-mascota-como-espejo-del-progreso)
6. [Visualización de Tendencia (Sube/Baja) por Edad](#6-visualización-de-tendencia-subebaja-por-edad)
7. [Wireframes por Sub-rango de Edad](#7-wireframes-por-sub-rango-de-edad)
8. [Motivación a Seguir: Hooks y Loops](#8-motivación-a-seguir-hooks-y-loops)
9. [Integración con el Mapa de Aventuras](#9-integración-con-el-mapa-de-aventuras)
10. [Anti-patrones (Qué NO Hacer)](#10-anti-patrones-qué-no-hacer)
11. [Especificaciones Técnicas del Dashboard](#11-especificaciones-técnicas-del-dashboard)
12. [Resumen de Pantallas](#12-resumen-de-pantallas)

---

## 1. Visión y Propósito

### ¿Qué es el Dashboard del Niño?

El Dashboard del Niño es la **pantalla de "yo"** del niño dentro de OmegaRead. Es el lugar donde ve quién es, hasta dónde ha llegado, y hacia dónde va. No es una pantalla de estadísticas — es un **espejo mágico** de su aventura lectora.

### ¿Por qué existe?

> **El padre tiene su dashboard con métricas. El niño necesita el suyo — pero hecho para él.**

Hoy, la app tiene un Mapa de Aventuras como navegación principal y actividades dentro de cada zona. Pero falta un lugar donde el niño pueda:

1. **Verse a sí mismo** — "Este soy yo, esto es lo que sé, esto es lo que he conseguido"
2. **Sentir progreso** — no como datos, sino como algo que crece, sube, se llena, evoluciona
3. **Ver la meta** — saber que hay más por delante y sentir ganas de llegar
4. **Entender si mejora** — de forma positiva, nunca punitiva
5. **Querer volver** — el dashboard debe ser en sí mismo un motivo para abrir la app

### Filosofía central

> **El dashboard del niño NO muestra datos. Muestra SENSACIONES.**
> 
> - No "15 de 27 letras" → Una pradera donde brotan flores por cada letra aprendida
> - No "Racha: 5 días" → Un sol que brilla más fuerte cada día que juegas
> - No "Nivel 3 de 10" → Un camino de montaña donde tu mascota ha subido hasta el tercer campamento

Los datos existen por debajo — son para el padre. El niño ve el mundo mágico que esos datos construyen.

---

## 2. Principios de Diseño

### PD1: Todo es Narrativo, Nada es Numérico (4-5 años)

A los 4-5 años, el progreso se cuenta con metáforas visuales, no con números ni barras. El niño no ve "80%" — ve que su jardín tiene más flores que ayer, que su mascota tiene un gorro nuevo, que el camino tiene una banderita más.

**Excepción graduada:**
- **6-7 años:** Pueden ver números simples (⭐×12, 🏷️×8) y barras que se llenan
- **8 años:** Pueden ver números, barras, y gráficas simples con emojis

### PD2: Siempre Hacia Arriba, Nunca Hacia Abajo

El progreso del niño **nunca puede retroceder visualmente**. Si el niño deja de practicar:

- Las flores no se marchitan — simplemente dejan de crecer
- La mascota no se encoge — se queda dormida esperando
- El camino no retrocede — simplemente se pausa
- Los stickers no se pierden — nunca

El niño no pierde nada de lo que ha ganado. El peor caso es que las cosas se "duermen" hasta que vuelve.

### PD3: El Dashboard es un Lugar, No una Pantalla

No es una tabla de estadísticas. Es un **espacio** al que el niño quiere ir — como su habitación en un juego. Tiene su mascota, sus cosas, sus logros decorando las paredes, su vista del camino por recorrer.

### PD4: Tres Capas de Profundidad, No Una Pantalla Llena

El dashboard se organiza en capas de zoom:

| Capa | Qué muestra | Cómo se accede |
|------|-------------|----------------|
| **Capa 1: Mi Rincón** | Mascota + estado general + acceso rápido a siguiente aventura | Pantalla principal del dashboard |
| **Capa 2: Mis Cosas** | Stickers, logros, guardarropa de mascota, racha | Toque en elementos de Capa 1 |
| **Capa 3: Mi Camino** | Vista detallada del progreso por skill (mapa/montaña/gráfica según edad) | Toque en el camino/montaña desde Capa 1 |

Esto evita sobrecargar al niño con todo a la vez. Entra, ve lo esencial, y profundiza solo si quiere.

### PD5: Audio-First en Todo Momento

Cada elemento del dashboard habla al tocarse:
- La mascota saluda al entrar
- Los stickers dicen su nombre ("¡Soy el delfín!")
- Los logros se leen en voz alta ("¡Leíste 10 cuentos!")
- La montaña/camino narra dónde estás ("¡Estás en el tercer campamento!")

Para 4-5 años esto es obligatorio. Para 8 años es opcional pero siempre disponible.

### PD6: Nunca Más de 3 Segundos Para Sentirse Bien

Al entrar al dashboard, en menos de 3 segundos el niño debe sentir algo positivo:
- Su mascota le saluda con cariño
- Ve algo nuevo que ha conseguido
- Recibe una invitación emocionante a la siguiente aventura

Si el dashboard requiere procesamiento cognitivo para "entender" cómo va, está mal diseñado.

---

## 3. Sistema de Niveles y Progresión

### 3.1 Estructura de Niveles

El sistema de niveles es la columna vertebral de la progresión. El niño tiene un **nivel general** (visible) que sube al acumular progreso en múltiples skills.

#### Metáfora de Niveles: "Explorador de Palabras"

| Nivel | Nombre | Icono | Requisitos aprox. | Qué sabe hacer |
|-------|--------|-------|-------------------|----------------|
| 1 | **Semilla** | 🌱 | Empezar | Reconoce su nombre, algunas letras |
| 2 | **Brote** | 🌿 | 5 vocales + contar hasta 5 | Todas las vocales, rimas básicas |
| 3 | **Hojita** | 🍃 | 10 sílabas directas | Sílabas con M, P, L + primeras palabras |
| 4 | **Flor** | 🌸 | 20 sílabas + 15 palabras | Sílabas con S, T, N, D + lee palabras de 2 sílabas |
| 5 | **Arbolito** | 🌳 | Sílabas inversas + 30 palabras | Sílabas inversas + lee frases cortas |
| 6 | **Bosquecito** | 🏕️ | Sílabas trabadas + frases | Lee frases completas con comprensión literal |
| 7 | **Montañero** | ⛰️ | Lectura fluida básica | Lee párrafos cortos, comprensión literal |
| 8 | **Explorador** | 🧭 | Lectura fluida + comprensión | Lee textos de 100-200 palabras, comprensión inferencial |
| 9 | **Aventurero** | 🗺️ | Lectura adaptativa activa | Lee textos personalizados por intereses (Ola 4) |
| 10 | **Maestro Lector** | 📖✨ | Dominio completo | Lee con fluidez, comprende, disfruta, elige |

#### Cómo se Sube de Nivel

```
PROGRESIÓN DE NIVEL:
────────────────────

Cada nivel requiere acumular "luces de estrella" (★) en distintos skills.
Las estrellas se ganan por:
  - Completar actividades (1 ★ por actividad)
  - Dominar un skill nuevo (3 ★ bonus)
  - Racha de 3 días (2 ★ bonus)
  - Racha de 7 días (5 ★ bonus)

Nivel 1 → 2:   10 ★  (alcanzable en 2-3 días)
Nivel 2 → 3:   25 ★  (alcanzable en ~1 semana)
Nivel 3 → 4:   45 ★  (alcanzable en ~2 semanas)
Nivel 4 → 5:   70 ★  (alcanzable en ~3 semanas)
Nivel 5 → 6:  100 ★  (alcanzable en ~1 mes)
Nivel 6 → 7:  140 ★  
Nivel 7 → 8:  190 ★  
Nivel 8 → 9:  250 ★  
Nivel 9 → 10: 320 ★  

IMPORTANTE: Los niveles NUNCA bajan. 
Si el niño deja de practicar, se queda en su nivel.
Al volver, retoma donde estaba (quizá con un repaso suave).
```

#### Cómo se Visualiza por Edad

| Edad | Cómo ve el nivel |
|------|------------------|
| **4-5** | La mascota tiene un aspecto diferente por nivel (crece, tiene más accesorios). No hay número de nivel. Solo la mascota que evoluciona. El niño "siente" que su mascota es más grande/especial. |
| **6-7** | La mascota evoluciona + hay un icono de nivel visible (🌱🌿🍃🌸🌳). La mascota lleva el icono como insignia. Debajo: estrellas acumuladas como puntitos brillantes. |
| **8** | Nivel visible con nombre y número ("Nivel 5 — Arbolito 🌳"), barra de progreso hacia el siguiente nivel, estrellas numéricas ("⭐ 73/100"). |

### 3.2 Skills Trackeados

Estos son los skills que alimentan la progresión. El niño no los ve como lista — los ve como "partes de su mundo" que crecen.

| Skill | Cómo se mide internamente | Cómo lo VE el niño |
|-------|---------------------------|---------------------|
| **Letras conocidas** | 0-27 grafemas reconocidos | Jardín de letras: cada letra aprendida es una flor que brota |
| **Sílabas dominadas** | Nº de sílabas con mastery ≥90% | Piedras en el camino de la montaña: cada sílaba dominada = una piedra más |
| **Palabras que sabe leer** | Nº de palabras leídas correctamente ≥2 veces | Estrellas en el cielo: cada palabra nueva = una estrella que se enciende |
| **Comprensión lectora** | % acierto en preguntas de comprensión | El brillo del sol sobre el camino: comprende bien = sol radiante |
| **Velocidad de lectura** | WPM (solo 7-8 años, vía ASR) | Solo visible a 8 años: un pajarito que vuela más rápido |
| **Vocabulario acumulado** | Palabras en el banco de vocabulario | Cofre de palabras: se abre y muestra las palabras con sus imágenes |
| **Consistencia (racha)** | Días consecutivos con ≥1 sesión | El sol del dashboard (más detalle en sección 4) |

### 3.3 Subida de Nivel: La Ceremonia

Cuando el niño alcanza un nuevo nivel, hay una **ceremonia especial** que es uno de los momentos más emocionantes de la app:

```
CEREMONIA DE SUBIDA DE NIVEL
─────────────────────────────

1. [FANFARRIA] Música especial de celebración (3-4 segundos)

2. [TRANSFORMACIÓN] La mascota brilla con luz dorada
   → Animación de "evolución" (inspiración Pokémon pero suave)
   → La mascota cambia: más grande, nuevo accesorio,
     nuevo detalle visual (corona de flores, capa, etc.)

3. [REVELACIÓN] Pantalla con el nuevo nivel
   🌿 → 🍃
   "¡Eres HOJITA!"
   🔊 "¡Felicidades [nombre]! ¡Ahora eres Hojita! 
       ¡Mira cómo ha crecido [mascota]!"

4. [REGALO] Se desbloquea algo nuevo:
   - Nuevo set de stickers temáticos
   - Nuevo accesorio para la mascota
   - Nueva zona del mapa visible
   - Para 8 años: nuevo tipo de reto/historia

5. [COMPARTIR] "¿Quieres enseñárselo a mamá/papá?"
   → Botón que envía notificación al padre con el logro
   → Opción de captura de pantalla con la mascota y el nivel

6. [TRANSICIÓN] La mascota dice algo motivante:
   🔊 "¡Ahora vamos a aprender cosas nuevas! ¿Listo?"
   → Vuelve al mapa con la nueva zona desbloqueada brillando
```

---

## 4. Sistema de Gamificación Completo

### 4.1 Estrellas (Moneda Principal)

Las estrellas son la moneda universal de OmegaRead. Se ganan, se acumulan, y se usan para desbloquear cosas.

| Acción | Estrellas |
|--------|-----------|
| Completar una actividad | ⭐ × 1 |
| Completar una sesión entera | ⭐ × 2 bonus |
| Dominar un skill nuevo (mastery) | ⭐ × 3 bonus |
| Racha de 3 días | ⭐ × 2 bonus |
| Racha de 7 días | ⭐ × 5 bonus |
| Primer intento perfecto en actividad | ⭐ × 1 bonus |
| Completar un reto diario | ⭐ × 3 |

**¿Qué se hace con las estrellas?**

| Uso | Coste | Disponible desde |
|-----|-------|-------------------|
| Accesorio para mascota (gorro, bufanda...) | 5-15 ⭐ | Nivel 2 |
| Fondo especial para dashboard | 10-20 ⭐ | Nivel 3 |
| Color de mascota | 8-12 ⭐ | Nivel 2 |
| Historia bonus desbloqueada | 15-25 ⭐ | Nivel 5 (Ola 4) |
| Animación especial de mascota (baile, magia...) | 10-20 ⭐ | Nivel 4 |
| Sticker edición limitada | 20-30 ⭐ | Nivel 3 |

**Regla de oro:** Las estrellas NUNCA se pierden. Se gastan voluntariamente. Si el niño no quiere gastar, se acumulan sin límite. La acumulación en sí misma es motivante.

**Visualización por edad:**
- **4-5:** Estrellas brillan en una franja en la parte superior. Sin número. Solo estrellas que se ven y brillan.
- **6-7:** Estrellas con contador simple visible: ⭐ × 12
- **8:** Contador numérico + desglose de cómo se ganaron

### 4.2 Stickers (Coleccionismo)

Los stickers son el corazón emocional de la gamificación. Son como cromos: se coleccionan, se miran, y se enseñan.

#### Colecciones de Stickers

| Colección | Stickers | Cómo se desbloquean | Sticker especial |
|-----------|----------|---------------------|------------------|
| 🐾 Animales del Bosque | 12 | 1 por sesión en zona Letras | 🦊 Zorro Dorado (colección completa) |
| 🦕 Dinosaurios | 10 | 1 por dominar una familia silábica | 🦖 T-Rex Brillante (todos) |
| 🌊 Animales del Mar | 10 | 1 por sesión en zona Palabras | 🐋 Ballena Mágica (todos) |
| 🚀 Espacio | 8 | 1 por cada 5 actividades perfectas | 🛸 OVNI Arcoíris (todos) |
| 🎂 Estacionales | Variable | Disponibles solo en temporada (Navidad, verano, Halloween) | El "raro" de cada temporada |
| 🏆 Logros | Variable | Por hitos específicos (ver badges) | — |
| 💎 Edición Limitada | 5-6 | Comprables con estrellas acumuladas | — |

#### El Álbum de Stickers

El álbum es una pantalla a la que el niño accede desde su dashboard. Es como un libro de cromos digital:

```
ÁLBUM DE STICKERS
─────────────────

┌─────────────────────────────────────────────────────────────┐
│  🔊 "¡Tu álbum de stickers!"                [🏠] (volver) │
│                                                              │
│  ── Animales del Bosque ──  (8/12) 🐾                      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│  │ 🐰 │ │ 🦌 │ │ 🐻 │ │ 🦉 │ │ 🐿️ │ │ 🦔 │               │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│  │ 🐺 │ │ 🦊✨│ │ ❓ │ │ ❓ │ │ ❓ │ │ ❓ │               │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘               │
│                                                              │
│  ── Dinosaurios ──  (4/10) 🦕                               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│  │ 🦕 │ │ 🦖 │ │ 🦴 │ │ 🥚 │ │ ❓ │ │ ❓ │               │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                               │
│  │ ❓ │ │ ❓ │ │ ❓ │ │ ❓ │                               │
│  └────┘ └────┘ └────┘ └────┘                               │
│                                                              │
│  [🌊 Mar]  [🚀 Espacio]  [🎂 Estacionales]  [🏆 Logros]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

INTERACCIONES:
- Tocar un sticker desbloqueado → se agranda + hace sonido 
  + audio dice su nombre ("¡El búho sabio!")
- Tocar un ❓ → la mascota dice: 
  "¡Ese todavía no lo tienes! ¡Sigue jugando para conseguirlo!"
- Los stickers especiales (✨) tienen animación brillante
- Para 6-7 años: se muestra "8 de 12" bajo cada colección
- Para 4-5 años: sin números, solo stickers vs siluetas vacías
```

### 4.3 Rachas (Consistencia)

La racha mide días consecutivos con al menos una sesión completada. Es un motivador de consistencia, no de velocidad.

#### Visualización: El Sol de la Racha

La racha se representa como un **sol** en el dashboard del niño. El sol cambia según los días seguidos:

| Días | Aspecto del Sol | Audio al entrar |
|------|-----------------|-----------------|
| 0 (primer día o tras pausa) | ☁️ Nube suave con brillo detrás | "¡Hola! ¡Vamos a hacer brillar el sol!" |
| 1 | 🌤️ Sol asomando entre nubes | "¡El sol está asomando!" |
| 2 | ⛅ Sol medio visible | "¡Dos días seguidos! ¡El sol sale más!" |
| 3 | ☀️ Sol brillante | "¡Tres días! ¡El sol brilla con fuerza!" + ⭐×2 bonus |
| 5 | ☀️✨ Sol con destellos | "¡Cinco días! ¡Tu sol tiene chispitas!" |
| 7 | 🌟 Sol dorado con corona | "¡Una semana entera! ¡Tu sol es DORADO!" + ⭐×5 bonus + sticker especial |
| 14 | 🌟🌟 Sol dorado con arcoíris | "¡Dos semanas! ¡Has creado un arcoíris!" + accesorio mascota |
| 30 | 🌟🌟🌟 Sol radiante máximo | "¡Un mes entero! ¡Eres INCREÍBLE!" + sticker legendario |

#### Protección de Racha

- **Escudo semanal (solo ≥6 años):** Una vez por semana, si el niño no juega un día, la racha se mantiene automáticamente. No necesita activarlo — es automático. Esto previene la frustración de "perdí mi racha por un día que estaba enfermo".
- **Para 4-5 años:** No hay concepto de racha rota. El sol simplemente vuelve a ☁️ suavemente si no practica, sin mensajes negativos. Al volver: "¡El sol te estaba esperando!"
- **NUNCA hay mensaje de racha perdida.** Si la racha se rompe, simplemente empieza de nuevo sin comentarios negativos.

### 4.4 Logros / Badges

Los logros son hitos permanentes que celebran momentos significativos. Una vez desbloqueados, nunca se pierden.

#### Logros por Categoría

**🔤 Letras y Lectura:**

| Badge | Nombre | Condición | Icono |
|-------|--------|-----------|-------|
| L1 | "¡Mis primeras letras!" | Reconocer 5 letras | 🅰️✨ |
| L2 | "¡Sé todas las vocales!" | Dominar A, E, I, O, U | 🗣️⭐ |
| L3 | "¡Mi primera sílaba!" | Dominar primera sílaba (ej: MA) | 🧩 |
| L4 | "¡La familia de la M!" | Dominar MA, ME, MI, MO, MU | Ⓜ️🌟 |
| L5 | "¡Mi primera palabra!" | Leer correctamente una palabra completa | 📖✨ |
| L6 | "¡Leo 10 palabras!" | 10 palabras leídas correctamente | 📚 |
| L7 | "¡Mi primera frase!" | Leer una frase completa | 📜⭐ |
| L8 | "¡Leo un cuento!" | Completar primer texto con comprensión | 📖🏆 |
| L9 | "¡10 cuentos leídos!" | Completar 10 textos | 📚🌟 |
| L10 | "¡Maestro de sílabas!" | Dominar todas las sílabas directas | 🎓 |

**🌟 Constancia:**

| Badge | Nombre | Condición | Icono |
|-------|--------|-----------|-------|
| C1 | "¡Primer día!" | Completar primera sesión | 🌅 |
| C2 | "¡Una semana!" | Racha de 7 días | 📅⭐ |
| C3 | "¡Un mes!" | Racha de 30 días | 🗓️🏆 |
| C4 | "¡100 sesiones!" | 100 sesiones completadas (acumuladas, no seguidas) | 💯 |
| C5 | "¡Madrugador!" | Jugar antes de las 9:00 AM (3 veces) | 🌄 |

**🎯 Maestría:**

| Badge | Nombre | Condición | Icono |
|-------|--------|-----------|-------|
| M1 | "¡Perfecto!" | 10 actividades perfectas al primer intento (acumuladas) | 💎 |
| M2 | "¡Super oído!" | Identificar 20 rimas correctamente | 👂✨ |
| M3 | "¡Velocista!" | (Solo 7-8) Leer a >40 WPM | 🏎️ |
| M4 | "¡Detective de palabras!" | Acertar 20 preguntas de comprensión | 🔍 |
| M5 | "¡Mil palabras!" | Vocabulario acumulado ≥ 100 palabras | 💬🌟 |

**🎨 Exploración:**

| Badge | Nombre | Condición | Icono |
|-------|--------|-----------|-------|
| E1 | "¡Coleccionista!" | Completar primera colección de stickers | 🏷️⭐ |
| E2 | "¡Aventurero!" | Visitar todas las zonas del mapa | 🗺️ |
| E3 | "¡Mi mascota es genial!" | Equipar 5 accesorios diferentes a la mascota | 👒 |
| E4 | "¡Cuenta-cuentos!" | (Ola 4) Elegir 3 temas de interés diferentes | 📖🎨 |

#### Visualización de Logros

Los logros viven en una pantalla accesible desde el dashboard ("Mis logros" / icono de trofeo).

- **4-5 años:** Los badges son animaciones grandes. Al entrar, la mascota dice "¡Mira lo que has conseguido!" y los muestra uno a uno. Los bloqueados NO se muestran (para no frustrar).
- **6-7 años:** Grid de badges desbloqueados + siluetas de los próximos 2-3 alcanzables. Tocar un badge → audio con la descripción.
- **8 años:** Grid completo con badges desbloqueados (color) y bloqueados (gris). Barra de progreso hacia el siguiente badge alcanzable. Descripción de texto al tocar.

### 4.5 Retos Diarios (Opcionales)

Cada día, la mascota puede proponer un **reto diario** — una mini-misión opcional que da estrellas bonus.

```
RETO DIARIO (ejemplo)
─────────────────────
Mascota: "¡Tengo un reto para ti!"
         "¿Puedes leer 3 palabras nuevas hoy?"
         
[👍 ¡Vamos!]    [👋 Hoy no]

Si acepta y completa:
  → ⭐×3 bonus
  → Animación especial de la mascota
  → "¡Lo lograste! ¡Eres increíble!"

Si acepta y no completa (la sesión termina antes):
  → Sin penalización, sin mención
  → Al día siguiente: nuevo reto (sin referencia al anterior)

Si rechaza:
  → "¡Está bien! ¡Jugamos normal!"
  → Sin penalización alguna
  → Mañana se ofrece otro reto (sin insistir)
```

**Tipos de retos:**
- "Lee 3 palabras nuevas" (lectura)
- "Consigue 5 estrellas hoy" (general)
- "Completa 2 actividades de sílabas" (específico)
- "Escucha un cuento entero" (comprensión oral)
- "¡Toca todas las vocales en orden!" (velocidad)

**Regla:** Los retos SIEMPRE son alcanzables dentro de una sesión normal. Nunca requieren esfuerzo extra. Son solo un "marco" motivacional para lo que el niño iba a hacer de todos modos.

---

## 5. La Mascota como Espejo del Progreso

### 5.1 La Mascota Es El Dashboard

Para los niños más pequeños (4-5), la mascota ES el dashboard. El estado de la mascota comunica TODO sobre el progreso del niño sin necesidad de números, barras o texto.

### 5.2 Estados de la Mascota

| Estado del niño | Aspecto de la mascota | Animación | Audio |
|---|---|---|---|
| **Activo, progresando** | Grande, brillante, ojos alegres, postura erguida | Salta ligeramente, mueve la cola/orejas con energía | "¡Hola [nombre]! ¡Estoy super contento de verte!" |
| **Activo, racha ≥3** | Todo lo anterior + brillo dorado sutil, accesorio "de racha" (bufanda dorada, corona de flores) | Animación más energética, hace trucos | "¡[Nombre]! ¡Llevamos [X] días juntos! ¡A por más!" |
| **Subida de nivel reciente** | Versión evolucionada (más grande, más detalle, nuevo look) | Animación especial del nuevo nivel | "¡Mira cómo he crecido!" |
| **1-2 días sin jugar** | Normal pero sentado/tranquilo | Bosteza suavemente, mira alrededor esperando | "¡Hola [nombre]! ¡Te estaba esperando! ¿Jugamos?" |
| **3-5 días sin jugar** | Dormido con gorrito de dormir | Zzzz... se despierta con animación al entrar | "¡[Nombre]! ¡Has vuelto! ¡Te eché de menos! ¿Jugamos un ratito?" |
| **>7 días sin jugar** | Dormido profundamente, roncando suavemente, con mantas | Se despierta lentamente, se estira, bosteza, se alegra al ver al niño | "¡¡[Nombre]!! ¡Cuánto tiempo! ¡Qué ganas tenía de verte! ¿Vamos a jugar?" |

**Regla fundamental:** La mascota NUNCA está triste, enfadada, o decepcionada. Cuando el niño no juega, la mascota **duerme** (lo cual es tierno, no punitivo). Al volver, la mascota está **emocionada** de verle, no resentida.

### 5.3 Evolución Visual de la Mascota por Nivel

La mascota cambia físicamente al subir de nivel. Los cambios son acumulativos:

```
EVOLUCIÓN DE LA MASCOTA (ejemplo: gato)
────────────────────────────────────────

Nivel 1 - Semilla 🌱
  → Gatito pequeño, simple, colores básicos
  → Sin accesorios
  → Expresiones simples

Nivel 2 - Brote 🌿
  → Un poco más grande
  → Aparece una florecita en la oreja
  → Ojos un poco más expresivos

Nivel 3 - Hojita 🍃
  → Tamaño medio
  → La florecita se convierte en corona de hojas
  → Puede hacer trucos (sentarse, saltar, dar vueltas)
  → Cola más esponjosa

Nivel 4 - Flor 🌸
  → Corona de flores de colores
  → Bigotes más detallados
  → Nuevas expresiones (guiñar, sorpresa, risa)
  → Puede "volar" brevemente (salta muy alto)

Nivel 5 - Arbolito 🌳
  → Grande
  → Capa o mochila con un arbolito bordado
  → Puede hacer animaciones complejas (bailar, rodar)
  → Empieza a tener "poderes" visuales (dejar rastro de brillo)

Nivel 6-7 - Bosquecito/Montañero
  → Más grande y detallado
  → Más accesorios de base
  → Animaciones más elaboradas
  → "Poderes" más llamativos

Nivel 8-9 - Explorador/Aventurero
  → Cercano al tamaño máximo
  → Look de "aventurero experto" (mochila, brújula, mapa)
  → Animaciones personalizadas según los intereses del niño

Nivel 10 - Maestro Lector 📖✨
  → Tamaño máximo
  → Corona/tiara dorada
  → Efecto de brillo permanente
  → Animación única (solo los nivel 10 la tienen)
  → Puede "hablar" más frases (más variedad)
```

### 5.4 Guardarropa de la Mascota

Además de la evolución por nivel, la mascota tiene un guardarropa de accesorios que el niño puede equipar:

**Accesorios comprables con estrellas:**

| Categoría | Ejemplos | Coste |
|-----------|----------|-------|
| Gorros | Gorra, boina, gorro de invierno, gorro de pirata, tiara | 5-10 ⭐ |
| Gafas | Gafas de sol, gafas de nerd, gafas de estrella, gafas redondas | 5-8 ⭐ |
| Capas/Ropa | Bufanda, capa de superhéroe, chaleco, tutú | 8-15 ⭐ |
| Mochilas | Mochila espacial, mochila de dinosaurio, bolsa de tesoros | 10-15 ⭐ |
| Objetos | Varita mágica, espada de madera, lupa, pincel | 8-12 ⭐ |
| Fondos | Nubes, arcoíris, estrellas, burbujas (detrás de la mascota) | 10-20 ⭐ |

**Accesorios por logros (no comprables):**

| Accesorio | Cómo se desbloquea |
|-----------|---------------------|
| 🎓 Birrete | Alcanzar nivel 5 |
| 👑 Corona dorada | Alcanzar nivel 10 |
| 🌈 Arcoíris de fondo | Racha de 14 días |
| 🏅 Medalla | Completar primera colección de stickers |
| 🔮 Bola de cristal | Leer primer cuento completo |

La pantalla de guardarropa se accede tocando la mascota en el dashboard:

```
GUARDARROPA
───────────

┌─────────────────────────────────────────────────────────────┐
│                                    [🏠] (volver)            │
│                                                              │
│         ┌──────────────────────┐                            │
│         │                      │                            │
│         │    🐱                │   ← mascota con accesorios │
│         │   (con gorro y      │      equipados actualmente  │
│         │    bufanda puestos) │                              │
│         │                      │                            │
│         └──────────────────────┘                            │
│                                                              │
│  ── Gorros ──                                               │
│  [🎩] [🧢] [👒] [🏴‍☠️] [🔒] [🔒]                             │
│                                                              │
│  ── Gafas ──                                                │
│  [🕶️] [🤓] [🔒] [🔒]                                       │
│                                                              │
│  ── Capas ──                                                │
│  [🧣] [🦸] [🔒] [🔒] [🔒]                                  │
│                                                              │
│  🔊 "¡Toca para probártelo!"                               │
│                                                              │
│  Mis ⭐: 23                                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

INTERACCIÓN:
- Tocar accesorio desbloqueado → la mascota se lo pone con animación
- Tocar accesorio bloqueado → "¡Necesitas 8 ⭐ para este!" 
  (o "¡Necesitas ser nivel 5!")
- El niño puede equipar múltiples accesorios (gorro + gafas + capa)
- Tocar la mascota → hace animación divertida con sus accesorios
```

---

## 6. Visualización de Tendencia (Sube/Baja) por Edad

### El Problema

Los niños necesitan sentir si están mejorando. Pero mostrar tendencia a un niño de 4 años es radicalmente diferente a mostrársela a uno de 8. Y la regla de oro es: **NUNCA punitivo.**

### 6.1 Para 4-5 Años: La Mascota ES la Tendencia

A esta edad, la tendencia no es un gráfico ni un camino. Es la mascota.

**Si mejora (tendencia ↑):**
- La mascota está MÁS GRANDE que la última vez
- La mascota tiene MÁS ENERGÍA (salta más, brilla más)
- El jardín del dashboard tiene MÁS FLORES
- Audio: "¡Mira cuánto has crecido!" / "¡Tu jardín está precioso!"

**Si está estable (tendencia →):**
- La mascota está igual — contenta, normal
- El jardín tiene las mismas flores (no brotan nuevas pero no se marchitan)
- Audio normal: "¡Hola! ¿Jugamos?"

**Si no practica / baja (tendencia ↓):**
- La mascota NO se encoge ni se pone triste
- La mascota se DUERME (dormida = tierna, no triste)
- Las flores del jardín se quedan igual (no se marchitan)
- Al volver:
  - La mascota se despierta FELIZ de ver al niño
  - Audio: "¡[Nombre]! ¡Te echaba de menos! ¿Jugamos un ratito?"
  - Si lleva >3 días: "¡Cuánto tiempo! ¡Mira, tu jardín te espera!"

**Clave:** No hay gráfica, no hay flechas, no hay "has bajado". El niño SIENTE que su mascota está más o menos activa. Es intuitivo y emocional, no cognitivo.

### 6.2 Para 6-7 Años: La Montaña del Progreso

A 6-7 años, el niño puede entender una metáfora espacial simple: estoy subiendo una montaña.

```
LA MONTAÑA DEL PROGRESO
────────────────────────

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                         ⛰️ 🏁                              │
│                        ╱    ╲                               │
│                       ╱      ╲                              │
│                  🏕️ ╱        ╲                              │
│                    ╱  Camp. 7  ╲                             │
│                   ╱              ╲                           │
│              🏕️ ╱                ╲                          │
│                ╱  Campamento 6    ╲                          │
│               ╱                    ╲                         │
│          🏕️ ╱                      ╲                        │
│            ╱  Campamento 5          ╲                        │
│           ╱                          ╲                       │
│      🐱 ╱  ← ¡ESTÁS AQUÍ! ✨                               │
│    ⛺🏕️  Campamento 4                                       │
│        ╱                                                     │
│   🏕️ ╱  Campamento 3 ✅                                    │
│      ╱                                                       │
│ 🏕️ ╱  Campamento 2 ✅                                      │
│    ╱                                                         │
│ 🏕️ Campamento 1 ✅                                         │
│ ╱                                                            │
│🌿 Inicio ✅                                                 │
│                                                              │
│  🔊 "¡Estás en el campamento 4! ¡Ya falta menos             │
│      para la cima!"                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘

INTERACCIONES:
- La mascota está en el campamento actual, con una banderita
- Los campamentos pasados (✅) muestran una banderita clavada
- Los campamentos futuros tienen una tienda de campaña difuminada
- La cima (🏁) siempre es visible — es la meta
- Tocar un campamento pasado → "¡Aquí aprendiste las sílabas con M!"
- Tocar el actual → "¡Estás aquí! Necesitas 12 ⭐ más para subir"
- Tocar uno futuro → "¡Ahí hay cosas geniales esperándote!"

TENDENCIA:
- ↑ Mejora: la mascota avanza hacia arriba (animación de subida)
  "¡Estás subiendo! ¡El siguiente campamento está cerca!"
- → Estable: la mascota está sentada junto a su fogata
  "¡Aquí estamos! ¿Seguimos subiendo?"
- ↓ Sin actividad: la mascota está dormida junto a la fogata
  "¡Tu mascota descansa junto al fuego! ¿La despertamos?"
```

**Mapeo de campamentos a niveles:**
- Cada campamento corresponde a un nivel del sistema (1-10)
- Dentro de cada campamento, la mascota se mueve entre el borde inferior (acaba de llegar) y el borde superior (a punto de subir)
- Esto da micro-feedback: "estás avanzando dentro de este campamento"

### 6.3 Para 8 Años: La Gráfica con Emojis

A los 8, el niño puede entender una representación temporal simple. Pero no le damos un gráfico de líneas — le damos una "gráfica de emojis".

```
MI SEMANA
─────────

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  "¡Tu semana de lectura!"                                   │
│                                                              │
│               🌟                                            │
│          🌟        🌟                                       │
│     🌟                  🌟                                  │
│ 🌟                           🌟                             │
│                                    🌟                       │
│  ─────────────────────────────────────                      │
│  Lun  Mar  Mie  Jue  Vie  Sab  Dom                        │
│                                                              │
│  Estrellas ganadas cada día:                                │
│  ⭐5  ⭐7  ⭐6  ⭐8  ⭐6  ⭐4  ⭐3                        │
│                                                              │
│  Total esta semana: ⭐39                                    │
│  Semana pasada: ⭐31                                        │
│  📈 "¡Has mejorado! ¡8 estrellas más que la semana pasada!" │
│                                                              │
│  ── Tus skills esta semana ──                               │
│                                                              │
│  📖 Lectura:     ████████░░ "¡Casi llegas!"                │
│  🔤 Vocabulario: ██████████ "¡Completado! 🎉"              │  
│  🧠 Comprensión: ██████░░░░ "¡Vas genial!"                 │
│  ⚡ Velocidad:   ████░░░░░░ "¡Sigue así!"                  │
│                                                              │
│  🔊 "¡Gran semana, [nombre]! Has ganado 8 estrellas         │
│      más que la semana pasada. ¡Sigue así!"                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

REGLAS DE TENDENCIA (8 años):
- Si esta semana > semana pasada: 
  📈 + mensaje positivo + mascota celebra
- Si esta semana ≈ semana pasada (±10%):
  "¡Semana sólida! ¡Constancia es clave!"
- Si esta semana < semana pasada:
  "¡Buena semana! La semana pasada fue increíble — 
   ¿a ver si la igualamos?" 
  (NUNCA: "has bajado" / "peor que la semana pasada")

Las barras de skills:
- Siempre usan mensajes positivos
- Nunca muestran % numérico 
- Usan frases tipo "¡Casi llegas!", "¡Vas genial!", "¡Sigue así!"
- El color de la barra va de azul (inicio) a dorado (completo)
```

### 6.4 Resumen de Tendencia por Edad

| | 4-5 años | 6-7 años | 8 años |
|---|---|---|---|
| **Metáfora** | La mascota (crece/duerme) | La montaña (sube campamentos) | Gráfica semanal con emojis |
| **Mejora** | Mascota grande y brillante | Mascota sube la montaña | 📈 + "¡Has mejorado!" |
| **Estable** | Mascota normal, contenta | Mascota sentada en fogata | "¡Semana sólida!" |
| **Inactividad** | Mascota dormida (tierna) | Mascota dormida junto al fuego | "¡La semana pasada fue genial! ¿Repetimos?" |
| **Al volver** | Mascota se despierta FELIZ | "¡Tu fogata sigue encendida!" | Resumen + siguiente paso |
| **Numérico** | NADA | Solo estrellas simples (⭐×12) | Números + barras + comparativa semanal |
| **Texto** | NADA (solo audio) | Frases cortas + audio | Texto legible + audio opcional |

---

## 7. Wireframes por Sub-rango de Edad

### 7.1 Dashboard — 4-5 Años: "Mi Rincón"

Este es el dashboard más simple. Es esencialmente: la mascota, el jardín, y un botón para jugar.

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ☀️/☁️/🌟                                      [🏠 Mapa]   │
│  (sol de racha)                                              │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │         🌸  🌺  🌻  🌷  🌹                         │    │
│  │        (jardín de letras: cada flor =                │    │
│  │         una letra aprendida)                         │    │
│  │                                                      │    │
│  │                   🐱                                 │    │
│  │              (MASCOTA GRANDE                         │    │
│  │               animada, viva,                         │    │
│  │               con accesorios)                        │    │
│  │                                                      │    │
│  │         🌱  🌱  🌱  ⬜  ⬜  ⬜  ⬜                  │    │
│  │        (brotes = próximas letras                     │    │
│  │         por florecer)                                │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  🔊 "¡Hola, Lucía! ¡Mira tu jardín!"                       │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │        🌟 ¡Vamos a jugar! 🌟                          │  │
│  │        (BOTÓN ENORME, brilla,                          │  │
│  │         pulsa con animación)                           │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ⭐⭐⭐⭐⭐⭐⭐⭐⭐       [🏷️]        [🏆]              │
│  (estrellas brillantes)   Stickers     Logros              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

ELEMENTOS:
1. SOL DE RACHA (arriba izq): ☀️ si racha activa, ☁️ si no
   → Tocar: audio sobre la racha
2. JARDÍN: área visual donde flores = letras aprendidas
   → Cada flor es tocable: "¡Esta es la A! ¡Tú la aprendiste!"
   → Los brotes (🌱) son las próximas letras
   → Sin números, sin contadores
3. MASCOTA: centro de la pantalla, grande y animada
   → Tocar: animación divertida + acceso al guardarropa
   → Su tamaño/brillo refleja el progreso general
4. BOTÓN JUGAR: enorme, imposible de no ver
   → Lleva directamente a la siguiente actividad recomendada
5. BARRA INFERIOR: Estrellas (sin número), Stickers, Logros
   → Todo tocable con audio

NOTAS 4-5:
- CERO texto (salvo nombre del niño como parte del audio)
- Toda interacción produce audio + animación
- El jardín es scroll horizontal si hay muchas flores
- El fondo cambia con la hora del día (mañana=claro, tarde=cálido)
```

### 7.2 Dashboard — 6-7 Años: "Mi Campamento"

Más elementos visibles, números simples, la montaña como progreso.

```
┌─────────────────────────────────────────────────────────────┐
│  ☀️ × 5 días                                   [🏠 Mapa]   │
│  (sol + racha)                              [⚙️ (adulto)]   │
│                                                              │
│  ┌──────────────────────────────────┐  ┌──────────────────┐ │
│  │                                   │  │                   │ │
│  │   LA MONTAÑA                      │  │   🐱              │ │
│  │                                   │  │  Nivel 4          │ │
│  │        ⛰️🏁                      │  │  "Flor 🌸"        │ │
│  │       ╱    ╲                     │  │                   │ │
│  │   🏕️╱      ╲                    │  │  ⭐ × 47          │ │
│  │     ╱ Camp.6 ╲                   │  │                   │ │
│  │  🏕️╱          ╲                 │  │  🔊 "¡Hola        │ │
│  │    ╱  Camp.5    ╲                │  │  Diego!"          │ │
│  │ 🐱╱ ← ¡AQUÍ!    ╲               │  │                   │ │
│  │ ⛺╱  Camp.4 ✨    ╲              │  │ [👔 Guardarropa]  │ │
│  │  ╱                 ╲             │  │                   │ │
│  │ ✅ Camp.3           ╲            │  └──────────────────┘ │
│  │ ✅ Camp.2            ╲           │                       │
│  │ ✅ Camp.1             ╲          │                       │
│  │ ✅ Inicio              ╲         │                       │
│  │                                   │                       │
│  └──────────────────────────────────┘                       │
│                                                              │
│  ── HOY ──                                                  │
│  🔊 "¡Hoy vamos a aprender sílabas nuevas!"                │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     🌟 ¡Siguiente aventura! 🌟                        │  │
│  │     "Las sílabas con T"                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Reto del día: "¿Puedes leer 3 palabras?" [👍] [👋]       │
│                                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │⭐ × 47 │  │🏷️ × 14│  │🏆 × 6 │  │📖 Cofre│           │
│  │Estrellas│  │Stickers│  │Logros  │  │Palabras│           │
│  └────────┘  └────────┘  └────────┘  └────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

ELEMENTOS:
1. SOL + RACHA: Sol visible + número de días (simple: "× 5 días")
2. MONTAÑA: Ocupa ~40% de pantalla, scrolleable verticalmente
   → Campamentos pasados con ✅
   → Campamento actual con mascota + banderita
   → Campamentos futuros visibles pero difuminados
   → La cima siempre visible como meta
3. PANEL MASCOTA: Al lado de la montaña
   → Mascota con nivel visible ("Flor 🌸")
   → Estrellas acumuladas
   → Acceso a guardarropa
4. SECCIÓN "HOY": Lo que toca hacer
   → Audio de la mascota diciendo el plan
   → Botón grande de siguiente aventura con preview
   → Reto diario opcional
5. BARRA INFERIOR: Accesos rápidos con contadores simples
   → Estrellas, Stickers, Logros, Cofre de Palabras

NOTAS 6-7:
- Texto corto y simple (1-3 palabras por etiqueta)
- Números visibles pero simples (× 47, × 14)
- Audio en todo al tocar
- La montaña se puede explorar tocando campamentos
```

### 7.3 Dashboard — 8 Años: "Mi Centro de Exploración"

Más información, gráfica semanal, más autonomía.

```
┌─────────────────────────────────────────────────────────────┐
│  Hola, Valentina 👋            ☀️ Racha: 12 días  [🏠 Mapa]│
│  Nivel 6 - Bosquecito 🏕️                                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ── Mi semana ──                                     │    │
│  │                                                      │    │
│  │        🌟                                           │    │
│  │   🌟        🌟                                      │    │
│  │  ─── ─── ─── ─── ─── ─── ───                       │    │
│  │  Lun Mar Mie Jue Vie Sab Dom                        │    │
│  │                                                      │    │
│  │  ⭐ Esta semana: 34  (sem. pasada: 28)              │    │
│  │  📈 "¡6 más que la semana pasada! ¡Genial!"         │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  🐱 [Mascota]        │  │  📖 Mis skills       │        │
│  │  Nivel 6 🏕️          │  │                      │        │
│  │  ⭐ 187 total        │  │  Lectura:  ████████░ │        │
│  │                      │  │  Vocabul.: ██████░░░ │        │
│  │  [👔 Personalizar]   │  │  Compren.: █████░░░░ │        │
│  │                      │  │  Velocid.: ████░░░░░ │        │
│  └──────────────────────┘  │                      │        │
│                             │  [Ver detalle →]     │        │
│                             └──────────────────────┘        │
│                                                              │
│  ── Siguiente aventura ──                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📖 "Messi y el dragón del estadio"                  │    │
│  │  Un cuento sobre tu tema favorito: ⚽ fútbol          │    │
│  │  Nivel: ██████░░ (perfecto para ti)                  │    │
│  │                                                      │    │
│  │  [▶️ ¡Leer ahora!]                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Reto del día: "Lee un cuento y responde 4 preguntas"      │
│  [👍 ¡Lo haré!]  [👋 Hoy no]         Recompensa: ⭐×3     │
│                                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │ ⭐   │  │ 🏷️  │  │ 🏆   │  │ 📖   │  │ ⛰️   │        │
│  │187   │  │ 23   │  │ 11   │  │Cofre │  │Montaña│        │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

ELEMENTOS:
1. HEADER: Nombre + nivel + racha (texto legible)
2. GRÁFICA SEMANAL: Estrellas por día + comparativa
   → Siempre con mensaje positivo
   → Tocar un día → desglose de ese día
3. PANEL DOBLE: Mascota + Skills
   → Mascota: nivel, estrellas, personalizar
   → Skills: barras de progreso con frases positivas
   → "Ver detalle" → pantalla con más info por skill
4. SIGUIENTE AVENTURA: Preview del próximo contenido
   → Basado en intereses del niño (Ola 4)
   → Nivel del texto indicado visualmente
   → Botón directo para empezar
5. RETO DIARIO: Con recompensa visible
6. BARRA INFERIOR: Accesos rápidos con números

NOTAS 8 AÑOS:
- Texto completo legible, audio opcional
- Números y estadísticas simples
- Barras de progreso por skill
- Gráfica semanal comprensible
- Preview personalizado de contenido
- Más autonomía en navegación
```

### 7.4 Pantalla Detalle de Skills (6-7 y 8 años)

Accesible desde "Ver detalle" en el dashboard:

```
MIS SKILLS (versión 8 años)
────────────────────────────

┌─────────────────────────────────────────────────────────────┐
│  📖 Mis habilidades de lectura              [← Volver]      │
│                                                              │
│  ── Letras ──                                               │
│  🔤 Conoces 24 de 27 letras                                │
│  [A✅ B✅ C✅ D✅ E✅ F✅ G✅ H✅ I✅ J✅ K✅ L✅ M✅]    │
│  [N✅ Ñ✅ O✅ P✅ Q✅ R✅ S✅ T✅ U✅ V✅ W🔲 X🔲 Y🔲]   │
│  "¡Solo te faltan 3! ¡Casi las tienes todas!"              │
│                                                              │
│  ── Sílabas ──                                              │
│  🧩 Dominas 38 sílabas                                     │
│  ████████████████████░░░░░ (38/50 sílabas del nivel)       │
│  Última dominada: "TRA" 🎉                                  │
│  Próxima: "BRA, BRE, BRI..."                               │
│                                                              │
│  ── Palabras ──                                             │
│  📝 Sabes leer 85 palabras                                  │
│  ⭐ Esta semana aprendiste: casa, mesa, libro, árbol        │
│  [📦 Ver mi cofre de palabras]                              │
│                                                              │
│  ── Comprensión ──                                          │
│  🧠 "¡Entiendes muy bien lo que lees!"                      │
│  Preguntas acertadas esta semana: 12 de 15                  │
│  ████████████░░░ 80% ← ¡Genial!                            │
│                                                              │
│  ── Velocidad (nuevo a los 8) ──                            │
│  ⚡ Lees a 42 palabras por minuto                           │
│  Hace 1 mes: 31 palabras por minuto                         │
│  📈 "¡Has mejorado mucho! ¡11 palabras más por minuto!"    │
│                                                              │
│  ── Vocabulario ──                                          │
│  💬 Conoces 127 palabras en tu banco                        │
│  Temas favoritos: 🦕 Dinosaurios (34), ⚽ Fútbol (28),     │
│                   🌊 Mar (22), 🚀 Espacio (19)...          │
│  [📦 Ver banco de vocabulario]                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

VERSIÓN 6-7 AÑOS:
- Misma info pero más visual, menos texto
- Letras como flores en un jardín (no grid de letras)
- Sílabas como piedras de un camino
- Sin velocidad de lectura
- Sin porcentajes — solo barras y frases
- Todo con audio al tocar
```

### 7.5 Cofre de Palabras

Una pantalla especial donde el niño ve TODAS las palabras que sabe leer:

```
MI COFRE DE PALABRAS
────────────────────

┌─────────────────────────────────────────────────────────────┐
│  📦 ¡Tu cofre de palabras!                   [← Volver]    │
│  🔊 "¡Mira cuántas palabras sabes leer!"                   │
│                                                              │
│  85 palabras ⭐                                             │
│                                                              │
│  ── Por tema ──                                             │
│                                                              │
│  🏠 Mi casa:                                                │
│  [casa] [mesa] [silla] [puerta] [ventana] [cocina]         │
│  [cama] [baño] [jardín]                                     │
│                                                              │
│  🐾 Animales:                                               │
│  [gato] [perro] [pato] [pez] [oso] [león] [mariposa]      │
│                                                              │
│  🍎 Comida:                                                 │
│  [pan] [leche] [manzana] [plátano] [agua] [sopa]          │
│                                                              │
│  ⚽ Deportes:                                               │
│  [pelota] [gol] [campo] [equipo]                           │
│                                                              │
│  ...                                                        │
│                                                              │
│  Tocar palabra → imagen + audio + frase ejemplo            │
│  "GATO → 🐱 → 'El gato duerme en el sofá'"               │
│                                                              │
└─────────────────────────────────────────────────────────────┘

INTERACCIÓN:
- Tocar cualquier palabra → se agranda, aparece su imagen, 
  se lee en voz alta, y se muestra una frase de ejemplo
- Para 4-5: solo imágenes organizadas por tema, sin texto
  → Tocar imagen → audio de la palabra + frase
- Para 6-7: palabras con imágenes pequeñas al lado
- Para 8: palabras por tema, tocables para ver detalle
```

---

## 8. Motivación a Seguir: Hooks y Loops

### 8.1 El Loop de Motivación Diario

Cada vez que el niño abre la app, el dashboard ejecuta un "loop" diseñado para motivar:

```
LOOP DE ENTRADA AL DASHBOARD
──────────────────────────────

1. SALUDO PERSONALIZADO (3 seg)
   La mascota aparece con animación de saludo
   Audio: "¡Hola [nombre]! ¡[mascota] te esperaba!"
   (variaciones: "¡Buenos días!", "¡Qué bien que has vuelto!")

2. NOVEDAD (si hay) (3-5 seg)
   Si hay algo nuevo desde la última vez:
   - "¡Mira! ¡Tu jardín tiene una flor nueva!" (skill nuevo)
   - "¡Casi completas la colección de dinosaurios!" (sticker)
   - "¡Solo te faltan 3 ⭐ para un gorro nuevo!" (meta cercana)
   Si no hay novedad:
   - "¡Vamos a seguir con la aventura!" 

3. PREVIEW DE SIGUIENTE AVENTURA (siempre visible)
   Un vistazo de lo que viene:
   - Para 4-5: la mascota señala la zona del mapa que brilla
   - Para 6-7: "Hoy vamos al Bosque de las Letras — ¡sílabas nuevas!"
   - Para 8: Preview del cuento personalizado + nivel de dificultad

4. META CERCANA (siempre visible)
   Algo alcanzable a corto plazo:
   - "¡2 ⭐ más y desbloqueas el gorro de pirata!"
   - "¡1 sticker más para completar los dinosaurios!"
   - "¡Tu mascota casi llega al campamento 5!"

5. BOTÓN DE ACCIÓN (imposible de ignorar)
   [🌟 ¡Vamos a jugar! 🌟] — grande, brillante, animado
```

### 8.2 Hooks Específicos

#### "Solo te falta X para..."

Siempre que el niño esté cerca de un logro, el dashboard lo muestra. Esto crea una tensión positiva de "quiero terminarlo":

| Distancia a meta | Mensaje |
|---|---|
| ≤2 estrellas para accesorio | "¡Solo 2 ⭐ más para el gorro de pirata! 🏴‍☠️" |
| ≤1 sticker para colección | "¡Te falta 1 sticker para completar los dinosaurios! 🦕" |
| ≤5 estrellas para subir de nivel | "¡Casi llegas al siguiente campamento! ⛰️" |
| ≤1 día para racha de 7 | "¡Mañana llegas a 7 días seguidos! ☀️" |

#### Preview del Siguiente Contenido (Ola 4)

Cuando la Ola 4 esté activa, el dashboard muestra un **preview del siguiente cuento personalizado**:

```
PREVIEW DE CUENTO
─────────────────

┌─────────────────────────────────────────────────────────────┐
│  📖 Tu próxima aventura:                                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │  🦕⚽ "Cuando los dinosaurios jugaron al fútbol"     │    │
│  │                                                      │    │
│  │  [Ilustración: un T-Rex con camiseta de fútbol       │    │
│  │   pateando un balón en un estadio prehistórico]      │    │
│  │                                                      │    │
│  │  "¿Qué pasa cuando un Velociraptor es el             │    │
│  │   jugador más rápido del mundo?"                     │    │
│  │                                                      │    │
│  │  [▶️ ¡Quiero leerlo!]                                │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

REGLAS:
- Siempre basado en los intereses del niño
- La ilustración y el título generan curiosidad
- El teaser plantea una pregunta (enganche narrativo)
- Para 4-5: solo imagen + audio del teaser (sin texto)
- Para 6-7: imagen + título corto + audio
- Para 8: imagen + título + teaser + botón
```

#### Mascota que "Pide" Jugar

La mascota puede tener "necesidades" que motivan al niño a jugar:

- "¡Hoy quiero aprender una palabra nueva! ¿Me ayudas?" → Vocabulario
- "¡Mira, hay un camino nuevo en la montaña! ¿Subimos?" → Progreso
- "¡Tengo hambre de estrellas! ¿Conseguimos algunas?" → Actividades generales

**Importante:** Esto es IN-APP (cuando el niño abre la app). Las notificaciones push van al PADRE, nunca al niño.

### 8.3 Motivación por Retorno (Tras Ausencia)

Si el niño lleva días sin jugar, el dashboard se adapta:

| Días sin jugar | Al abrir la app |
|---|---|
| 1-2 | Normal. Mascota feliz. "¡Hola [nombre]! ¿Seguimos?" |
| 3-5 | Mascota dormida → se despierta feliz. "¡[Nombre]! ¡Te echaba de menos!" + resumen de lo último que hizo. |
| 6-14 | Mascota dormida con mantita → se despierta con alegría. "¡¡Has vuelto!! ¡Qué ganas de jugar!" + mini-repaso rápido de lo aprendido + "¡Mira, tu jardín te esperaba!" (las flores siguen ahí) |
| >14 | Mascota dormida profundamente → despertar gradual con mucha celebración. "¡¡[NOMBRE]!! ¡Cuánto tiempo! ¡Pero mira, todo lo que sabes sigue aquí!" + repaso suave + reseteo suave de racha sin mencionarlo |

**Regla de oro:** Cuanto más tiempo sin jugar, MÁS EFUSIVA es la bienvenida. NUNCA hay castigo, culpa, o pérdida. El niño vuelve a un lugar que se alegra de verle.

---

## 9. Integración con el Mapa de Aventuras

### 9.1 Dashboard vs. Mapa: Dos Caras de la Misma Moneda

El Mapa de Aventuras es la **navegación** — dónde va el niño para jugar.  
El Dashboard del Niño es el **espejo** — dónde ve quién es y cómo va.

```
FLUJO DE NAVEGACIÓN
───────────────────

                    ┌──────────────┐
                    │   DASHBOARD   │
                    │   DEL NIÑO    │
                    │  (Mi Rincón)  │
                    └──────┬───────┘
                           │
                    [🏠 Ir al Mapa]
                           │
                    ┌──────▼───────┐
                    │    MAPA DE    │
                    │  AVENTURAS   │
                    │ (zonas para   │
                    │  jugar)       │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ Bosque   │ │ Montaña │ │  Lago   │
         │ Letras   │ │ Números │ │Palabras │
         │(activ.)  │ │(activ.) │ │(activ.) │
         └─────────┘ └─────────┘ └─────────┘
              │
              ▼
         [Actividad completada]
              │
              ▼
         ┌──────────────┐
         │ Celebración + │
         │ Sticker + ⭐   │
         │ → Volver al   │
         │   Mapa o      │
         │   Dashboard   │
         └──────────────┘
```

### 9.2 Cómo se Accede al Dashboard

| Desde | Cómo | Qué ve |
|-------|------|--------|
| **Mapa de Aventuras** | Tocar el avatar/mascota en la esquina del mapa | Dashboard completo |
| **Fin de sesión** | Opción "Ver mis cosas" después de la celebración | Dashboard con logros recién ganados destacados |
| **Inicio de app** | La app abre en el dashboard si es primera sesión del día | Dashboard con saludo + preview de lo que toca |
| **Inicio de app (siguiente sesión)** | La app abre en el mapa si ya hubo sesión hoy | — |

### 9.3 Lo Que el Mapa Refleja del Dashboard

El Mapa de Aventuras refleja visualmente el progreso del dashboard:

| Elemento del Mapa | Conectado a |
|---|---|
| Zonas desbloqueadas | Nivel general del niño |
| Brillo/animación de una zona | Actividad recomendada para hoy |
| Candaditos en zonas | Nivel necesario para desbloquear |
| Mascota en el mapa | Lleva los accesorios equipados en el dashboard |
| Estrellas en el borde | Estrellas del dashboard |
| Banderitas en caminos | Skills dominados (cada banderita = un skill) |

### 9.4 La Montaña del Dashboard ≠ El Mapa

**Distinción importante:**

- **El Mapa de Aventuras** es un mundo 2D con zonas temáticas (Bosque de Letras, Montaña de Números, etc.). Es para NAVEGAR.
- **La Montaña del Dashboard** (6-7 años) es una representación lineal de PROGRESO GENERAL. No es para navegar — es para VER dónde estás.

Son cosas diferentes. El niño entiende la diferencia:
- "El mapa es donde juego"
- "La montaña/jardín es donde veo mi progreso"

Para 4-5 años no hay montaña — hay jardín (más abstracto, menos confusión con el mapa).

---

## 10. Anti-patrones (Qué NO Hacer)

### 10.1 Anti-patrones de Diseño

| ❌ Anti-patrón | ¿Por qué es malo? | ✅ Lo que hacemos en su lugar |
|---|---|---|
| **Mostrar datos numéricos crudos a 4-5 años** | Un niño de 4 no entiende "15 de 27". Genera confusión o indiferencia. | Metáforas visuales: flores, estrellas, mascota que crece. |
| **Ranking / Comparación con otros** | Genera ansiedad, envidia, y desmotiva al que "pierde". | Comparación solo consigo mismo ("esta semana vs la pasada"). |
| **Vidas / Corazones / Penalizaciones** | Perder una "vida" a los 4-5 años = llanto. A los 8 = frustración innecesaria. | Sin pérdidas. Solo ganancias. El peor caso es no ganar, nunca perder. |
| **"Has bajado" / "Peor que ayer"** | Desmotiva. El niño se siente fracasado. | Reencuadre positivo: "¡La semana pasada fue genial! ¿La igualamos?" |
| **Streak anxiety ("Perdiste tu racha")** | Genera culpa y ansiedad innecesarias. | La racha se "pausa" sin mención. Al volver: "¡El sol te esperaba!" |
| **Mascota triste / enfadada** | El niño siente culpa. El compañero que le "juzga" destruye la confianza. | Mascota dormida = tierna. Mascota siempre feliz de ver al niño. |
| **Notificaciones push al niño** | Los niños de 4-8 no gestionan notificaciones. Genera dependencia y ansiedad. | Notificaciones van al PADRE. La app motiva in-app, no por push. |
| **Dashboard como primera pantalla para 4-5** | Demasiada información para un pre-lector. | El dashboard de 4-5 es un "rincón" minimalista: mascota + jardín + botón jugar. |
| **Texto en dashboard de 4-5** | No pueden leer. Es irrelevante y excluyente. | Todo es visual + audio. Cero texto. |
| **Gráficas complejas** | Incluso a los 8, gráficas de líneas o barras complejas son confusas. | Gráfica ultra-simple: estrellas por día, comparativa con frase. |
| **Timer visible / Cuenta regresiva** | Genera presión temporal. Ansiedad. "Me queda poco tiempo". | El timer es invisible para el niño. La sesión termina suavemente. |
| **Objetivos inalcanzables** | "Consigue 100 ⭐ hoy" → imposible → frustración. | Metas siempre alcanzables en 1-2 sesiones. "Solo te faltan 2 ⭐". |
| **Demasiados elementos en pantalla** | Sobrecarga cognitiva. El niño no sabe dónde mirar. | 3 capas de profundidad. Capa 1 es minimalista. |

### 10.2 Anti-patrones de Gamificación

| ❌ Anti-patrón | Referente que lo hace | Por qué no para 4-8 |
|---|---|---|
| **XP numérico** | Duolingo (adults) | "47 XP" no significa nada para un niño de 6. Usan estrellas visuales. |
| **Ligas / Leaderboards** | Duolingo | Comparación social es tóxica para el desarrollo a esta edad. |
| **Streak freeze que cuesta dinero** | Duolingo | Economía virtual compleja. Inapropiado. Escudo automático y gratis. |
| **Mascota pasivo-agresiva** | Duo (el búho) | "Te echo de menos" dicho con culpa. Nuestra mascota DUERME, no culpa. |
| **Vidas que se agotan** | Duolingo, muchos juegos | El niño se queda sin poder jugar. Inaceptable para educación. |
| **Compras in-app** | Muchas apps educativas | Niños pidiendo dinero a padres. Nuestro modelo es 100% gratis/OSS. |
| **Logros negativos** | Algunos juegos | "El que más falla". Eliminar todo badge negativo. |
| **Progreso que se borra** | Algunos juegos/apps | El niño pierde lo ganado si no juega. Destruye confianza. Nunca. |

### 10.3 Anti-patrones de Contenido

| ❌ Anti-patrón | ✅ Lo que hacemos |
|---|---|
| **"¡Incorrecto!"** | "¡Casi! ¿Probamos otra vez?" |
| **Sonido de error agresivo (buzzer)** | Sonido suave neutro + mascota pensativa |
| **Pantalla roja de error** | La opción incorrecta se desvanece suavemente |
| **Contar errores visiblemente** | Solo contar aciertos. Los errores son invisibles. |
| **"Deberías saber esto"** | "¡Vamos a repasarlo!" |
| **Comparar con "otros niños de tu edad"** | Nunca. Cada niño tiene su ritmo. |
| **Mostrar tiempo gastado como métrica al niño** | El tiempo es para el padre, no para el niño. |

---

## 11. Especificaciones Técnicas del Dashboard

### 11.1 Datos que Consume el Dashboard

```typescript
interface ChildDashboardData {
  // Identidad
  childName: string;
  mascotName: string;
  mascotType: 'cat' | 'dog' | 'owl' | 'dragon' | ...;
  mascotAccessories: string[]; // IDs de accesorios equipados
  ageGroup: '4-5' | '6-7' | '8';
  
  // Nivel y progresión
  level: number; // 1-10
  levelName: string; // "Flor", "Arbolito", etc.
  levelIcon: string; // 🌸, 🌳, etc.
  starsTotal: number;
  starsToNextLevel: number;
  starsNeededForNextLevel: number;
  
  // Racha
  streakDays: number;
  streakShieldAvailable: boolean;
  lastSessionDate: string; // ISO date
  daysSinceLastSession: number;
  
  // Skills
  skills: {
    lettersKnown: number; // 0-27
    lettersTotal: 27;
    syllablesMastered: number;
    syllablesInProgress: string[];
    wordsCanRead: number;
    wordsThisWeek: string[]; // palabras aprendidas esta semana
    comprehensionAccuracy: number; // 0-100 (interno, no mostrar)
    readingSpeedWPM: number | null; // null si <7 años
    vocabularyCount: number;
    vocabularyByTopic: Record<string, number>;
  };
  
  // Gamificación
  stickers: {
    collected: StickerInfo[];
    collections: CollectionProgress[];
  };
  badges: BadgeInfo[];
  badgesNearCompletion: BadgeInfo[]; // badges casi desbloqueados
  
  // Actividad
  sessionsToday: number;
  sessionsCompletedToday: number;
  starsToday: number;
  starsThisWeek: number[];  // [lun, mar, mie, jue, vie, sab, dom]
  starsLastWeek: number;
  
  // Contenido siguiente
  nextAdventure: {
    title: string;
    teaser: string;
    illustration: string; // URL
    topic: string;
    zone: string; // zona del mapa
  };
  
  // Reto diario
  dailyChallenge: {
    description: string;
    reward: number; // estrellas
    accepted: boolean | null; // null = no mostrado aún
    completed: boolean;
  } | null;
  
  // Metas cercanas
  nearestGoals: NearestGoal[]; // máx 3, ordenadas por cercanía
}
```

### 11.2 Reglas de Renderizado por Edad

```
REGLAS DE ADAPTACIÓN POR EDAD
──────────────────────────────

4-5 AÑOS:
  - dashboard_layout: "garden" (jardín + mascota)
  - show_numbers: false
  - show_text: false (solo audio)
  - show_mountain: false
  - show_weekly_chart: false
  - show_skill_bars: false
  - show_streak_number: false
  - streak_visual: "sun" (solo icono)
  - mascot_size: "large" (60% pantalla)
  - garden_letters_as_flowers: true
  - play_button_size: "huge"
  - sticker_album_show_count: false
  - badge_show_locked: false
  - daily_challenge: false
  - auto_play_audio: true

6-7 AÑOS:
  - dashboard_layout: "mountain" (montaña + mascota)
  - show_numbers: true (simple: "× 12")
  - show_text: true (palabras cortas)
  - show_mountain: true
  - show_weekly_chart: false
  - show_skill_bars: false (solo en detalle)
  - show_streak_number: true
  - streak_visual: "sun_with_number"
  - mascot_size: "medium" (panel lateral)
  - next_adventure_preview: true
  - sticker_album_show_count: true
  - badge_show_locked: true (próximos 2-3)
  - daily_challenge: true
  - auto_play_audio: true

8 AÑOS:
  - dashboard_layout: "explorer" (gráfica + mascota + skills)
  - show_numbers: true (completos)
  - show_text: true (completo)
  - show_mountain: true (en sección dedicada)
  - show_weekly_chart: true
  - show_skill_bars: true
  - show_streak_number: true
  - streak_visual: "text_with_sun"
  - mascot_size: "small" (panel compacto)
  - next_adventure_preview: true (con teaser texto)
  - sticker_album_show_count: true
  - badge_show_locked: true (todos)
  - daily_challenge: true
  - auto_play_audio: false (disponible al tocar)
```

### 11.3 Animaciones Clave

| Animación | Trigger | Duración | Prioridad |
|---|---|---|---|
| Mascota saludo | Entrar al dashboard | 2-3 seg | Alta |
| Flor brotando | Nueva letra aprendida | 1.5 seg | Alta |
| Estrella volando al contador | Ganar estrella | 0.8 seg | Media |
| Subida de nivel (evolución mascota) | Nivel up | 4-5 seg | Crítica |
| Sol brillando más | Racha incrementa | 1 seg | Media |
| Sticker revelación | Nuevo sticker | 2 seg | Alta |
| Badge desbloqueado | Logro conseguido | 2-3 seg | Alta |
| Mascota despertándose | Volver tras ausencia | 3-4 seg | Alta |
| Montaña: subir campamento | Nivel up (6-7) | 3 seg | Alta |
| Gráfica semanal animándose | Entrar a "Mi semana" (8) | 1.5 seg | Media |

**Motor de animación:** Rive (preferido) para la mascota y estados complejos. Lottie para celebraciones y UI micro-animations.

### 11.4 Audio del Dashboard

Cada estado del dashboard tiene audio asociado. El audio se selecciona aleatoriamente de un pool para evitar repetición:

| Momento | Pool de audios (ejemplo, mínimo 5 variaciones) |
|---|---|
| **Entrada normal** | "¡Hola [nombre]!", "¡Qué bien verte!", "¡[Mascota] te estaba esperando!", "¡Hola amigo/a!", "¡Vamos a jugar!" |
| **Entrada con racha** | "¡[X] días seguidos! ¡Qué crack!", "¡El sol brilla por ti!", "¡Racha de campeón/a!" |
| **Entrada tras ausencia** | "¡Has vuelto! ¡Qué alegría!", "¡Te eché de menos!", "¡Cuánto tiempo! ¡A jugar!" |
| **Meta cercana** | "¡Solo [X] más para [meta]!", "¡Casi lo tienes!", "¡Poquito más y lo consigues!" |
| **Sticker nuevo** | "¡Mira! ¡Un [animal]!", "¡Nuevo sticker!", "¡Para tu colección!" |
| **Badge nuevo** | "¡Has conseguido [nombre badge]!", "¡Logro desbloqueado!", "¡Eres increíble!" |

---

## 12. Resumen de Pantallas

### Mapa de Pantallas del Dashboard

```
PANTALLAS DEL DASHBOARD DEL NIÑO
─────────────────────────────────

┌──────────────┐
│  DASHBOARD   │ ← Pantalla principal (varía por edad)
│  PRINCIPAL   │
│  (Mi Rincón) │
└──────┬───────┘
       │
       ├──→ [Tocar mascota] ──→ ┌──────────────┐
       │                         │ GUARDARROPA  │
       │                         │ DE MASCOTA   │
       │                         └──────────────┘
       │
       ├──→ [Tocar stickers] ──→ ┌──────────────┐
       │                          │ ÁLBUM DE     │
       │                          │ STICKERS     │
       │                          └──────────────┘
       │
       ├──→ [Tocar logros] ───→ ┌──────────────┐
       │                         │ MIS LOGROS   │
       │                         │ (Badges)     │
       │                         └──────────────┘
       │
       ├──→ [Tocar montaña] ──→ ┌──────────────┐
       │    (6-7 años)           │ MONTAÑA DE   │
       │                         │ PROGRESO     │
       │                         │ (detalle)    │
       │                         └──────────────┘
       │
       ├──→ [Tocar skills] ───→ ┌──────────────┐
       │    (6-7, 8 años)        │ MIS SKILLS   │
       │                         │ (detalle)    │
       │                         └──────────────┘
       │
       ├──→ [Tocar cofre] ────→ ┌──────────────┐
       │                         │ COFRE DE     │
       │                         │ PALABRAS     │
       │                         └──────────────┘
       │
       ├──→ [Tocar semana] ───→ ┌──────────────┐
       │    (8 años)             │ MI SEMANA    │
       │                         │ (gráfica)    │
       │                         └──────────────┘
       │
       └──→ [Botón jugar] ────→ ┌──────────────┐
                                 │ MAPA DE      │
                                 │ AVENTURAS    │
                                 │ (navegación) │
                                 └──────────────┘

Total: 8 pantallas únicas del dashboard
(+ el Mapa de Aventuras como destino principal)
```

### Resumen de Elementos por Edad

| Elemento | 4-5 | 6-7 | 8 |
|---|---|---|---|
| Mascota (hub central) | ✅ Grande | ✅ Panel lateral | ✅ Panel compacto |
| Jardín de letras | ✅ | ❌ (reemplazado por montaña) | ❌ |
| Montaña del progreso | ❌ | ✅ | ✅ (en sección) |
| Gráfica semanal | ❌ | ❌ | ✅ |
| Barras de skills | ❌ | ❌ (solo en detalle) | ✅ |
| Números visibles | ❌ | ✅ (simples) | ✅ (completos) |
| Texto en pantalla | ❌ | ✅ (palabras cortas) | ✅ (completo) |
| Audio automático | ✅ Siempre | ✅ Siempre | ✅ Al tocar |
| Sol de racha | ✅ (solo icono) | ✅ (icono + número) | ✅ (texto) |
| Sticker album | ✅ (sin contadores) | ✅ (con contadores) | ✅ (completo) |
| Badges | ✅ (solo desbloqueados) | ✅ (+ próximos) | ✅ (todos) |
| Guardarropa mascota | ✅ | ✅ | ✅ |
| Cofre de palabras | ✅ (solo imágenes) | ✅ (imágenes + palabras) | ✅ (por tema) |
| Reto diario | ❌ | ✅ | ✅ |
| Preview siguiente aventura | ✅ (visual) | ✅ (visual + título) | ✅ (completo) |
| Botón jugar | ✅ ENORME | ✅ Grande | ✅ Prominente |

---

## Apéndice: Glosario del Dashboard

| Término | Definición en contexto |
|---------|----------------------|
| **Mi Rincón** | Nombre del dashboard para el niño. "Ir a mi rincón" = abrir el dashboard. |
| **Jardín** | Metáfora visual de progreso para 4-5 años. Flores = letras/skills aprendidos. |
| **Montaña** | Metáfora visual de progreso para 6-7 años. Campamentos = niveles. |
| **Sol de racha** | Indicador visual de días consecutivos jugando. De ☁️ (0) a 🌟 (30+). |
| **Cofre de palabras** | Banco visual de todas las palabras que el niño sabe leer. |
| **Guardarropa** | Pantalla donde el niño personaliza los accesorios de su mascota. |
| **Ceremonia de nivel** | Animación especial cuando el niño sube de nivel (evolución de mascota). |
| **Escudo de racha** | Protección automática (1/semana) que mantiene la racha si el niño no juega un día. |
| **Hook** | Elemento de diseño que motiva al niño a volver (meta cercana, preview, mascota). |
| **Loop** | Secuencia de experiencia que se repite cada vez que el niño entra al dashboard. |

---

*Este documento especifica el dashboard del niño como experiencia independiente pero integrada con el Mapa de Aventuras y el resto de la UX de OmegaRead. Debe implementarse de forma progresiva:*

**Prioridad de implementación:**

| Prioridad | Elemento | Ola |
|-----------|----------|-----|
| P0 | Mascota con estados básicos + saludo | Ola 1 |
| P0 | Botón "jugar" desde dashboard | Ola 1 |
| P0 | Estrellas ganadas (visuales, sin número para 4-5) | Ola 1 |
| P1 | Jardín de letras (4-5) | Ola 1 |
| P1 | Sticker album básico | Ola 1 |
| P1 | Sol de racha (básico) | Ola 2 |
| P1 | Montaña del progreso (6-7) | Ola 2 |
| P1 | Guardarropa de mascota | Ola 2 |
| P2 | Badges/logros | Ola 2 |
| P2 | Cofre de palabras | Ola 2-3 |
| P2 | Retos diarios | Ola 3 |
| P2 | Detalle de skills | Ola 3 |
| P3 | Gráfica semanal (8 años) | Ola 3-4 |
| P3 | Preview de cuento personalizado | Ola 4 |
| P3 | Evolución completa de mascota (10 niveles) | Ola 3-4 |
| P3 | Ceremonia de subida de nivel | Ola 3 |
