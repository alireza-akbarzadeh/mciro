// @ts-check
// The gateway: one public origin (http://localhost:8080) in front of two zones.
//
// In production this job belongs to a CDN or reverse proxy (CloudFront,
// Cloudflare, nginx, Vercel Microfrontends...). It's written by hand here, with
// no dependencies, so every routing decision is visible.
//
//   /  /products/*  /categories/*  /search  /catalog.json  /sitemap.xml  /robots.txt  /_next/*
//                                                         → storefront (Next.js)
//   /api/cart/*                                           → cart-api (Fastify, the Cart team's backend)
//   /api/auth/*                                           → auth-api (Fastify, users and sessions)
//   everything else: /orders/*, /shipping/*, /cart/*, /checkout, shell assets
//                                                         → shell (Module Federation host)
//
// Remote micro-frontends (auth, orders, shipping, cart) are NOT behind the
// gateway: the shell loads them from their own origins, the way it would from a
// CDN. APIs ARE behind it: same origin as the page, so no CORS, and cookies work.

import http from 'node:http';
import net from 'node:net';

const PORT = Number(process.env.GATEWAY_PORT ?? 8080);

const zones = {
  storefront: { host: '127.0.0.1', port: Number(process.env.STOREFRONT_PORT ?? 3004) },
  shell: { host: '127.0.0.1', port: Number(process.env.SHELL_PORT ?? 3000) },
  'cart-api': { host: '127.0.0.1', port: Number(process.env.CART_API_PORT ?? 4005) },
  'auth-api': { host: '127.0.0.1', port: Number(process.env.AUTH_API_PORT ?? 4001) },
  // Production simulation only (infra/prod/start.mjs sets CDN_PORT).
  cdn: { host: '127.0.0.1', port: Number(process.env.CDN_PORT ?? 8081) },
};

/** @param {string} pathname @returns {keyof typeof zones} */
function zoneFor(pathname) {
  // Production: the remote registry is deployment data owned by the release
  // pipeline, so it's served by the CDN. In dev the shell's dev server serves it.
  if (pathname === '/mfe-registry.json' && process.env.CDN_PORT) return 'cdn';
  if (pathname === '/api/cart' || pathname.startsWith('/api/cart/')) return 'cart-api';
  if (pathname.startsWith('/api/auth/')) return 'auth-api';
  if (pathname === '/') return 'storefront';
  if (pathname.startsWith('/products/') || pathname === '/products') return 'storefront';
  if (pathname.startsWith('/categories/')) return 'storefront';
  // Catalog search. A public page, so it lives in the storefront zone.
  if (pathname === '/search') return 'storefront';
  // The catalog's read API (names and prices), used by the Cart API.
  if (pathname === '/catalog.json') return 'storefront';
  if (pathname === '/sitemap.xml' || pathname === '/robots.txt') return 'storefront';
  // Next.js assets, dev overlay and HMR websocket.
  if (pathname.startsWith('/_next/') || pathname.startsWith('/__nextjs')) return 'storefront';
  return 'shell';
}

/** Headers for the upstream request: talk to the upstream as itself, remember the public host. */
function upstreamHeaders(/** @type {http.IncomingHttpHeaders} */ headers, /** @type {{host: string, port: number}} */ target) {
  return {
    ...headers,
    host: `localhost:${target.port}`,
    'x-forwarded-host': headers.host ?? `localhost:${PORT}`,
    'x-forwarded-proto': 'http',
  };
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://gateway').pathname;
  const zone = zoneFor(pathname);
  const target = zones[zone];

  const upstream = http.request(
    { host: target.host, port: target.port, method: req.method, path: req.url, headers: upstreamHeaders(req.headers, target) },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, { ...upstreamRes.headers, 'x-served-by-zone': zone });
      upstreamRes.pipe(res);
    },
  );

  upstream.on('error', (error) => {
    // A zone being down must not take the gateway down: answer with a clear 502.
    console.error(`[gateway] ${zone} unreachable: ${error.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'x-served-by-zone': zone });
    }
    res.end(`The ${zone} zone is unavailable (${target.host}:${target.port}).`);
  });

  req.pipe(upstream);
});

// WebSockets (dev-server hot reload for both zones) arrive as HTTP "upgrade"
// requests. Forward the raw request line + headers, then splice the sockets.
server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url ?? '/', 'http://gateway').pathname;
  const target = zones[zoneFor(pathname)];
  const upstream = net.connect(target.port, target.host, () => {
    const headers = upstreamHeaders(req.headers, target);
    const lines = Object.entries(headers).flatMap(([name, value]) =>
      value === undefined ? [] : (Array.isArray(value) ? value : [value]).map((v) => `${name}: ${v}`),
    );
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${lines.join('\r\n')}\r\n\r\n`);
    if (head.length > 0) upstream.write(head);
    upstream.pipe(socket).pipe(upstream);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(PORT, () => {
  console.log(`[gateway] http://localhost:${PORT}`);
  console.log(`[gateway]   / /products/* /search /_next/*  → storefront :${zones.storefront.port}`);
  console.log(`[gateway]   /api/cart/*                      → cart-api   :${zones['cart-api'].port}`);
  console.log(`[gateway]   /api/auth/*                      → auth-api   :${zones['auth-api'].port}`);
  console.log(`[gateway]   everything else                  → shell      :${zones.shell.port}`);
});
