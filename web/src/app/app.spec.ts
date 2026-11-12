import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { buildRoutes } from './dune/assemble';
import { FEATURES } from './dune/feature';
import { features } from './features.generated';

describe('Sand Bank screens', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: FEATURES, useValue: features },
        provideRouter(buildRoutes(features, 'home')),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  it('shows the balance and adds the loan offer to home through a slot', async () => {
    const harness = await RouterTestingHarness.create('/home');
    TestBed.inject(HttpTestingController)
      .expectOne('/host/v1/loan-eligibility')
      .flush({ eligible: true, productId: 'personal-loan-standard' });
    await harness.fixture.whenStable();

    const text = (harness.routeNativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('฿52,300');
    expect(text).toContain('Personal loan offer');
  });

  it('adds the fraud banner to transfer when the host scores it HIGH', async () => {
    const harness = await RouterTestingHarness.create('/transfer');
    TestBed.inject(HttpTestingController)
      .expectOne('/host/v1/fraud-score')
      .flush({ score: 85, level: 'HIGH', reasons: ['NEW_RECIPIENT'] });
    await harness.fixture.whenStable();

    const text = (harness.routeNativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Check the recipient');
  });
});
