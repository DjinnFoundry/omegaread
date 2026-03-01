# SPEC: Grafo Dinámico de Conocimiento (Obsidian-style)

**Estado:** Draft
**Fecha:** 2026-03-01
**Autor:** Juan + Claude

---

## Problema

El sistema actual tiene ~80 skills predefinidas en un array estático. Cuando un niño escribe un topic libre ("dinosaurios", "mi perro Toby", "viajes en el tiempo"), la historia se genera correctamente pero el topic queda huérfano: sin conexiones al grafo, sin progreso, sin nodos relacionados.

El aprendizaje es casi infinito. No podemos pre-definir todos los topics posibles. Necesitamos un grafo que **crezca orgánicamente** a medida que el niño explora, como una wiki personal de conocimiento.

### Bugs corregidos (pre-requisito de este spec)

- Nodos duplicados en el layout (completado + sugerencia con mismo slug)
- Aristas intra-dominio basadas en orden secuencial en vez de prerequisitos reales
- Sugerencias que incluían topics ya completados

---

## Visión

> "Un Obsidian para niños": según navegas, aparecen nodos relacionados. No ves todo el grafo de primeras, sino los últimos ~10 nodos que has estado explorando, con opción de explorar todo.

---

## Modelo de Datos

### Tabla: `knowledge_nodes`

Cada nodo es un concepto que un estudiante ha explorado o que el sistema le ha sugerido.

```sql
CREATE TABLE knowledge_nodes (
  id            TEXT PRIMARY KEY,        -- uuid
  student_id    TEXT NOT NULL,           -- FK students
  slug          TEXT NOT NULL,           -- identificador único por estudiante
  nombre        TEXT NOT NULL,           -- "Dinosaurios", "Agujeros negros"
  emoji         TEXT NOT NULL DEFAULT '📖',
  concepto_nucleo TEXT NOT NULL,         -- 1-2 frases: qué se aprende
  source        TEXT NOT NULL,           -- 'predefined' | 'generated' | 'custom'
  dominio       TEXT,                    -- dominio si aplica (null para custom/generated)
  nivel         INTEGER DEFAULT 1,       -- 1-3 (para predefinidos; 1 para generados)
  times_visited INTEGER DEFAULT 0,       -- cuántas historias se han leído
  mastery       REAL DEFAULT 0,          -- 0-1 nivel de dominio
  dominated     INTEGER DEFAULT 0,       -- boolean: mastery >= 0.85
  embedding     TEXT,                    -- JSON array of floats (embedding del concepto_nucleo)
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, slug)
);
```

**Notas:**
- Los ~80 skills predefinidos se convierten en nodos al primer uso (`source = 'predefined'`)
- Topics custom del usuario se crean como `source = 'custom'`
- Nodos generados por el LLM como sugerencias son `source = 'generated'`
- `embedding` almacena el vector como JSON array (SQLite no tiene tipo vector nativo; si migramos a Postgres, usamos `pgvector`)

### Tabla: `knowledge_edges`

Cada arista conecta dos nodos con un tipo y peso.

```sql
CREATE TABLE knowledge_edges (
  id            TEXT PRIMARY KEY,        -- uuid
  student_id    TEXT NOT NULL,           -- FK students
  from_node_id  TEXT NOT NULL,           -- FK knowledge_nodes
  to_node_id    TEXT NOT NULL,           -- FK knowledge_nodes
  type          TEXT NOT NULL,           -- 'prerequisite' | 'deepens' | 'relates'
  weight        REAL DEFAULT 0.5,        -- 0-1 fuerza de la relación
  source        TEXT NOT NULL,           -- 'predefined' | 'llm' | 'embedding'
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, from_node_id, to_node_id)
);
```

**Tipos de arista:**
| Tipo | Significado | Fuente |
|------|-------------|--------|
| `prerequisite` | A es necesario antes de B | Skills predefinidas |
| `deepens` | B profundiza en el mismo tema que A | LLM al generar nodos |
| `relates` | A y B comparten conceptos | LLM + similitud de embedding |

---

## Flujo: Generación de Nodos Relacionados

### Cuándo se ejecuta

Después de generar una historia (cualquier tipo de topic: predefinido, custom, o sugerido).

### Pipeline

```
1. Historia generada para topic T
   │
2. ¿Existe nodo para T en este estudiante?
   ├─ NO → Crear nodo (con concepto_nucleo)
   └─ SÍ → Actualizar times_visited + mastery
   │
3. LLM genera 4 nodos relacionados
   │  Input: concepto_nucleo de T + edad del niño + últimos 5 nodos visitados
   │  Output: [{nombre, emoji, concepto_nucleo, relacion_con_T}, ...]
   │
4. Para cada nodo sugerido S:
   │
   ├─ 4a. Buscar nodo existente por similitud
   │       - Primero: match exacto por slug normalizado
   │       - Luego: similitud de embedding contra nodos del estudiante
   │       - Umbral: cosine_similarity > 0.85 → es el mismo concepto
   │
   ├─ 4b. Si match encontrado:
   │       └─ Crear arista T → match (si no existe)
   │
   └─ 4c. Si no hay match:
           ├─ Crear nodo nuevo (source='generated')
           └─ Crear arista T → nuevo nodo
```

