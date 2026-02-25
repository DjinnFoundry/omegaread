# OmegaRead - Refactoring Plan

Prioritized recommendations to improve maintainability before adding new features.
Analysis date: 2026-02-25. Codebase: 63 source files, 1020 tests.

---

## Quick Wins (S effort, do before next feature sprint)

### 1. Unify `normalizarTexto` functions
- **Files:** `story-generator.ts`, `qa-rubric.ts`, `story-actions.ts`
- **Problem:** 3 near-identical text normalization functions. One preserves `ñ`, two don't (silent correctness bug for Spanish text).
- **Fix:** Create `lib/utils/text.ts` with one canonical `normalizarTexto()`. Replace all callsites.

### 2. Unify skill progress helpers
- **Files:** `story-actions.ts`, `dashboard-actions.ts`, `graph.ts`
- **Problem:** 3 files each implement `normalizarSkillSlug`, `crearMapaProgresoSkill`, `skillDominada`. Mastery threshold (0.85) hardcoded in different places.
- **Fix:** Create `lib/skills/progress.ts` with shared constants and helpers.

### 3. Unify `extraerPerfilVivo`
- **Files:** `profile-actions.ts`, `dashboard-actions.ts`
- **Problem:** Identical function in 2 files. Evolving `PerfilVivoState` means updating both (will forget one).
- **Fix:** Move to `lib/profile/perfil-vivo.ts`, import from both.

### 4. Merge auth `getSecret()`
- **Files:** `auth.ts`, `admin-auth.ts`
- **Problem:** Two `getSecret()` reading same env var. Admin version has length check (`< 32`) that parent version lacks (security inconsistency).
- **Fix:** Create `server/jwt.ts` with shared `getSecret()`, `createToken()`, `verifyToken()`.

### 5. Name magic numbers as constants
- **File:** `story-actions.ts`
- **Problem:** Inline `0.75` (topic skill threshold), `7` (cache TTL days), `0.80` (stars calc) with no names.
- **Fix:** Add named constants at file top: `CACHE_TTL_DIAS`, `UMBRAL_ACIERTO_TOPIC_SKILL`, etc.

### 6. Fix `AudioAnalisisLectura` type duplication
- **Files:** `reading.ts`, `story-actions.ts`, `validation.ts`
- **Problem:** Same audio analysis object defined 3 times with slightly different names/fields.
- **Fix:** Keep `AudioReadingAnalysis` in `reading.ts` as canonical. Delete `AudioAnalisisLectura`, derive Zod schema from it.

### 11. Config validation at startup
- **Files:** `auth.ts`, `admin-auth.ts`
- **Problem:** Missing `AUTH_SECRET` only crashes on first user request, not at deploy.
- **Fix:** Validate in module-level const so it surfaces in worker startup logs.

### 12. Extract `serializarAudioAnalisis`
- **File:** `story-actions.ts`
- **Problem:** Same 13-line audio serialization block appears twice verbatim.
- **Fix:** Extract to a shared function.

---

## Strategic Refactors (M effort, plan for a sprint)

### 7. Break apart `story-actions.ts` god file (1929 lines)
- **Problem:** 5 distinct responsibilities in one file: story generation (800+ lines), progress tracing, audio analysis, session finalization, story rewriting. Can't work on one without scrolling through the others.
- **Fix:**
  - `story-generation-actions.ts` (generarHistoria, generarPreguntasSesion)
  - `story-rewrite-actions.ts` (reescribirHistoria)
  - `session-finalization-actions.ts` (finalizarSesionLectura, registrarLecturaCompletada)
  - `audio-actions.ts` (analizarLecturaAudio + helpers)
  - `lib/story/generation-trace.ts` (pure trace state machine)
  - Keep `story-actions.ts` as re-export barrel for backwards compat.

### 8. Type `sessions.metadata` (step 1: types only)
- **Problem:** `metadata: Record<string, unknown>` stores critical data (comprensionScore, topicSlug, lecturaCompletada). Code reads it with unsafe casts: `(sesion.metadata as any).comprensionScore`.
- **Fix (step 1, no migration):** Define `SessionMetadata` interface, replace `Record<string, unknown>` in type annotations. Immediate type safety, zero DB change.

