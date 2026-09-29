import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppName, EventEnvelope } from '@micro-shop/contracts';
import { getEventLog, subscribeAll } from '@micro-shop/event-bus';
import { Button } from '@micro-shop/ui/components/button';
import { MfeLabel, type Accent } from '@micro-shop/ui/components/mfe-frame';

const accentBySource: Record<AppName, Accent> = {
  shell: 'blue',
  auth: 'violet',
  orders: 'emerald',
  shipping: 'amber',
};

const badgeStylesBySource: Record<AppName, string> = {
  shell: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  auth: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  orders: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  shipping: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
};

export function EventLog() {
  const [events, setEvents] = useState<readonly EventEnvelope[]>(getEventLog);
  const [open, setOpen] = useState(true);
  const [filterSource, setFilterSource] = useState<AppName | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    setEvents(getEventLog());
    return subscribeAll(() => setEvents(getEventLog()));
  }, []);

  const filteredEvents = useMemo(() => {
    return [...events]
      .reverse()
      .filter((event) => {
        const matchesSource = filterSource === 'all' || event.source === filterSource;
        const matchesQuery =
          searchQuery.trim() === '' ||
          event.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          JSON.stringify(event.payload).toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSource && matchesQuery;
      });
  }, [events, filterSource, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (event: EventEnvelope) => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-background/90 px-4 py-2 text-xs font-semibold text-foreground shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:border-blue-500/50 dark:border-slate-800"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
        <MfeLabel label="SHELL" accent="blue" />
        <span>Event Log</span>
        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
          {events.length}
        </span>
      </button>
    );
  }

  return (
    <aside
      aria-label="Event log"
      className="fixed bottom-4 right-4 z-50 flex w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-background/95 shadow-2xl backdrop-blur-xl transition-all dark:border-slate-800 dark:bg-slate-950/95"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <MfeLabel label="SHELL" accent="blue" />
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Event Bus Traffic
            </h3>
            <span className="font-mono text-[11px] text-muted-foreground">
              ({filteredEvents.length} / {events.length})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setEvents([])}
            className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
            title="Clear current view"
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setOpen(false)}
            className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-foreground"
            aria-label="Minimize Event Log"
          >
            ✕
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-2 border-b border-slate-100 p-2.5 dark:border-slate-800/60">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter event type or payload..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Source Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
          {(['all', 'shell', 'auth', 'orders', 'shipping'] as const).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => setFilterSource(source)}
              className={`rounded-md px-2 py-1 font-medium capitalize transition-all ${
                filterSource === source
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-muted-foreground hover:bg-slate-200 hover:text-foreground dark:bg-slate-900 dark:hover:bg-slate-800'
              }`}
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <ol
        ref={listRef}
        className="flex max-h-80 flex-col gap-2 overflow-y-auto p-3 text-xs scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800"
        aria-live="polite"
      >
        {filteredEvents.length === 0 ? (
          <li className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <span className="mb-1 text-base">📡</span>
            <p className="text-xs font-medium">No bus events captured</p>
            <p className="text-[11px] text-slate-400">
              {searchQuery ? 'Try matching another query' : 'Perform an action to stream events'}
            </p>
          </li>
        ) : (
          filteredEvents.map((event) => {
            const isExpanded = expandedEvents[event.id];
            const hasPayload =
              event.payload &&
              typeof event.payload === 'object' &&
              Object.keys(event.payload as object).length > 0;

            return (
              <li
                key={event.id}
                className="group flex flex-col gap-1.5 rounded-xl border border-slate-200/80 bg-card p-2.5 shadow-sm transition-all hover:border-blue-500/40 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/40"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      badgeStylesBySource[event.source]
                    }`}
                  >
                    {event.source}
                  </span>
                  <code className="font-mono text-xs font-semibold text-foreground">
                    {event.type}
                  </code>
                  <time
                    className="ml-auto font-mono text-[10px] text-muted-foreground"
                    dateTime={event.occurredAt}
                  >
                    {new Date(event.occurredAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </time>
                </div>

                {/* Payload Section */}
                {hasPayload ? (
                  <div className="rounded-lg bg-slate-950/5 p-2 font-mono text-[11px] text-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleExpand(event.id)}
                        className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-blue-500 dark:text-slate-400"
                      >
                        <span>{isExpanded ? '▼' : '▶'}</span>
                        <span>Payload</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(event)}
                        className="opacity-0 transition-opacity group-hover:opacity-100 text-[10px] text-slate-400 hover:text-foreground"
                        title="Copy Event JSON"
                      >
                        Copy
                      </button>
                    </div>

                    <pre
                      className={`mt-1 overflow-x-auto rounded text-[11px] leading-relaxed ${
                        isExpanded ? 'whitespace-pre-wrap' : 'truncate'
                      }`}
                    >
                      {isExpanded
                        ? JSON.stringify(event.payload, null, 2)
                        : JSON.stringify(event.payload)}
                    </pre>
                  </div>
                ) : (
                  <span className="italic text-[10px] text-muted-foreground">No payload</span>
                )}
              </li>
            );
          })
        )}
      </ol>
    </aside>
  );
}