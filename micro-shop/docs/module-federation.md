# Module Federation — how Stage 1 works

> **Scope of this document:** the Stage 1 setup (one host, one remote, hard-coded `remotes`,
> `version-first`). The finished shell evolved: it loads remotes with the runtime API and
> `shareStrategy: 'loaded-first'` ([GUIDE, Chapter 7](GUIDE.md#chapter-7-failure-isolation)),
> and reads remote URLs from a registry instead of its config
> ([GUIDE, Chapter 9](GUIDE.md#chapter-9-production-deploy-version-observe-test)). The
> concepts below still apply unchanged.

## The one-sentence model

Several **separate builds** end up in **one browser page**. Each build ships a small
"container" object with `get(moduleName)` and `init(shareScope)`. A host asks a container for a
module at runtime, over the network, the way it would call `import()` on a local chunk.

Nothing is linked at build time. The shell's `dist/` contains no Orders code at all.

## Vocabulary

| Term | In this repo | What it is |
| --- | --- | --- |
| **Host** (consumer) | `apps/shell` | Loads modules from other builds. Declares `remotes`. |
| **Remote** (producer) | `apps/orders` | Offers modules to other builds. Declares `exposes`. |
| **Container** | global `orders` | Runtime object created by `remoteEntry.js`: `{ get, init }`. |
| **exposes** | `'./OrdersApp'` | The remote's public API. Everything else is private. |
| **remotes** | `orders: 'orders@…/mf-manifest.json'` | Alias → where to find a container. |
| **shared** | `react`, `react-dom` | Libraries negotiated at runtime so only one copy loads. |
| **Share scope** | `default` | The runtime registry where every app announces "I can provide react@19.3.0". |
| **remoteEntry.js** | `apps/orders/dist/remoteEntry.js` | Script that creates the container plus the federation runtime. |
| **mf-manifest.json** | `apps/orders/dist/mf-manifest.json` | JSON description of the remote: entry file, exposes, shared versions, per-module assets. |

## What actually happens in the browser

Observed in DevTools → Network with both dev servers running:

```
 1  GET :3000/                       shell HTML
 2  GET :3000/main.js                shell entry + federation runtime (tiny: just import('./bootstrap'))
 3  GET :3002/mf-manifest.json       ← runtime reads Orders' manifest (fetch, needs CORS)
 4  GET :3002/remoteEntry.js         ← runtime loads the Orders container (<script>)
 5  GET :3000/…react…js              shared react: the SHELL's copy wins
 6  GET :3000/…react-dom…js          shared react-dom: the SHELL's copy wins
 7  GET :3000/…bootstrap…js          shell app code renders

    — user clicks "Orders" —

 8  GET :3002/__federation_expose_OrdersApp.css
 9  GET :3002/__federation_expose_OrdersApp.js   ← the exposed module
10  GET :3002/…jsx-dev-runtime…js                 not shared, so Orders brings its own
```

Three things to notice:

1. **Orders' copy of React is never downloaded.** Orders' `remoteEntry.js` registered
   "I can provide react 19.3.0" in the share scope, the shell registered the same, and the
   runtime picked one. With equal versions the host's copy is used.
2. **Steps 3–4 happen at startup, before anyone clicks Orders.** That is the default
   `shareStrategy: 'version-first'`: to choose the *highest* version of each shared library,
   the runtime must first ask *every* remote what it provides. This makes startup depend on
   every remote. See "What breaks" below.
3. **The CSS came with the module.** The manifest lists `css.sync` assets per exposed module;
   the runtime loads them before resolving the module.

## File by file

### `apps/orders/module-federation.config.mjs` — the remote's contract

- `name: 'orders'`: globally unique. It becomes the container's global name and the prefix
  consumers use (`orders@…`). Two remotes with the same name on one page will overwrite each other.
- `exposes: { './OrdersApp': './src/OrdersApp.tsx' }`: the whole public API. `orders-data.ts` is
  unreachable from outside, because a remote can only hand out what it exposes. Keep this
  list short. Every entry is something another team can depend on, so you can't freely change it.
- `shared`: see below.
- `manifest: true`: emit `mf-manifest.json`. Without it, consumers point at `remoteEntry.js`
  directly and lose preloading, type discovery and devtools.
- `dts: false`: MF 2.0 can generate `@mf-types.zip` from the remote and download it into the
  host automatically. We hand-write the type in `apps/shell/src/remotes.d.ts` for now, so the
  contract is visible and you can see what TypeScript *cannot* check across a network boundary.

### `apps/shell/module-federation.config.mjs` — the host's view

`remotes: { orders: 'orders@http://localhost:3002/mf-manifest.json' }`

- `orders` (left) is the **alias** used in imports: `import('orders/OrdersApp')`.
- `orders@` (right) must equal the remote's `name`.
- The URL is **data, not code**. Stage 7 turns it into per-environment config. That's the
  mechanism behind independent deployment: the shell never rebuilds when Orders changes.

### `shared` — why only React

```js
react:       { singleton: true, requiredVersion: '^19.3.0' },
'react-dom': { singleton: true, requiredVersion: '^19.3.0' },
```

- **Why share at all:** React holds module-level state (the current hooks dispatcher). If the
  shell renders `<OrdersApp/>` with React A and Orders calls `useState` from React B, you get
  "Invalid hook call". `singleton: true` means "exactly one copy on the page, even if versions differ".
- **`requiredVersion`:** the range this app is known to work with. If the chosen singleton
  falls outside it, the runtime warns and uses it anyway, because it's a singleton.
- **Why not share everything:** each shared library becomes a **runtime agreement** between
  teams that deploy independently. Share `lodash`, and upgrading lodash in Orders now involves
  every app on the page. Share only what *must* be single (stateful frameworks) or is so large
  that duplication hurts.

**Something from the build output:** `apps/*/dist/372.js` (~200 KB) is `react-dom/client`, and
it is in **both** builds. The key `react-dom` shares only that exact import, not its
`react-dom/client` subpath. That's harmless here: only the host calls `createRoot`, and
Orders' copy is used only in standalone mode. But it shows that shared keys match import
specifiers, not packages.

### `src/index.ts` → `src/bootstrap.tsx` — the async boundary

Both apps start with a file that does nothing but `import('./bootstrap')`.

Shared modules are resolved **asynchronously** (the runtime may need to fetch another app's
copy). If `main.js` synchronously imported React, the bundler would need React before the
share scope exists, and the runtime would throw *"Shared module is not available for eager
consumption"*. The dynamic import creates one async tick in which the runtime initialises
sharing.

(MF 2.0 can do this for you with `experiments.asyncStartup: true`. We keep it explicit so you
can see it.)

### `bootstrap.tsx` in Orders — standalone mode

Orders is a complete app. `pnpm dev:orders` → http://localhost:3002 mounts `OrdersApp`
in its own page, without the shell. That's how the Orders team works day to day. When the shell
loads Orders, `bootstrap.tsx` never runs; only the exposed module does.

### `rspack.config.mjs` — details that matter for federation

| Setting | App | Why |
| --- | --- | --- |
| `output.publicPath: 'auto'` | orders | The remote doesn't know its deployment URL. `'auto'` resolves chunk URLs relative to wherever `remoteEntry.js` or the manifest was loaded from. Hard-coding `http://localhost:3002/` would bake an environment into the artifact. |
| `output.publicPath: '/'` | shell | The shell owns the origin and its URLs. |
| `output.uniqueName` | both | Namespaces the chunk-loading global (`rspackChunkorders`) so two builds on one page don't collide. |
| `devServer.headers['Access-Control-Allow-Origin']` | orders | The shell (`:3000`) `fetch()`es the manifest from `:3002`. `<script>` tags ignore CORS; `fetch` doesn't. In production, allow-list the shell's origin, not `*`. |
| `lazyCompilation: false` | both | Rspack 2 compiles dynamic imports lazily in dev by default. With federation, that produced hot updates for the `orders` container chunk on pages that never loaded it (standalone Orders crashed with `rspackHotUpdateorders … reading 'push'`). |

### Styles

CSS is global. Once the shell loads Orders, both stylesheets live in one document, and
**Module Federation provides no style isolation**. Stage 1 used prefixed class names
(`orders-*`). Since the shared-UI stage, all apps use Tailwind + `@micro-shop/ui`, and the rule
is about *who ships what*: only the page owner ships the reset and token values; remotes ship
utilities only. See [shared-packages.md](shared-packages.md).

## What breaks (the Stage 1 experiment)

Stop the Orders dev server and reload http://localhost:3000.

The shell shows a **blank page**, even the Home view, which uses no Orders code. Console:

```
[ Federation Runtime ]: Failed to get manifest. #RUNTIME-003  manifestUrl: http://localhost:3002/mf-manifest.json
[shell] failed to bootstrap
```

Two independent causes, both fixed in Stage 6:

1. `version-first` fetches every remote's manifest **during startup**, so an unreachable remote
   rejects the shell's bootstrap promise.
2. Even with startup fixed, `lazy(() => import('orders/OrdersApp'))` would reject when you click
   Orders. There is no error boundary, so React would unmount the whole tree.

So far we have independent *builds*, but not independent *runtime* failure.

## What production systems do differently

- Remote URLs come from **config or a service** (an "MFE registry"), not the shell's build.
- Artifacts are **immutable and versioned** (`/orders/1.4.2/mf-manifest.json`). A mutable
  pointer decides which version is live, which gives cheap rollback.
- `mf-manifest.json` is served with **short or no caching**; hashed chunks get long caching.
- Remote failures are expected: **retry plugin**, error boundaries and fallbacks.
- Shared-version drift is **monitored** (the runtime warns; production sends those warnings to
  error tracking).
