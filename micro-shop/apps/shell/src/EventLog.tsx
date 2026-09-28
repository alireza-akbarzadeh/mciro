import { useEffect, useState } from 'react';
import type { AppName, EventEnvelope } from '@micro-shop/contracts';
import { getEventLog, subscribeAll } from '@micro-shop/event-bus';
import { Button } from '@micro-shop/ui/components/button';
import { MfeLabel, type Accent } from '@micro-shop/ui/components/mfe-frame';

// A learning/dev tool owned by the shell: every cross-app event on the page, who
// published it and when. The shell is a passive observer here; it reacts to
// nothing, it only shows the traffic.

const accentBySource: Record<AppName, Accent> = {
  shell: 'blue',
  auth: 'violet',
  orders: 'emerald',
  shipping: 'amber',
};

export function EventLog() {
  const [events, setEvents] = useState<readonly EventEnvelope[]>(getEventLog);
  const [open, setOpen] = useState(true);

  // Re-read the whole log on each event instead of appending, so a double
  // subscription (React StrictMode, HMR) can never show an event twice.
  useEffect(() => {
    setEvents(getEventLog());
    return subscribeAll(() => setEvents(getEventLog()));
  }, []);

  return (
    <aside
      aria-label="Event log"
      className="fixed right-4 bottom-4 z-50 grid w-96 max-w-[calc(100vw-2rem)] gap-2 rounded-xl border-2 border-blue-600 bg-card p-3 shadow-lg"
    >
      <div className="flex items-center gap-2">
        <MfeLabel label="SHELL" accent="blue" />
        <strong className="text-sm">Event log</strong>
        <span className="text-xs text-muted-foreground">({events.length})</span>
        <Button
          variant="ghost"
          size="xs"
          className="ml-auto"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Hide' : 'Show'}
        </Button>
      </div>

      {open && (
        <ol className="grid max-h-72 gap-2 overflow-y-auto text-xs" aria-live="polite">
          {events.length === 0 && (
            <li className="text-muted-foreground">
              No events yet. Sign in, or create an order on the Orders page.
            </li>
          )}
          {[...events].reverse().map((event) => (
            <li key={event.id} className="grid gap-1 rounded-lg border p-2">
              <div className="flex items-center gap-2">
                <MfeLabel label={event.source.toUpperCase()} accent={accentBySource[event.source]} />
                <code className="font-semibold">{event.type}</code>
                <time className="ml-auto text-muted-foreground" dateTime={event.occurredAt}>
                  {new Date(event.occurredAt).toLocaleTimeString()}
                </time>
              </div>
              <code className="break-all text-muted-foreground">{JSON.stringify(event.payload)}</code>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
