import { MfeFrame } from '@micro-shop/ui/components/mfe-frame';
import { CategoryNav } from '../components/category-nav';
import { ProductGrid } from '../components/product-grid';
import { getCategories, getProducts } from '../lib/catalog';

// A Server Component, prerendered from the catalog database, so search engines
// and link previews see the full product list without running JavaScript.
// Regenerated in the background at most every 5 minutes (ISR), so price and
// product changes in the database show up without a rebuild.
export const revalidate = 300;

export default async function HomePage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  return (
    <MfeFrame label="STOREFRONT" accent="rose">
      <div className="grid gap-6 p-5">
        <div className="grid gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Desk gear for people who build things</h1>
          <p className="text-muted-foreground">
            {products.length} products, served from the catalog database and prerendered: view the
            page source, every product is already in the HTML.
          </p>
        </div>

        <CategoryNav categories={categories} />
        <ProductGrid products={products} />
      </div>
    </MfeFrame>
  );
}
