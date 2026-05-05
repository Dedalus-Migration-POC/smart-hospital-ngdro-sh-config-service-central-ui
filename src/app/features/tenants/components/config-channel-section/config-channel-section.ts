import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { toUserMessage } from '../../../../core/http/api-error';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';
import {
  ConfigVersionDiffDialog,
  ConfigVersionDiffDialogData,
} from '../../dialogs/config-version-diff-dialog/config-version-diff-dialog';
import {
  SmhUiRenderEditorDialog,
  SmhUiRenderEditorDialogData,
  SmhUiRenderJson,
} from '../../dialogs/smh-ui-render-editor-dialog/smh-ui-render-editor-dialog';
import { AppConfigVersion, ChannelId } from '../../models';
import { TenantService } from '../../services/tenants';

interface JsonError {
  message: string;
  line: number | null;
  col: number | null;
}

function jsonValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const v = control.value as string;
    if (!v?.trim()) return null;
    try {
      JSON.parse(v);
      return null;
    } catch (e) {
      const msg = (e as SyntaxError).message;
      let line: number | null = null;
      let col: number | null = null;
      const posMatch = msg.match(/at position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const before = v.substring(0, pos);
        const lines = before.split('\n');
        line = lines.length;
        col = lines[lines.length - 1].length + 1;
      }
      return { invalidJson: { message: msg, line, col } as JsonError };
    }
  };
}

const ENTITY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

@Component({
  selector: 'app-config-channel-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatExpansionModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './config-channel-section.html',
  styleUrl: './config-channel-section.scss',
})
export class ConfigChannelSection {
  readonly tenantId = input.required<string>();
  readonly channelId = input.required<ChannelId>();

