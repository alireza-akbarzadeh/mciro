import { useSyncExternalStore, version as reactVersion } from 'react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@micro-shop/ui/components/table';
import { cn } from '@micro-shop/ui/lib/utils';
import { throwIfBroken } from './fault-injection';
import type { Shipment, ShipmentStatus } from './shipping-data';
import {
  findShipment,
  findShipmentForOrder,
  getShipments,
  subscribeToShipments,
} from './shipping-store';
import './shipping.css';

/** Re-renders when Shipping's store changes (e.g. after order.created). */
function useShipments() {
  return useSyncExternalStore(subscribeToShipments, getShipments);
}

// PUBLIC API of the Shipping remote. The shell mounts it at /shipping/* and
// Shipping owns every route below that prefix. Paths here are RELATIVE, so the
// same component works at /shipping/* in the shell and in standalone mode.

export default function ShippingApp() {
  throwIfBroken();
  return (
    <MfeFrame label="SHIPPING" accent="amber" aria-labelledby="shipping-title">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle id="shipping-title" className="text-xl">
            Shipping
          </CardTitle>
          <CardDescription>
            Rendered by the Shipping build <strong>v{__APP_VERSION__}</strong> · React{' '}
            {reactVersion}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Routes>
            <Route index element={<ShipmentList />} />
            <Route path="order/:orderId" element={<ShipmentForOrder />} />
            <Route path=":shipmentId" element={<ShipmentDetails />} />
            <Route path="*" element={<NotFound what="page" />} />
          </Routes>
        </CardContent>
      </Card>
    </MfeFrame>
  );
}

function ShipmentList() {
  const shipments = useShipments();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shipment</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Carrier</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shipments.map((shipment) => (
          <TableRow key={shipment.id}>
            <TableCell>
              <Button asChild variant="link" className="h-auto px-0 font-mono">
                <Link to={shipment.id}>{shipment.id}</Link>
              </Button>
            </TableCell>
            <TableCell className="font-mono">#{shipment.orderId}</TableCell>
            <TableCell>{shipment.carrier}</TableCell>
            <TableCell>
              <StatusBadge status={shipment.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * /shipping/order/:orderId — the entry point Orders links to. Orders knows the
 * order id, not the shipment id; resolving one to the other is Shipping's job.
 */
function ShipmentForOrder() {
  useShipments();
  const { orderId = '' } = useParams();
  const shipment = findShipmentForOrder(orderId);

  if (shipment) {
    const shipmentUrl: AppPath = `/shipping/${shipment.id}`;
    return <Navigate to={shipmentUrl} replace />;
  }

  const orderUrl: AppPath = `/orders/${orderId}`;
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-sm">
        No shipment exists for order <span className="font-mono">#{orderId}</span> yet.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link to={orderUrl}>View order #{orderId}</Link>
      </Button>
    </div>
  );
}

function ShipmentDetails() {
  useShipments();
  const { shipmentId = '' } = useParams();
  const shipment = findShipment(shipmentId);
  if (!shipment) return <NotFound what={`shipment ${shipmentId}`} />;

  // A link INTO another micro-frontend: an absolute path from the URL contract.
  const orderUrl: AppPath = `/orders/${shipment.orderId}`;

  return (
    <div className="grid gap-5">
      <Button asChild variant="ghost" size="sm" className="justify-self-start">
        <Link to="..">← All shipments</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="flex items-center gap-3 text-lg font-semibold">
            <span className="font-mono">{shipment.id}</span>
            <StatusBadge status={shipment.status} />
          </h3>
          <p className="text-sm text-muted-foreground">{shipment.carrier}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={orderUrl}>View order #{shipment.orderId} →</Link>
        </Button>
      </div>

      <Timeline shipment={shipment} />
    </div>
  );
}

function Timeline({ shipment }: { shipment: Shipment }) {
  const events = [...shipment.events].reverse(); // newest first

  return (
    <ol className="grid gap-0" aria-label="Tracking history">
      {events.map((event, index) => (
        <li key={`${event.at}-${event.status}`} className="relative grid grid-cols-[20px_1fr] gap-3">
          <span className="relative flex justify-center" aria-hidden="true">
            <span
              className={cn(
                'relative z-10 mt-1.5 size-3 rounded-full border-2 border-background',
                index === 0 ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-neutral-300',
              )}
            />
            {index < events.length - 1 && (
              <span className="absolute top-4 bottom-0 w-px bg-border" />
            )}
          </span>
          <div className="grid gap-0.5 pb-5">
            <span className="text-sm font-medium">{event.note}</span>
            <span className="text-xs text-muted-foreground">
              {event.at} · {event.location}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function NotFound({ what }: { what: string }) {
  const listUrl: AppPath = '/shipping';
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-sm">Shipping has no {what}.</p>
      <Button asChild variant="outline" size="sm">
        <Link to={listUrl}>All shipments</Link>
      </Button>
    </div>
  );
}

const statusLabels: Record<ShipmentStatus, string> = {
  label_created: 'Label created',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

const statusStyles: Record<ShipmentStatus, string> = {
  label_created: 'bg-secondary text-secondary-foreground',
  in_transit: 'bg-amber-100 text-amber-800',
  out_for_delivery: 'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
};

function StatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <Badge variant="outline" className={cn('border-transparent', statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}
