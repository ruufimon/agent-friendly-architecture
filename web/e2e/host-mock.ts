import { Page, Route } from '@playwright/test';

type Handler = (route: Route) => Promise<void>;

const json = (route: Route, status: number, body: unknown, contentType = 'application/json') =>
  route.fulfill({ status, contentType, body: JSON.stringify(body) });

/** Fakes the host API in the browser, following bank-api/openapi.yaml. Override one endpoint per test. */
export async function mockHost(
  page: Page,
  overrides: Partial<Record<'fraud-score' | 'loan-eligibility' | 'transfers', Handler>> = {},
): Promise<void> {
  const defaults: Record<string, Handler> = {
    'fraud-score': (route) => {
      const { amount } = route.request().postDataJSON() as { amount: number };
      return json(route, 200, amount >= 20_000 ? { score: 85, level: 'HIGH' } : { score: 25, level: 'LOW' });
    },
    'loan-eligibility': (route) => json(route, 200, { eligible: true, productId: 'personal-loan-standard' }),
    transfers: (route) => json(route, 201, { transferId: 'trf_000001', status: 'COMPLETED', newBalance: 27_300 }),
  };

  await page.route('**/host/v1/**', (route) => {
    const endpoint = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const handler = overrides[endpoint as keyof typeof overrides] ?? defaults[endpoint];
    return handler ? handler(route) : route.abort();
  });
}

export const problem = (route: Route, status: number, title: string, detail: string, supportedPath: string) =>
  json(
    route,
    status,
    { type: `https://api.sandbank.example/problems/${status}`, title, status, detail, supportedPath },
    'application/problem+json',
  );
