import { Component } from '@angular/core';
import { buildRoutes, validateFeatures } from './assemble';
import { DuneError } from './dune-error';
import { Feature } from './feature';

@Component({ template: '' })
class Dummy {}

const owns = (id: string, screen: string): Feature => ({
  id,
  entrypoints: [{ screen, slot: 'screen', component: Dummy }],
});

describe('validateFeatures', () => {
  it('refuses two owners for one screen and names the supported path', () => {
    expect(() => validateFeatures([owns('a', 'home'), owns('b', 'home')])).toThrowError(DuneError);
    expect(() => validateFeatures([owns('a', 'home'), owns('b', 'home')])).toThrowError(/slot 'banner'/);
  });

  it('lists existing screens when a feature adds to a missing one', () => {
    const banner: Feature = { id: 'banner', entrypoints: [{ screen: 'transfers', slot: 'banner', component: Dummy }] };
    expect(() => validateFeatures([owns('home', 'home'), banner])).toThrowError(/Existing screens: home/);
  });

  it('builds one route per screen owner', () => {
    const paths = buildRoutes([owns('home', 'home'), owns('transfer', 'transfer')], 'home').map((r) => r.path);
    expect(paths).toEqual(['home', 'transfer', '', '**']);
  });
});
