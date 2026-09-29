import { expect, type Page } from '@playwright/test';

/** Signs in through Auth's own form, the way a user would. */
export async function signIn(page: Page, path = '/orders'): Promise<void> {
  await page.goto(path);
  await page.getByLabel('Password', { exact: true }).fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('banner')).toContainText('Ada Lovelace');
}

/** The text every remote renders in its header: "Rendered by the <App> build". */
export function renderedBy(page: Page, app: 'Orders' | 'Shipping') {
  return page.getByText(`Rendered by the ${app} build`);
}
