import { Link } from 'react-router';
import type { AppPath } from '@micro-shop/contracts';
import { Badge } from '@micro-shop/ui/components/badge';
import { MfeLabel } from '@micro-shop/ui/components/mfe-frame';
import { itemCount } from './cart-store';
import { throwIfBroken } from './fault-injection';
import { useCart } from './use-cart';
import './cart.css';

// PUBLIC API of the Cart remote (exposed as `cart/CartBadge`). The shell decides
// WHERE it goes (the header); Cart decides WHAT it shows. It reads only the
// cart, never the catalog, so it costs no network request.

const cartUrl: AppPath = '/cart';

export default function CartBadge() {
  throwIfBroken();
  const count = itemCount(useCart());

  return (
    <Link
      to={cartUrl}
      aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      className="flex h-10 items-center gap-2 rounded-lg border-2 border-dashed border-cyan-600 pr-2 pl-2 text-sm"
    >
      <MfeLabel label="CART" accent="cyan" />
      <span className="font-medium">Cart</span>
      <Badge variant="secondary" className="tabular-nums">
        {count}
      </Badge>
    </Link>
  );
}
