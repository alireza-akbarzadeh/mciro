import Link from 'next/link';
import { Badge } from '@micro-shop/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@micro-shop/ui/components/card';
import { currency, type Product } from '../lib/catalog';

/** Product cards linking to their pages. Used by the home page and search results. */
export function ProductGrid({ products }: { products: readonly Product[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.slug}>
          <Link href={`/products/${product.slug}`} className="block h-full">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <Badge variant="secondary">{product.category}</Badge>
                <CardTitle className="mt-2">{product.name}</CardTitle>
                <CardDescription>{product.summary}</CardDescription>
              </CardHeader>
              <CardContent className="font-semibold tabular-nums">
                {currency.format(product.price)}
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
