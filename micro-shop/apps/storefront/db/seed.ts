import { createDatabasePool, logRetry, waitForDatabase } from '@micro-shop/service-kit';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { seedCategories, seedProducts } from '../lib/catalog-data.ts';
import { categories, products } from './schema.ts';

// `pnpm db:seed`: writes the seed catalog (lib/catalog-data.ts) to DATABASE_URL.
// Creates missing rows and updates existing ones, so it's safe to run again, and
// re-running it after editing catalog-data.ts updates names and prices.

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (see apps/storefront/.env.example)');

const pool = createDatabasePool(url, { max: 1 });
const db = drizzle(pool);

try {
  await waitForDatabase(pool, { onRetry: logRetry('storefront seed') });
  await db.transaction(async (tx) => {
    await tx
      .insert(categories)
      .values([...seedCategories])
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: sql`excluded.name`, description: sql`excluded.description` },
      });

    await tx
      .insert(products)
      .values(
        seedProducts.map(({ price, ...product }) => ({ ...product, priceCents: Math.round(price * 100) })),
      )
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: sql`excluded.name`,
          categorySlug: sql`excluded.category_slug`,
          priceCents: sql`excluded.price_cents`,
          summary: sql`excluded.summary`,
          description: sql`excluded.description`,
        },
      });
  });
  console.log(`[storefront] seeded ${seedCategories.length} categories and ${seedProducts.length} products`);
} finally {
  await pool.end();
}
