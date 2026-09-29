import { expect, test } from '@playwright/test';

// Cart and checkout: a journey across both zones, four apps and the Cart API.
// Storefront → Cart API → Cart (guest) → Auth (sign in at checkout) → Orders → Shipping.

test('the catalog read API is served by the storefront with public fields only', async ({
  request,
}) => {
  const response = await request.get('/catalog.json');
  expect(response.headers()['x-served-by-zone']).toBe('storefront');

  const { products } = (await response.json()) as { products: Record<string, unknown>[] };
  expect(products.length).toBeGreaterThanOrEqual(20); // the seed catalog
  expect(Object.keys(products[0] ?? {}).sort()).toEqual(['name', 'price', 'slug']);
});

test('the cart API sits behind the gateway, keyed by an HttpOnly cookie, priced on the server', async ({
  request,
}) => {
  const added = await request.post('/api/cart/items', { data: { productSlug: 'usb-c-cable', quantity: 2 } });
  expect(added.headers()['x-served-by-zone']).toBe('cart-api');
  expect(added.headers()['set-cookie']).toMatch(/micro-shop-cart=.*; Path=\/api\/cart; HttpOnly; SameSite=Lax/);

  // The same "browser" (cookie) sees its cart; the price came from the catalog.
  const cart = await (await request.get('/api/cart')).json();
  expect(cart).toMatchObject({ itemCount: 2, total: 24, lines: [{ name: 'USB-C cable', unitPrice: 12 }] });

  expect((await request.post('/api/cart/items', { data: { productSlug: 'toaster' } })).status()).toBe(404);
});

test('a guest adds products from the storefront and edits the cart', async ({ page }) => {
  await page.goto('/products/standing-desk');
  // A plain form POST to the Cart API, answered with 303 → /cart (Post/Redirect/Get).
  // `exact`: related products below have their own "Add <name> to cart" buttons.
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText('Added Standing desk to your cart')).toBeVisible();
  await expect(page.getByRole('row', { name: /Standing desk/ })).toBeVisible();
  await expect(page.getByTestId('cart-total')).toHaveText('$540.00');
  await expect(page.getByRole('link', { name: 'Cart, 1 item' })).toBeVisible();

  // The cart is on the server now: reloading shows it, and doesn't post again.
  await page.reload();
  await expect(page.getByRole('link', { name: 'Cart, 1 item' })).toBeVisible();

  await page.getByRole('button', { name: 'Increase quantity of Standing desk' }).click();
  await expect(page.getByTestId('cart-total')).toHaveText('$1,080.00');
  await expect(page.getByRole('link', { name: 'Cart, 2 items' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove Standing desk' }).click();
  await expect(page.getByText('Your cart is empty.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cart, 0 items' })).toBeVisible();

  // Removing is instant, and the toast can take it back.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('cart-total')).toHaveText('$1,080.00');
});

test('category pages list their products, and any card adds to the cart', async ({ page }) => {
  await page.goto('/categories/lighting');
  await expect(page.getByRole('heading', { name: 'Lighting', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Monitor light bar' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Standing desk' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add Monitor light bar to cart' }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('row', { name: /Monitor light bar/ })).toBeVisible();
});

test('checkout asks for sign-in, then Orders creates the order and Shipping ships it', async ({
  page,
}) => {
  await page.goto('/products/monitor-arm');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
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
