import { buttonVariants } from '@micro-shop/ui/components/button';
import { MfeLabel } from '@micro-shop/ui/components/mfe-frame';
import { version as reactVersion } from 'react';
import { Outlet } from 'react-router';
import { loadRemoteModule } from '../load-remote';
import { NavItem } from '../components/nav-item';
import { Remote } from '../remote';
import { EventLog } from '../EventLog';
import { CatalogSearch } from '../components/global-search';


const loadUserMenu = () => loadRemoteModule('auth/UserMenu');
const loadCartBadge = () => loadRemoteModule('cart/CartBadge');

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-foreground antialiased selection:bg-blue-500/10 selection:text-blue-600">
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-background/80 backdrop-blur-md transition-all dark:border-slate-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <MfeLabel label="SHELL" accent="blue" />
              <a
                href="/"
                className="group flex items-center gap-2 font-bold tracking-tight text-slate-900 transition-colors hover:text-blue-600 dark:text-slate-100"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs text-white font-extrabold shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  μ
                </span>
                <span className="whitespace-nowrap text-base sm:text-lg">Micro Shop</span>
              </a>
            </div>

            <nav className="hidden md:flex items-center gap-1 rounded-full border border-slate-200/60 bg-slate-100/50 p-1 dark:border-slate-800 dark:bg-slate-900/50" aria-label="Main">
              <a
                href="/"
                className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-400'}
              >
                Store
              </a>
              <NavItem to="/orders">Orders</NavItem>
              <NavItem to="/shipping">Shipping</NavItem>
            </nav>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <CatalogSearch />
            <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-4 dark:border-slate-800">
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                React v{reactVersion}
              </span>
            </div>
            {/* Two remotes side by side: if one is down, the other still renders. */}
            <Remote name="cart" load={loadCartBadge} variant="inline" />
            <Remote name="auth" load={loadUserMenu} variant="inline" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 pb-96">
        <Outlet />
      </main>
      <EventLog />
    </div>
  );
}
