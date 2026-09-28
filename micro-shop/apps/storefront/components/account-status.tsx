'use client';

import { useSyncExternalStore } from 'react';

// A small CLIENT island inside otherwise static pages.
//
// The public pages are prerendered once and cached for everybody, so they can't
// contain "Signed in as Ada". Personalisation happens here, in the browser, from
// the display-name cookie Auth sets on the shared domain. The server snapshot is
// "unknown" (null), which keeps the static HTML identical for every visitor.

const COOKIE_NAME = 'micro-shop-user';

function readDisplayName(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const value = match?.[1];
  return value ? decodeURIComponent(value) : null;
}

const noSubscription = () => () => {};

export function AccountStatus() {
  const name = useSyncExternalStore(noSubscription, readDisplayName, () => null);

  return (
    // Plain <a>: /orders belongs to the OTHER zone (the shell), so this is a
    // full page load through the gateway, not client-side navigation.
    <a href="/orders" className="text-sm font-medium underline-offset-4 hover:underline">
      {name ? `Signed in as ${name} · My orders` : 'Sign in · My orders'}
    </a>
  );
}
