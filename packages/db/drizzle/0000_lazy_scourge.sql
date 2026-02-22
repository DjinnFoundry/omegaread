CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`tipo` text NOT NULL,
	`logro_id` text NOT NULL,
	`nombre` text NOT NULL,
	`icono` text,
	`descripcion` text,
	`coleccion` text,
	`metadata` text DEFAULT '{}',
	`ganado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `achievements_student_idx` ON `achievements` (`student_id`);--> statement-breakpoint
CREATE TABLE `baseline_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`nivel_texto` integer NOT NULL,
	`texto_id` text NOT NULL,
	`total_preguntas` integer NOT NULL,
	`aciertos` integer NOT NULL,
	`aciertos_por_tipo` text DEFAULT '{}',
	`tiempo_lectura_ms` integer,
	`respuestas` text DEFAULT '[]',
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `baseline_student_idx` ON `baseline_assessments` (`student_id`);--> statement-breakpoint
CREATE TABLE `difficulty_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`session_id` text,
	`nivel_anterior` real NOT NULL,
	`nivel_nuevo` real NOT NULL,
	`direccion` text NOT NULL,
	`razon` text NOT NULL,
	`evidencia` text DEFAULT '{}',
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `difficulty_student_idx` ON `difficulty_adjustments` (`student_id`);--> statement-breakpoint
CREATE INDEX `difficulty_session_idx` ON `difficulty_adjustments` (`session_id`);--> statement-breakpoint
CREATE TABLE `elo_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`session_id` text NOT NULL,
	`elo_global` real NOT NULL,
	`elo_literal` real NOT NULL,
	`elo_inferencia` real NOT NULL,
	`elo_vocabulario` real NOT NULL,
	`elo_resumen` real NOT NULL,
	`rd_global` real DEFAULT 350 NOT NULL,
	`wpm_promedio` real,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `elo_snapshots_student_idx` ON `elo_snapshots` (`student_id`);--> statement-breakpoint
