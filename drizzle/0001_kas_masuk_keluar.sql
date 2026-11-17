CREATE TYPE "public"."cash_type" AS ENUM('masuk', 'keluar');--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"business_date" date NOT NULL,
	"type" "cash_type" NOT NULL,
	"amount" integer NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_movements_shift" ON "cash_movements" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "cash_movements_date" ON "cash_movements" USING btree ("business_date");--> statement-breakpoint
-- Teh celup & gula tidak dihitung angkanya lagi, cukup dicek manual (Masih banyak / Setengah / Habis).
UPDATE "ingredients" SET "tracking" = 'manual', "group" = 'Cek manual', "check_status" = COALESCE("check_status", 'aman') WHERE "name" IN ('Teh celup Poci', 'Gula pasir');
