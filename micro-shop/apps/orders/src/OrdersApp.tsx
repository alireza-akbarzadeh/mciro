import { useSyncExternalStore, version as reactVersion } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router';
import type { AppPath } from '@micro-shop/contracts';
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
import { orderTotal, type OrderStatus } from './orders-data';
import { throwIfBroken } from './fault-injection';
import {
  createTestOrder,
  findOrder,
  findOrderByCheckout,
  getSnapshot,
  subscribeToOrders,
} from './orders-store';
import './orders.css';

function useOrders() {
  return useSyncExternalStore(subscribeToOrders, getSnapshot);
}

// PUBLIC API of the Orders remote (listed in module-federation.config.mjs).
// Keep this surface small: a component with no props. Anything the shell passes
// in here becomes a contract both teams must keep compatible.
//
// The shell mounts it at /orders/* and Orders owns every route below that
// prefix. Paths here are RELATIVE, so the same component works under the shell
// and in standalone mode.

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

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
            <Route path="checkout/:checkoutId" element={<OrderForCheckout />} />
            <Route path=":orderId" element={<OrderDetails />} />
            <Route path="*" element={<NotFound what="page" />} />
          </Routes>
        </CardContent>
      </Card>
    </MfeFrame>
  );
}

/**
 * /orders/checkout/:checkoutId — the entry point Cart navigates to after
 * checkout. Cart knows its checkout id, not the order id (Orders assigns that),
 * so resolving one to the other is Orders' job, like /shipping/order/:orderId.
 */
function OrderForCheckout() {
  useOrders();
  const { checkoutId = '' } = useParams();
  const order = findOrderByCheckout(checkoutId);

  if (order) {
    const orderUrl: AppPath = `/orders/${order.id}`;
    return <Navigate to={orderUrl} replace />;
  }
  return <NotFound what={`order for checkout ${checkoutId}`} />;
}

function OrderList() {
  const navigate = useNavigate();

  function handleCreate() {
    const order = createTestOrder();
    navigate(order.id);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Creating an order publishes <code>order.created</code>. Shipping reacts to it.
        </p>
        <Button size="sm" onClick={handleCreate}>
          Create test order
        </Button>
      </div>
      <OrderTable />
    </div>
  );
}

function OrderTable() {
  const { orders } = useOrders();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <Button asChild variant="link" className="h-auto px-0 font-mono">
                {/* Relative link: resolves to /orders/<id> under the shell. */}
                <Link to={order.id}>#{order.id}</Link>
              </Button>
            </TableCell>
            <TableCell>{order.customer}</TableCell>
            <TableCell>
              <StatusBadge status={order.status} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {currency.format(orderTotal(order))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function OrderDetails() {
  const { orderId = '' } = useParams();
  const { ordersWithShipment } = useOrders();
  const order = findOrder(orderId);
  if (!order) return <NotFound what={`order #${orderId}`} />;

  // A link INTO another micro-frontend. Orders knows the order id, not the
  // shipment id, so it uses the entry point Shipping publishes for exactly this.
  const trackingUrl: AppPath = `/shipping/order/${order.id}`;
  // Orders' read model of a Shipping fact, filled by `shipment.created` events.
  const hasShipment = ordersWithShipment.has(order.id);
  const awaitingShipment = !hasShipment && order.status === 'paid';

  return (
    <div className="grid gap-4">
      <Button asChild variant="ghost" size="sm" className="justify-self-start">
        <Link to="..">← All orders</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="flex items-center gap-3 text-lg font-semibold">
            Order #{order.id} <StatusBadge status={order.status} />
          </h3>
          <p className="text-sm text-muted-foreground">
            {order.customer} · placed {order.createdAt}
          </p>
        </div>
        {hasShipment && (
          <Button asChild variant="outline" size="sm">
            <Link to={trackingUrl}>Track shipment →</Link>
          </Button>
        )}
      </div>

      {awaitingShipment && (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Waiting for Shipping to announce a shipment (<code>shipment.created</code>). If Shipping
          isn't loaded yet, open <strong>Shipping</strong> once: it replays missed events.
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lines.map((line) => (
            <TableRow key={line.product}>
              <TableCell>{line.product}</TableCell>
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
            <TableCell className="text-right tabular-nums">
              {currency.format(orderTotal(order))}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
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
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-amber-100 text-amber-800',
  delivered: 'bg-emerald-100 text-emerald-800',
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={cn('border-transparent capitalize', statusStyles[status])}>
      {status}
    </Badge>
  );
}
