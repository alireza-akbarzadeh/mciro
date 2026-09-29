import { useSyncExternalStore } from 'react';
import { LogOut, Package } from 'lucide-react';
import type { AppPath } from '@micro-shop/contracts';
import { Avatar, AvatarFallback } from '@micro-shop/ui/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@micro-shop/ui/components/dropdown-menu';
import { MfeLabel } from '@micro-shop/ui/components/mfe-frame';
import { throwIfBroken } from './fault-injection';
import { getSession, logout, subscribe } from './session-store';
import './auth.css';

// PUBLIC API of Auth (exposed as `auth/UserMenu`). The shell decides WHERE it
// goes (the header); Auth decides WHAT it shows.

const ordersUrl: AppPath = '/orders';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function UserMenu() {
  throwIfBroken();
  const session = useSyncExternalStore(subscribe, getSession);

  return (
    <div className="flex h-10 items-center gap-2 rounded-lg border-2 border-dashed border-violet-600 pr-1 pl-2 text-sm">
      <MfeLabel label="AUTH" accent="violet" />
      {session ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-md px-1 py-0.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Account menu for ${session.user.name}`}
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-800">
                {initials(session.user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{session.user.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="grid">
              <span>{session.user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{session.user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              {/* Another app's URL, from the URL contract. A full page load
                  keeps Auth independent of the host's router. */}
              <a href={ordersUrl}>
                <Package />
                My orders
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={logout}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="pr-2 text-muted-foreground">Guest</span>
      )}
    </div>
  );
}
