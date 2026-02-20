# Fix Ola 1 — OmegaAnywhere

## CONTEXTO IMPORTANTE
Este es un proyecto open source (AGPL-3.0) de educación infantil para ayudar
a millones de niños a aprender a leer. Todo uso requiere consentimiento
parental explícito. El código maneja datos de menores con las máximas
protecciones de privacidad.

## Tu tarea
Lee el review en docs/reviews/REVIEW-OLA1-003.md y arregla TODOS los issues.

## Resumen de fixes necesarios:

### BLOCKERS:
1. Auth en rutas /jugar/* - server actions con requireStudentOwnership pueden crashear componentes client al redirigir a login. Manejar gracefully: si no hay auth, mostrar UI amigable para el contexto infantil en vez de crash. Crear un componente AuthGuardNino que envuelva las rutas /jugar/*.
2. Mastery client/server puede divergir - el cliente (MasteryTracker) traga errores del servidor silenciosamente. Añadir retry simple para saves fallidos. No tragar errores con console.warn.

### IMPORTANTES:
3. Fallback si Web Speech API TTS no disponible - detectar y mostrar texto
4. Mascota siempre renderiza gato - simplificar a un solo tipo por ahora (eliminar seleccion que no funciona)
5. MascotaDialogo doble invocacion TTS al montar - cleanup en useEffect con flag
6. mezclar() y calcularEdad() duplicados - extraer a src/lib/utils/helpers.ts
7. Componentes de pagina >200 lineas - extraer sub-componentes o custom hooks
8. ErrorBoundary en layout /jugar con UI amigable
9. Si falla 3+ veces misma pregunta: bajar dificultad, dar mas pistas
10. Sesiones huerfanas >1h inactivas: cerrar auto al cargar
11. Añadir 3-5 tests de componentes React con testing-library
12. Añadir manifest.json en apps/web/public/
13. Añadir archivo LICENSE con AGPL-3.0 en raiz
14. Sugerencias offline: pool predefinido mapeado al progreso

## Stack: Next.js + TypeScript + Drizzle + PostgreSQL + Tailwind
## Tests: 75 existentes deben seguir pasando (vitest)
