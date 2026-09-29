import { Link } from 'react-router';
import type { AppPath } from '@micro-shop/contracts';
import { Badge } from '@micro-shop/ui/components/badge';
import { MfeLabel } from '@micro-shop/ui/components/mfe-frame';
import { throwIfBroken } from './fault-injection';
import { useCartState } from './use-cart';
import './cart.css';

// PUBLIC API of the Cart remote (exposed as `cart/CartBadge`). The shell decides
// WHERE it goes (the header); Cart decides WHAT it shows. It shares the page's
// one copy of the cart with the cart page, so it updates the moment you add.

const cartUrl: AppPath = '/cart';

export default function CartBadge() {
  throwIfBroken();
  const state = useCartState();
  const count = state.status === 'ready' ? state.cart.itemCount : null;

  return (
    <Link
      to={cartUrl}
      aria-label={count === null ? 'Cart' : `Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      className="flex h-10 items-center gap-2 rounded-lg border-2 border-dashed border-cyan-600 pr-2 pl-2 text-sm"
    >
      <MfeLabel label="CART" accent="cyan" />
      <span className="font-medium">Cart</span>
      <Badge variant="secondary" className="tabular-nums">
        {count ?? '…'}
      </Badge>
    </Link>
  );
}
