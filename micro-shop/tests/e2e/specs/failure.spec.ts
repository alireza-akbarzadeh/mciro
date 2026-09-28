import { expect, test } from '@playwright/test';
import { renderedBy, signIn } from './helpers';

// Failure isolation. Instead of killing servers, the tests make the browser
// unable to reach a remote's origin: to the shell it looks exactly like an outage.

test('Orders is unreachable: only Orders shows a fallback, the rest keeps working', async ({ page }) => {
  await signIn(page, '/shipping');
  await page.route('http://localhost:3002/**', (route) => route.abort('connectionrefused'));

  await page.getByRole('link', { name: 'Orders', exact: true }).click();
  await expect(page.getByText('Orders is temporarily unavailable')).toBeVisible();

  // The shell, Auth's menu and the other remotes still work.
  await expect(page.getByRole('banner')).toContainText('Ada Lovelace');
  await page.getByRole('link', { name: 'Shipping', exact: true }).click();
  await expect(renderedBy(page, 'Shipping')).toBeVisible();
});

test('Retry recovers once the remote is reachable again', async ({ page }) => {
  await signIn(page, '/shipping');
  await page.route('http://localhost:3002/**', (route) => route.abort('connectionrefused'));
  await page.getByRole('link', { name: 'Orders', exact: true }).click();
  await expect(page.getByText('Orders is temporarily unavailable')).toBeVisible();

  await page.unroute('http://localhost:3002/**');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(renderedBy(page, 'Orders')).toBeVisible();
});

test('a remote that crashes while rendering is contained (?break=shipping)', async ({ page }) => {
  await signIn(page, '/orders');
  await page.goto('/shipping?break=shipping');

  await expect(page.getByText('Shipping is temporarily unavailable')).toBeVisible();
  await expect(page.getByRole('banner')).toContainText('Ada Lovelace');
});

test('Auth unreachable: protected pages fail closed', async ({ page }) => {
  await page.route('http://localhost:3001/**', (route) => route.abort('connectionrefused'));
  await page.goto('/orders');

  await expect(page.getByText('Auth is temporarily unavailable')).toBeVisible();
  await expect(renderedBy(page, 'Orders')).toHaveCount(0);
});
