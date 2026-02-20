# OmegaRead - Plan de Sprints (Reboot)

Fecha: 2026-02-20
Estado: Propuesto
Este documento reemplaza la planificación centrada en prelectura temprana.

## North Star del roadmap

Que cada niño lea contenido que sí le importa, a su nivel real, y mejore comprensión de forma medible semana a semana.

## Principios

1. Personalización basada en identidad e intereses.
2. Adaptación por evidencia (no por intuición).
3. Métricas legibles para niño y familia.
4. Cada sprint debe dejar un loop completo usable.

---

## Sprint 1 (Sem 1-2) - Perfil + Baseline

Meta:
- Capturar identidad/intereses y estimar nivel inicial confiable.

Historias de usuario clave:
- Como madre/padre, quiero registrar contexto e intereses del niño para que la app personalice lecturas.
- Como niño, quiero empezar con contenido que no se sienta ni demasiado fácil ni demasiado difícil.

Entregables:
- Perfil enriquecido y taxonomía de topics.
- Baseline de lectura/comprensión.
- Contrato de datos para sesiones adaptativas.

DoD:
- Nivel inicial + confianza guardados.
- Perfil usable para generación de prompts.

---

## Sprint 2 (Sem 3-4) - Generación de Historias v1

Meta:
- Entregar historias personalizadas con metadata de dificultad.

Historias de usuario clave:
- Como niño, quiero leer historias sobre mis temas favoritos.
- Como producto, quiero controlar longitud y complejidad según nivel.

Entregables:
- Pipeline `generate -> evaluate -> publish`.
- Rubrica QA pedagógica y de seguridad.
- Plantillas de prompt por edad/nivel/topic.

DoD:
- Historias generadas consistentemente por perfil.
- Rechazo automático de contenido fuera de política.

---

## Sprint 3 (Sem 5-6) - Comprensión + Adaptación Automática

Meta:
- Cerrar el ciclo lectura -> preguntas -> decisión de dificultad.

Historias de usuario clave:
- Como niño, quiero preguntas claras al final para demostrar que entendí.
- Como sistema, quiero ajustar la siguiente lectura según resultado.

Entregables:
- Banco de preguntas por tipo (literal, inferencia, vocabulario, resumen).
- Scoring de comprensión por sesión.
- Motor de ajuste de dificultad para la siguiente historia.

DoD:
- El nivel sube con buen rendimiento y baja con bajo rendimiento.
- Toda decisión de ajuste queda trazada con “por qué”.

---

## Sprint 4 (Sem 7-8) - Reescritura en Sesión + Control del Niño

Meta:
- Dar control explícito para ajustar dificultad en tiempo real.

Historias de usuario clave:
- Como niño, quiero pedir versión más fácil o más desafiante sin salir de la historia.
- Como sistema, quiero aprender de esas elecciones manuales.

Entregables:
- Botones UX: `Hazlo más fácil` / `Hazlo más desafiante`.
- Reescritura de texto en caliente preservando tema/personajes.
- Registro de ajustes manuales para mejorar recomendaciones futuras.

DoD:
- Reescritura funcional sin romper comprensión ni continuidad narrativa.
- Telemetría completa de ajustes manuales.

---

## Sprint 5 (Sem 9-10) - Dashboards (Niño + Padre)

Meta:
- Mostrar progreso claro y accionable, con gráficas simples para niño.

Historias de usuario clave:
- Como niño, quiero ver en una gráfica dónde estoy y cuál es mi siguiente meta.
- Como madre/padre, quiero entender fortalezas y áreas a reforzar por topic y habilidad.

Entregables:
- Dashboard niño: tendencia de comprensión, ritmo lector, nivel actual y objetivo.
- Dashboard padre: evolución semanal, skills por topic, recomendaciones concretas.
- Explicador de cambios de nivel (“subiste por X”, “bajamos por Y”).

DoD:
- Métricas entendibles en <30 segundos.
- Recomendaciones accionables y no ambiguas.

---

## Sprint 6 (Sem 11-12) - Hardening + Benchmark AlphaRead + Piloto

Meta:
- Validar robustez y cerrar preparación de piloto real.

Historias de usuario clave:
- Como equipo, quiero comparar flujo y resultados contra patrones probados de AlphaRead.
- Como producto, quiero minimizar regresiones antes del piloto.

Entregables:
- Benchmark UX/learning loop vs AlphaRead (checklist documentado).
- Hardening técnico (observabilidad, errores, performance de generación).
- Playbook de piloto con criterios de éxito.

DoD:
- Loop principal estable de extremo a extremo.
- Go/No-Go de piloto decidido con evidencia.

---

## Dependencias críticas

1. Calidad de perfil (sin buen input, la personalización falla).
2. Rubrica QA sólida (sin esto, riesgo pedagógico y reputacional).
3. Telemetría limpia (sin trazabilidad, no hay adaptación fiable).

## KPIs por sprint

- S1: % perfiles completos + confianza de baseline.
- S2: % historias aprobadas por QA automático.
- S3: mejora media de comprensión sesión a sesión.
- S4: uso y efecto de ajustes manuales.
- S5: comprensión de dashboard (test de usabilidad).
- S6: estabilidad del loop y readiness de piloto.
