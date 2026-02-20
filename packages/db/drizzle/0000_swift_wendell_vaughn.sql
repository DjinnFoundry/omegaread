CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"logro_id" varchar(100) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"icono" varchar(10),
	"descripcion" text,
	"coleccion" varchar(50),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ganado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "baseline_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"nivel_texto" integer NOT NULL,
	"texto_id" varchar(50) NOT NULL,
	"total_preguntas" integer NOT NULL,
	"aciertos" integer NOT NULL,
	"aciertos_por_tipo" jsonb DEFAULT '{}'::jsonb,
	"tiempo_lectura_ms" integer,
	"respuestas" jsonb DEFAULT '[]'::jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "difficulty_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"session_id" uuid,
	"nivel_anterior" real NOT NULL,
	"nivel_nuevo" real NOT NULL,
	"direccion" varchar(10) NOT NULL,
	"razon" text NOT NULL,
	"evidencia" jsonb DEFAULT '{}'::jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"idioma" varchar(10) DEFAULT 'es-ES' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parents_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"ejercicio_id" varchar(100) NOT NULL,
	"tipo_ejercicio" varchar(50) NOT NULL,
	"pregunta" text NOT NULL,
	"respuesta" text NOT NULL,
	"respuesta_correcta" text NOT NULL,
	"correcta" boolean NOT NULL,
	"tiempo_respuesta_ms" integer,
	"intento_numero" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tipo_actividad" varchar(50) NOT NULL,
	"modulo" varchar(50) NOT NULL,
	"duracion_segundos" integer,
	"completada" boolean DEFAULT false NOT NULL,
	"estrellas_ganadas" integer DEFAULT 0 NOT NULL,
	"sticker_ganado" varchar(10),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"iniciada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"finalizada_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "skill_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"skill_id" varchar(100) NOT NULL,
	"categoria" varchar(50) NOT NULL,
	"nivel_mastery" real DEFAULT 0 NOT NULL,
	"total_intentos" integer DEFAULT 0 NOT NULL,
	"total_aciertos" integer DEFAULT 0 NOT NULL,
	"dominada" boolean DEFAULT false NOT NULL,
	"ultima_practica" timestamp with time zone,
	"proxima_revision" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"fecha_nacimiento" timestamp NOT NULL,
	"idioma" varchar(10) DEFAULT 'es-ES' NOT NULL,
	"dialecto" varchar(10) DEFAULT 'es-ES' NOT NULL,
	"curso" varchar(30),
	"centro_escolar" varchar(200),
	"rutina_lectura" varchar(30),
	"acompanamiento" varchar(20),
	"senales_dificultad" jsonb DEFAULT '{}'::jsonb,
	"intereses" jsonb DEFAULT '[]'::jsonb,
	"temas_evitar" jsonb DEFAULT '[]'::jsonb,
	"personajes_favoritos" text,
	"nivel_lectura" real,
	"comprension_score" real,
	"baseline_confianza" varchar(10),
	"baseline_completado" boolean DEFAULT false NOT NULL,
	"perfil_completo" boolean DEFAULT false NOT NULL,
	"accesibilidad" jsonb DEFAULT '{}'::jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"descripcion" text NOT NULL,
	"edad_minima" integer DEFAULT 5 NOT NULL,
	"edad_maxima" integer DEFAULT 9 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_assessments" ADD CONSTRAINT "baseline_assessments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "difficulty_adjustments" ADD CONSTRAINT "difficulty_adjustments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "difficulty_adjustments" ADD CONSTRAINT "difficulty_adjustments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_progress" ADD CONSTRAINT "skill_progress_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievements_student_idx" ON "achievements" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "baseline_student_idx" ON "baseline_assessments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "difficulty_student_idx" ON "difficulty_adjustments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "difficulty_session_idx" ON "difficulty_adjustments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "responses_session_idx" ON "responses" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_student_idx" ON "sessions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "sessions_fecha_idx" ON "sessions" USING btree ("iniciada_en");--> statement-breakpoint
CREATE INDEX "skill_student_idx" ON "skill_progress" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "skill_id_idx" ON "skill_progress" USING btree ("student_id","skill_id");--> statement-breakpoint
CREATE INDEX "topics_slug_idx" ON "topics" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "topics_activo_idx" ON "topics" USING btree ("activo");