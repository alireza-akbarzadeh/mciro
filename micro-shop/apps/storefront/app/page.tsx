import { MfeFrame } from '@micro-shop/ui/components/mfe-frame';
import { ProductGrid } from '../components/product-grid';
import { products } from '../lib/catalog';

// A Server Component: rendered to HTML ahead of time (static), so search
// engines and link previews see the full product list without running JS.

export default function HomePage() {
  return (
    <MfeFrame label="STOREFRONT" accent="rose">
      <div className="grid gap-6 p-5">
        <div className="grid gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Desk gear for people who build things</h1>
          <p className="text-muted-foreground">
            This page is public and server-rendered. View the page source: every product is already
            in the HTML.
          </p>
        </div>

        <ProductGrid products={products} />
      </div>
    </MfeFrame>
  );
}
