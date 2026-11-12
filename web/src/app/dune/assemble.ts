import { Routes } from '@angular/router';
import { DuneError } from './dune-error';
import { Entrypoint, Feature } from './feature';

/** Checks the discovered features fit together. Runs at startup and in tests. */
export function validateFeatures(features: Feature[]): void {
  const ids = features.map((f) => f.id);
  const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicateIds.length > 0) {
    throw new DuneError(
      `Feature id used twice: ${[...new Set(duplicateIds)].join(', ')}.`,
      'Each feature owns one folder. Use your folder name under src/app/features/ as the id.',
    );
  }

  const owners = new Map<string, string[]>();
  for (const f of features) {
    for (const e of f.entrypoints.filter((e) => e.slot === 'screen')) {
      owners.set(e.screen, [...(owners.get(e.screen) ?? []), f.id]);
    }
  }
  for (const [screen, ids] of owners) {
    if (ids.length > 1) {
      throw new DuneError(
        `Screen '${screen}' is provided by ${ids.join(' and ')}.`,
        `A screen has one owner. To add to '${screen}', use slot 'banner', 'body' or 'actions' in your own feature.`,
      );
    }
  }

  for (const f of features) {
    for (const e of f.entrypoints.filter((e) => e.slot !== 'screen' && !owners.has(e.screen))) {
      throw new DuneError(
        `Feature '${f.id}' adds to screen '${e.screen}', which no feature provides.`,
        `Existing screens: ${[...owners.keys()].sort().join(', ')}. Use one of them, or create a feature that owns the screen.`,
      );
    }
  }
}

/** Screen owners, in the order their features were discovered. */
export function screens(features: Feature[]): Entrypoint[] {
  return features.flatMap((f) => f.entrypoints).filter((e) => e.slot === 'screen');
}

/** Routes come from screen owners: adding a screen never means editing a routes file. */
export function buildRoutes(features: Feature[], home: string): Routes {
  return [
    ...screens(features).map((e) => ({
      path: e.screen,
      component: e.component,
      title: `Sand Bank · ${e.label ?? e.screen}`,
    })),
    { path: '', pathMatch: 'full' as const, redirectTo: home },
    { path: '**', redirectTo: home },
  ];
}
