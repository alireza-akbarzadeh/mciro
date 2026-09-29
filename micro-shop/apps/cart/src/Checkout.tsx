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
import { CartApiError } from './cart-store';
import { completeCheckout } from './checkout-service';
import { throwIfBroken } from './fault-injection';
import { CartUnavailable, currency, PricesUnavailable } from './shared';
import { useCartState } from './use-cart';
import './cart.css';

// PUBLIC API of the Cart remote (exposed as `cart/Checkout`). The shell mounts it
// at /checkout behind its sign-in policy, and passes the signed-in customer in
// (CheckoutProps) so the page can say who is ordering. The Cart API checks the
// session itself when the order is placed: the browser's word isn't trusted.

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
          <CheckoutSummary />
        </CardContent>
      </Card>
    </MfeFrame>
  );
}

function CheckoutSummary() {
  const state = useCartState();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === 'loading') {
    return <Skeleton className="h-24 w-full" aria-label="Loading your cart" />;
  }
  if (state.status === 'error') {
    return <CartUnavailable message={state.message} />;
  }

  const { cart } = state;
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

  const hasUnavailable = cart.pricesAvailable && cart.lines.some((line) => line.name === null);

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    try {
      const checkoutId = await completeCheckout();
      // Orders owns the order. It resolves this checkout to the order it created.
      const orderUrl: AppPath = `/orders/checkout/${checkoutId}`;
      navigate(orderUrl);
    } catch (cause) {
      setError(cause instanceof CartApiError ? cause.message : 'Checkout failed, try again.');
      setPlacing(false);
    }
  }

  return (
    <div className="grid gap-4">
      {!cart.pricesAvailable && <PricesUnavailable />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cart.lines.map(({ productSlug, quantity, name, unitPrice }) => (
            <TableRow key={productSlug}>
              <TableCell>{name ?? productSlug}</TableCell>
              <TableCell className="text-right tabular-nums">{quantity}</TableCell>
              <TableCell className="text-right tabular-nums">
                {unitPrice === null ? '—' : currency.format(unitPrice * quantity)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className="text-right tabular-nums">
              {cart.total === null ? '—' : currency.format(cart.total)}
            </TableCell>
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
        <Button
          onClick={() => void placeOrder()}
          disabled={placing || hasUnavailable || !cart.pricesAvailable}
        >
          {placing ? 'Placing order…' : 'Place order'}
        </Button>
      </div>
    </div>
  );
}
