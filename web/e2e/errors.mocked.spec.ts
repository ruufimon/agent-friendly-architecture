import { expect, test } from '@playwright/test';
import { mockHost, problem } from './host-mock';

// Mocked: the real Angular app with the API faked in the browser,
// for cases that are hard to produce against the real server.

test('a refused transfer shows the server’s reason and the supported path', async ({ page }) => {
  await mockHost(page, {
    transfers: (route) =>
      problem(route, 422, 'Insufficient funds', 'Amount 60,000 is more than the balance of 52,300.', 'Lower the amount or choose another source account.'),
  });
  await page.goto('/transfer');
  await page.getByRole('button', { name: 'Confirm transfer' }).click();

  const alert = page.getByRole('alert').filter({ hasText: 'Insufficient funds' });
  await expect(alert).toContainText('→ Lower the amount or choose another source account.');
  await expect(page).toHaveURL(/\/transfer$/);
  await expect(page.getByRole('button', { name: 'Confirm transfer' })).toBeEnabled();
});

test('when the server is down, the app says how to start it', async ({ page }) => {
  await mockHost(page, { transfers: (route) => route.abort('connectionrefused') });
  await page.goto('/transfer');
  await page.getByRole('button', { name: 'Confirm transfer' }).click();

  await expect(page.getByRole('alert').filter({ hasText: 'Server not reachable' })).toContainText(
    './gradlew :host-server:run',
  );
});

test('the fraud banner shows only for a HIGH score', async ({ page }) => {
  await mockHost(page);
  await page.goto('/transfer');
  const banner = page.getByRole('alert').filter({ hasText: 'Check the recipient' });
  await expect(banner).toBeVisible();

  const amount = page.getByLabel('Amount (฿)');
  await amount.fill('5000');
  await amount.press('Tab');
  await expect(banner).toBeHidden();
});

test('the loan offer is hidden when the customer is not eligible', async ({ page }) => {
  await mockHost(page, {
    'loan-eligibility': (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"eligible":false}' }),
  });
  await page.goto('/home');

  await expect(page.getByRole('region', { name: 'Balance' })).toContainText('฿52,300');
  await expect(page.getByRole('region', { name: 'Personal loan offer' })).toHaveCount(0);
});

test('on a phone the app fills the screen without the frame', async ({ page }) => {
  await mockHost(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/home');

  const device = page.locator('.device');
  await expect(device).toHaveCSS('border-top-width', '0px');
  expect((await device.boundingBox())?.width).toBe(375);
});
