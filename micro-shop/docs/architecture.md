# Architecture — who owns what

## Ownership table

| Concern | Owner | Why there |
| --- | --- | --- |
| Page layout, navigation, which views exist | **Shell** | Composition is a platform concern |
| *Policy*: "the Orders view needs a signed-in user" | **Shell** | It decides what gets composed where |
| *Identity*: who the user is, how login works, the token | **Auth** | One team owns one security-sensitive concern |
| Orders data and UI | **Orders** | Business capability |

The Shell doesn't know how login works. Orders doesn't know that login exists.

## Auth's public API (and what it withholds)

```
auth/session     getSession() · subscribe(listener) · logout()
auth/LoginForm   <LoginForm />   the ONLY way to log in
auth/UserMenu    <UserMenu />    name + "Log out", or "Guest"
```

Not exposed: `login()`, the token, storage keys, the demo user list
(`apps/auth/src/session-store.ts`). `session.ts` is a facade that re-exports only the read side.

Design choices:

- **Framework-agnostic `session`.** Plain functions, not `useSession()`. The Shell adapts
  them with `useSyncExternalStore` in [apps/shell/src/use-session.ts](../apps/shell/src/use-session.ts).
  A non-React consumer could use the same API.
- **`LoginForm` takes no props.** The Shell doesn't need an `onSuccess` callback because it's
  subscribed to the session and re-renders when one appears. Fewer props, smaller contract.
- **Components vs. data.** The Shell places `UserMenu` (where); Auth renders it (what).

## One store, three exposed modules

`auth/session`, `auth/LoginForm` and `auth/UserMenu` are loaded separately, but they all come
from the same `auth` container, which has one module cache. So `session-store.ts` is
evaluated once on the page: logging in through `LoginForm` updates the Shell's gate and
`UserMenu` at the same time.

## Remote code has no origin

When the Shell hosts Auth, Auth's JavaScript runs on **localhost:3000**. Its
`sessionStorage.setItem(...)` writes to the Shell's origin, not to localhost:3001. Cookies,
storage, and `fetch` credentials all follow the page's origin, not where the script was
downloaded from.

Consequences:

- Every remote on the page can read `micro-shop.auth.session`, including the mock token. There
  is **no security boundary between micro-frontends** that share a page. Isolation would need
  iframes or separate origins.
- A production setup keeps the token out of JavaScript entirely (an `HttpOnly` cookie set by an
  auth backend or BFF), and Auth's public API exposes identity, never credentials.

## Startup no longer depends on any remote

Originally, with `shareStrategy: 'version-first'`, the Shell fetched **every** remote's
manifest before rendering, so stopping any one of them blanked the whole page. The shell now
uses `'loaded-first'`, wraps each remote in its own error boundary and fails closed when Auth
is unreachable. See [GUIDE, Chapter 7](GUIDE.md#chapter-7-failure-isolation).

## Orders and Shipping: linked by URL, not by code

Shipping stores an order **id**, never order data. Orders links to
`/shipping/order/:orderId`; Shipping resolves the shipment and redirects to
`/shipping/:shipmentId`. Both paths are typed by `AppPath` in `@micro-shop/contracts`. See
[GUIDE.md, Chapter 5](GUIDE.md#chapter-5-routing-and-the-shipping-app).

## Duplication

- ~~`Session`/`User` types exist twice~~. Resolved: both sides now compile against
  `@micro-shop/contracts` ([shared-packages.md](shared-packages.md)).
- The three `rspack.config.mjs` files are near-copies, on purpose. Each team owns its
  build; sharing build config is a coupling decision to make deliberately.
