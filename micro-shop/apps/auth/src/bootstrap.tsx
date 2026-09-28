import { StrictMode, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import LoginForm from './LoginForm';
import UserMenu from './UserMenu';
import { getSession, subscribe } from './session';

// Standalone mode: the Auth team develops its UI and session logic without the
// shell. The debug panel shows exactly what consumers of `auth/session` see.

function StandaloneAuth() {
  const session = useSyncExternalStore(subscribe, getSession);

  return (
    <>
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-sm">
        <strong>Auth: standalone mode</strong> (localhost:3001). In the composed app the shell
        places <code>UserMenu</code> in its header and <code>LoginForm</code> in front of
        protected views.
      </div>
      <main className="mx-auto my-8 grid max-w-md gap-6 px-4">
        <div className="justify-self-start">
          <UserMenu />
        </div>
        {!session && <LoginForm />}
        <div className="grid gap-2 text-sm">
          <strong>getSession(): the public view (no token)</strong>
          <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-neutral-100">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      </main>
    </>
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