  private readonly tenantService = inject(TenantService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  // Entity selection — resets to 'base' whenever tenantId or channelId changes
  readonly entity = linkedSignal({
    source: () => `${this.tenantId()}::${this.channelId()}`,
    computation: () => 'base',
  });
  readonly entities = signal<string[]>(['base']);
  readonly addingEntity = signal(false);
  readonly newEntityControl = new FormControl('', [
    Validators.required,
    Validators.pattern(ENTITY_PATTERN),
  ]);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly resyncing = signal(false);
  readonly historyLoading = signal(false);
  readonly rollingBack = signal<number | null>(null);

  readonly activeVersion = signal<AppConfigVersion | null>(null);
  readonly history = signal<AppConfigVersion[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly configControl = new FormControl('', [Validators.required, jsonValidator()]);

  readonly isUnauthorizedSync = computed(() => {
    const v = this.activeVersion();
    return v?.syncStatus === 'DRAFT' && (v.syncError?.includes('401') ?? false);
  });

  constructor() {
    // Load entity list when tenant/channel changes
    effect(() => {
      const tenantId = this.tenantId();
      const channelId = this.channelId();
      this.entities.set(['base']);
      this.loadEntities(tenantId, channelId);
    });

    // Load config whenever tenant, channel, or entity changes
    effect(() => {
      const tenantId = this.tenantId();
      const channelId = this.channelId();
      const entity = this.entity();
      this.loadConfig(tenantId, channelId, entity);
    });
  }

  private loadEntities(tenantId: string, channelId: string): void {
    this.tenantService.getEntities(tenantId, channelId).subscribe({
      next: (list) => {
        const merged = new Set([...this.entities(), ...list]);
        merged.add('base');
        const sorted = [...merged].sort((a, b) => {
          if (a === 'base') return -1;
          if (b === 'base') return 1;
          return a.localeCompare(b);
        });
        this.entities.set(sorted);
      },
      error: () => {
        // API non disponibile — mantieni la lista corrente, assicura solo 'base'
        this.entities.update((list) =>
          list.includes('base') ? list : ['base', ...list],
        );
      },
    });
  }

  selectEntity(e: string): void {
    if (this.entity() === e) return;
    this.cancelAddEntity();
    this.entity.set(e);
  }

  startAddEntity(): void {
    this.newEntityControl.reset('');
    this.addingEntity.set(true);
  }

  cancelAddEntity(): void {
    this.addingEntity.set(false);
    this.newEntityControl.reset('');
  }

  confirmAddEntity(): void {
    this.newEntityControl.markAsTouched();
    if (this.newEntityControl.invalid) return;
    const name = (this.newEntityControl.value ?? '').trim();
    if (!this.entities().includes(name)) {
      this.entities.update((list) => {
        const updated = [...list, name];
        updated.sort((a, b) => {
          if (a === 'base') return -1;
          if (b === 'base') return 1;
          return a.localeCompare(b);
        });
        return updated;
      });
    }
    this.entity.set(name);
    this.cancelAddEntity();
  }

  private loadConfig(tenantId: string, channelId: string, entity: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.activeVersion.set(null);
    this.history.set([]);
    this.tenantService.getConfig(tenantId, channelId, 'local', entity).subscribe({
      next: (active) => {
        const pretty = active.configJson != null
          ? JSON.stringify(active.configJson, null, 2)
          : '';
        this.configControl.reset(pretty);
        this.loading.set(false);
        this.loadHistory(tenantId, channelId, entity);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const msg = toUserMessage(err, this.translate.instant('config.loadError'));
        if ((err as { status?: number })?.status === 404) {
          this.configControl.reset('{}');
          this.activeVersion.set(null);
          this.loadHistory(tenantId, channelId, entity);
        } else {
          this.errorMessage.set(msg);
        }
      },
    });
  }

  private loadHistory(tenantId: string, channelId: string, entity: string): void {
    this.historyLoading.set(true);
    this.tenantService.getHistory(tenantId, channelId, entity).subscribe({
      next: (versions) => {
        this.history.set(versions);
        const active = versions.find((v) => v.active) ?? null;
        this.activeVersion.set(active);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyLoading.set(false);
      },
    });
  }

  prettify(): void {
    const v = this.configControl.value ?? '';
    if (!v.trim()) return;
    try {
      const parsed: unknown = JSON.parse(v);
      this.configControl.setValue(JSON.stringify(parsed, null, 2));
      this.configControl.markAsDirty();
    } catch {
      this.configControl.markAsTouched();
    }
  }

  save(): void {
    this.configControl.markAsTouched();
    if (this.configControl.invalid || this.saving()) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.configControl.value ?? '{}');
    } catch {
      return;
    }

    const tenantId = this.tenantId();
    const channelId = this.channelId();
    const entity = this.entity();

    this.saving.set(true);
    this.tenantService.putConfig(tenantId, channelId, entity, parsed).subscribe({
      next: (version) => {
        this.saving.set(false);
        this.activeVersion.set(version);
        const pretty = JSON.stringify(version.configJson, null, 2);
        this.configControl.reset(pretty);
        this.snackbar.open(
          this.translate.instant(version.syncStatus === 'SYNCED' ? 'config.saveSynced' : 'config.saveDraftWarning'),
          'OK',
          { duration: version.syncStatus === 'SYNCED' ? 3000 : 6000 },
        );
        // Mantieni l'entity corrente nella lista (può essere nuova, appena creata)
        this.entities.update((list) => {
          if (list.includes(entity)) return list;
          return [...list, entity].sort((a, b) =>
            a === 'base' ? -1 : b === 'base' ? 1 : a.localeCompare(b),
          );
        });
        this.loadHistory(tenantId, channelId, entity);
        this.loadEntities(tenantId, channelId);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('config.saveError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  resync(): void {
    if (this.resyncing()) return;
    const tenantId = this.tenantId();
    const channelId = this.channelId();
    const entity = this.entity();
    this.resyncing.set(true);
    this.tenantService.resync(tenantId, channelId, entity).subscribe({
      next: (version) => {
        this.resyncing.set(false);
        this.activeVersion.set(version);
        this.snackbar.open(
          this.translate.instant(version.syncStatus === 'SYNCED' ? 'config.resyncSynced' : 'config.resyncDraft'),
          'OK',
          { duration: version.syncStatus === 'SYNCED' ? 3000 : 6000 },
        );
        this.loadHistory(tenantId, channelId, entity);
      },
      error: (err: unknown) => {
        this.resyncing.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('config.resyncError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  readonly isSmhUiRender = computed(() => this.entity() === 'smh_ui_render');

  openGraphicEditor(): void {
    let parsed: SmhUiRenderJson = {};
    const raw = this.configControl.value ?? '';
    if (raw.trim()) {
      try { parsed = JSON.parse(raw) as SmhUiRenderJson; } catch { /* usa vuoto */ }
    }
    const data: SmhUiRenderEditorDialogData = { value: parsed };
    const ref = this.dialog.open<SmhUiRenderEditorDialog, SmhUiRenderEditorDialogData, SmhUiRenderJson>(
      SmhUiRenderEditorDialog,
      { data, autoFocus: 'first-tabbable', maxWidth: '960px', width: '960px' },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      const pretty = JSON.stringify(result, null, 2);
      this.configControl.setValue(pretty);
      this.configControl.markAsDirty();
    });
  }

  openDiff(target: AppConfigVersion): void {
    const active = this.activeVersion();
    if (!active) return;
    const data: ConfigVersionDiffDialogData = { activeVersion: active, targetVersion: target };
    const ref = this.dialog.open<ConfigVersionDiffDialog, ConfigVersionDiffDialogData, boolean>(
      ConfigVersionDiffDialog,
      { data, maxWidth: '1160px', width: '95vw' },
    );
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.doRollback(target.version);
    });
  }

  confirmRollback(version: AppConfigVersion): void {
    const data: ConfirmDialogData = {
      title: this.translate.instant('config.rollbackConfirmTitle', { version: version.version }),
      message: this.translate.instant('config.rollbackConfirmMessage', { version: version.version }),
      confirmLabel: this.translate.instant('config.rollbackConfirmButton'),
      destructive: false,
    };
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.doRollback(version.version);
    });
  }

  private doRollback(version: number): void {
    const tenantId = this.tenantId();
    const channelId = this.channelId();
    const entity = this.entity();
    this.rollingBack.set(version);
    this.tenantService.rollback(tenantId, channelId, entity, version).subscribe({
      next: (newVersion) => {
        this.rollingBack.set(null);
        this.activeVersion.set(newVersion);
        const pretty = JSON.stringify(newVersion.configJson, null, 2);
        this.configControl.reset(pretty);
        this.snackbar.open(
          this.translate.instant(
            newVersion.syncStatus === 'SYNCED' ? 'config.rollbackSynced' : 'config.rollbackDraft',
            { version },
          ),
          'OK',
          { duration: newVersion.syncStatus === 'SYNCED' ? 3000 : 6000 },
        );
        this.loadHistory(tenantId, channelId, entity);
      },
      error: (err: unknown) => {
        this.rollingBack.set(null);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('config.rollbackError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }
}
