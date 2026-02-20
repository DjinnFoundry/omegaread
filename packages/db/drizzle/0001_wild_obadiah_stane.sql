CREATE TABLE "generated_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"topic_slug" varchar(50) NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"contenido" text NOT NULL,
	"nivel" real NOT NULL,
	"metadata" jsonb NOT NULL,
	"modelo_generacion" varchar(50) NOT NULL,
	"prompt_version" varchar(20) DEFAULT 'v1' NOT NULL,
	"aprobada_qa" boolean DEFAULT false NOT NULL,
	"motivo_rechazo" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"pregunta" text NOT NULL,
	"opciones" jsonb NOT NULL,
	"respuesta_correcta" integer NOT NULL,
	"explicacion" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "story_id" uuid;--> statement-breakpoint
ALTER TABLE "generated_stories" ADD CONSTRAINT "generated_stories_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_questions" ADD CONSTRAINT "story_questions_story_id_generated_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."generated_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stories_student_idx" ON "generated_stories" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "stories_topic_idx" ON "generated_stories" USING btree ("topic_slug");--> statement-breakpoint
CREATE INDEX "questions_story_idx" ON "story_questions" USING btree ("story_id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_story_id_generated_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."generated_stories"("id") ON DELETE set null ON UPDATE no action;