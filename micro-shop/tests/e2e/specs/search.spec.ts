import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// Catalog search lives in the storefront zone (/search). The shell only offers a
// search box that crosses into that zone.

test('search results are server-rendered by the storefront and kept out of the index', async ({
  request,
}) => {
  const response = await request.get('/search?q=desk');
  expect(response.headers()['x-served-by-zone']).toBe('storefront');

  const html = await response.text();
  expect(html).toContain('Standing desk');
  expect(html).toContain('Monitor arm');
  expect(html).not.toContain('Mechanical keyboard');
  expect(html).toContain('<meta name="robots" content="noindex, follow"');
});

test('searching from the storefront header shows matching products', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Search the store' }).fill('keyboard');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/search\?q=keyboard$/);
  await expect(page.getByText('1 product matches “keyboard”.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Mechanical keyboard/ })).toBeVisible();
});

test('a search with no match offers a way back to the catalog', async ({ page }) => {
  await page.goto('/search?q=toaster');
  await expect(page.getByText('0 products match “toaster”.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'browse all products' })).toBeVisible();
});

test('the shell header search crosses into the storefront zone', async ({ page }) => {
  await signIn(page);
  await page.getByRole('searchbox', { name: 'Search the store' }).fill('monitor');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/search\?q=monitor$/);
  await expect(page.getByRole('heading', { name: 'Search', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /27" monitor/ })).toBeVisible();
});
