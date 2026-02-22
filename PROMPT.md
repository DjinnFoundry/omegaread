# PARTE 1: 20 Subniveles granulares + ejemplos para el LLM

SOLO toca apps/web/src/lib/ai/prompts.ts. No toques NINGÚN otro archivo.

## Qué hacer:

### 1. Reemplazar NIVELES_CONFIG (4 niveles) por 20 subniveles

Cambia el Record<number, NivelConfig> para que tenga keys: 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0, 4.2, 4.4, 4.6, 4.8

Añade campo `ejemplo` (string) a NivelConfig — un texto de ejemplo real del nivel para que el LLM calibre.
Añade campo `wpmEsperado` (number) — WPM esperado para este nivel.

Parámetros por subnivel:

| Nivel | Palabras | Oración (palabras) | Léxico | WPM esperado |
|-------|----------|-------------------|--------|-------------|
| 1.0 | 30-40 | 3-5 | Top-500, solo presente, frases nominales | 20 |
| 1.2 | 40-50 | 4-6 | Top-500, presente, sujeto+verbo+complemento | 25 |
| 1.4 | 50-60 | 4-6 | Top-700, introduce "había/tenía" | 28 |
| 1.6 | 60-70 | 5-7 | Top-700, pasado simple | 32 |
| 1.8 | 70-80 | 5-7 | Top-800, 1 palabra nueva con definición inline | 35 |
| 2.0 | 80-100 | 6-8 | Top-1000, vocabulario cotidiano | 40 |
| 2.2 | 100-120 | 6-9 | Top-1000, 1-2 palabras nuevas por contexto | 48 |
| 2.4 | 120-130 | 7-9 | Top-1200, diálogo simple entre personajes | 52 |
| 2.6 | 130-145 | 7-10 | Top-1200, causa-efecto simple ("porque...") | 58 |
| 2.8 | 145-160 | 8-10 | Top-1500, 2 palabras nuevas, comparaciones | 62 |
| 3.0 | 160-180 | 8-11 | Subordinadas simples ("porque", "cuando", "si") | 70 |
| 3.2 | 180-200 | 9-12 | 2-3 palabras nuevas inferibles por contexto | 78 |
| 3.4 | 200-220 | 9-13 | Secuencias temporales, conectores ("primero...luego...") | 85 |
| 3.6 | 220-240 | 10-14 | Vocabulario técnico sencillo del tema | 90 |
| 3.8 | 240-260 | 10-14 | Metáforas simples, lenguaje figurado básico | 95 |
| 4.0 | 260-290 | 11-15 | Hilo argumentativo, múltiples párrafos conectados | 105 |
| 4.2 | 290-320 | 12-16 | 3-4 palabras nuevas, vocabulario variado | 115 |
| 4.4 | 320-350 | 12-17 | Causa-efecto compleja, relaciones abstractas | 125 |
| 4.6 | 350-380 | 13-18 | Humor suave, ironía, doble sentido | 135 |
| 4.8 | 380-420 | 14-18 | Texto casi adulto simplificado | 145 |

### 2. Ejemplo real por cada rango (1.x, 2.x, 3.x, 4.x)

Añade un campo `ejemplo` con un texto REAL de muestra. Estos son los que se pasan al LLM para que calibre:

**Ejemplo nivel 1.x:**
"El sol sale por la mañana. Nos da luz y calor. Las plantas necesitan el sol para crecer. Sin el sol, todo estaría oscuro y frío."

**Ejemplo nivel 2.x:**
"Los delfines viven en el mar. Son animales muy listos. Nadan rápido y saltan fuera del agua. Los delfines hablan entre ellos con sonidos especiales. Usan silbidos y chasquidos. Cada delfín tiene su propio silbido. Es como su nombre. Las mamás delfín cuidan a sus crías durante muchos años."

**Ejemplo nivel 3.x:**
"¿Sabías que tu corazón late unas 100.000 veces al día? Este órgano, que es del tamaño de tu puño, bombea sangre a todo tu cuerpo sin descanso. Cuando corres o juegas, tu corazón late más rápido porque tus músculos necesitan más oxígeno. La sangre viaja por tubos llamados vasos sanguíneos: las arterias llevan sangre roja con oxígeno, y las venas traen sangre azulada de vuelta. Es como un circuito que nunca se detiene."

**Ejemplo nivel 4.x:**
"Los volcanes son montañas con un secreto bajo tierra. En las profundidades de nuestro planeta, la temperatura es tan alta que las rocas se derriten y forman un líquido espeso llamado magma. Cuando la presión aumenta demasiado, el magma busca una salida hacia la superficie, como cuando agitas una botella de refresco y la abres. Al salir, el magma pasa a llamarse lava y puede alcanzar temperaturas de más de 1.000 grados. Los científicos que estudian los volcanes se llaman vulcanólogos, y gracias a sus instrumentos pueden predecir cuándo un volcán está a punto de entrar en erupción, lo que ha salvado miles de vidas."

Para los subniveles intermedios (1.2, 1.4, etc.) no hace falta ejemplo único — usa el ejemplo del rango. El LLM usará los parámetros numéricos para ajustar dentro del rango.

### 3. Actualizar getNivelConfig()

Que busque el subnivel más cercano (redondear al 0.2 más próximo):
```typescript
export function getNivelConfig(nivel: number): NivelConfig {
  const clamped = Math.max(1.0, Math.min(4.8, nivel));
  const rounded = Math.round(clamped * 5) / 5; // Redondear al 0.2 más cercano
  return NIVELES_CONFIG[rounded] ?? NIVELES_CONFIG[2.0];
}
```

### 4. Actualizar buildUserPrompt()

Añadir el ejemplo al prompt del usuario:
```
EJEMPLO DE TEXTO DE ESTE NIVEL (escribe con este estilo y complejidad):
"{config.ejemplo}"
```

### 5. NO tocar
- reading-actions.ts (eso es parte 2)
- PantallaLectura.tsx (eso es parte 2)  
- schema.ts (eso es parte 2)
- dashboard (eso es parte 3)
- topics (eso es parte 3)

### Verificación
```bash
pnpm typecheck && pnpm lint
```

Si hay tests que fallan por los niveles antiguos (1,2,3,4), actualízalos para usar los nuevos (1.0, 2.0, 3.0, 4.0).
