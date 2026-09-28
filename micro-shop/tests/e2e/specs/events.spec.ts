import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('order.created → Shipping creates a shipment → Orders learns about it', async ({ page }) => {
  await signIn(page, '/orders');

  await page.getByRole('button', { name: 'Create test order' }).click();
  await expect(page).toHaveURL(/\/orders\/(\d+)$/);
  const orderId = page.url().split('/').pop() ?? '';

  // Shipping's code isn't loaded yet, so nobody reacted.
  await expect(page.getByText('Waiting for Shipping')).toBeVisible();
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
