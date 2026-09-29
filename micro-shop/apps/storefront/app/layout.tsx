import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { MfeLabel } from '@micro-shop/ui/components/mfe-frame';
import { AccountStatus } from '../components/account-status';
import { SearchForm } from '../components/search-form';
import { SITE_URL } from '../lib/catalog';
import './globals.css';

export const metadata: Metadata = {
  // Makes relative Open Graph / canonical URLs absolute.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Micro Shop: desk gear for people who build things',
    template: '%s · Micro Shop',
  },
  description: 'Keyboards, monitors, desks and accessories. A micro-frontend architecture demo.',
  icons: { icon: 'data:,' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="flex flex-wrap items-center gap-6 border-b-2 border-rose-600 bg-card px-6 py-3">
          <MfeLabel label="STOREFRONT" accent="rose" />
          <Link href="/" className="text-lg font-bold">
            Micro Shop
          </Link>
          <nav className="flex gap-4 text-sm" aria-label="Main">
            {/* Same zone (storefront): client-side navigation with next/link. */}
            <Link href="/" className="underline-offset-4 hover:underline">
              Products
            </Link>
            {/* Other zone (shell): plain links, full page load through the gateway. */}
            <a href="/orders" className="underline-offset-4 hover:underline">
              Orders
            </a>
            <a href="/shipping" className="underline-offset-4 hover:underline">
              Shipping
            </a>
            <a href="/cart" className="underline-offset-4 hover:underline">
              Cart
            </a>
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <SearchForm id="site-search" label="Search the store" className="w-72" />
            <AccountStatus />
          </div>
        </header>
        <main className="mx-auto my-8 max-w-5xl px-4">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-muted-foreground">
          Server-rendered by Next.js (storefront zone, port 3004). Signed-in pages are served by
          the Module Federation shell (port 3000). The gateway on port 8080 routes between them.
        </footer>
      </body>
    </html>
  );
}
