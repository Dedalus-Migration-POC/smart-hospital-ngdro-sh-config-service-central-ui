import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { AppConfigVersion } from '../../models';

export interface ConfigVersionDiffDialogData {
  /** Versione correntemente attiva (pannello sinistro — stato attuale). */
  activeVersion: AppConfigVersion;
  /** Versione selezionata per il rollback (pannello destro — stato target). */
  targetVersion: AppConfigVersion;
}

interface DiffLine {
  text: string;
  /** null sulle righe placeholder (empty) */
  lineNum: number | null;
  type: 'equal' | 'removed' | 'added' | 'empty';
}

interface DiffRow {
  left: DiffLine;
  right: DiffLine;
}

// ── LCS diff ──────────────────────────────────────────────────────────────────

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function buildDiffRows(a: string[], b: string[]): DiffRow[] {
  const dp = computeLCS(a, b);
  const ops: Array<{ type: 'equal' | 'removed' | 'added'; text: string }> = [];

  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: 'equal', text: a[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'added', text: b[j - 1] });
      j--;
    } else {
      ops.unshift({ type: 'removed', text: a[i - 1] });
      i--;
    }
  }

  const rows: DiffRow[] = [];
  let leftNum = 0, rightNum = 0;
  for (const op of ops) {
    if (op.type === 'equal') {
      leftNum++; rightNum++;
      rows.push({
        left:  { text: op.text, lineNum: leftNum,  type: 'equal' },
        right: { text: op.text, lineNum: rightNum, type: 'equal' },
      });
    } else if (op.type === 'removed') {
      leftNum++;
      rows.push({
        left:  { text: op.text, lineNum: leftNum, type: 'removed' },
        right: { text: '',      lineNum: null,    type: 'empty'   },
      });
    } else {
      rightNum++;
      rows.push({
        left:  { text: '',      lineNum: null,     type: 'empty' },
        right: { text: op.text, lineNum: rightNum, type: 'added' },
      });
    }
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-config-version-diff-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './config-version-diff-dialog.html',
  styleUrl: './config-version-diff-dialog.scss',
})
export class ConfigVersionDiffDialog {
  readonly dialogRef = inject<MatDialogRef<ConfigVersionDiffDialog, boolean>>(MatDialogRef);
  readonly data = inject<ConfigVersionDiffDialogData>(MAT_DIALOG_DATA);

  readonly diffRows = computed<DiffRow[]>(() => {
    const leftJson  = JSON.stringify(this.data.activeVersion.configJson, null, 2) ?? '';
    const rightJson = JSON.stringify(this.data.targetVersion.configJson, null, 2) ?? '';
    return buildDiffRows(leftJson.split('\n'), rightJson.split('\n'));
  });

  readonly removedCount = computed(() => this.diffRows().filter(r => r.left.type === 'removed').length);
  readonly addedCount   = computed(() => this.diffRows().filter(r => r.right.type === 'added').length);
  readonly identical    = computed(() => this.removedCount() === 0 && this.addedCount() === 0);
}
