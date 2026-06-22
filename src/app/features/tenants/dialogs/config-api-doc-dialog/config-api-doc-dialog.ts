import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { ChannelId } from '../../models';

export interface ConfigApiDocDialogData {
  tenantSlug: string;
  channelId: ChannelId;
  channelLabel: string;
  baseUrl: string;
}

@Component({
  selector: 'app-config-api-doc-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, TranslatePipe],
  templateUrl: './config-api-doc-dialog.html',
  styleUrl: './config-api-doc-dialog.scss',
})
export class ConfigApiDocDialog {
  readonly data = inject<ConfigApiDocDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ConfigApiDocDialog>);

  readonly curlExample: string;

  constructor() {
    const base = this.data.baseUrl || '{base-url}';
    this.curlExample =
      `curl -s \\\n` +
      `  "${base}/v1/config/${this.data.tenantSlug}/${this.data.channelId}?entity=base" \\\n` +
      `  -H "X-API-Key: <la-tua-api-key>"`;
  }

  close(): void {
    this.ref.close();
  }
}
