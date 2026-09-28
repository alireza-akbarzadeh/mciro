# micro-shop

A deliberately small micro-frontend architecture for learning **Module Federation 2.0** with
**Rspack 2**, **React 19**, **TypeScript**, **pnpm workspaces**, and a shared **shadcn/ui +
Tailwind v4** design system.

This is not an e-commerce app. It is the smallest system that makes each micro-frontend
concept visible: independent builds, runtime loading, shared dependencies, contracts,
failure isolation and independent deployment.

## Current stage: shared UI + contracts

```
Browser
  └── Shell   localhost:3000   host: layout, navigation, "Orders needs a session"
        ├── Auth    localhost:3001   remote: auth/session, auth/LoginForm, auth/UserMenu
        └── Orders  localhost:3002   remote: orders/OrdersApp

packages/ui          shadcn/ui components + theme tokens   (bundled into each app at build time)
packages/contracts   public types between apps             (types only: zero runtime bytes)
```

| App    | Role   | Port | Exposes                                  |
| ------ | ------ | ---- | ---------------------------------------- |
| shell  | host   | 3000 | nothing                                  |
| auth   | remote | 3001 | `./session`, `./LoginForm`, `./UserMenu` |
| orders | remote | 3002 | `./OrdersApp`                            |

Port 3003 is reserved for shipping. Mock login: `ada@example.com` / `demo`.

## Running

Requires Node ≥ 22.12 and pnpm.

```bash
pnpm install

# Separate applications, separate dev servers (start remotes first)
pnpm dev:auth
pnpm dev:orders
pnpm dev:shell

# or all at once (still three processes, three servers)
pnpm dev
```

Open http://localhost:3000. Each labeled, dashed box (`SHELL`, `AUTH`, `ORDERS`) is code built
and served by that application.

## Building

```bash
pnpm build:auth     # → apps/auth/dist
pnpm build:orders   # → apps/orders/dist
pnpm build:shell    # → apps/shell/dist
pnpm build          # all
pnpm typecheck      # all apps and packages
```

## Adding shadcn components

```bash
cd packages/ui
pnpm dlx shadcn@latest add dialog
```

## Docs

- [docs/module-federation.md](docs/module-federation.md): host, remote, exposes, shared, manifest, async boundary
- [docs/architecture.md](docs/architecture.md): domain ownership, the Auth boundary
- [docs/shared-packages.md](docs/shared-packages.md): ui vs contracts, build-time vs runtime sharing, Tailwind across MFEs

## Roadmap

1. ✅ Shell loads Orders
2. ✅ Auth remote
3. ✅ Shared UI (shadcn) + contracts
4. Shipping + URL routing (shell owns top-level routes, remotes own their sub-routes)
5. Cross-MFE events (`order.created` → Shipping)
6. Failure isolation (an unreachable remote must not blank the shell)
7. Next.js `storefront` for SEO pages + a local reverse proxy composing it with the shell
8. Independent deployment, versioning, rollback, observability, tests
