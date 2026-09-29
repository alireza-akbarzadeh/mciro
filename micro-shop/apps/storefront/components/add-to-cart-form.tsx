import type { AddToCartEndpoint, AddToCartFields } from '@micro-shop/contracts';
import { Button } from '@micro-shop/ui/components/button';
import { cn } from '@micro-shop/ui/lib/utils';

// "Add to cart", as the Cart team's contract describes it: a plain HTML form
// POST to the Cart API, which answers 303 → /cart. No JavaScript, no shared
// code with the Cart app, and adding is a POST, not a link a crawler could follow.

const endpoint: AddToCartEndpoint = '/api/cart/items';
const productSlugField: keyof AddToCartFields = 'productSlug';

type Props = {
  productSlug: string;
  /**
   * In a list of products, pass the name: every button then has a distinct
   * accessible name ("Add Monitor arm to cart") for screen-reader users.
   */
  productName?: string;
  size?: 'sm' | 'default';
  className?: string;
};

export function AddToCartForm({ productSlug, productName, size = 'default', className }: Props) {
  return (
    <form action={endpoint} method="post" className={cn('contents', className)}>
      <input type="hidden" name={productSlugField} value={productSlug} />
      <Button type="submit" size={size} aria-label={productName ? `Add ${productName} to cart` : undefined}>
        Add to cart
      </Button>
    </form>
  );
}
