import { expect, test } from '@playwright/test';

// Cart and checkout: a journey across both zones and four apps.
// Storefront → Cart (guest) → Auth (sign in at checkout) → Orders → Shipping.

test('the catalog read API is served by the storefront with public fields only', async ({
  request,
}) => {
  const response = await request.get('/catalog.json');
  expect(response.headers()['x-served-by-zone']).toBe('storefront');

  const { products } = (await response.json()) as { products: Record<string, unknown>[] };
  expect(products).toHaveLength(6);
  expect(Object.keys(products[0] ?? {}).sort()).toEqual(['name', 'price', 'slug']);
});

test('a guest adds products from the storefront and edits the cart', async ({ page }) => {
  await page.goto('/products/standing-desk');
  await page.getByRole('link', { name: 'Add to cart' }).click();

  // /cart/add replaced itself with /cart: Back or reload can't add it twice.
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('row', { name: /Standing desk/ })).toBeVisible();
  await expect(page.getByTestId('cart-total')).toHaveText('$540.00');
  await expect(page.getByRole('link', { name: 'Cart, 1 item' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('link', { name: 'Cart, 1 item' })).toBeVisible();

  await page.getByRole('button', { name: 'Increase quantity of Standing desk' }).click();
  await expect(page.getByTestId('cart-total')).toHaveText('$1,080.00');
  await expect(page.getByRole('link', { name: 'Cart, 2 items' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove Standing desk' }).click();
  await expect(page.getByText('Your cart is empty.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cart, 0 items' })).toBeVisible();
});

test('checkout asks for sign-in, then Orders creates the order and Shipping ships it', async ({
  page,
}) => {
  await page.goto('/products/monitor-arm');
  await page.getByRole('link', { name: 'Add to cart' }).click();
  await expect(page.getByRole('row', { name: /Monitor arm/ })).toBeVisible();

  // Checkout is behind the shell's sign-in policy; the cart itself was not.
  await page.getByRole('link', { name: 'Checkout' }).click();
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // The shell passed the signed-in customer to Cart's checkout.
  await expect(page.getByText('Ordering as Ada Lovelace.')).toBeVisible();
  await page.getByRole('button', { name: 'Place order' }).click();

  // Cart → checkout.completed → Orders created the order and resolved the checkout to it.
  await expect(page).toHaveURL(/\/orders\/\d+$/);
  const orderId = new URL(page.url()).pathname.split('/').pop() ?? '';
  await expect(page.getByRole('heading', { name: `Order #${orderId}` })).toBeVisible();
  await expect(page.getByText(/Ada Lovelace · placed/)).toBeVisible();
  await expect(page.getByRole('row', { name: /Monitor arm/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cart, 0 items' })).toBeVisible();

  // Orders → order.created → Shipping (loaded now, catching up by replay) ships it.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Shipping' }).click();
  await expect(page.getByRole('cell', { name: `#${orderId}` })).toBeVisible();
});

test('a crashing Cart is contained: the header badge and the cart page fail, nothing else', async ({
  page,
}) => {
  await page.goto('/cart?break=cart');

  await expect(page.getByText('Cart is temporarily unavailable')).toBeVisible();
  await expect(page.getByText('Cart unavailable')).toBeVisible();
  // Auth's user menu, right next to the broken badge, still renders.
  await expect(page.getByRole('banner')).toContainText('Guest');
});
