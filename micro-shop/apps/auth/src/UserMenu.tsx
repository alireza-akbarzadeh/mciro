import { useSyncExternalStore } from 'react';
import { Button } from '@micro-shop/ui/components/button';
import { MfeLabel } from '@micro-shop/ui/components/mfe-frame';
import { getSession, logout, subscribe } from './session-store';
import './auth.css';

// PUBLIC API of Auth (exposed as `auth/UserMenu`). The shell decides WHERE it
// goes (the header); Auth decides WHAT it shows.

export default function UserMenu() {
  const session = useSyncExternalStore(subscribe, getSession);

  return (
    <div className="flex h-10 items-center gap-2 rounded-lg border-2 border-dashed border-violet-600 pr-1 pl-2 text-sm">
      <MfeLabel label="AUTH" accent="violet" />
      {session ? (
        <>
          <span className="font-medium" title={session.user.email}>
            {session.user.name}
          </span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Log out
          </Button>
        </>
      ) : (
        <span className="pr-2 text-muted-foreground">Guest</span>
      )}
    </div>
  );
}
