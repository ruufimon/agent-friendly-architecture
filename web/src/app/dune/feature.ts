import { InjectionToken, Type } from '@angular/core';

/** Where on a screen an entrypoint appears, top to bottom. */
export type Slot = 'screen' | 'banner' | 'body' | 'actions';

/**
 * How a feature puts something into the app.
 * Exactly one feature owns each screen (slot 'screen'); any feature may add to it.
 */
export interface Entrypoint {
  screen: string;
  slot: Slot;
  component: Type<unknown>;
  /** Tab label, for screen owners only. */
  label?: string;
}

/**
 * A feature owns one folder under src/app/features/.
 * It is discovered from the reserved file `feature.ts` in that folder, never from a shared list.
 */
export interface Feature {
  /** Same as the folder name, e.g. 'fraud-banner'. */
  id: string;
  entrypoints: Entrypoint[];
}

export const FEATURES = new InjectionToken<Feature[]>('FEATURES');
