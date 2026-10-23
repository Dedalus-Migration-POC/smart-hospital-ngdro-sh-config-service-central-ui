import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface SduiTranslationEntry {
  key: string;
  value: string;
}

/** Pannello suggerimenti dell'autocomplete sulle *Key del wizard SDUI: mostra il testo
 * tradotto (lingua UI admin corrente) con la relativa key sotto, selezionabile al click. */
@Component({
  selector: 'sdui-key-autocomplete-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div class="sdui-key-ac-panel">
      @if (unknownKey()) {
        <div class="sdui-key-ac-panel__warning">
          <span class="material-icons" aria-hidden="true">warning</span>
          {{ 'sduiWizard.keyAutocomplete.unknownKey' | translate }}
        </div>
      }
      @if (items().length) {
        <ul class="sdui-key-ac-panel__list">
          @for (item of items(); track item.key) {
            <li>
              <button type="button" class="sdui-key-ac-panel__item" (mousedown)="$event.preventDefault()" (click)="pick.emit(item.key)">
                <span class="sdui-key-ac-panel__value">{{ item.value }}</span>
                <span class="sdui-key-ac-panel__key">{{ item.key }}</span>
              </button>
            </li>
          }
        </ul>
      } @else if (!unknownKey()) {
        <div class="sdui-key-ac-panel__empty">{{ 'sduiWizard.keyAutocomplete.noMatch' | translate }}</div>
      }
    </div>
  `,
  styleUrl: './sdui-key-autocomplete-panel.scss',
})
export class SduiKeyAutocompletePanel {
  readonly items = input<SduiTranslationEntry[]>([]);
  readonly unknownKey = input(false);
  readonly pick = output<string>();
}
