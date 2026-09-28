// A typed event bus for micro-frontends, built on the browser's own events.
//
// Why this works without Module Federation `shared`: every app bundles its OWN
// copy of this file, but all copies talk through the same `window`. The browser
// is the shared runtime. There is no singleton library and no global store.
//
// Delivery is fire-and-forget: an app that hasn't loaded yet has no listener and
// misses the event. The bus therefore keeps a short in-memory log so late
// subscribers can ask for a REPLAY. Replay delivers old events again, so every
// handler must be idempotent (safe to run twice for the same fact).

import type {
  AppName,
  EventEnvelope,
  MicroShopEvents,
  MicroShopEventType,
} from '@micro-shop/contracts';

const DOM_EVENT_NAME = 'micro-shop:event';
const MAX_LOG_SIZE = 200;

declare global {
  interface Window {
    /** Shared by every copy of this package on the page. */
    __microShopEventLog__?: EventEnvelope[];
  }
}

function eventLog(): EventEnvelope[] {
  window.__microShopEventLog__ ??= [];
  return window.__microShopEventLog__;
}

export type SubscribeOptions = {
  /** Also deliver matching events that happened before this call. */
  replay?: boolean;
};

/**
 * Returns a `publish` function stamped with the publishing app's name, so every
 * event on the page says where it came from.
 */
export function createPublisher(source: AppName) {
  return function publish<T extends MicroShopEventType>(type: T, payload: MicroShopEvents[T]): void {
    const envelope: EventEnvelope<T> = {
      id: crypto.randomUUID(),
      type,
      source,
      occurredAt: new Date().toISOString(),
      payload,
    };

    const log = eventLog();
    log.push(envelope);
    if (log.length > MAX_LOG_SIZE) log.splice(0, log.length - MAX_LOG_SIZE);

    window.dispatchEvent(new CustomEvent(DOM_EVENT_NAME, { detail: envelope }));
  };
}

/** Listen for one event type. Returns an unsubscribe function. */
export function subscribe<T extends MicroShopEventType>(
  type: T,
  handler: (event: EventEnvelope<T>) => void,
  options: SubscribeOptions = {},
): () => void {
  return subscribeAll(
    (event) => {
      if (isOfType(event, type)) handler(event);
    },
    options,
  );
}

/** Listen for every event (useful for logging and dev tools). */
export function subscribeAll(
  handler: (event: EventEnvelope) => void,
  options: SubscribeOptions = {},
): () => void {
  if (options.replay) {
    for (const event of [...eventLog()]) handler(event);
  }

  const listener = (domEvent: Event) => {
    // Anything on the page can dispatch this DOM event. Treat it as untrusted.
    if (!(domEvent instanceof CustomEvent)) return;
    const detail: unknown = domEvent.detail;
    if (isEnvelope(detail)) handler(detail);
  };

  window.addEventListener(DOM_EVENT_NAME, listener);
  return () => window.removeEventListener(DOM_EVENT_NAME, listener);
}

/** Events already on the page, oldest first. */
export function getEventLog(): readonly EventEnvelope[] {
  return [...eventLog()];
}

function isOfType<T extends MicroShopEventType>(
  event: EventEnvelope,
  type: T,
): event is EventEnvelope<T> {
  return event.type === type;
}

function isEnvelope(value: unknown): value is EventEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const { id, type, source, occurredAt, payload } = value as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    typeof type === 'string' &&
    typeof source === 'string' &&
    typeof occurredAt === 'string' &&
    typeof payload === 'object' &&
    payload !== null
  );
}
