import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { screens } from './dune/assemble';
import { FEATURES } from './dune/feature';

/** The phone-shaped shell from the workshop slide. Tabs come from screen owners, not a hand-kept list. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="device">
      <main class="screen"><router-outlet /></main>
      <nav class="tabs" aria-label="Screens">
        @for (tab of tabs; track tab.screen) {
          <a [routerLink]="'/' + tab.screen" routerLinkActive="active">{{ tab.label ?? tab.screen }}</a>
        }
      </nav>
    </div>
    <p class="footnote">Sand Bank is a fictional app · Dune architecture demo</p>
  `,
})
export class App {
  protected readonly tabs = screens(inject(FEATURES));
}
