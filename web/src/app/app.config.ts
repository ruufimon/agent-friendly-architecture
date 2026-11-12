import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { demoAuthInterceptor } from './bank/bank-host';
import { buildRoutes, validateFeatures } from './dune/assemble';
import { FEATURES } from './dune/feature';
import { features } from './features.generated';

// Nothing here changes when a feature is added (rule 4): features.generated.ts is
// written by scripts/discover-features.mjs from the folders under src/app/features/.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: FEATURES, useValue: features },
    provideAppInitializer(() => validateFeatures(inject(FEATURES))),
    provideRouter(buildRoutes(features, 'home')),
    provideHttpClient(withInterceptors([demoAuthInterceptor])),
  ],
};
