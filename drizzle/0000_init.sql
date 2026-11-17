CREATE TYPE "public"."check_status" AS ENUM('aman', 'menipis', 'habis');--> statement-breakpoint
CREATE TYPE "public"."menu_kind" AS ENUM('minuman', 'makanan', 'topping');--> statement-breakpoint
CREATE TYPE "public"."movement_reason" AS ENUM('jual', 'batal', 'belanja', 'koreksi');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('tunai', 'qris');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'staff');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('lunas', 'batal');--> statement-breakpoint
CREATE TYPE "public"."tracking" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group" text NOT NULL,
	"unit" text NOT NULL,
	"tracking" "tracking" DEFAULT 'auto' NOT NULL,
	"stock" numeric(12, 2) DEFAULT 0 NOT NULL,
	"low_threshold" numeric(12, 2) DEFAULT 0 NOT NULL,
	"pack_size" numeric(12, 2) DEFAULT 1 NOT NULL,
	"pack_label" text DEFAULT 'kemasan' NOT NULL,
	"check_status" "check_status",
	"checked_at" timestamp with time zone,
	"checked_by" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ingredients_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"kind" "menu_kind" NOT NULL,
	"price" integer NOT NULL,
	"hpp" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"qty" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"parent_id" integer,
	"menu_item_id" integer,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"kind" "menu_kind" NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"unit_hpp" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"business_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"total" integer NOT NULL,
	"hpp_total" integer NOT NULL,
	"cash_received" integer,
	"change" integer,
	"status" "sale_status" DEFAULT 'lunas' NOT NULL,
	"void_reason" text,
	"voided_at" timestamp with time zone,
	"voided_by" integer
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"business_name" text DEFAULT 'Kios Poci' NOT NULL,
	"rent_monthly" integer DEFAULT 666667 NOT NULL,
	"electricity_monthly" integer DEFAULT 200000 NOT NULL,
	"security_monthly" integer DEFAULT 50000 NOT NULL,
	"other_monthly" integer DEFAULT 0 NOT NULL,
	"initial_capital" integer DEFAULT 5280680 NOT NULL,
	"start_date" date,
	"target_drinks" integer DEFAULT 7 NOT NULL,
	"target_food" integer DEFAULT 5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"opened_by" integer NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_date" date NOT NULL,
	"opening_cash" integer NOT NULL,
	"closed_by" integer,
	"closed_at" timestamp with time zone,
	"expected_cash" integer,
	"counted_cash" integer,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"status" "check_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"ingredient_id" integer NOT NULL,
	"change" numeric(12, 2) NOT NULL,
	"stock_after" numeric(12, 2) NOT NULL,
	"reason" "movement_reason" NOT NULL,
	"sale_id" integer,
	"user_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" "role" DEFAULT 'staff' NOT NULL,
	"pin_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_parent_id_sale_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sale_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_checks" ADD CONSTRAINT "stock_checks_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_checks" ADD CONSTRAINT "stock_checks_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_menu_ingredient" ON "recipe_items" USING btree ("menu_item_id","ingredient_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sales_business_date" ON "sales" USING btree ("business_date");--> statement-breakpoint
CREATE INDEX "sales_shift" ON "sales" USING btree ("shift_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_shift" ON "shifts" USING btree ((1)) WHERE "shifts"."closed_at" is null;--> statement-breakpoint
CREATE INDEX "stock_movements_ingredient" ON "stock_movements" USING btree ("ingredient_id");