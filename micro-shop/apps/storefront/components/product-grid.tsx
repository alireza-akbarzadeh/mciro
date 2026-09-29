import Link from 'next/link';
import { Badge } from '@micro-shop/ui/components/badge';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@micro-shop/ui/components/card';
import { currency, type Product } from '../lib/catalog';
import { AddToCartForm } from './add-to-cart-form';

/**
 * Product cards: the name links to the product page, and every card can add to
 * the cart directly. Used by the home page, category pages and search results.
 */
export function ProductGrid({ products }: { products: readonly Product[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.slug}>
          <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
            <CardHeader className="flex-1">
              <Link
                href={`/categories/${product.categorySlug}`}
                className="w-fit"
                aria-label={`More in ${product.category}`}
              >
                <Badge variant="secondary">{product.category}</Badge>
              </Link>
              <CardTitle className="mt-2">
                <Link href={`/products/${product.slug}`} className="underline-offset-4 hover:underline">
                  {product.name}
                </Link>
              </CardTitle>
              <CardDescription>{product.summary}</CardDescription>
            </CardHeader>
            <CardFooter className="flex items-center justify-between gap-3">
              <span className="font-semibold tabular-nums">{currency.format(product.price)}</span>
              <AddToCartForm productSlug={product.slug} productName={product.name} size="sm" />
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
}
