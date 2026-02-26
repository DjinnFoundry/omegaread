# SPEC: Dashboard Sidebar Navigation

## Problema

El dashboard del padre (`/padre/dashboard`) tiene 10 secciones en scroll infinito:
1. Resumen rapido por hijo (heatmap, metricas, CTA)
2. Comprension Lectora (ELO global + chart)
3. Ajustes de Lectura (fun mode, accesibilidad)
4. Perfil Vivo (contexto, personajes, temas a evitar, micro-preguntas)
5. Ruta de Aprendizaje (tech tree SVG, topics recientes, dominios, sugerencias)
6. Normativa y Catch-up (percentiles, benchmarks por edad)
7. Comprension por Tipo (literal, inferencia, vocabulario, resumen)
8. Velocidad de Lectura (WPM chart)
9. Historial de Sesiones (ultimas 20)
10. Recomendaciones para Casa

Es imposible encontrar lo que buscas. Necesita navegacion lateral con agrupacion logica.

## Solucion: Layout con sidebar + subrutas

### Agrupacion de secciones

| Ruta | Nombre sidebar | Emoji | Secciones incluidas |
|------|---------------|-------|---------------------|
| `/padre/dashboard` | Resumen | 🏠 | (1) Resumen por hijo + (10) Recomendaciones para Casa |
| `/padre/dashboard/progreso` | Progreso | 📊 | (2) Comprension Lectora + (7) Comprension por Tipo + (6) Normativa + (8) Velocidad Lectura |
| `/padre/dashboard/ruta` | Ruta | 🗺️ | (5) Ruta de Aprendizaje completa (tech tree, topics, dominios, sugerencias) |
| `/padre/dashboard/perfil` | Perfil | 👤 | (4) Perfil Vivo + (3) Ajustes de Lectura |
| `/padre/dashboard/historial` | Historial | 📋 | (9) Historial de Sesiones |

### Justificacion de las agrupaciones

- **Resumen**: lo que un padre quiere ver en 10 segundos (actividad + que hacer)
- **Progreso**: todo lo medible (ELOs, percentiles, WPM, desglose por tipo). Un padre interesado en "como va mi hijo" viene aqui
- **Ruta**: el "que viene despues" (skill tree, sugerencias). Separado de progreso porque es forward-looking vs backward-looking
- **Perfil**: todo lo configurable del nino (personalidad + ajustes tecnicos). Un padre viene aqui para cambiar algo
- **Historial**: log detallado para padres curiosos. No necesita estar en el home

## Arquitectura tecnica

### Nuevo layout: `apps/web/src/app/padre/dashboard/layout.tsx`

```
dashboard/
├── layout.tsx          (sidebar + content area)
├── page.tsx            (Resumen - refactored from original)
├── progreso/
│   └── page.tsx        (Comprension + Tipo + Normativa + WPM)
├── ruta/
│   └── page.tsx        (Tech tree + topics + dominios + sugerencias)
├── perfil/
│   └── page.tsx        (Perfil Vivo + Ajustes Lectura)
└── historial/
    └── page.tsx        (Historial Sesiones)
```

### Sidebar component: `DashboardSidebar.tsx`

- Desktop (>=768px): sidebar fijo a la izquierda, 220px ancho, colapsable a iconos
- Mobile (<768px): bottom navigation bar con 5 iconos (como app nativa)
- Item activo: fondo turquesa/10, texto turquesa, borde izquierdo turquesa (desktop) o dot indicator (mobile)
- Nombre del hijo seleccionado visible en el sidebar header (desktop)

```
┌──────────────────────────────────────────┐
│ NavPadre (header existente)              │
├────────┬─────────────────────────────────┤
│        │                                 │
│ 🏠 Res │  [Contenido de la subruta]      │
│ 📊 Pro │                                 │
│ 🗺️ Rut │                                 │
│ 👤 Per │                                 │
│ 📋 His │                                 │
│        │                                 │
├────────┴─────────────────────────────────┤
│ (mobile: bottom nav bar)                 │
└──────────────────────────────────────────┘
```

### Data fetching strategy

El `obtenerDashboardPadre()` actual retorna TODOS los datos en una sola llamada.
Para no romper nada, mantenemos esa llamada en el layout y pasamos los datos via React Context.