### Prompt para generar nodos relacionados

```
Dado el concepto "{concepto_nucleo}" sobre "{nombre}" que un niño de {edad} años
acaba de leer, sugiere 4 temas relacionados que podrían despertar su curiosidad.

Contexto: Los últimos temas que ha explorado son: {últimos_5_nodos}

Para cada tema, proporciona:
- nombre: nombre corto (2-4 palabras)
- emoji: un emoji representativo
- concepto_nucleo: 1-2 frases explicando qué aprenderá
- tipo_relacion: "deepens" (profundiza) o "relates" (concepto relacionado)

Reglas:
- Al menos 1 debe ser de un área diferente (cross-domain)
- Al menos 1 debe profundizar en el tema actual
- Evitar repetir los últimos 5 temas del niño
- Adaptar la complejidad a un niño de {edad} años
- Los nombres deben ser concretos, no genéricos
```

### Timing

Esta generación puede ser **asíncrona** (fire-and-forget) después de guardar la historia. No bloquea la experiencia de lectura. Los nodos nuevos aparecen cuando el niño vuelve al mapa.

---

## Embeddings

### Estrategia

Usar un modelo de embeddings ligero para los `concepto_nucleo` (~2 frases por nodo).

**Opción recomendada:** `text-embedding-3-small` de OpenAI
- Dimensión: 1536 (o truncado a 256 para ahorrar espacio)
- Coste: ~$0.02 por millón de tokens (~$0.00002 por nodo)
- Latencia: <100ms por batch

**Alternativa local:** `@xenova/transformers` con `all-MiniLM-L6-v2`
- Dimensión: 384
- Coste: $0 (local)
- Más lento, pero viable para <1000 nodos por estudiante

### Cuándo se calculan

1. **Al crear un nodo:** calcular embedding de `concepto_nucleo`
2. **Al buscar similitud:** cosine similarity contra todos los nodos del estudiante
3. **Pre-cálculo para skills predefinidas:** calcular embeddings de los 80 skills al deploy (script de build)

### Similitud coseno

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

Para <1000 nodos por estudiante, la búsqueda por fuerza bruta es suficiente (~1ms). No necesitamos ANN/HNSW.

---

## Visualización: Local Graph View

### Vista por defecto: Vecindario local

Muestra los **últimos ~10 nodos visitados** + sus conexiones directas.

```
                    ┌─────────┐
              ┌────→│ Volcanes │ (sugerido, sin visitar)
              │     └─────────┘
┌──────────┐  │     ┌──────────────┐
│ Fósiles  │──┼────→│ Dinosaurios  │ (visitado, foco actual)
└──────────┘  │     └──────┬───────┘
              │            │
              │     ┌──────▼──────┐     ┌─────────────┐
              └────→│  Reptiles   │────→│ Ecosistemas │
                    └─────────────┘     └─────────────┘
```

**Comportamiento:**
- Al abrir el mapa: centrado en el último nodo visitado
- Nodos visitados: círculo sólido con color de dominio
- Nodos sugeridos (nunca visitados): borde punteado, color amarillo
- Al tocar un nodo: mostrar concepto_nucleo + opciones (leer historia, explorar conexiones)
- Al tocar un nodo sugerido: "Quieres una historia sobre X?"
- Doble-tap en un nodo: expandir sus conexiones (traer nodos conectados que no están visibles)

### Vista expandida: Grafo completo

Accesible desde botón "Ver todo el mapa". Muestra todos los nodos del estudiante con clustering automático.

**Clustering visual:**
- Los nodos con muchas conexiones entre sí se agrupan naturalmente (force-directed layout)
- Los dominios predefinidos siguen usando su color
- Los nodos custom/generated usan un color neutro o el color del dominio más cercano

### Datos que necesita el componente

```typescript
interface LocalGraphData {
  // Nodos visibles (recientes + sus vecinos)
  nodes: Array<{
    id: string;
    slug: string;
    nombre: string;
    emoji: string;
    dominio: string | null;
    source: 'predefined' | 'generated' | 'custom';
    timesVisited: number;
    mastery: number;
    isRecent: boolean;      // es de los últimos ~10
    isSuggestion: boolean;  // nunca visitado
  }>;
  // Aristas entre nodos visibles
  edges: Array<{
    fromSlug: string;
    toSlug: string;
    type: 'prerequisite' | 'deepens' | 'relates';
    weight: number;
  }>;
  // Nodo focal (el más reciente o el seleccionado)
  focusSlug: string;
}
```

---

## Migración desde el sistema actual

### Paso 1: Crear tablas `knowledge_nodes` y `knowledge_edges`

### Paso 2: Seed de nodos predefinidos

Para cada skill en `SKILLS[]`, crear un template de nodo (sin student_id). Cuando un estudiante lee una historia sobre esa skill, se crea su instancia personal.

### Paso 3: Migrar `skill_progress` existente

```typescript
// Para cada registro en skill_progress con totalIntentos > 0:
// 1. Crear knowledge_node para ese estudiante con source='predefined'
// 2. Copiar mastery, times_visited, dominated
// 3. Crear knowledge_edges basadas en prerequisitos
```

