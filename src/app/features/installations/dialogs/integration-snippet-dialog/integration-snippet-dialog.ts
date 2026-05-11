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
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:pointycastle/export.dart'; // pub: pointycastle ^3.7.4

const String baseUrl      = '${this.baseUrl}';
const String tenantId     = '${this.tenantId}';
const String channel      = 'mobile';
const String apiKey       = 'LA_TUA_READ_API_KEY';  // sezione Sicurezza → READ key
const String masterKeyB64 = 'LA_TUA_PAYLOAD_MASTER_KEY'; // sezione Sicurezza → Payload master key

/// Recupera e decifra la configurazione dal tenant.
Future<Map<String, dynamic>> fetchConfig() async {
  final uri = Uri.parse('\$baseUrl/api/tenants/\$tenantId/configs/\$channel');
  final response = await http.get(uri, headers: {'X-API-Key': apiKey});
  if (response.statusCode != 200) {
    throw Exception('Errore caricamento config: \${response.statusCode}');
  }

  final encryptedB64 = (jsonDecode(response.body) as Map<String, dynamic>)['payload'] as String;
  final plainJson    = _decryptAesGcm(encryptedB64, masterKeyB64);
  return jsonDecode(plainJson) as Map<String, dynamic>;
}

/// Decifra un payload AES-256-GCM.
/// Formato payload: Base64( IV[12 bytes] || CipherText+AuthTag[128-bit] )
String _decryptAesGcm(String encryptedB64, String masterKeyB64) {
  final payload   = base64Decode(encryptedB64);
  final masterKey = base64Decode(masterKeyB64);

  final iv         = payload.sublist(0, 12);
  final cipherText = payload.sublist(12);

  final cipher = GCMBlockCipher(AESEngine())
    ..init(false, AEADParameters(KeyParameter(masterKey), 128, iv, Uint8List(0)));

  final plain = cipher.process(cipherText);
  return utf8.decode(plain);
}`;
  }

  get angularSnippet(): string {
    return `import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl      = '${this.baseUrl}';
  private readonly tenantId     = '${this.tenantId}';
  private readonly channel      = 'web';
  private readonly apiKey       = 'LA_TUA_READ_API_KEY';       // sezione Sicurezza → READ key
  private readonly masterKeyB64 = 'LA_TUA_PAYLOAD_MASTER_KEY'; // sezione Sicurezza → Payload master key

  /** Recupera e decifra la configurazione del tenant. */
  getConfig(): Observable<unknown> {
    const headers = new HttpHeaders({ 'X-API-Key': this.apiKey });
    return this.http
      .get<{ payload: string }>(
        \`\${this.baseUrl}/api/tenants/\${this.tenantId}/configs/\${this.channel}\`,
        { headers }
      )
      .pipe(switchMap(({ payload }) => from(this.decryptAesGcm(payload))));
  }

  /**
   * Decifra un payload AES-256-GCM.
   * Formato: Base64( IV[12 bytes] || CipherText+AuthTag[128-bit] )
   * Richiede SubtleCrypto (Web Crypto API) — disponibile in tutti i browser moderni.
   */
  private async decryptAesGcm(encryptedB64: string): Promise<unknown> {
    const payload = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
    const keyBytes = Uint8Array.from(atob(this.masterKeyB64), c => c.charCodeAt(0));

    const iv         = payload.slice(0, 12);
    const cipherText = payload.slice(12);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
    );
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 }, cryptoKey, cipherText
    );
    return JSON.parse(new TextDecoder().decode(plainBuffer));
  }
}`;
  }

  get javaSnippet(): string {
    return `import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class ConfigClient {

    private static final String BASE_URL       = "${this.baseUrl}";
    private static final String TENANT_ID      = "${this.tenantId}";
    private static final String CHANNEL        = "totem";
    private static final String API_KEY        = "LA_TUA_READ_API_KEY";       // sezione Sicurezza → READ key
    private static final String MASTER_KEY_B64 = "LA_TUA_PAYLOAD_MASTER_KEY"; // sezione Sicurezza → Payload master key

    private static final int IV_LENGTH  = 12;
    private static final int TAG_LENGTH = 128;

    /** Recupera e decifra la configurazione del tenant. */
    public JsonNode fetchConfig() throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/api/tenants/" + TENANT_ID + "/configs/" + CHANNEL))
            .header("X-API-Key", API_KEY)
            .GET()
            .build();

        HttpResponse<String> response =
            client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Errore config: " + response.statusCode());
        }

        ObjectMapper mapper = new ObjectMapper();
        String encryptedB64 = mapper.readTree(response.body()).get("payload").asText();
        String plainJson = decryptAesGcm(encryptedB64);
        return mapper.readTree(plainJson);
    }

    /**
     * Decifra un payload AES-256-GCM.
     * Formato: Base64( IV[12 bytes] || CipherText+AuthTag[128-bit] )
     */
    private String decryptAesGcm(String encryptedB64) throws Exception {
        byte[] payload   = Base64.getDecoder().decode(encryptedB64);
        byte[] keyBytes  = Base64.getDecoder().decode(MASTER_KEY_B64);

        byte[] iv         = new byte[IV_LENGTH];
        byte[] cipherText = new byte[payload.length - IV_LENGTH];
        System.arraycopy(payload, 0,         iv,         0, IV_LENGTH);
        System.arraycopy(payload, IV_LENGTH, cipherText, 0, cipherText.length);

        SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "AES");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH, iv));

        byte[] plainBytes = cipher.doFinal(cipherText);
        return new String(plainBytes, StandardCharsets.UTF_8);
    }
}`;
  }

  copySnippet(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackbar.open(this.translate.instant('common.copySuccess'), 'OK', { duration: 2000 });
    });
  }
}
