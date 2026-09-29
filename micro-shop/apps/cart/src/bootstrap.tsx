import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router';
import type { Customer } from '@micro-shop/contracts';
import CartApp from './CartApp';
import CartBadge from './CartBadge';
import Checkout from './Checkout';

// Standalone mode. Cart owns the page, so it also owns the router, and mounts
// itself at the SAME paths the shell uses (/cart/*, /checkout). There is no
// shell here to ask Auth who is signed in, so checkout gets a demo customer.
// The cart lives in the Cart API, reached through the dev server's proxy
// (rspack.config.mjs): run `pnpm dev:cart-api` too, and `pnpm dev:storefront`
// for the catalog behind it.

const demoCustomer: Customer = { id: 'u-ada', name: 'Ada Lovelace' };

function ForeignRoute() {
  const { pathname } = useLocation();
  return (
    <div className="grid justify-items-start gap-2 rounded-xl border-2 border-dashed p-6 text-sm">
      <p>
        <code>{pathname}</code> belongs to another application. In the composed app (localhost:8080)
        the shell or the storefront would handle it.
      </p>
      <Link className="underline" to="/cart">
        Back to the cart
      </Link>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('[cart] #root element not found');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <div className="flex items-center gap-4 border-b border-cyan-200 bg-cyan-50 px-6 py-2.5 text-sm">
        <span>
          <strong>Cart: standalone mode</strong> (localhost:3005). No shell and no login here; try{' '}
          <Link className="underline" to="/cart/add?product=standing-desk">
            adding a desk
          </Link>
          .
        </span>
        <span className="ml-auto">
          <CartBadge />
        </span>
      </div>
      <main className="mx-auto my-8 max-w-4xl px-4">
        <Routes>
          <Route index element={<Navigate to="/cart" replace />} />
          <Route path="/cart/*" element={<CartApp />} />
          <Route path="/checkout" element={<Checkout customer={demoCustomer} />} />
          <Route path="*" element={<ForeignRoute />} />
        </Routes>
      </main>
    </BrowserRouter>
  </StrictMode>,
);
