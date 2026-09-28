// @ts-check
// A tiny static file server that plays two production roles:
//
//   CDN          node infra/static/serve.mjs --dir infra/cdn/public --port 8081 --cors --name cdn
//   shell host   node infra/static/serve.mjs --dir apps/shell/dist  --port 3000 --spa  --name shell
//
// Cache headers are the important part:
//   mf-manifest.json, mfe-registry.json, *.html  →  no-cache (always revalidate)
//   everything else under a versioned path       →  immutable, cached for a year
// A release changes WHICH files the registry points to, never the files
// themselves, so aggressive caching is safe and rollback is instant.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    dir: { type: 'string' },
    port: { type: 'string' },
    name: { type: 'string', default: 'static' },
    spa: { type: 'boolean', default: false },
    cors: { type: 'boolean', default: false },
  },
});

if (!values.dir || !values.port) {
  console.error('usage: serve.mjs --dir <folder> --port <port> [--spa] [--cors] [--name <label>]');
  process.exit(1);
}

const root = path.resolve(values.dir);
const port = Number(values.port);
const name = values.name;

/** @type {Record<string, string>} */
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.zip': 'application/zip',
};

/** @param {string} filePath */
function cacheControl(filePath) {
  const base = path.basename(filePath);
  if (base === 'mf-manifest.json' || base === 'mfe-registry.json' || base.endsWith('.html')) {
    return 'no-cache';
  }
  return 'public, max-age=31536000, immutable';
}

/** @param {string} filePath */
function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  if (values.cors) {
    // Production: allow-list the shell's origin instead of "*".
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://static').pathname);
  let filePath = path.join(root, pathname);

  // Never serve anything outside the root folder.
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  if (!isFile(filePath) && isFile(path.join(filePath, 'index.html'))) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!isFile(filePath) && values.spa && !path.extname(pathname)) {
    // Single-page app: unknown routes (/orders/1002) get index.html; the router takes over.
    filePath = path.join(root, 'index.html');
  }
  if (!isFile(filePath)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`not found: ${pathname}`);
    return;
  }

  res.writeHead(200, {
    'content-type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
    'cache-control': cacheControl(filePath),
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`[${name}] serving ${root} on http://localhost:${port}`);
});
