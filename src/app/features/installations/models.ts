export type SyncStatus = 'SYNCED' | 'DRAFT' | null;

export interface Installation {
  id: string;
  customerId: string;
  name: string;
  baseUrl: string;
  /** True se nel backend è memorizzata una API key cifrata (non viene mai esposta in chiaro). */
  apiKeyConfigured: boolean;
  /** True se è memorizzata una payload master key (recuperabile in chiaro via apposito endpoint). */
  payloadMasterKeyConfigured: boolean;
  active: boolean;
  /** Timestamp ISO LocalDateTime dell'ultimo tentativo di push delle config verso l'on-prem. */
  lastSyncAt: string | null;
  /** Stato del push delle config: SYNCED (ok) o DRAFT (fallito), null se non ancora tentato. */
  lastSyncStatus: SyncStatus;
  lastSyncError: string | null;
  createdAt: string;
}

export interface InstallationCreateRequest {
  name: string;
  /** Deve iniziare con http:// o https:// (regex backend ^https?://.+). */
  baseUrl: string;
  apiKey: string;
  /** Opzionale: se omessa, il central genera una master key random. */
  payloadMasterKey?: string;
}

export interface InstallationUpdateRequest {
  name: string;
  baseUrl: string;
  active?: boolean;
}

export interface InstallationApiKeyUpdateRequest {
  apiKey: string;
}

export interface InstallationPayloadMasterKeyUpdateRequest {
  /** Se omessa/null, il central genera una nuova chiave random. */
  payloadMasterKey?: string;
}

export interface InstallationPayloadMasterKeyResponse {
  installationId: string;
  payloadMasterKey: string;
}

export interface InstallationHealth {
  installationId: string;
  reachable: boolean;
}

/** Regex baseUrl come Pattern lato backend. */
export const INSTALLATION_BASE_URL_PATTERN = /^https?:\/\/.+/;
