import {
  Component,
  lazy,
  Suspense,
  useState,
  type ComponentType,
  type ErrorInfo,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';
import { createLogger, errorData } from '@micro-shop/observability';
import { Alert, AlertDescription, AlertTitle } from '@micro-shop/ui/components/alert';
import { Button } from '@micro-shop/ui/components/button';
import { Skeleton } from '@micro-shop/ui/components/skeleton';

// Failure isolation for remote applications.
//
// A remote can fail in two ways, and both end up here:
//   1. LOADING fails: its server is down, the manifest 404s, the network drops.
//      The dynamic import rejects; React.lazy re-throws it during render.
//   2. RENDERING fails: the remote's own code throws.
// Either way the error stops at this boundary. The rest of the shell, and
// every other remote, keeps working.

const log = createLogger('shell');

type RemoteModule<P> = { default: ComponentType<P> };
type Loader<P> = () => Promise<RemoteModule<P>>;

// One lazy component per loader, kept OUTSIDE React state.
//
// A first version created it with useMemo(() => lazy(load), [attempt]). After a
// failed load, React re-renders the not-yet-committed subtree a few times;
// uncommitted components lose their memoized values, so every re-render built a
// new lazy() and fired a new request: 39 manifest requests in a burst. Caching
// here makes it exactly one request per attempt. Only Retry forgets the entry.
// Each entry maps a loader to the lazy component made from it, so the cast on
// the way out is safe whatever the component's props are.
const lazyRemotes = new Map<unknown, unknown>();

function getLazyRemote<P extends object>(load: Loader<P>): LazyExoticComponent<ComponentType<P>> {
  const cached = lazyRemotes.get(load) as LazyExoticComponent<ComponentType<P>> | undefined;
  if (cached) return cached;
  const component = lazy(load);
  lazyRemotes.set(load, component);
  return component;
}

type RemoteProps<P extends object> = {
  /** Remote name, for messages and logs. */
  name: string;
  /** Must be a stable, module-level function: () => loadRemoteModule('orders/OrdersApp'). */
  load: Loader<P>;
  /** 'page' for a main-area remote, 'inline' for small ones like the header menu. */
  variant?: 'page' | 'inline';
} & PropsField<P>;

/**
 * Props for the remote component, typed by its contract (e.g. CheckoutProps).
 * Required when the remote requires them, so a missing prop is a compile error.
 * Most remotes take none: every prop is API both teams must keep compatible.
 */
type PropsField<P> = {} extends P ? { props?: P } : { props: P };

/** Loads, renders and isolates one remote component. */
export function Remote<P extends object>({ name, load, variant = 'page', props }: RemoteProps<P>) {
  const [attempt, setAttempt] = useState(0);
  const LazyRemote = getLazyRemote(load);
  const { pathname } = useLocation();

  function retry() {
    // React.lazy caches a rejected load forever, so retrying needs a NEW lazy
    // component: forget the cached one, then re-render.
    lazyRemotes.delete(load);
    setAttempt((value) => value + 1);
  }

  return (
    <RemoteBoundary
      // A new key resets the boundary's error state on retry.
      key={attempt}
      name={name}
      variant={variant}
      // Found by an end-to-end test: /orders/* and /shipping/* render this same
      // component in the same place, so React REUSES the boundary when you
      // navigate, and a failed Orders kept Shipping on the fallback. A boundary
      // in the error state resets when the remote or the URL changes.
      resetKey={`${name}|${pathname}`}
      onRetry={retry}
    >
      <Suspense fallback={<RemoteLoading name={name} variant={variant} />}>
        <LazyRemote {...(props as P)} />
      </Suspense>
    </RemoteBoundary>
  );
}

type BoundaryProps = {
  name: string;
  variant: 'page' | 'inline';
  onRetry: () => void;
  /** When this changes while an error is shown, the boundary tries again. */
  resetKey?: string;
  children: ReactNode;
};

type BoundaryState = { error: Error | null };

/**
 * Error boundaries must still be class components in React 19. This one only
 * catches errors from its own subtree: one per remote.
 */
export class RemoteBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidUpdate(previous: BoundaryProps): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Tagged with the REMOTE's name: this alert belongs to that team.
    log.error(`remote "${this.props.name}" failed; showing fallback`, {
      ...errorData(error),
      remote: this.props.name,
      componentStack: info.componentStack,
    });
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <RemoteUnavailable
        name={this.props.name}
        variant={this.props.variant}
        error={error}
        onRetry={this.props.onRetry}
      />
    );
  }
}

function RemoteUnavailable({
  name,
  variant,
  error,
  onRetry,
}: {
  name: string;
  variant: 'page' | 'inline';
  error: Error;
  onRetry: () => void;
}) {
  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className="flex h-10 items-center gap-2 rounded-lg border-2 border-dashed border-destructive/60 px-2 text-sm"
      >
        <span className="text-destructive">{capitalize(name)} unavailable</span>
        <Button variant="ghost" size="xs" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Alert variant="destructive" className="border-2 border-dashed">
      <AlertTitle>{capitalize(name)} is temporarily unavailable</AlertTitle>
      <AlertDescription className="gap-3">
        <p>
          The rest of the application keeps working. This area comes from the{' '}
          <code>{name}</code> application, which failed to load or crashed.
        </p>
        <code className="text-xs break-all">{error.message}</code>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function RemoteLoading({ name, variant }: { name: string; variant: 'page' | 'inline' }) {
  if (variant === 'inline') {
    return <Skeleton className="h-10 w-40" aria-label={`Loading ${name}`} />;
  }
  return (
    <div role="status" className="grid gap-3 rounded-xl border-2 border-dashed p-6">
      <p className="text-sm text-muted-foreground">
        Loading <code>{name}</code> remote…
      </p>
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
