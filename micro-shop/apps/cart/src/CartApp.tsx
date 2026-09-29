import { useEffect, version as reactVersion } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router';
import type { CartLineView } from '@micro-shop/cart-api/api-types';
import type { AppPath } from '@micro-shop/contracts';
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
import { addItem, MAX_QUANTITY, removeItem, setQuantity } from './cart-store';
import { throwIfBroken } from './fault-injection';
import { CartUnavailable, currency, PricesUnavailable } from './shared';
import { useCartState } from './use-cart';
import './cart.css';

// PUBLIC API of the Cart remote (exposed as `cart/CartApp`). The shell mounts it
// at /cart/* for everyone, signed in or not: guests can fill a cart, and sign in
// only at checkout. Paths here are RELATIVE, so it also works standalone.

const checkoutUrl: AppPath = '/checkout';
const cartUrl: AppPath = '/cart';

export default function CartApp() {
  throwIfBroken();
  return (
    <MfeFrame label="CART" accent="cyan" aria-labelledby="cart-title">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle id="cart-title" className="text-xl">
            Cart
          </CardTitle>
          <CardDescription>
            Rendered by the Cart build <strong>v{__APP_VERSION__}</strong> · React {reactVersion} ·
            kept by the Cart API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Routes>
            <Route index element={<CartPage />} />
            <Route path="add" element={<AddToCart />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CardContent>
      </Card>
    </MfeFrame>
  );
}

// Each visit to /cart/add is handled once, although React StrictMode runs effects
// twice in development. Keyed by the history entry, not the product, so adding
// the same product again later still works.
const handledVisits = new Set<string>();

/**
 * /cart/add?product=<slug>: a link-shaped entry point, kept for other apps that
 * can only link (the URL contract promises it). The storefront POSTs a form to
 * the Cart API instead. Adds one item, then replaces itself with /cart, so Back
 * and reload never add the item twice.
 */
function AddToCart() {
  const { key } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const productSlug = params.get('product') ?? '';

  useEffect(() => {
    if (handledVisits.has(key)) return;
    handledVisits.add(key);
    void addItem(productSlug).then(() => navigate(cartUrl, { replace: true }));
  }, [key, productSlug, navigate]);

  return (
    <p role="status" className="text-sm text-muted-foreground">
      Adding to your cart…
    </p>
  );
}

function CartPage() {
  const state = useCartState();

  if (state.status === 'loading') {
    return (
      <div role="status" aria-label="Loading your cart" className="grid gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  if (state.status === 'error') {
    return <CartUnavailable message={state.message} />;
  }

  const { cart, error } = state;
  const hasUnavailable = cart.pricesAvailable && cart.lines.some((line) => line.name === null);

  return (
    <div className="grid gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>That change didn’t go through: {error}</AlertDescription>
        </Alert>
      )}

      {cart.lines.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-sm">Your cart is empty.</p>
          <BrowseProducts />
        </div>
      ) : (
        <>
          {!cart.pricesAvailable && <PricesUnavailable />}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.lines.map((line) => (
                <CartRow key={line.productSlug} line={line} pricesAvailable={cart.pricesAvailable} />
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right tabular-nums" data-testid="cart-total">
                  {cart.total === null ? '—' : currency.format(cart.total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>

          {hasUnavailable && (
            <p className="text-sm text-destructive">
              Some products are no longer available. Remove them to check out.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <BrowseProducts label="Continue shopping" />
            {hasUnavailable || !cart.pricesAvailable ? (
              <Button disabled>Checkout</Button>
            ) : (
              <Button asChild>
                <Link to={checkoutUrl}>Checkout</Link>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CartRow({ line, pricesAvailable }: { line: CartLineView; pricesAvailable: boolean }) {
  const { productSlug, quantity, name, unitPrice } = line;
  const label = name ?? productSlug;

  return (
    <TableRow>
      <TableCell>
        {name ? (
          // A link INTO the storefront's zone: plain <a>, full page load.
          <a href={`/products/${productSlug}`} className="font-medium underline-offset-4 hover:underline">
            {name}
          </a>
        ) : (
          <span className="text-muted-foreground">
            {productSlug}
            {pricesAvailable && ' (no longer available)'}
          </span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-xs"
            aria-label={`Decrease quantity of ${label}`}
            onClick={() => void setQuantity(productSlug, quantity - 1)}
          >
            −
          </Button>
          <span className="w-6 text-center tabular-nums" aria-label={`Quantity of ${label}`}>
            {quantity}
          </span>
          <Button
            variant="outline"
            size="icon-xs"
            aria-label={`Increase quantity of ${label}`}
            disabled={quantity >= MAX_QUANTITY}
            onClick={() => void setQuantity(productSlug, quantity + 1)}
          >
            +
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {unitPrice === null ? '—' : currency.format(unitPrice * quantity)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => void removeItem(productSlug)}
          aria-label={`Remove ${label}`}
        >
          Remove
        </Button>
      </TableCell>
    </TableRow>
  );
}

/** The catalog belongs to the storefront zone: a plain link, full page load. */
function BrowseProducts({ label = 'Browse products' }: { label?: string }) {
  const storeUrl: AppPath = '/';
  return (
    <Button asChild variant="outline" size="sm">
      <a href={storeUrl}>{label}</a>
    </Button>
  );
}

function NotFound() {
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-sm">Cart has no such page.</p>
      <Button asChild variant="outline" size="sm">
        <Link to={cartUrl}>Your cart</Link>
      </Button>
    </div>
  );
}