CREATE INDEX `elo_snapshots_created_idx` ON `elo_snapshots` (`creado_en`);--> statement-breakpoint
CREATE TABLE `generated_stories` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`topic_slug` text NOT NULL,
	`titulo` text NOT NULL,
	`contenido` text NOT NULL,
	`nivel` real NOT NULL,
	`metadata` text NOT NULL,
	`modelo_generacion` text NOT NULL,
	`prompt_version` text DEFAULT 'v1' NOT NULL,
	`aprobada_qa` integer DEFAULT false NOT NULL,
	`motivo_rechazo` text,
	`reutilizable` integer DEFAULT true NOT NULL,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stories_student_idx` ON `generated_stories` (`student_id`);--> statement-breakpoint
CREATE INDEX `stories_topic_idx` ON `generated_stories` (`topic_slug`);--> statement-breakpoint
CREATE INDEX `stories_cache_idx` ON `generated_stories` (`student_id`,`topic_slug`,`nivel`,`reutilizable`);--> statement-breakpoint
CREATE TABLE `manual_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`session_id` text NOT NULL,
	`story_id` text NOT NULL,
	`tipo` text NOT NULL,
	`nivel_antes` real NOT NULL,
	`nivel_despues` real NOT NULL,
	`tiempo_lectura_antes_ms` integer NOT NULL,
	`rewritten_story_id` text,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`story_id`) REFERENCES `generated_stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rewritten_story_id`) REFERENCES `generated_stories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `manual_adj_student_idx` ON `manual_adjustments` (`student_id`);--> statement-breakpoint
CREATE INDEX `manual_adj_session_idx` ON `manual_adjustments` (`session_id`);--> statement-breakpoint
CREATE TABLE `parents` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`nombre` text NOT NULL,
	`idioma` text DEFAULT 'es-ES' NOT NULL,
	`config` text DEFAULT '{}',
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	`actualizado_en` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parents_email_unique` ON `parents` (`email`);--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`ejercicio_id` text NOT NULL,
	`tipo_ejercicio` text NOT NULL,
	`pregunta` text NOT NULL,
	`respuesta` text NOT NULL,
	`respuesta_correcta` text NOT NULL,
	`correcta` integer NOT NULL,
	`tiempo_respuesta_ms` integer,
	`intento_numero` integer DEFAULT 1 NOT NULL,
	`metadata` text DEFAULT '{}',
	`creada_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `responses_session_idx` ON `responses` (`session_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`tipo_actividad` text NOT NULL,
	`modulo` text NOT NULL,
	`duracion_segundos` integer,
	`completada` integer DEFAULT false NOT NULL,
	`estrellas_ganadas` integer DEFAULT 0 NOT NULL,
	`sticker_ganado` text,
	`story_id` text,
	`metadata` text DEFAULT '{}',
	`wpm_promedio` real,
	`wpm_por_pagina` text,
	`total_paginas` integer,
	`iniciada_en` integer DEFAULT (unixepoch()) NOT NULL,
	`finalizada_en` integer,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`story_id`) REFERENCES `generated_stories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `sessions_student_idx` ON `sessions` (`student_id`);--> statement-breakpoint
CREATE INDEX `sessions_fecha_idx` ON `sessions` (`iniciada_en`);--> statement-breakpoint
CREATE TABLE `skill_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`categoria` text NOT NULL,
	`nivel_mastery` real DEFAULT 0 NOT NULL,
	`total_intentos` integer DEFAULT 0 NOT NULL,
	`total_aciertos` integer DEFAULT 0 NOT NULL,
	`dominada` integer DEFAULT false NOT NULL,
	`ultima_practica` integer,
	`proxima_revision` integer,
	`metadata` text DEFAULT '{}',
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	`actualizado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_student_idx` ON `skill_progress` (`student_id`);--> statement-breakpoint
CREATE INDEX `skill_id_idx` ON `skill_progress` (`student_id`,`skill_id`);--> statement-breakpoint
CREATE TABLE `story_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`tipo` text NOT NULL,
	`pregunta` text NOT NULL,
	`opciones` text NOT NULL,
	`respuesta_correcta` integer NOT NULL,
	`explicacion` text NOT NULL,
	`dificultad` integer DEFAULT 3 NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `generated_stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `questions_story_idx` ON `story_questions` (`story_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text NOT NULL,
	`nombre` text NOT NULL,
	`fecha_nacimiento` integer NOT NULL,
	`idioma` text DEFAULT 'es-ES' NOT NULL,
	`dialecto` text DEFAULT 'es-ES' NOT NULL,
	`curso` text,
	`centro_escolar` text,
	`rutina_lectura` text,
	`acompanamiento` text,
	`senales_dificultad` text DEFAULT '{}',
	`intereses` text DEFAULT '[]',
	`temas_evitar` text DEFAULT '[]',
	`personajes_favoritos` text,
	`contexto_personal` text,
	`nivel_lectura` real,
	`comprension_score` real,
	`baseline_confianza` text,
	`baseline_completado` integer DEFAULT false NOT NULL,
	`perfil_completo` integer DEFAULT false NOT NULL,
	`elo_global` real DEFAULT 1000 NOT NULL,
	`elo_literal` real DEFAULT 1000 NOT NULL,
	`elo_inferencia` real DEFAULT 1000 NOT NULL,
	`elo_vocabulario` real DEFAULT 1000 NOT NULL,
	`elo_resumen` real DEFAULT 1000 NOT NULL,
	`elo_rd` real DEFAULT 350 NOT NULL,
	`accesibilidad` text DEFAULT '{}',
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	`actualizado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `parents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`nombre` text NOT NULL,
	`emoji` text NOT NULL,
	`descripcion` text NOT NULL,
	`categoria` text DEFAULT 'general' NOT NULL,
	`edad_minima` integer DEFAULT 5 NOT NULL,
	`edad_maxima` integer DEFAULT 9 NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topics_slug_unique` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `topics_slug_idx` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `topics_activo_idx` ON `topics` (`activo`);--> statement-breakpoint
CREATE INDEX `topics_categoria_idx` ON `topics` (`categoria`);