-- IF NOT EXISTS: the migrator creates "cart" first, for its history table (cart.__drizzle_migrations).
CREATE SCHEMA IF NOT EXISTS "cart";
--> statement-breakpoint
CREATE TABLE "cart"."cart_lines" (
	"cart_id" uuid NOT NULL,
	"product_slug" text NOT NULL,
	"quantity" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_lines_cart_id_product_slug_pk" PRIMARY KEY("cart_id","product_slug"),
	CONSTRAINT "cart_lines_quantity_range" CHECK ("cart"."cart_lines"."quantity" BETWEEN 1 AND 10),
	CONSTRAINT "cart_lines_product_slug_format" CHECK ("cart"."cart_lines"."product_slug" ~ '^[a-z0-9-]{1,100}$')
);
--> statement-breakpoint
CREATE TABLE "cart"."carts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart"."cart_lines" ADD CONSTRAINT "cart_lines_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "cart"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "carts_updated_at_idx" ON "cart"."carts" USING btree ("updated_at");