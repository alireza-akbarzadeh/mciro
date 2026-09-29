import { Alert, AlertDescription, AlertTitle } from '@micro-shop/ui/components/alert';
import { Button } from '@micro-shop/ui/components/button';
import { loadCatalog } from './catalog-client';

// Pieces used by both exposed pages (CartApp and Checkout). Private to Cart.

export const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** The catalog API is another team's service: when it's down, Cart degrades instead of crashing. */
export function CatalogUnavailable({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Prices are unavailable right now</AlertTitle>
      <AlertDescription className="gap-3">
        <p>Your cart is saved. The product catalog could not be reached ({message}).</p>
        <Button variant="outline" size="sm" onClick={() => void loadCatalog()}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
