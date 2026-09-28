import { expect, test } from '@playwright/test';
import { renderedBy, signIn } from './helpers';

test('a user opens Orders, an order, and follows it into Shipping', async ({ page }) => {
  await signIn(page, '/orders');

  // The Orders remote loaded inside the shell.
  await expect(renderedBy(page, 'Orders')).toBeVisible();

  // URL-based navigation inside Orders.
  await page.getByRole('link', { name: '#1002' }).click();
  await expect(page).toHaveURL(/\/orders\/1002$/);
  await expect(page.getByRole('heading', { name: /Order #1002/ })).toBeVisible();

  // Cross-app navigation through the URL contract: Orders → Shipping.
  await page.getByRole('link', { name: 'Track shipment →' }).click();
  await expect(page).toHaveURL(/\/shipping\/SHP-2002$/);
  await expect(renderedBy(page, 'Shipping')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Tracking history' })).toBeVisible();
});

test('the storefront and the shell are one product behind the gateway', async ({ page }) => {
  await signIn(page, '/orders');

  // Crossing zones is a full page load; identity travels in a cookie.
  await page.getByRole('link', { name: 'Store' }).click();
  await expect(page).toHaveURL('http://localhost:8080/');
  await expect(page.getByRole('banner')).toContainText('Signed in as Ada Lovelace');
});
