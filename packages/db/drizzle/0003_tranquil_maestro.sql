ALTER TABLE "elo_snapshots" ADD COLUMN "rd_global" real DEFAULT 350 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "elo_rd" real DEFAULT 350 NOT NULL;