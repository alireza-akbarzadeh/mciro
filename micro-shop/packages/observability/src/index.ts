// Observability for micro-frontends, deliberately small.
//
// The one rule that matters: every log entry says WHICH application produced
// it. When five teams' code runs on one page, "TypeError in main.js" is useless;
// "[orders] failed to render order 1005" goes straight to the right team.
//
//   const log = createLogger('orders');
//   log.info('order created', { orderId: '1005' });   // console: [orders] order created {...}
//
// Sinks are where production plugs in Sentry, OpenTelemetry or a log endpoint:
//
//   addLogSink((entry) => Sentry.captureMessage(entry.message, { tags: { app: entry.app } }));
//
// Like the event bus, sinks live on `window`, so the copy of this package bundled
// into each app reports to the same sinks.

import type { AppName } from '@micro-shop/contracts';

export type LogLevel = 'info' | 'warn' | 'error';

export type LogEntry = {
  app: AppName;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  /** ISO 8601 timestamp. */
  at: string;
};

export type LogSink = (entry: LogEntry) => void;

export type Logger = {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
};

declare global {
  interface Window {
    __microShopLogSinks__?: LogSink[];
  }
}

function sinks(): LogSink[] {
  window.__microShopLogSinks__ ??= [];
  return window.__microShopLogSinks__;
}

/** Register a destination for every log entry on the page. Returns a remover. */
export function addLogSink(sink: LogSink): () => void {
  sinks().push(sink);
  return () => {
    const list = sinks();
    const index = list.indexOf(sink);
    if (index >= 0) list.splice(index, 1);
  };
}

export function createLogger(app: AppName): Logger {
  function write(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = { app, level, message, at: new Date().toISOString() };
    if (data) entry.data = data;

    const line = `[${app}] ${message}`;
    if (data) console[level](line, data);
    else console[level](line);

    for (const sink of sinks()) {
      try {
        sink(entry);
      } catch {
        // A broken sink must never break the app that is logging.
      }
    }
  }

  return {
    info: (message, data) => write('info', message, data),
    warn: (message, data) => write('warn', message, data),
    error: (message, data) => write('error', message, data),
  };
}

/** Turns an unknown thrown value into loggable data. */
export function errorData(error: unknown): Record<string, unknown> {
  return error instanceof Error
    ? { error: error.message, name: error.name }
    : { error: String(error) };
}
