# Source 03: Understanding and Addressing Learning Anti-Patterns

URL: https://support.alpha.school/article/31771-understanding-and-addressing-learning-anti-patterns  
Estado: captured  
Captura: 2026-02-20

## Texto normalizado (resumen operativo)

1. Se describen conductas de bajo aprendizaje detectables en datos de uso.
2. Un patron explicitado es responder preguntas muy rapido (ejemplo: menos de 20 segundos por pregunta) con menor precision.
3. Dash muestra indicadores para identificar y corregir estos patrones.
4. La recomendacion operativa es priorizar calidad de respuesta y ajuste de ritmo.

## Implicaciones para OmegaRead

1. Implementar detector de `rushing` con umbral temporal y condicion de accuracy.
2. No premiar XP cuando se detecte conducta de baja calidad sostenida.
3. Incluir intervenciones UI claras cuando el sistema detecte anti-pattern.

## Riesgos si no se aplica

1. El usuario puede optimizar puntos y no aprendizaje real.
2. El dashboard puede mostrar progreso inflado y enganoso.
