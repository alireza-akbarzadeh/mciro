import { Suspense, useState, version as reactVersion, type ReactNode } from 'react';
import { Link, NavLink, Outlet, Route, Routes } from 'react-router';
import type { AppPath } from '@micro-shop/contracts';
import { Alert, AlertDescription } from '@micro-shop/ui/components/alert';
import { Button, buttonVariants } from '@micro-shop/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@micro-shop/ui/components/card';
import { Input } from '@micro-shop/ui/components/input';
import { MfeLabel } from '@micro-shop/ui/components/mfe-frame';
import { Skeleton } from '@micro-shop/ui/components/skeleton';
import { EventLog } from './EventLog';
import { loadRemoteModule } from './load-remote';
import { Remote, RemoteBoundary } from './remote';
import { resetSessionApi, useSession } from './use-session';
import { Layout } from './layouts/base-layout';

const loadOrdersApp = () => loadRemoteModule('orders/OrdersApp');
const loadShippingApp = () => loadRemoteModule('shipping/ShippingApp');
const loadUserMenu = () => loadRemoteModule('auth/UserMenu');
const loadLoginForm = () => loadRemoteModule('auth/LoginForm');

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
    <div className="mx-auto max-w-md space-y-6">
      <Alert className="border-blue-200 bg-blue-50/50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
        <AlertDescription className="flex items-center gap-3 text-xs leading-relaxed">
          <MfeLabel label="SHELL" accent="blue" />
          <span>
            This view requires sign-in. The shell manages access rights; Auth verifies identity.
          </span>
        </AlertDescription>
      </Alert>
      <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-xl shadow-slate-100 dark:border-slate-800 dark:shadow-none">
        <Remote name="auth" load={loadLoginForm} />
      </div>
    </div>
  );
}

const deepLinks: { path: AppPath; owner: string; note: string }[] = [
  { path: '/orders', owner: 'Orders', note: 'Order history list' },
  { path: '/orders/1002', owner: 'Orders', note: 'Order details with tracking option' },
  { path: '/shipping/SHP-2001', owner: 'Shipping', note: 'Detailed tracking timeline' },
  { path: '/shipping/order/1002', owner: 'Shipping', note: 'Resolves order ID to shipment' },
  { path: '/shipping/order/1003', owner: 'Shipping', note: 'Pending shipment resolution' },
];

const breakLinks = ['/orders?break=orders', '/shipping?break=shipping', '/?break=auth'];

function Home() {
  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800">
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />
        <CardHeader className="space-y-1.5 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Four applications, one seamless interface
            </CardTitle>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              Live Federation
            </span>
          </div>
          <CardDescription className="text-sm">
            Shell (3000) · Auth (3001) · Orders (3002) · Shipping (3003), independently built & orchestrated at runtime.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 text-sm text-slate-600 dark:text-slate-400">
          <p className="leading-relaxed">
            The shell owns routing for top-level URL prefixes. Sub-routes belong to each respective micro-frontend. Every path below represents a deep-linkable entry point:
          </p>

          <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/40">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Deep Links</h4>
            <ul className="grid gap-2.5">
              {deepLinks.map((link) => (
                <li key={link.path} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 border-b border-slate-100 dark:border-slate-800/50 pb-2 last:border-none last:pb-0">
                  <Link
                    to={link.path}
                    className="font-mono font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {link.path}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-semibold text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {link.owner}
                    </span>
                    <span className="text-slate-500">{link.note}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-amber-200/60 bg-amber-50/30 p-4 dark:border-amber-900/30 dark:bg-amber-950/10">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
              Fault Isolation Testing
            </h4>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mb-3">
              Simulate service failures to verify remote error boundaries:
            </p>
            <div className="flex flex-wrap gap-2">
              {breakLinks.map((link) => (
                <Link
                  key={link}
                  to={link}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/50 bg-white px-2.5 py-1 font-mono text-xs text-amber-900 shadow-sm transition-colors hover:bg-amber-100/50 dark:border-amber-800/50 dark:bg-slate-900 dark:text-amber-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
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
    <Card className="mx-auto max-w-md border-slate-200 text-center dark:border-slate-800">
      <CardHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <CardTitle className="text-xl">Page Not Found</CardTitle>
        <CardDescription>No application owns this URL segment.</CardDescription>
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
    <div role="status" className="grid gap-3.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/20">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 animate-ping rounded-full bg-blue-600" />
        <p className="text-xs font-medium text-slate-500">
          Loading <code className="rounded bg-slate-200/60 px-1 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{remote}</code> remote…
        </p>
      </div>
      <Skeleton className="h-6 w-1/3 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-5/6 rounded-lg" />
    </div>
  );
}