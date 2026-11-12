import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { FEATURES, Slot } from './feature';

/**
 * Renders whatever features contribute to one slot of one screen.
 * Screen owners place these; contributors never edit the screen itself (rule 4).
 */
@Component({
  selector: 'dune-slot',
  imports: [NgComponentOutlet],
  template: `
    @for (component of components(); track $index) {
      <ng-container *ngComponentOutlet="component" />
    }
  `,
  styles: `:host { display: contents; }`,
})
export class SlotOutlet {
  readonly screen = input.required<string>();
  readonly slot = input.required<Slot>();

  private readonly features = inject(FEATURES);

  protected readonly components = computed(() =>
    this.features
      .flatMap((f) => f.entrypoints)
      .filter((e) => e.screen === this.screen() && e.slot === this.slot())
      .map((e) => e.component),
  );
}
