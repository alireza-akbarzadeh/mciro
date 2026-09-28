import { lazy, Suspense, version as reactVersion, type ReactNode } from 'react';
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
import { useSession } from './use-session';

// Each of these imports crosses an application boundary. At build time the shell
// knows nothing about their code; at runtime the federation runtime fetches them
// from their own servers. React.lazy turns that network round-trip into Suspense.
const OrdersApp = lazy(() => import('orders/OrdersApp'));
const ShippingApp = lazy(() => import('shipping/ShippingApp'));
const UserMenu = lazy(() => import('auth/UserMenu'));
const LoginForm = lazy(() => import('auth/LoginForm'));

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
            <ProtectedRemote remote="orders">
              <OrdersApp />
            </ProtectedRemote>
          }
        />
        <Route
          path="shipping/*"
          element={
            <ProtectedRemote remote="shipping">
              <ShippingApp />
            </ProtectedRemote>
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
        <Link to="/" className="text-lg font-bold">
          Micro Shop
        </Link>
        <nav className="flex gap-1" aria-label="Main">
          <NavItem to="/" end>
            Home
          </NavItem>
          <NavItem to="/orders">Orders</NavItem>
          <NavItem to="/shipping">Shipping</NavItem>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">React {reactVersion}</span>
          {/* The shell decides WHERE the user menu goes; Auth decides WHAT it shows. */}
          <Suspense fallback={<Skeleton className="h-10 w-40" aria-label="Loading user" />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto my-8 max-w-4xl px-4">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, end, children }: { to: AppPath; end?: boolean; children: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => buttonVariants({ variant: isActive ? 'secondary' : 'ghost' })}
    >
      {children}
    </NavLink>
  );
}

/**
 * Loading → session check → remote. Two Suspense boundaries so the user sees
 * WHICH remote is being fetched.
 */
function ProtectedRemote({ remote, children }: { remote: string; children: ReactNode }) {
  return (
    <Suspense fallback={<RemoteLoading remote="auth" />}>
      <RequireSession>
        <Suspense fallback={<RemoteLoading remote={remote} />}>{children}</Suspense>
      </RequireSession>
    </Suspense>
  );
}

/**
 * Composition policy, owned by the shell: "this view needs a signed-in user".
 * The shell does not know HOW sign-in works; it only asks Auth whether a session
 * exists and, if not, renders Auth's own form in its place.
 */
function RequireSession({ children }: { children: ReactNode }) {
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
      <LoginForm />
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
