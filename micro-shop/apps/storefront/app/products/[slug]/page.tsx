import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@micro-shop/ui/components/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@micro-shop/ui/components/breadcrumb';
import { MfeFrame } from '@micro-shop/ui/components/mfe-frame';
import { AddToCartForm } from '../../../components/add-to-cart-form';
import { ProductGrid } from '../../../components/product-grid';
import { currency, findProduct, getProducts, getProductsInCategory, SITE_URL } from '../../../lib/catalog';

// Why this page is in Next.js and not a Module Federation remote: it must be
// readable by search engines and link previews WITHOUT running JavaScript.
// Everything below ends up in the prerendered HTML: the title, the meta
// description, Open Graph tags, a canonical URL and structured data (JSON-LD).

type Props = { params: Promise<{ slug: string }> };

/** Every product in the catalog database is prerendered at build time... */
export async function generateStaticParams() {
  return (await getProducts()).map((product) => ({ slug: product.slug }));
}

/**
 * ...and regenerated in the background at most every 5 minutes, so price
 * changes appear without a rebuild. Products added later render on first
 * request (dynamicParams defaults to true); unknown slugs are a 404.
 */
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await findProduct((await params).slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.summary,
      url: `/products/${product.slug}`,
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await findProduct((await params).slug);
  if (!product) notFound();
  const related = (await getProductsInCategory(product.categorySlug))
    .filter((other) => other.slug !== product.slug)
    .slice(0, 3);

  // schema.org Product: lets search engines show price and availability.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    category: product.category,
    url: `${SITE_URL}/products/${product.slug}`,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <MfeFrame label="STOREFRONT" accent="rose">
      <div className="grid gap-10 p-5">
        <article className="grid gap-5">
          <script
            type="application/ld+json"
            // Escape "<" so product text can never close the script tag.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">All products</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/categories/${product.categorySlug}`}>{product.category}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="grid gap-2">
            <Badge variant="secondary">{product.category}</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-2xl font-semibold tabular-nums">{currency.format(product.price)}</p>
          </div>
          <p className="max-w-prose leading-relaxed text-muted-foreground">{product.description}</p>
          {/* The cart belongs to the Cart team: see AddToCartForm. */}
          <div className="flex flex-wrap items-center gap-3">
            <AddToCartForm productSlug={product.slug} />
            <span className="text-xs text-muted-foreground">
              Opens your cart (Cart app, in the Module Federation shell) with a full page load.
            </span>
          </div>
        </article>

        {related.length > 0 && (
          <section aria-labelledby="related-title" className="grid gap-4">
            <h2 id="related-title" className="text-lg font-semibold">
              More in {product.category}
            </h2>
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </MfeFrame>
  );
}