### 9. Extract topic-selector into domain service
- **File:** `story-actions.ts` lines 653-790
- **Problem:** `elegirSiguienteSkillTechTree` and `construirContextoTechTree` are 140 lines of pure business logic (no I/O) buried in a server action file. Impossible to unit test in isolation.
- **Fix:** Move to `lib/learning/topic-selector.ts`. Write focused unit tests.

### 10. Fix N+1 queries in dashboard
- **File:** `dashboard-actions.ts`
- **Problem:** Loads all sessions, then separately loads all responses (in 50-ID chunks), then stories, then topics. 4+ sequential DB round-trips per dashboard load. A kid with 250+ sessions = very slow.
- **Fix:** Use Drizzle's `with: { responses: true, story: true }` or a single JOIN.

### 14. Shared `callLLM` abstraction
- **File:** `story-generator.ts`
- **Problem:** 4 functions (generateStory, generateStoryOnly, generateQuestions, rewriteStory) repeat 200+ lines of identical retry/parse/validate boilerplate.
- **Fix:** Extract `callLLM<TInput, TOutput>(config)`. Each generator becomes ~30 lines.

### 17. Typed error codes in server actions
- **Problem:** `{ ok: false, error: string }` with user-facing messages hardcoded in server logic. No way to distinguish error types without string matching.
- **Fix:** Define discriminated union of error codes in `lib/types/errors.ts`. Move user strings to UI layer.

### 18. `StudentContext` repository layer
- **Problem:** Every action repeats: `requireStudentOwnership()` + `calcularEdad()` + null-coalesce `nivelLectura ?? 1`. 10+ places.
- **Fix:** Create `server/student-context.ts` with `getStudentContext(studentId)` that bundles auth, DB, computed age, safe defaults.

### 19. Extract audio hooks from `PantallaLectura`
- **File:** `PantallaLectura.tsx` (785 lines)
- **Problem:** Audio recording, VAD (voice activity detection), FFT/RMS calculation mixed with reading UI. Untestable, unreusable.
- **Fix:** Extract `useAudioRecording.ts` and `useReadingTimer.ts` hooks. Aim for component at ~300 lines.

---

## Major Restructuring (L effort, plan carefully)

### 13. Promote `sessions.metadata` fields to DB columns
- **Problem:** Can't query sessions by comprehension score in SQL. Can't add indexes. Must load all sessions into memory for analytics.
- **Fix:** Add columns via Drizzle migration: `comprension_score REAL`, `topic_slug TEXT`, `lectura_completada BOOLEAN`, etc. Dual-write phase, then cut over.

### 15. Separate `perfilVivo` from `senalesDificultad`
- **Problem:** The "living profile" (perfilVivo) lives inside a column named "difficulty signals" as an arbitrary JSON property. Semantic mismatch that will confuse as profile features grow.
- **Fix:** Add dedicated `perfil_vivo` JSON column to students, typed as `PerfilVivoState`.

### 16. Resolve topics table vs skills.ts duality
- **Problem:** Two overlapping sources of topic metadata (DB table + in-memory skills.ts). Adding a new skill requires updating both. Dashboard has 3-level fallback: `topic?.nombre ?? skill?.nombre ?? story.topicSlug`.
- **Fix (simple):** Make skills.ts the single source of truth, remove topics table queries. Fix long-term: seed DB from skills.ts in migrations.

### 20. Establish naming convention rule
- **Problem:** Mixed Spanish/English identifiers with no rule. DB columns mix camelCase and snake_case. AI agents can't predict naming patterns.
- **Fix:** Document rule: Spanish for domain concepts, English for infrastructure. Apply incrementally.

---

## Recommended Sprint Order

**Sprint 1 (cleanup, 1-2 days):** #1, #2, #3, #4, #5, #6, #11, #12
All S-effort, safe standalone PRs. Reduces "landmine density" before adding features.

**Sprint 2 (enablement):** #7, #9, #18
Break the god file, extract topic selector, add StudentContext. Makes it dramatically faster to add new session types and recommendation logic.

**Sprint 3 (data foundation):** #8 step 1, #17
Type the metadata, add typed errors. Safer data layer before more features write to it.

**Deferred (when scaling):** #10 (when 100+ sessions/student), #13, #15, #16 (batch schema migrations together)
