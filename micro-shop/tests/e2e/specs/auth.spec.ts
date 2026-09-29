import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// Sign-in is real now: the Auth API checks the password against a scrypt hash
// in Postgres and keeps the session in an HttpOnly cookie.

test('the session cookie is HttpOnly: page scripts can’t read it', async ({ page, context }) => {
  await signIn(page);

  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === 'micro-shop-session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Lax');
  // The display-name cookie (for the storefront's "Signed in as") is readable; the token is not.
  const visible = await page.evaluate(() => document.cookie);
  expect(visible).toContain('micro-shop-user=');
  expect(visible).not.toContain('micro-shop-session');
});

test('a wrong password is refused', async ({ page }) => {
  await page.goto('/orders');
  await page.getByLabel('Password', { exact: true }).fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid email or password')).toBeVisible();
});

test('the account menu shows who you are and signs you out, on the server too', async ({ page }) => {
  await signIn(page);

  await page.getByRole('button', { name: 'Account menu for Ada Lovelace' }).click();
  await expect(page.getByRole('menu')).toContainText('ada@example.com');
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  await expect(page.getByRole('banner')).toContainText('Guest');
  // Reload: the server agrees the session is over.
  await page.reload();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
});

test('a visitor creates an account and is signed in with it', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto('/orders');
  await page.getByRole('tab', { name: 'Create account' }).click();

  await page.getByLabel('Full name').fill('Katherine Johnson');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('orbital-mechanics');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('banner')).toContainText('Katherine Johnson');
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);

  // The same email can't be taken twice.
  await page.getByRole('button', { name: 'Account menu for Katherine Johnson' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.goto('/orders');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Full name').fill('Someone Else');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('another-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('An account with this email already exists')).toBeVisible();
});

test('the session survives a reload: it lives on the server, not in the page', async ({ page }) => {
  await signIn(page);
  await page.reload();
  await expect(page.getByRole('banner')).toContainText('Ada Lovelace');
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
});
