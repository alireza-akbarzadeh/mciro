import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { AppPath, CheckoutProps } from '@micro-shop/contracts';
import { Alert, AlertDescription } from '@micro-shop/ui/components/alert';
import { Button } from '@micro-shop/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@micro-shop/ui/components/card';
import { MfeFrame } from '@micro-shop/ui/components/mfe-frame';
import { Skeleton } from '@micro-shop/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@micro-shop/ui/components/table';
import { useCatalog } from './catalog-client';
import { CheckoutError, completeCheckout, priceCart } from './checkout-service';
import { throwIfBroken } from './fault-injection';
import { CatalogUnavailable, currency } from './shared';
import { useCart } from './use-cart';
import './cart.css';

// PUBLIC API of the Cart remote (exposed as `cart/Checkout`). The shell mounts it
// at /checkout behind its sign-in policy, and passes the signed-in customer in
// (CheckoutProps). Cart never talks to Auth itself.

const cartUrl: AppPath = '/cart';

export default function Checkout({ customer }: CheckoutProps) {
  throwIfBroken();
  return (
    <MfeFrame label="CART" accent="cyan" aria-labelledby="checkout-title">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle id="checkout-title" className="text-xl">
            Checkout
          </CardTitle>
          <CardDescription>
            Ordering as <strong>{customer.name}</strong>. No payment in this demo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckoutSummary customer={customer} />
        </CardContent>
      </Card>
    </MfeFrame>
  );
}

function CheckoutSummary({ customer }: CheckoutProps) {
  const cart = useCart();
  const catalog = useCatalog();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (cart.lines.length === 0) {
    return (
      <div className="grid justify-items-start gap-3">
        <p className="text-sm">Your cart is empty, so there is nothing to check out.</p>
        <Button asChild variant="outline" size="sm">
          <a href="/">Browse products</a>
        </Button>
      </div>
    );
  }

  if (catalog.status === 'loading') {
    return <Skeleton className="h-24 w-full" aria-label="Loading prices" />;
  }
  if (catalog.status === 'error') {
    return <CatalogUnavailable message={catalog.message} />;
  }

  const { lines, total, hasUnavailable } = priceCart(cart, catalog.products);

  function placeOrder() {
    if (catalog.status !== 'ready') return;
    try {
      const checkoutId = completeCheckout(customer, cart, catalog.products);
      // Orders owns the order. It resolves this checkout to the order it created.
      const orderUrl: AppPath = `/orders/checkout/${checkoutId}`;
      navigate(orderUrl);
    } catch (cause) {
      setError(cause instanceof CheckoutError ? cause.message : 'Checkout failed, try again.');
    }
  }

  return (
    <div className="grid gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map(({ productSlug, quantity, product }) => (
            <TableRow key={productSlug}>
              <TableCell>{product?.name ?? `${productSlug} (no longer available)`}</TableCell>
              <TableCell className="text-right tabular-nums">{quantity}</TableCell>
              <TableCell className="text-right tabular-nums">
                {product ? currency.format(product.price * quantity) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className="text-right tabular-nums">{currency.format(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {(error ?? hasUnavailable) && (
        <Alert variant="destructive">
          <AlertDescription>
            {error ?? 'Some products are no longer available. Remove them from your cart first.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={cartUrl}>Back to cart</Link>
        </Button>
        <Button onClick={placeOrder} disabled={hasUnavailable}>
          Place order
        </Button>
      </div>
    </div>
  );
}
