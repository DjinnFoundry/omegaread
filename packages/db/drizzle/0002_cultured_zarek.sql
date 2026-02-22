CREATE TABLE "elo_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"elo_global" real NOT NULL,
	"elo_literal" real NOT NULL,
	"elo_inferencia" real NOT NULL,
	"elo_vocabulario" real NOT NULL,
	"elo_resumen" real NOT NULL,
	"wpm_promedio" real,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"nivel_antes" real NOT NULL,
	"nivel_despues" real NOT NULL,
	"tiempo_lectura_antes_ms" integer NOT NULL,
	"rewritten_story_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "slug" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "nombre" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "wpm_promedio" real;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "wpm_por_pagina" jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "total_paginas" integer;--> statement-breakpoint
ALTER TABLE "story_questions" ADD COLUMN "dificultad" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "contexto_personal" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "elo_global" real DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "elo_literal" real DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "elo_inferencia" real DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "elo_vocabulario" real DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "elo_resumen" real DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "categoria" varchar(50) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "elo_snapshots" ADD CONSTRAINT "elo_snapshots_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_snapshots" ADD CONSTRAINT "elo_snapshots_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_adjustments" ADD CONSTRAINT "manual_adjustments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_adjustments" ADD CONSTRAINT "manual_adjustments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_adjustments" ADD CONSTRAINT "manual_adjustments_story_id_generated_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."generated_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_adjustments" ADD CONSTRAINT "manual_adjustments_rewritten_story_id_generated_stories_id_fk" FOREIGN KEY ("rewritten_story_id") REFERENCES "public"."generated_stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "elo_snapshots_student_idx" ON "elo_snapshots" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "elo_snapshots_created_idx" ON "elo_snapshots" USING btree ("creado_en");--> statement-breakpoint
CREATE INDEX "manual_adj_student_idx" ON "manual_adjustments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "manual_adj_session_idx" ON "manual_adjustments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "topics_categoria_idx" ON "topics" USING btree ("categoria");