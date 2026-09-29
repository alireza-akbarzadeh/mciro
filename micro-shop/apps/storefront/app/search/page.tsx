import type { Metadata } from 'next';
import Link from 'next/link';
import { MfeFrame } from '@micro-shop/ui/components/mfe-frame';
import { ProductGrid } from '../../components/product-grid';
import { SearchForm } from '../../components/search-form';
import { normalizeQuery, searchProducts } from '../../lib/catalog';

// /search?q=... Public like the rest of the storefront and server-rendered, so
// results are in the HTML and a search is a shareable URL.
//
// Unlike product pages it can't be prerendered: reading `searchParams` makes it
// render on every request.
//
// SEO: result pages are "noindex, follow". Search engines treat internal search
// results as thin, near-duplicate content, but should still follow the links to
// the product pages. They are also absent from the sitemap. robots.txt does NOT
// block /search: a blocked crawler would never see the noindex tag.

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = normalizeQuery((await searchParams).q);
  return {
    title: query ? `Search: ${query}` : 'Search',
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const query = normalizeQuery((await searchParams).q);
  const results = searchProducts(query);

  return (
    <MfeFrame label="STOREFRONT" accent="rose">
      <div className="grid gap-6 p-5">
        <div className="grid gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Search</h1>
          {/* key: a new query must reset this uncontrolled input after client navigation. */}
          <SearchForm
            key={query}
            id="search-page-query"
            label="Search products"
            defaultValue={query}
            className="max-w-lg"
          />
          <p className="text-sm text-muted-foreground" role="status">
            {query
              ? `${results.length} ${results.length === 1 ? 'product matches' : 'products match'} “${query}”.`
              : 'Search by product name, category or feature, for example “desk” or “usb-c”.'}
          </p>
        </div>

        {results.length > 0 && <ProductGrid products={results} />}

        {query && results.length === 0 && (
          <p className="text-sm">
            Try fewer or different words, or{' '}
            <Link href="/" className="font-medium underline underline-offset-4">
              browse all products
            </Link>
            .
          </p>
        )}
      </div>
    </MfeFrame>
  );
}
