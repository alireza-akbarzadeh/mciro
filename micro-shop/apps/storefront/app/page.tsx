import Link from 'next/link';
import { Badge } from '@micro-shop/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@micro-shop/ui/components/card';
import { MfeFrame } from '@micro-shop/ui/components/mfe-frame';
import { currency, products } from '../lib/catalog';

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
      </div>
    </MfeFrame>
  );
}
