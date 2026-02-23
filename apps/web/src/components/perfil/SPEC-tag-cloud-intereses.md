# Spec: Tag Cloud de intereses/personalidad del nino

## Problema

La pantalla de onboarding "que te gusta aprender?" muestra 5 categorias STEM (Naturaleza, Universo, etc.) como cards grandes. Estos dominios se van a desbloquear todos igualmente, asi que seleccionarlos no aporta valor. Lo que si aporta valor es perfilar como es el nino para personalizar las historias.

## Solucion

Reemplazar las 5 cards de dominios STEM por un **tag cloud de chips** que describan la personalidad, actividades e intereses del nino. El padre puede seleccionar de tags predefinidos y tambien anadir tags custom.

## Componente: `SelectorIntereses.tsx`

### Header
- Emoji: estrella (mantener)
- Titulo: "Como es {nombre}?"
- Subtitulo: "Selecciona lo que mejor le describe"

### Tag cloud
- Chips con emoji + texto, layout flex wrap
- Agrupados por categoria con separacion visual (gap mayor entre grupos), sin headers de texto
- Toggle on/off al tocar
- Activo: `rounded-full px-3 py-1.5 bg-turquesa/15 border border-turquesa text-turquesa font-semibold`
- Inactivo: `rounded-full px-3 py-1.5 border border-neutro/30 bg-superficie text-texto`

### Tags predefinidos (~25)

**Grupo Personalidad:**
timido, extrovertido, curioso, tranquilo, energetico, sensible, independiente

**Grupo Actividades:**
deportista, legos/construccion, videojuegos, musica, dibujo/arte, cocina, manualidades

**Grupo Intereses:**
animales, dinosaurios, espacio, coches, princesas, superheroes, robots, piratas, naturaleza, ciencia

Cada tag: `{ slug: string, label: string, emoji: string, grupo: number }`

### Input de tags custom
- Campo de texto + boton "+" debajo del tag cloud
- Placeholder: "Anadir otra cosa..."
- Al enviar, se anade como chip con "x" para borrar
- Los custom se guardan con el prefijo `custom:` para distinguirlos (ej: `custom:patinaje`)

### Reglas
- Min 1 tag para habilitar "Listo!"
- Sin limite maximo estricto (max 30 en validacion backend)

## Datos

### Almacenamiento
Campo `intereses: string[]` en tabla `students` (ya existe, no hay cambio de schema).

Antes guardaba: `["naturaleza-vida", "universo"]`
Ahora guarda: `["curioso", "deportista", "dinosaurios", "custom:patinaje"]`

### Server action
`guardarIntereses()` en `profile-actions.ts` no cambia. Solo subir el max en la validacion Zod de 10 a 30.

## Archivos

| Archivo | Accion |
|---------|--------|
| `src/lib/data/interest-tags.ts` | CREAR: array de tags predefinidos |
| `src/components/perfil/SelectorIntereses.tsx` | REESCRIBIR: tag cloud |
| `src/server/validation.ts` | EDITAR: max intereses 10 -> 30 |
