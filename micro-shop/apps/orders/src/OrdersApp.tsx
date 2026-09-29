import { useEffect, useRef, useSyncExternalStore, version as reactVersion } from 'react';
import { Link, Route, Routes, useParams } from 'react-router';
import type { AppPath } from '@micro-shop/contracts';
import type { OrderStatus, OrderView } from '@micro-shop/orders-api/api-types';
import { Alert, AlertDescription } from '@micro-shop/ui/components/alert';
import { Badge } from '@micro-shop/ui/components/badge';
import { Button } from '@micro-shop/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@micro-shop/ui/components/card';
import { MfeFrame } from '@micro-shop/ui/components/mfe-frame';
import { Skeleton } from '@micro-shop/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@micro-shop/ui/components/table';
import { cn } from '@micro-shop/ui/lib/utils';
import { throwIfBroken } from './fault-injection';
import {
  ensureOrdersLoaded,
  findOrder,
  getSnapshot,
  refreshOrders,
  subscribeToOrders,
} from './orders-store';
import './orders.css';

function useOrders() {
  const snapshot = useSyncExternalStore(subscribeToOrders, getSnapshot);
  useEffect(ensureOrdersLoaded, []);
  return snapshot;
}

// PUBLIC API of the Orders remote (listed in module-federation.config.mjs).
// Keep this surface small: a component with no props. Anything the shell passes
// in here becomes a contract both teams must keep compatible.
//
// The shell mounts it at /orders/* and Orders owns every route below that
// prefix. Paths here are RELATIVE, so the same component works under the shell
// and in standalone mode.

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export default function OrdersApp() {
  throwIfBroken();
  return (
    <MfeFrame label="ORDERS" accent="emerald" aria-labelledby="orders-title">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle id="orders-title" className="text-xl">
            Orders
          </CardTitle>
          <CardDescription>
            Rendered by the Orders build <strong>v{__APP_VERSION__}</strong> · React {reactVersion}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Routes>
            <Route index element={<OrderList />} />
            <Route path=":orderId" element={<OrderDetails />} />
            <Route path="*" element={<NotFound what="page" />} />
          </Routes>
        </CardContent>
      </Card>
    </MfeFrame>
  );
}

