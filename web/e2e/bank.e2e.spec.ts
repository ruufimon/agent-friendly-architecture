import { expect, test } from '@playwright/test';

// Full stack: the real Angular app talking to the real Kotlin host-server.
// The server starts fresh for each run, so the demo balance begins at ฿52,300.
test.describe.serial('Sand Bank against the real host-server', () => {
  test('home shows the balance and the loan offer', async ({ page }) => {
    await page.goto('/home');

    await expect(page.getByRole('region', { name: 'Balance' })).toContainText('฿52,300');
    await expect(page.getByRole('region', { name: 'Personal loan offer' })).toBeVisible();
  });

  test('the fraud banner follows the amount', async ({ page }) => {
    await page.goto('/transfer');
    const amount = page.getByLabel('Amount (฿)');
    const banner = page.getByRole('alert').filter({ hasText: 'Check the recipient' });

    await expect(amount).toHaveValue('25000');
    await expect(banner).toBeVisible();

    await amount.fill('5000');
    await amount.press('Tab');
    await expect(banner).toBeHidden();

    await amount.fill('25000');
    await amount.press('Tab');
    await expect(banner).toBeVisible();
  });

  test('confirming a transfer updates the balance and hides the offer', async ({ page }) => {
    await page.goto('/transfer');
    await page.getByRole('button', { name: 'Confirm transfer' }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole('region', { name: 'Balance' })).toContainText('฿27,300');
    await expect(page.getByRole('status')).toContainText('trf_000001');
    // The server now says the customer is not eligible (balance under ฿30,000).
    await expect(page.getByRole('region', { name: 'Personal loan offer' })).toHaveCount(0);
  });

  test('tabs move between the two screens', async ({ page }) => {
    await page.goto('/home');
    const tabs = page.getByRole('navigation', { name: 'Screens' });

    await tabs.getByRole('link', { name: 'Transfer' }).click();
    await expect(page.getByRole('heading', { name: 'Sand Bank · Transfer' })).toBeVisible();

    await tabs.getByRole('link', { name: 'Home' }).click();
    await expect(page.getByRole('heading', { name: 'Sand Bank · Home' })).toBeVisible();
  });
});
