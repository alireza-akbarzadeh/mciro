# Shared packages: `@micro-shop/ui` and `@micro-shop/contracts`

## The rule for sharing anything

> If this changes, do I want every micro-frontend to potentially need a rebuild or redeploy?

| Share it | Keep it inside one app |
| --- | --- |
| Buttons, inputs, cards (`@micro-shop/ui`) | Order status → colour mapping (Orders' `statusStyles`) |
| Theme tokens | Stores, API clients, repositories |
| Public types between apps (`@micro-shop/contracts`) | A domain's internal types (`Order`, `OrderLine`) |
| `cn()` | "Common utils" grab-bags. They turn into a distributed monolith. |

## Two kinds of sharing

| | Build-time package | Runtime shared module (MF `shared`) |
| --- | --- | --- |
| Example | `@micro-shop/ui`, `@micro-shop/contracts` | `react`, `react-dom` |
| Where the code lives | Copied into each app's bundle | Downloaded once, used by all |
| Version on the page | Each app has the version it was built with | One negotiated version |
| Upgrade | Each team, at its own pace | Coordinated, because everyone runs one copy |
| Use when | Stateless and presentational | Must be a singleton (React's hook state) |

`@micro-shop/ui` is deliberately **not** in `shared`. Orders and Auth each bundle their own copy
(see `885.js` in both `dist/` folders). The cost is bytes and possible visual drift between
versions. The benefit is that no team's deploy depends on another team's UI upgrade.

**Context gotcha:** because each app has its own copy, React context does **not** cross app
boundaries. A `<TooltipProvider>` rendered by the shell's copy of Radix is invisible to the
Orders copy. Each remote wraps its own providers.

## `@micro-shop/contracts`: types only

- Contains `User`, `Session`, `AuthSessionModule`. No functions, no classes, no logic.
- Auth **implements** it ([apps/auth/src/session.ts](../apps/auth/src/session.ts)): every export is
  typed as `AuthSessionModule['…']`, so Auth's own build fails if it drifts from the contract.
- The shell **consumes** it ([apps/shell/src/remotes.d.ts](../apps/shell/src/remotes.d.ts)): the
  `auth/session` declaration is built from the same type.
- It's a `devDependency`: types are erased at build time, so it adds **zero bytes and zero
  runtime coupling**. Its whole job is to make breaking changes fail at compile time.

In this monorepo, `workspace:*` means both sides always compile against the current source,
so a breaking change is atomic: you fix every consumer in the same commit. In a polyrepo,
contracts would be published with semver, and a major version would signal a breaking change.

## `@micro-shop/ui`: shadcn/ui as an internal package

- Components are shadcn "new-york" sources in `packages/ui/src/components`. The CLI config is
  `packages/ui/components.json`, so `pnpm dlx shadcn@latest add dialog` run in `packages/ui` adds
  more.
- It ships **source** (`.tsx`), not a build. Each app compiles it with its own `swc-loader`.
- `MfeFrame` / `MfeLabel` are our learning aids, not shadcn. They take a colour, not a domain
  name. The design system must not know the list of business domains.

## Tailwind across micro-frontends: who loads what

Tailwind generates CSS per build. With several builds on one page, the question is which
stylesheet ships what:

| Stylesheet | Reset (preflight) | Token values (`--primary: …`) | Utilities (`.bg-primary`) |
| --- | --- | --- | --- |
| Shell, `shell.css` (owns the page) | ✅ | ✅ | ✅ |
| Remote, `orders.css` / `auth.css` (ships with exposed modules) | ❌ | ❌ | ✅ |
| Remote standalone, `standalone.css` (in `main.js` only) | ✅ | ✅ | — |

Split across two files in `packages/ui/src/styles`:

- **`theme.css`**: `@theme inline { --color-primary: var(--primary) … }`. Tells each Tailwind
  build that `bg-primary` exists. It emits no values, so it's safe everywhere.
- **`tokens.css`**: `:root { --primary: oklch(…) }` plus base element styles. **Page owner only.**

Because remotes reference `var(--primary)` and never the colour, changing a token in the
shell re-themes every micro-frontend **without redeploying them**.

### Why remotes must not ship token values (verified)

We put `:root { --background: … green … }` in `orders.css` and measured
`getComputedStyle(document.body).backgroundColor` in the shell:

```
home (before Orders loads)   oklch(0.985 0 0)       shell's value
orders view                  oklch(0.93 0.06 150)   Orders' value took over the WHOLE page
back to home                 oklch(0.93 0.06 150)   still green: CSS is never unloaded
```

### Why every file declares the same layer order

Each stylesheet starts with `@layer theme, base, components, remote-utilities, utilities;`.
Layers with the same name merge across stylesheets, so the order holds no matter which file
loads first. **Unlayered CSS beats every layer**. A remote that ships plain CSS, or Tailwind v3
(unlayered output), overrides the shell's utilities. Keep everything layered.

**Remotes put their utilities in `remote-utilities`, below the page's `utilities`.** Duplicate
utilities are *not* harmless when they share a layer. Tailwind sorts `hidden` before `md:flex`
inside one stylesheet, but across two stylesheets the one loaded later wins. When Auth's CSS
(with its own `.hidden`) loaded after the shell's, it beat the shell's `md:flex`, and the
header's navigation disappeared. In a lower layer a remote can't override the page, whatever
classes it uses.

The shell's build also scans every remote's source (`@source "../../orders/src"` and so on in
[shell.css](../apps/shell/src/shell.css)), so the top layer already holds every class the remotes
use, in Tailwind's order. A remote's own layer is the fallback for classes the shell hasn't been
built with yet (a remote deployed with new markup), and all there is in standalone mode. All of
this relies on every app using the **same Tailwind major version**, so upgrading Tailwind is a
coordinated change.

### A bug we hit: standalone CSS leaking into the host (dev only)

`standalone.css` was first imported from `bootstrap.tsx`. In dev, Rspack put `bootstrap.tsx` in
the same chunk as the shared `react-dom` module that the exposed components need (`radix-ui`
imports `react-dom`). Opening Orders in the shell therefore downloaded Orders' **standalone
page CSS**, and its tokens overrode the shell's.

The fix: import `standalone.css` from `index.ts`, the entry. Its CSS becomes `main.css`, which
only the remote's own `index.html` links. Hosts load `remoteEntry.js`, never `main.js`.

Still visible in dev: the shell downloads Orders' bootstrap *JS* chunk and `react-dom/client`,
which are never executed. The production manifest's `exposes[].assets` don't include them.
Check with `apps/orders/dist/mf-manifest.json`. **Always verify federation behaviour against
a production build.**
