import { Alert, AlertDescription, AlertTitle } from '@micro-shop/ui/components/alert';
import { Button } from '@micro-shop/ui/components/button';
import { refreshCart } from './cart-store';

// Pieces used by both exposed pages (CartApp and Checkout). Private to Cart.

export const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** The Cart API itself can't be reached. Cart degrades instead of crashing the remote. */
export function CartUnavailable({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Your cart can’t be loaded right now</AlertTitle>
      <AlertDescription className="gap-3">
        <p>The cart service did not answer ({message}).</p>
        <Button variant="outline" size="sm" onClick={() => void refreshCart()}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/** The API answered, but the catalog behind it didn't: the cart is shown unpriced. */
export function PricesUnavailable() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Prices are unavailable right now</AlertTitle>
      <AlertDescription className="gap-3">
        <p>Your cart is saved. Checkout waits until the product catalog is back.</p>
        <Button variant="outline" size="sm" onClick={() => void refreshCart()}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
