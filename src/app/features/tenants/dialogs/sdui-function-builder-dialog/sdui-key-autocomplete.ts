import { ComponentRef, Directive, ElementRef, HostListener, Input, OnDestroy, ViewContainerRef, inject } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { NgModel } from '@angular/forms';

import { SduiKeyAutocompletePanel, SduiTranslationEntry } from './sdui-key-autocomplete-panel';

const MAX_SUGGESTIONS = 8;
/** Ritardo chiusura overlay su blur: lascia il tempo al mousedown sul pannello (che previene
 * già il default per non far perdere il focus all'input) di completare la selezione. */
const BLUR_CLOSE_DELAY_MS = 150;

/** Autocomplete non invasivo per i campi *Key (chiave di traduzione) del wizard SDUI: cerca
 * nel catalogo traduzioni (lingua UI admin corrente) per testo tradotto o per key, e al click
 * su un suggerimento scrive la key nel controllo via `NgModel.control.setValue()` — questo
 * emette `ngModelChange` esattamente come una digitazione manuale, quindi riusa senza modifiche
 * gli esistenti handler `(ngModelChange)="setXxxProp($event)"` di ogni campo. Segnala in modo
 * non bloccante (badge "chiave sconosciuta") quando il valore corrente non esiste nel catalogo. */
@Directive({
  selector: '[sduiKeyAutocomplete]',
  standalone: true,
})
export class SduiKeyAutocompleteDirective implements OnDestroy {
  @Input('sduiKeyAutocomplete') catalog: SduiTranslationEntry[] = [];

  private readonly elementRef = inject(ElementRef<HTMLInputElement>);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly ngModel = inject(NgModel, { optional: true, self: true });

  private overlayRef: OverlayRef | null = null;
  private panelRef: ComponentRef<SduiKeyAutocompletePanel> | null = null;
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;

  @HostListener('focus')
  @HostListener('input')
  onActivity(): void {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.refresh();
  }

  @HostListener('blur')
  onBlur(): void {
    this.closeTimeout = setTimeout(() => this.close(), BLUR_CLOSE_DELAY_MS);
  }

  ngOnDestroy(): void {
    this.destroyOverlay();
  }

  private refresh(): void {
    const rawValue = (this.elementRef.nativeElement.value ?? '').trim();
    const query = rawValue.toLowerCase();
    const items = this.filter(query);
    const unknown = rawValue.length > 0 && this.catalog.length > 0 && !this.catalog.some((e) => e.key === rawValue);

    if (!items.length && !unknown) {
      this.close();
      return;
    }

    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create({
        positionStrategy: this.overlay
          .position()
          .flexibleConnectedTo(this.elementRef)
          .withPositions([
            { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
            { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
          ]),
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        width: Math.max(this.elementRef.nativeElement.offsetWidth, 260),
      });
    }

    if (!this.overlayRef.hasAttached()) {
      const portal = new ComponentPortal(SduiKeyAutocompletePanel, this.viewContainerRef);
      this.panelRef = this.overlayRef.attach(portal);
      this.panelRef.instance.pick.subscribe((key: string) => this.select(key));
    }

    this.panelRef?.setInput('items', items);
    this.panelRef?.setInput('unknownKey', unknown);
  }

  private filter(query: string): SduiTranslationEntry[] {
    if (!query) return this.catalog.slice(0, MAX_SUGGESTIONS);
    const byValue = this.catalog.filter((e) => e.value.toLowerCase().includes(query));
    const pool = byValue.length ? byValue : this.catalog.filter((e) => e.key.toLowerCase().includes(query));
    return pool.slice(0, MAX_SUGGESTIONS);
  }

  private select(key: string): void {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.ngModel?.control.setValue(key);
    this.close();
    this.elementRef.nativeElement.focus();
  }

  private close(): void {
    this.overlayRef?.detach();
    this.panelRef = null;
  }

  private destroyOverlay(): void {
    if (this.closeTimeout) clearTimeout(this.closeTimeout);
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.panelRef = null;
  }
}
