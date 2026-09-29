import { Suspense, useState, type ReactNode } from 'react';
import { Link, Route, Routes } from 'react-router';
import type { AppPath } from '@micro-shop/contracts';
import { Button } from '@micro-shop/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@micro-shop/ui/components/card';
import { Skeleton } from '@micro-shop/ui/components/skeleton';
import { loadRemoteModule } from './load-remote';
import { Remote, RemoteBoundary } from './remote';
import { resetSessionApi, useSession } from './use-session';
import { Layout } from './layouts/base-layout';

const loadOrdersApp = () => loadRemoteModule('orders/OrdersApp');
const loadShippingApp = () => loadRemoteModule('shipping/ShippingApp');
const loadUserMenu = () => loadRemoteModule('auth/UserMenu');
const loadLoginForm = () => loadRemoteModule('auth/LoginForm');
const loadCartApp = () => loadRemoteModule('cart/CartApp');
const loadCheckout = () => loadRemoteModule('cart/Checkout');

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route
          path="orders/*"
          element={
            <RequireSession>
              <Remote name="orders" load={loadOrdersApp} />
            </RequireSession>
          }
        />

        <Route
          path="shipping/*"
          element={
            <RequireSession>
              <Remote name="shipping" load={loadShippingApp} />
            </RequireSession>
          }
        />

        {/* Guests may fill a cart; the shell asks for sign-in only at checkout. */}
        <Route
          path="cart/*"
          element={<Remote name="cart" load={loadCartApp} />}
        />

        <Route
          path="checkout"
          element={
            <RequireSession>
              <CheckoutForCustomer />
            </RequireSession>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function RequireSession({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);

  return (
    <RemoteBoundary
      key={attempt}
      name="auth"
      variant="page"
      onRetry={() => {
        resetSessionApi();
        setAttempt((value) => value + 1);
      }}
    >
      <Suspense fallback={<RemoteLoading remote="auth" />}>
        <SessionGate>{children}</SessionGate>
      </Suspense>
    </RemoteBoundary>
  );
}

function SessionGate({ children }: { children: ReactNode }) {
  const session = useSession();

  if (session) {
    return children;
  }

  // Auth's form lays itself out by the space it gets: form only in a narrow
  // column, form + brand panel from 48rem. The shell just gives it room.
  return (
    <div className="mx-auto w-full max-w-4xl py-4 sm:py-8">
      <Remote name="auth" load={loadLoginForm} />
    </div>
  );
}

/**
 * Composition: the shell is the only app that talks to Auth, so it hands
 * Cart's checkout the signed-in customer (CheckoutProps).
 *
 * Only id and name cross over; the email and the token stay with Auth.
 */
function CheckoutForCustomer() {
  const session = useSession();

  if (!session) {
    return null;
  }

  const { id, name } = session.user;

  return (
    <Remote
      name="cart"
      load={loadCheckout}
      props={{
        customer: {
          id,
          name,
        },
      }}
    />
  );
}

const deepLinks: {
  path: AppPath;
  owner: string;
  note: string;
}[] = [
  {
    path: '/orders',
    owner: 'Orders',
    note: 'Order history list',
  },
  {
    path: '/orders/1002',
    owner: 'Orders',
    note: 'Order details with tracking option',
  },
  {
    path: '/shipping/SHP-2001',
    owner: 'Shipping',
    note: 'Detailed tracking timeline',
  },
  {
    path: '/shipping/order/1002',
    owner: 'Shipping',
    note: 'Resolves order ID to shipment',
  },
  {
    path: '/shipping/order/1003',
    owner: 'Shipping',
    note: 'Pending shipment resolution',
  },
  {
    path: '/cart',
    owner: 'Cart',
    note: 'Your cart, open to guests',
  },
  {
    path: '/cart/add?product=standing-desk',
    owner: 'Cart',
    note: 'Adds a product, then shows the cart',
  },
  {
    path: '/checkout',
    owner: 'Cart',
    note: 'Checkout, behind sign-in',
  },
];

const breakLinks = [
  '/orders?break=orders',
  '/shipping?break=shipping',
  '/?break=auth',
];

function Home() {
  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />

        <CardHeader className="space-y-1.5 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Microfrontend Workspace
              </CardTitle>

              <CardDescription className="mt-2">
                Five independently built applications composed at runtime.
              </CardDescription>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live Federation
            </span>
          </div>

          <p className="pt-2 text-xs text-muted-foreground">
            Shell (3000) · Auth (3001) · Orders (3002) · Shipping (3003) ·
            Cart (3005)
          </p>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Runtime composition
            </h3>

            <p className="text-sm leading-6 text-muted-foreground">
              The shell owns top-level routing while each microfrontend owns
              its respective application area. Every path below represents a
              deep-linkable entry point.
            </p>
          </div>

          {/* Deep Links */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Deep Links
              </h4>
            </div>

            <ul className="grid gap-2">
              {deepLinks.map((link) => (
                <li
                  key={link.path}
                  className="flex flex-col gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    to={link.path}
                    className="w-fit font-mono text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {link.path}
                  </Link>

                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {link.owner}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {link.note}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Fault Isolation */}
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
            <div className="mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Fault Isolation Testing
              </h4>

              <p className="mt-1 text-xs leading-5 text-amber-700/80 dark:text-amber-300/80">
                Simulate service failures to verify remote error boundaries.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {breakLinks.map((link) => (
                <Link
                  key={link}
                  to={link}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/60 bg-background px-2.5 py-1.5 font-mono text-[11px] text-amber-900 shadow-sm transition-colors hover:bg-amber-100/60 dark:border-amber-800/60 dark:text-amber-300 dark:hover:bg-amber-950/30"
                >
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {link}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotFound() {
  return (
    <Card className="mx-auto max-w-md border-border/60 text-center shadow-sm">
      <CardHeader>
        <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <svg
            className="size-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <CardTitle className="text-xl">
          Page Not Found
        </CardTitle>

        <CardDescription>
          No application owns this URL segment.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link to="/">Back to Home</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function RemoteLoading({ remote }: { remote: string }) {
  return (
    <div
      role="status"
      aria-label={`Loading ${remote}`}
      className="grid gap-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-8 place-items-center rounded-lg bg-muted">
          <div className="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
        </div>

        <div className="grid gap-1">
          <p className="text-sm font-medium">Loading</p>

          <p className="text-xs text-muted-foreground">
            Connecting to {remote}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Skeleton className="h-4 w-2/5 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </div>
    </div>
  );
}