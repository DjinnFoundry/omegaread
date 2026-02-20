# SPEC Dashboard Niño OmegaRead

Versión: 2.0
Fecha: 2026-02-20
Estado: Activo (reemplaza enfoque narrativo no numérico)
Dependencias:
- `docs/design/SPEC-OMEGAREAD-CORE-ADAPTATIVO-2026-02-20.md`
- `docs/planning/SPRINTS-OMEGAREAD-REBOOT-2026-02-20.md`

## 1) Principio de diseño

No infantilizar al niño ocultando datos.
El dashboard debe enseñar progreso real con gráficas simples y accionables.

## 2) Objetivo UX

Que el niño pueda responder en menos de 20 segundos:
1. ¿Cómo voy?
2. ¿Qué estoy mejorando?
3. ¿Qué necesito practicar ahora?

## 3) Componentes obligatorios

### A. Gráfica de comprensión (línea)
- Eje X: últimas 7 sesiones.
- Eje Y: score de comprensión (0-100).
- Marcador de meta semanal visible.

### B. Gráfica de ritmo lector (barra)
- Barras por sesión: tiempo real de lectura.
- Línea objetivo por nivel.
- Colores neutros, no punitivos.

### C. Estado de nivel actual
- Nivel actual.
- Próximo nivel y criterio para alcanzarlo.
- Texto explicativo breve: “Te falta subir X puntos en comprensión media”.

### D. Topics fuertes y a reforzar
- Top 3 topics con mejor desempeño.
- 1 topic recomendado para práctica dirigida.

### E. Próxima misión
- Siguiente lectura sugerida.
- Objetivo explícito de esa lectura.

## 4) Copys clave

- Subida de nivel: “Subiste porque entendiste bien 3 lecturas seguidas”.
- Mantenimiento: “Vas estable. Una sesión más para intentar subir”.
- Bajada: “Bajamos un poco para que consolides comprensión”.

Regla de copy:
- Siempre causal y concreta.
- Nunca culpabilizar.

## 5) Interacción mínima

Acciones desde dashboard niño:
- `Leer siguiente historia`.
- `Ver por qué estoy en este nivel`.
- `Elegir topic para próxima lectura`.

## 6) Reglas visuales

- Nada de “sol mágico” o metáforas ambiguas como eje principal.
- Sí usar iconos de apoyo, pero la señal principal es la gráfica.
- Escalas estables sesión a sesión para evitar confusión.

## 7) Telemetría

Eventos mínimos:
- `child_dashboard_opened`
- `child_dashboard_metric_clicked`
- `child_dashboard_next_story_clicked`
- `child_dashboard_topic_selected`

## 8) Criterios de aceptación

1. Niño entiende su estado actual en test moderado de usabilidad.
2. Niño identifica su siguiente objetivo sin ayuda adulta.
3. Padre y niño interpretan igual la tendencia general.

## 9) No objetivo en v1

- Gamificación compleja basada en skins/cosméticos.
- Visualizaciones densas tipo analytics profesional.