### Paso 4: Migrar historias custom existentes

```typescript
// Para cada generated_story con topicSlug.startsWith('custom:'):
// 1. Crear knowledge_node con source='custom'
// 2. No hay edges todavía (se generarán en la próxima lectura)
```

### Paso 5: Deprecar GRAFO_PROFUNDIZAR y GRAFO_APLICAR

Los mapas manuales se convierten en edges en la migración y luego se eliminan.

---

## Impacto en el sistema actual

### story-generation-actions.ts

- Después de `completarEtapa('persistencia')`: disparar generación async de nodos relacionados
- Para custom topics: generar `concepto_nucleo` como parte de la generación (el LLM ya tiene contexto)

### InicioSesion.tsx (topic picker)

- Además de la lista de dominios/skills, mostrar "Nodos recientes" y "Sugeridos para ti"
- Los nodos sugeridos vienen del grafo (vecinos no visitados del último nodo)
- El input de texto libre sigue funcionando igual

### SeccionRutaAprendizaje.tsx (dashboard)

- Reemplazar el layout actual por el Local Graph View
- Datos vienen de nueva server action `obtenerGrafoLocal(studentId)`

### skill_progress

- Se mantiene para compatibilidad a corto plazo
- A medio plazo, `knowledge_nodes.mastery` lo reemplaza
- La tabla `skill_progress` se convierte en vista derivada de `knowledge_nodes`

---

## Cosas que NO cambian

- Generación de historias (funciona igual, solo añade paso async)
- Preguntas de comprensión (no dependen del grafo)
- Sistema de niveles/ELO (independiente del grafo)
- WPM tracking (independiente)
- Configuración de padres (independiente)

---

## Fases de implementación

### Fase 1: Modelo de datos + migración (2 días)
- Crear tablas `knowledge_nodes` y `knowledge_edges`
- Script de migración de skills predefinidas
- Script de migración de skill_progress existente
- Server action `obtenerGrafoLocal(studentId)`

### Fase 2: Generación de nodos relacionados (2 días)
- Integrar en pipeline de story-generation
- Prompt para generar 4 nodos relacionados
- Deduplicación por slug + embedding similarity
- Tests

### Fase 3: Visualización Local Graph (2-3 días)
- Componente LocalGraphView (reemplaza SeccionRutaAprendizaje)
- Vista vecindario (últimos 10 + vecinos)
- Interacción: tap para detalles, double-tap para expandir
- Vista "todo el grafo" (toggle)

### Fase 4: Integración en topic picker (1 día)
- Mostrar sugerencias del grafo en InicioSesion
- Nodos sugeridos como opción de lectura

### Fase 5: Embeddings + similitud cross-estudiante (futuro)
- Pre-calcular embeddings para todos los nodos
- Descubrimiento automático de relaciones
- Posible: "otros niños que aprendieron X también aprendieron Y"

---

## Decisiones de diseño abiertas

1. **Nodos per-student vs globales:**
   - Recomendado: per-student (un niño de 5 y uno de 9 tienen concepto_nucleo diferentes para "dinosaurios")
   - Los predefined son templates que se instancian por estudiante
   - Custom y generated son siempre per-student

2. **Límite de nodos por estudiante:**
   - ¿Limitamos? Probablemente no a corto plazo
   - Con <1000 nodos la búsqueda bruta de embeddings funciona bien
   - Si crece mucho, paginar/archivar nodos no visitados en >6 meses

3. **Embeddings: API vs local:**
   - API (OpenAI) es más pragmático para v1
   - Local es viable pero añade complejidad de build
   - Decisión: empezar con API, evaluar coste real

4. **¿Los padres ven el grafo?**
   - Sí, en el dashboard padre (reemplaza la sección "Ruta" actual)
   - Pueden ver qué nodos ha explorado su hijo y las conexiones

---

## Ejemplo de flujo completo

1. Niño escribe "piratas del espacio" como topic libre
2. Se genera la historia normalmente
3. Async: se crea nodo `piratas-del-espacio` (source='custom')
4. LLM genera 4 nodos: "Gravedad cero", "Estrellas lejanas", "Mapas estelares", "Tesoros escondidos"
5. "Estrellas lejanas" tiene embedding similar a "Las estrellas" (predefinido) → se crea edge en vez de nodo nuevo
6. Los otros 3 se crean como nodos nuevos con edges hacia "piratas del espacio"
7. Niño vuelve al mapa → ve "piratas del espacio" conectado a "Las estrellas" + 3 sugerencias nuevas
8. Toca "Gravedad cero" → "Quieres una historia sobre Gravedad cero?" → "Sí, vamos!"
9. Se genera historia sobre gravedad cero
10. LLM genera 4 nodos más: "Astronautas", "La gravedad" (match existente!), "Estación espacial", "Flotar en el agua"
11. "La gravedad" ya existía → solo se crea edge
12. "Flotar en el agua" tiene similitud con "Por qué flotan las cosas" (predefinido) → edge
13. El grafo crece orgánicamente, conectando temas que parecían inconexos
