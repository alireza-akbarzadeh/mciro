import { Suspense, useState, version as reactVersion, type ReactNode } from 'react';
import { Link, NavLink, Outlet, Route, Routes } from 'react-router';
import type { AppPath } from '@micro-shop/contracts';
import { Alert, AlertDescription } from '@micro-shop/ui/components/alert';
import { buttonVariants } from '@micro-shop/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@micro-shop/ui/components/card';
import { MfeLabel } from '@micro-shop/ui/components/mfe-frame';
import { Skeleton } from '@micro-shop/ui/components/skeleton';
import { EventLog } from './EventLog';
import { loadRemoteModule } from './load-remote';
import { Remote, RemoteBoundary } from './remote';
import { resetSessionApi, useSession } from './use-session';

// Each of these loads crosses an application boundary. At build time the shell
// knows nothing about their code; at runtime the federation runtime fetches them
// from their own servers. <Remote> adds loading, error isolation and retry.
// Module-level functions, so their identity is stable across renders.
const loadOrdersApp = () => loadRemoteModule('orders/OrdersApp');
const loadShippingApp = () => loadRemoteModule('shipping/ShippingApp');
const loadUserMenu = () => loadRemoteModule('auth/UserMenu');
const loadLoginForm = () => loadRemoteModule('auth/LoginForm');

/**
 * TOP-LEVEL routing, owned by the shell. The shell decides which application
 * owns which URL prefix. It does NOT know the routes below the prefix: the
 * trailing `/*` hands everything under /orders to Orders, and so on.
 */
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
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function Layout() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-6 border-b-2 border-blue-600 bg-card px-6 py-3">
        <MfeLabel label="SHELL" accent="blue" />
        {/* "/" belongs to the storefront zone behind the gateway (:8080), so these are
            plain <a> links: a full page load, not client-side routing. On :3000
            directly, "/" is the shell's own overview page. */}
        <a href="/" className="text-lg font-bold">
          Micro Shop
        </a>
        <nav className="flex gap-1" aria-label="Main">
          <a href="/" className={buttonVariants({ variant: 'ghost' })}>
            Store
          </a>
          <NavItem to="/orders">Orders</NavItem>
          <NavItem to="/shipping">Shipping</NavItem>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">React {reactVersion}</span>
          {/* The shell decides WHERE the user menu goes; Auth decides WHAT it shows. */}
          <Remote name="auth" load={loadUserMenu} variant="inline" />
        </div>
      </header>

      <main className="mx-auto my-8 max-w-4xl px-4 pb-80">
        <Outlet />
      </main>

      <EventLog />
    </div>
  );
}

function NavItem({ to, children }: { to: AppPath; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => buttonVariants({ variant: isActive ? 'secondary' : 'ghost' })}
    >
      {children}
    </NavLink>
  );
}

/**
 * Composition policy, owned by the shell: "this view needs a signed-in user".
 * The shell does not know HOW sign-in works; it only asks Auth whether a session
 * exists and, if not, renders Auth's own form in its place.
 *
 * If Auth itself can't be reached, the boundary FAILS CLOSED: the protected
 * remote is not rendered, because nobody can say who the user is.
 */
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
  if (session) return children;

  return (
    <div className="grid justify-items-start gap-6">
      <Alert>
        <AlertDescription className="flex flex-wrap items-center gap-2">
          <MfeLabel label="SHELL" accent="blue" />
          <span>
            This view requires sign-in. The shell decides <em>that</em>; Auth decides{' '}
            <em>who you are</em>.
          </span>
        </AlertDescription>
      </Alert>
      <Remote name="auth" load={loadLoginForm} />
    </div>
  );
}

const deepLinks: { path: AppPath; owner: string; note: string }[] = [
  { path: '/orders', owner: 'Orders', note: 'order list' },
  { path: '/orders/1002', owner: 'Orders', note: 'order details, with "Track shipment"' },
  { path: '/shipping/SHP-2001', owner: 'Shipping', note: 'tracking timeline' },
  { path: '/shipping/order/1002', owner: 'Shipping', note: 'resolves order → shipment' },
  { path: '/shipping/order/1003', owner: 'Shipping', note: 'order with no shipment yet' },
];

const breakLinks = ['/orders?break=orders', '/shipping?break=shipping', '/?break=auth'];

function Home() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Four applications, one page</CardTitle>
        <CardDescription>
          Shell (3000) · Auth (3001) · Orders (3002) · Shipping (3003), each built and served
          separately.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm leading-relaxed">
        <p>
          The shell owns the <strong>first URL segment</strong> and decides which application
          renders it. Everything after the prefix belongs to that application. Every link below is
          a real URL you can reload, bookmark or share:
        </p>
        <ul className="grid gap-2">
          {deepLinks.map((link) => (
            <li key={link.path} className="flex flex-wrap items-baseline gap-2">
              <Link to={link.path} className="font-mono text-primary underline underline-offset-4">
                {link.path}
              </Link>
              <span className="text-muted-foreground">
                {link.owner}: {link.note}
              </span>
            </li>
          ))}
        </ul>
        <p>
          <strong>Break it on purpose.</strong> Stop any app's dev server, or add{' '}
          <code>?break=&lt;app&gt;</code> to make a remote crash while rendering. Only that area
          shows a fallback; everything else keeps working:
        </p>
        <ul className="grid gap-2">
          {breakLinks.map((link) => (
            <li key={link} className="font-mono">
              <Link to={link} className="text-primary underline underline-offset-4">
                {link}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function NotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Not found</CardTitle>
        <CardDescription>No application owns this URL.</CardDescription>
      </CardHeader>
    </Card>
  );
}

function RemoteLoading({ remote }: { remote: string }) {
  return (
    <div role="status" className="grid gap-3 rounded-xl border-2 border-dashed p-6">
      <p className="text-sm text-muted-foreground">
        Loading <code>{remote}</code> remote…
      </p>
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}
