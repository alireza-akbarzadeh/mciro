import { StrictMode, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { Badge } from '@micro-shop/ui/components/badge';
import { Button } from '@micro-shop/ui/components/button';
import { MfeLabel } from '@micro-shop/ui/components/mfe-frame';
import LoginForm from './LoginForm';
import UserMenu from './UserMenu';
import { getSession, subscribe } from './session';

function StandaloneAuth() {
  const session = useSyncExternalStore(subscribe, getSession);
  const [copied, setCopied] = useState(false);

  const handleCopySession = () => {
    navigator.clipboard.writeText(JSON.stringify(session, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-foreground antialiased selection:bg-violet-500/10 selection:text-violet-600 dark:bg-slate-950">
      {/* Development Banner */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-background/80 backdrop-blur-md dark:border-slate-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <MfeLabel label="AUTH" accent="violet" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Auth App
              </span>
              <Badge
                variant="secondary"
                className="h-5 border border-violet-500/20 bg-violet-500/10 px-2 text-[10px] font-semibold text-violet-600 dark:text-violet-400"
              >
                Standalone Preview
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <code className="hidden rounded-full border border-slate-200 bg-slate-100/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:block">
              http://localhost:3001
            </code>
          </div>
        </div>
      </header>

      {/* Main Content Side-by-Side Container */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          {/* Left Column: Auth UI / Active Session */}
          <section className="w-full space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Host Integration View
              </span>
              <UserMenu />
            </div>

            {!session ? (
              <LoginForm />
            ) : (
              <div className="rounded-2xl border border-slate-200/80 bg-card p-6 shadow-xl shadow-slate-100 dark:border-slate-800 dark:shadow-none">
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active Session
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    ID: {session.user.id ?? 'usr_demo'}
                  </span>
                </div>

                <div className="flex items-center gap-3.5 pt-1">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-base font-bold text-white shadow-md shadow-violet-500/20">
                    {session.user.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                      {session.user.name ?? 'Authenticated User'}
                    </h4>
                    <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                      {session.user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Sticky Debug Session Panel */}
          <section className="w-full lg:sticky lg:top-20">
            <div className="rounded-2xl border border-slate-200/80 bg-card shadow-sm dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs">🔍</span>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Session Debug State
                    </h3>
                    <p className="font-mono text-[10px] text-slate-500">
                      Exposed via auth/session
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`h-5 rounded-md font-mono text-[10px] uppercase font-bold ${
                      session
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {session ? 'authenticated' : 'guest'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleCopySession}
                    className="h-6 text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="p-3">
                <pre className="max-h-[380px] min-h-[160px] overflow-auto rounded-xl border border-slate-900/80 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-300 scrollbar-thin scrollbar-thumb-slate-800">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('[auth] #root element not found');
}

createRoot(container).render(
  <StrictMode>
    <StandaloneAuth />
  </StrictMode>,
);