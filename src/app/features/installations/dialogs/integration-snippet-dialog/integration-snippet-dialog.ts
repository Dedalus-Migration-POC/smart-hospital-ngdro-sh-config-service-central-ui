import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Installation } from '../../models';
import { Tenant } from '../../../tenants/models';
import { TenantService } from '../../../tenants/services/tenants';

export interface IntegrationSnippetDialogData {
  installation: Installation;
  channel: 'mobile' | 'web' | 'totem';
}

@Component({
  selector: 'app-integration-snippet-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    MatDialogModule,
    MatButtonModule,
    MatTabsModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
  ],
  templateUrl: './integration-snippet-dialog.html',
  styleUrl: './integration-snippet-dialog.scss',
})
export class IntegrationSnippetDialog implements OnInit {
  readonly data = inject<IntegrationSnippetDialogData>(MAT_DIALOG_DATA);
  private readonly tenantService = inject(TenantService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly tenants = signal<Tenant[]>([]);
  readonly selectedTenantId = signal<string>('');
  readonly loading = signal(true);

  get baseUrl(): string { return this.data.installation.baseUrl; }
  get channel(): string { return this.data.channel; }
  get tenantId(): string { return this.selectedTenantId() || '<TENANT_ID>'; }
  get tenantSlug(): string {
    return this.tenants().find(t => t.id === this.selectedTenantId())?.slug || '<TENANT_SLUG>';
  }

  ngOnInit(): void {
    this.tenantService.listByInstallation(this.data.installation.id).subscribe({
      next: (list: Tenant[]) => {
        const active = list.filter((t: Tenant) => t.active);
        this.tenants.set(active);
        if (active.length === 1) this.selectedTenantId.set(active[0].id);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  get flutterSnippet(): string {
    return `import 'dart:convert';
import 'package:http/http.dart' as http;

const String baseUrl = '${this.baseUrl}';
const String tenantId = '${this.tenantId}';
const String channel  = '${this.channel}';
const String apiKey   = 'LA_TUA_API_KEY'; // dalla rotazione chiave

Future<Map<String, dynamic>> fetchConfig() async {
  final uri = Uri.parse(
    '\$baseUrl/api/tenants/\$tenantId/configs/\$channel',
  );
  final response = await http.get(uri, headers: {
    'Authorization': 'Bearer \$apiKey',
    'Content-Type': 'application/json',
  });

  if (response.statusCode == 200) {
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
  throw Exception('Errore caricamento config: \${response.statusCode}');
}`;
  }

  get angularSnippet(): string {
    return `import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '${this.baseUrl}';
  private readonly tenantId = '${this.tenantId}';
  private readonly channel = '${this.channel}';
  private readonly apiKey = 'LA_TUA_API_KEY'; // dalla rotazione chiave

  getConfig(): Observable<unknown> {
    const headers = new HttpHeaders({
      Authorization: \`Bearer \${this.apiKey}\`,
    });
    return this.http.get(
      \`\${this.baseUrl}/api/tenants/\${this.tenantId}/configs/\${this.channel}\`,
      { headers }
    );
  }
}`;
  }

  get javaSnippet(): string {
    return `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ConfigClient {

    private static final String BASE_URL  = "${this.baseUrl}";
    private static final String TENANT_ID = "${this.tenantId}";
    private static final String CHANNEL   = "${this.channel}";
    private static final String API_KEY   = "LA_TUA_API_KEY"; // dalla rotazione chiave

    public String fetchConfig() throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/api/tenants/" + TENANT_ID + "/configs/" + CHANNEL))
            .header("Authorization", "Bearer " + API_KEY)
            .header("Content-Type", "application/json")
            .GET()
            .build();

        HttpResponse<String> response =
            client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) return response.body();
        throw new RuntimeException("Errore config: " + response.statusCode());
    }
}`;
  }

  copySnippet(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackbar.open(this.translate.instant('common.copySuccess'), 'OK', { duration: 2000 });
    });
  }
}
