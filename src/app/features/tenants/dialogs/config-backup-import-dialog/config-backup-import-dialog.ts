import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import JSZip from 'jszip';
import { firstValueFrom } from 'rxjs';

import { toUserMessage } from '../../../../core/http/api-error';
import { CHANNELS, ChannelId, TenantConfigBackupManifest } from '../../models';
import { TenantService } from '../../services/tenants';

export interface ConfigBackupImportDialogData {
  tenantId: string;
  tenantSlug: string;
}

interface ImportEntityRow {
  channelId: ChannelId;
  entity: string;
  enabled: boolean;
  configJson: unknown;
  selected: boolean;
}

interface ImportLogEntry {
  channelId: ChannelId;
  entity: string;
  status: 'synced' | 'draft' | 'error';
  message?: string;
}

type DialogState = 'pick' | 'ready' | 'running' | 'done';

@Component({
  selector: 'app-config-backup-import-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './config-backup-import-dialog.html',
  styleUrl: './config-backup-import-dialog.scss',
})
export class ConfigBackupImportDialog {
  readonly data = inject<ConfigBackupImportDialogData>(MAT_DIALOG_DATA);
  private readonly tenants = inject(TenantService);
  private readonly translate = inject(TranslateService);
  private readonly ref = inject<MatDialogRef<ConfigBackupImportDialog, boolean>>(MatDialogRef);

  readonly state = signal<DialogState>('pick');
  readonly fileName = signal<string | null>(null);
  readonly parseError = signal<string | null>(null);
  readonly sourceTenantSlug = signal<string | null>(null);
  readonly rows = signal<ImportEntityRow[]>([]);

  readonly progressTotal = signal(0);
  readonly progressDone = signal(0);
  readonly log = signal<ImportLogEntry[]>([]);

  readonly channelGroups = computed(() => {
    const rows = this.rows();
    return CHANNELS.filter((ch) => rows.some((r) => r.channelId === ch)).map((ch) => ({
      channelId: ch,
      rows: rows.filter((r) => r.channelId === ch),
    }));
  });

  readonly selectedCount = computed(() => this.rows().filter((r) => r.selected).length);
  readonly allSelected = computed(() => this.rows().length > 0 && this.rows().every((r) => r.selected));

  readonly syncedCount = computed(() => this.log().filter((l) => l.status === 'synced').length);
  readonly draftCount = computed(() => this.log().filter((l) => l.status === 'draft').length);
  readonly errorCount = computed(() => this.log().filter((l) => l.status === 'error').length);
  readonly errorLog = computed(() => this.log().filter((l) => l.status === 'error'));

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.parseError.set(null);
    this.fileName.set(file.name);
    // Consente di riselezionare lo stesso file in un tentativo successivo.
    input.value = '';

    try {
      const zip = await JSZip.loadAsync(file);
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) throw new Error('missing-manifest');
      const manifest = JSON.parse(await manifestFile.async('string')) as TenantConfigBackupManifest;
      if (!manifest || manifest.formatVersion !== 2 || !Array.isArray(manifest.entries)) {
        throw new Error('invalid-format');
      }

      const rows: ImportEntityRow[] = [];
      for (const entry of manifest.entries) {
        const entryFile = zip.file(entry.file);
        if (!entryFile) continue;
        const configJson = JSON.parse(await entryFile.async('string')) as unknown;
        rows.push({
          channelId: entry.channelId,
          entity: entry.entity,
          enabled: entry.enabled,
          configJson,
          selected: true,
        });
      }

      if (rows.length === 0) throw new Error('empty-backup');

      this.sourceTenantSlug.set(manifest.sourceTenantSlug);
      this.rows.set(rows);
      this.state.set('ready');
    } catch {
      this.rows.set([]);
      this.state.set('pick');
      this.parseError.set(this.translate.instant('config.backupImportInvalidFile'));
    }
  }

  reset(): void {
    this.state.set('pick');
    this.fileName.set(null);
    this.sourceTenantSlug.set(null);
    this.rows.set([]);
    this.parseError.set(null);
    this.log.set([]);
    this.progressDone.set(0);
    this.progressTotal.set(0);
  }

  toggleRow(row: ImportEntityRow): void {
    this.rows.update((list) =>
      list.map((r) => (r === row ? { ...r, selected: !r.selected } : r)),
    );
  }

  toggleAll(): void {
    const next = !this.allSelected();
    this.rows.update((list) => list.map((r) => ({ ...r, selected: next })));
  }

  async startImport(): Promise<void> {
    const selected = this.rows().filter((r) => r.selected);
    if (selected.length === 0 || this.state() === 'running') return;

    this.state.set('running');
    this.log.set([]);
    this.progressTotal.set(selected.length);
    this.progressDone.set(0);

    for (const row of selected) {
      await this.importOne(row.channelId, row.entity, row.configJson, row.enabled);
      this.progressDone.update((n) => n + 1);
    }

    this.state.set('done');
  }

  private async importOne(
    channelId: ChannelId,
    entity: string,
    configJson: unknown,
    enabled: boolean,
  ): Promise<void> {
    try {
      const version = await firstValueFrom(
        this.tenants.putConfig(this.data.tenantId, channelId, entity, configJson),
      );

      if (version.pushPackage) {
        const pushed = await this.tryBrowserPush(channelId, entity, version.pushPackage);
        this.log.update((l) => [
          ...l,
          {
            channelId,
            entity,
            status: pushed ? 'synced' : 'draft',
          },
        ]);
      } else {
        this.log.update((l) => [
          ...l,
          { channelId, entity, status: version.syncStatus === 'SYNCED' ? 'synced' : 'draft' },
        ]);
      }

      if (!enabled) {
        await firstValueFrom(this.tenants.disableEntity(this.data.tenantId, channelId, entity)).catch(() => undefined);
      }
    } catch (err: unknown) {
      this.log.update((l) => [
        ...l,
        { channelId, entity, status: 'error', message: toUserMessage(err, this.translate.instant('config.backupImportEntityError')) },
      ]);
    }
  }

  /** Prova il push diretto browser→on-prem senza dialog di conferma per-entity (bulk import). */
  private async tryBrowserPush(
    channelId: ChannelId,
    entity: string,
    pkg: { encryptedPayload: string; apiKey: string; targetUrl: string; baseUrl: string },
  ): Promise<boolean> {
    const reachable = await fetch(`${pkg.baseUrl}/actuator/health`, {
      mode: 'no-cors',
      signal: AbortSignal.timeout(5000),
    }).then(() => true).catch(() => false);

    if (!reachable) {
      await firstValueFrom(
        this.tenants.pushConfirm(this.data.tenantId, channelId, entity, false, null, 'On-prem non raggiungibile dal browser'),
      ).catch(() => undefined);
      return false;
    }

    try {
      const res = await fetch(pkg.targetUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': pkg.apiKey },
        body: JSON.stringify({ payload: pkg.encryptedPayload }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const resData = await res.json() as { version?: number };
        await firstValueFrom(
          this.tenants.pushConfirm(this.data.tenantId, channelId, entity, true, resData.version ?? null, null),
        );
        return true;
      }
      await firstValueFrom(
        this.tenants.pushConfirm(this.data.tenantId, channelId, entity, false, null, `On-prem ha risposto ${res.status}`),
      ).catch(() => undefined);
      return false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Errore rete';
      await firstValueFrom(
        this.tenants.pushConfirm(this.data.tenantId, channelId, entity, false, null, msg),
      ).catch(() => undefined);
      return false;
    }
  }

  close(): void {
    this.ref.close(this.state() === 'done');
  }
}
