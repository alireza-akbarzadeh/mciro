-- IF NOT EXISTS: the migrator creates "catalog" first, for its history table (catalog.__drizzle_migrations).
CREATE SCHEMA IF NOT EXISTS "catalog";
--> statement-breakpoint
CREATE TABLE "catalog"."categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."products" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category_slug" text NOT NULL,
	"price_cents" integer NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_positive" CHECK ("catalog"."products"."price_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "catalog"."products" ADD CONSTRAINT "products_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "catalog"."categories"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_category_slug_idx" ON "catalog"."products" USING btree ("category_slug");