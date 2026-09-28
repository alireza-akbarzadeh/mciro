import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@micro-shop/ui/components/badge';
import { Button } from '@micro-shop/ui/components/button';
import { MfeFrame } from '@micro-shop/ui/components/mfe-frame';
import { currency, findProduct, products, SITE_URL } from '../../../lib/catalog';

// Why this page is in Next.js and not a Module Federation remote: it must be
// readable by search engines and link previews WITHOUT running JavaScript.
// Everything below ends up in the prerendered HTML: the title, the meta
// description, Open Graph tags, a canonical URL and structured data (JSON-LD).

type Props = { params: Promise<{ slug: string }> };

/** Prerender one HTML page per product at build time (static generation). */
export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

/** Only the slugs above exist; anything else is a 404, not an on-demand render. */
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = findProduct(slug);
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
  const { slug } = await params;
  const product = findProduct(slug);
  if (!product) notFound();

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
      <article className="grid gap-5 p-5">
        <script
          type="application/ld+json"
          // Escape "<" so product text can never close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          ← All products
        </Link>
        <div className="grid gap-2">
          <Badge variant="secondary">{product.category}</Badge>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-2xl font-semibold tabular-nums">{currency.format(product.price)}</p>
        </div>
        <p className="max-w-prose leading-relaxed text-muted-foreground">{product.description}</p>
        <div className="flex flex-wrap items-center gap-3">
          {/* Checkout is out of scope for this demo. The link crosses into the shell's zone. */}
          <Button asChild>
            <a href="/orders">Go to your orders</a>
          </Button>
          <span className="text-xs text-muted-foreground">
            Opens the signed-in app (Module Federation shell) with a full page load.
          </span>
        </div>
      </article>
    </MfeFrame>
  );
}
