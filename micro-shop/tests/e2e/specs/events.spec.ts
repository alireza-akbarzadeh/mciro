import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('checkout → order.created → Shipping creates a shipment → Orders learns about it', async ({ page }) => {
  await signIn(page, '/orders');

  // A real order: the Cart API has the Orders API create it at checkout.
  // (page.request shares the page's cookies: same cart, same session.)
  await page.request.post('/api/cart/items', { data: { productSlug: 'wireless-mouse' } });
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page).toHaveURL(/\/orders\/(\d+)$/);
  const orderId = page.url().split('/').pop() ?? '';
  await expect(page.getByRole('heading', { name: `Order #${orderId}` })).toBeVisible();

  // Shipping's code isn't loaded yet, so nobody reacted.
  await expect(page.getByText('Waiting for Shipping')).toBeVisible();
  // The shell's event log starts minimized; open it to watch the events.
  await page.getByRole('button', { name: /^Open event log/ }).click();
  const log = page.getByRole('complementary', { name: 'Event log' });
  await expect(log).toContainText('order.created');

  // Opening Shipping loads it; it replays the missed event and creates a shipment.
  await page.getByRole('link', { name: 'Shipping', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: `#${orderId}` })).toBeVisible();
  await expect(log).toContainText('shipment.created');

  // Back in Orders, the read model now knows about the shipment.
  await page.goBack();
  await expect(page.getByRole('link', { name: 'Track shipment →' })).toBeVisible();
});

test('orders live on the server: a reload still shows them, and only your own', async ({ page }) => {
  await signIn(page, '/orders');
  await expect(page.getByRole('link', { name: '#1002' })).toBeVisible();
  // #1003 is Grace Hopper's.
  await expect(page.getByRole('link', { name: '#1003' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('link', { name: '#1002' })).toBeVisible();

  const response = await page.request.get('/api/orders/1003');
  expect(response.status()).toBe(404);
});
