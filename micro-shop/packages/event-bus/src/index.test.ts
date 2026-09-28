import { afterEach, describe, expect, it } from 'vitest';
import { createPublisher, getEventLog, subscribe, subscribeAll } from './index';

const unsubscribers: (() => void)[] = [];
afterEach(() => {
  for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
});

describe('event bus', () => {
  it('delivers a published event to subscribers of that type only', () => {
    const orderIds: string[] = [];
    const shipmentIds: string[] = [];
    unsubscribers.push(
      subscribe('order.created', (event) => orderIds.push(event.payload.orderId)),
      subscribe('shipment.created', (event) => shipmentIds.push(event.payload.shipmentId)),
    );

    createPublisher('orders')('order.created', { version: 1, orderId: 'A1' });

    expect(orderIds).toEqual(['A1']);
    expect(shipmentIds).toEqual([]);
  });

  it('stamps every event with an id, its source app and a timestamp', () => {
    createPublisher('shipping')('shipment.created', { version: 1, shipmentId: 'S1', orderId: 'A1' });

    const last = getEventLog().at(-1);
    expect(last?.source).toBe('shipping');
    expect(last?.id).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(last?.occurredAt ?? ''))).toBe(false);
  });

  it('replays past events to a late subscriber that asks for it', () => {
    createPublisher('orders')('order.created', { version: 1, orderId: 'LATE-1' });

    const withoutReplay: string[] = [];
    const withReplay: string[] = [];
    unsubscribers.push(
      subscribe('order.created', (event) => withoutReplay.push(event.payload.orderId)),
      subscribe('order.created', (event) => withReplay.push(event.payload.orderId), { replay: true }),
    );

    expect(withoutReplay).not.toContain('LATE-1');
    expect(withReplay).toContain('LATE-1');
  });

  it('stops delivering after unsubscribe', () => {
    const received: string[] = [];
    const unsubscribe = subscribe('order.created', (event) => received.push(event.payload.orderId));
    unsubscribe();

    createPublisher('orders')('order.created', { version: 1, orderId: 'A2' });
    expect(received).toEqual([]);
  });

  it('ignores DOM events that are not valid envelopes (untrusted input)', () => {
    const received: unknown[] = [];
    unsubscribers.push(subscribeAll((event) => received.push(event)));

    window.dispatchEvent(new CustomEvent('micro-shop:event', { detail: { hello: 'world' } }));
    window.dispatchEvent(new CustomEvent('micro-shop:event', { detail: 'not an object' }));

    expect(received).toEqual([]);
  });
});