```typescript
// dashboard/layout.tsx (server component)
// Fetches all data once, passes to client layout
export default async function DashboardLayout({ children }) {
  const { parent, selectedChild } = await getAuthAndChild();
  const resumen = await obtenerResumenProgreso(selectedChild.id);
  const dashboard = await obtenerDashboardPadre(selectedChild.id);

  return (
    <DashboardShell
      children={children}
      resumen={resumen}
      dashboard={dashboard}
      hijos={parent.hijos}
      hijoSeleccionado={selectedChild}
    />
  );
}
```

```typescript
// DashboardShell.tsx (client component)
// Provides data via context + renders sidebar + content
export function DashboardShell({ children, resumen, dashboard, ... }) {
  return (
    <DashboardDataContext.Provider value={{ resumen, dashboard }}>
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </DashboardDataContext.Provider>
  );
}
```

Cada sub-page simplemente consume del context:
```typescript
// progreso/page.tsx
'use client';
export default function ProgresoPage() {
  const { dashboard } = useDashboardData();
  // Renderiza secciones de progreso usando dashboard data
}
```

### Componentes a extraer del DashboardPadreDetalle actual

El componente monolitico `DashboardPadreDetalle.tsx` se divide en componentes independientes:

| Componente nuevo | Secciones que incluye | Destino |
|-----------------|----------------------|---------|
| `SeccionComprension.tsx` | ELO global + chart de evolucion | progreso/ |
| `SeccionTipos.tsx` | Desglose por tipo + charts expandibles | progreso/ |
| `SeccionNormativa.tsx` | Percentiles + benchmarks + catch-up | progreso/ |
| `SeccionWpm.tsx` | Velocidad de lectura chart | progreso/ |
| `SeccionRutaAprendizaje.tsx` | Tech tree SVG + topics + dominios + sugerencias | ruta/ |
| `SeccionPerfilVivo.tsx` | Contexto, personajes, temas, micro-preguntas, hechos | perfil/ |
| `SeccionAjustesLectura.tsx` | Fun mode + accesibilidad toggles | perfil/ |
| `SeccionHistorial.tsx` | Lista de sesiones expandibles | historial/ |
| `SeccionRecomendaciones.tsx` | Tips para padres | resumen (home) |

### Estilos del sidebar

```css
/* Desktop sidebar */
.sidebar {
  @apply fixed left-0 top-[navHeight] bottom-0 w-56 bg-white border-r border-texto/10;
  @apply flex flex-col py-4 gap-1;
}

.sidebar-item {
  @apply flex items-center gap-3 px-4 py-3 mx-2 rounded-xl;
  @apply text-sm font-medium text-texto-suave;
  @apply hover:bg-turquesa/5 hover:text-texto transition-colors;
}

.sidebar-item.active {
  @apply bg-turquesa/10 text-turquesa font-semibold;
  @apply border-l-3 border-turquesa;
}

/* Mobile bottom nav */
@media (max-width: 767px) {
  .sidebar { @apply fixed bottom-0 left-0 right-0 h-16 flex-row justify-around; }
  .sidebar-item { @apply flex-col gap-0.5 text-xs px-2 py-1; }
}
```

## Notas de implementacion

1. **No romper URLs**: `/padre/dashboard` sigue funcionando (es el home/resumen)
2. **No romper datos**: la data-fetching strategy no cambia, solo se reorganiza donde se consume
3. **Animacion de transicion**: usar `animate-fade-in-up` al cambiar de seccion
4. **Child selector**: mantener el selector de hijo existente en NavPadre, funciona con ?hijo=id
5. **El DashboardHijo (resumen por hijo) permanece en la pagina home** como esta
6. **Loading states**: cada sub-page puede usar el loading.tsx de Next.js App Router
7. **Mobile-first**: bottom nav en mobile, sidebar en desktop

## Criterio de exito

- Un padre puede llegar a cualquier seccion en 1 tap (vs scroll infinito actual)
- Las secciones estan agrupadas de forma que tiene sentido buscar juntas
- La pagina home muestra solo lo esencial (resumen + recomendaciones)
- Mobile experience es nativa (bottom tab bar)
- No hay regresion: todos los datos y funcionalidades siguen disponibles
