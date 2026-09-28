import { expect, test } from '@playwright/test';

// What a search engine sees: raw HTML, no JavaScript executed.

test('product pages are server-rendered with metadata and structured data', async ({ request }) => {
  const response = await request.get('/products/standing-desk');
  expect(response.headers()['x-served-by-zone']).toBe('storefront');

  const html = await response.text();
  expect(html).toContain('<title>Standing desk · Micro Shop</title>');
  expect(html).toContain('<meta name="description" content="A dual-motor electric standing desk');
  expect(html).toContain('<link rel="canonical" href="http://localhost:8080/products/standing-desk"');
  expect(html).toContain('"@type":"Product"');
});

test('robots.txt keeps crawlers out of the signed-in zone', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /orders');
  expect(robots).toContain('Disallow: /shipping');
});

test('the signed-in zone is served by the shell, not the storefront', async ({ request }) => {
  const response = await request.get('/orders', { headers: { accept: 'text/html' } });
  expect(response.headers()['x-served-by-zone']).toBe('shell');
});