function OrderList() {
  const { status, refreshing, orders, error } = useOrders();

  if (status === 'error') return <LoadError message={error} />;
  if (status !== 'ready') return <ListSkeleton />;
  if (orders.length === 0) return <EmptyOrders />;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {orders.length === 1 ? '1 order' : `${orders.length} orders`}, newest first. Kept by the
          Orders API in Postgres.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={refreshing}
          onClick={() => void refreshOrders()}
          className="transition-transform duration-150 active:scale-[0.97]"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Order</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="hidden sm:table-cell">Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Button asChild variant="link" className="h-auto px-0 font-mono font-semibold">
                    {/* Relative link: resolves to /orders/<id> under the shell. */}
                    <Link to={order.id}>#{order.id}</Link>
                  </Button>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {date.format(new Date(order.createdAt))}
                </TableCell>
                <TableCell className="hidden max-w-64 truncate sm:table-cell">{summarize(order)}</TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {currency.format(order.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** "Standing desk", "Standing desk + 2 more" */
function summarize(order: OrderView): string {
  const [first, ...rest] = order.lines;
  if (!first) return '—';
  return rest.length === 0 ? first.name : `${first.name} + ${rest.length} more`;
}

function OrderDetails() {
  const { orderId = '' } = useParams();
  const { status, refreshing, error, ordersWithShipment } = useOrders();
  const order = findOrder(orderId);

  // An order created a moment ago (checkout) may be newer than the list this
  // page loaded: look once more before saying it doesn't exist.
  const checkedAgain = useRef(false);
  useEffect(() => {
    if (!order && status === 'ready' && !checkedAgain.current) {
      checkedAgain.current = true;
      void refreshOrders();
    }
  }, [order, status]);

  if (!order) {
    if (status === 'error') return <LoadError message={error} />;
    if (status !== 'ready' || refreshing || !checkedAgain.current) return <DetailsSkeleton />;
    return <NotFound what={`order #${orderId}`} />;
  }

  // A link INTO another micro-frontend. Orders knows the order id, not the
  // shipment id, so it uses the entry point Shipping publishes for exactly this.
  const trackingUrl: AppPath = `/shipping/order/${order.id}`;
  // Orders' read model of a Shipping fact, filled by `shipment.created` events.
  const hasShipment = ordersWithShipment.has(order.id);
  const awaitingShipment = !hasShipment && order.status === 'paid';
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="grid gap-6">
      <Button asChild variant="ghost" size="sm" className="justify-self-start">
        <Link to="..">← All orders</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <h3 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            Order #{order.id} <StatusBadge status={order.status} />
          </h3>
          <p className="text-sm text-muted-foreground">
            {order.customerName} · placed {date.format(new Date(order.createdAt))}
          </p>
        </div>
        {hasShipment && (
          <Button asChild variant="outline" size="sm">
            <Link to={trackingUrl}>Track shipment →</Link>
          </Button>
        )}
      </div>

      {awaitingShipment && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <span className="relative mt-1.5 flex size-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
          </span>
          <p>
            Waiting for Shipping to announce a shipment (<code>shipment.created</code>). If Shipping
            isn't loaded yet, open <strong>Shipping</strong> once: it replays missed events.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.map((line) => (
                <TableRow key={line.productSlug}>
                  <TableCell>
                    {/* The storefront is another zone: a plain link, a full page load. */}
                    <a href={`/products/${line.productSlug}`} className="font-medium hover:underline">
                      {line.name}
                    </a>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {currency.format(line.unitPrice)} each
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {currency.format(line.unitPrice * line.quantity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {currency.format(order.total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <dl className="grid content-start gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
          <Summary term="Items" value={String(itemCount)} />
          <Summary term="Subtotal" value={currency.format(order.total)} />
          <Summary term="Shipping" value="Free" />
          <div className="border-t pt-3">
            <Summary term="Paid" value={currency.format(order.total)} strong />
          </div>
        </dl>
      </div>
    </div>
  );
}

function Summary({ term, value, strong = false }: { term: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'font-semibold')}>
      <dt className={cn(!strong && 'text-muted-foreground')}>{term}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-xl" aria-hidden="true">
        📦
      </div>
      <div className="grid gap-1">
        <p className="font-medium">No orders yet</p>
        <p className="text-sm text-muted-foreground">Everything you check out shows up here.</p>
      </div>
      {/* The storefront is another zone: a plain link, a full page load. */}
      <Button asChild size="sm">
        <a href="/">Browse the store</a>
      </Button>
    </div>
  );
}

function LoadError({ message }: { message: string | null }) {
  return (
    <Alert variant="destructive" className="flex flex-wrap items-center justify-between gap-3">
      <AlertDescription>{message ?? 'Orders are unavailable right now.'}</AlertDescription>
      <Button size="sm" variant="outline" onClick={() => void refreshOrders()}>
        Try again
      </Button>
    </Alert>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading orders">
      <Skeleton className="h-5 w-56" />
      <div className="grid gap-2 rounded-xl border p-3">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading order">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function NotFound({ what }: { what: string }) {
  const listUrl: AppPath = '/orders';
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-sm">Orders has no {what}.</p>
      <Button asChild variant="outline" size="sm">
        <Link to={listUrl}>All orders</Link>
      </Button>
    </div>
  );
}

// Which colour means "shipped" is a business decision, so it lives in Orders,
// not in the design system. The design system only provides <Badge>.
const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-secondary text-secondary-foreground',
  paid: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  shipped: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={cn('border-transparent capitalize', statusStyles[status])}>
      {status}
    </Badge>
  );
}
