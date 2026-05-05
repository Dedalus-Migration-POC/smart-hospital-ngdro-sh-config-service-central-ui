export interface Tenant {
  id: string;
  installationId: string;
  slug: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface TenantCreateRequest {
  slug: string;
  name: string;
}

export interface TenantUpdateRequest {
  name: string;
  active?: boolean;
}

export type SyncStatus = 'SYNCED' | 'DRAFT' | null;

/**
 * Payload pre-cifrato lato server. Il browser lo usa per fare PUT direttamente all'on-prem
 * quando il server centrale non riesce a raggiungerlo (es. behind VPN).
 * Il browser deve fare:
 *   PUT targetUrl
 *   Headers: Content-Type: application/json, X-API-Key: apiKey
 *   Body: { payload: encryptedPayload }
 */
export interface PushPackage {
  encryptedPayload: string;
  apiKey: string;
  targetUrl: string;
  baseUrl: string;
}

export interface AppConfigVersion {
  id: string;
  tenantId: string;
  channelId: string;
  entity: string;
  version: number;
  configJson: unknown;
  active: boolean;
  pushedBy: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  syncedAt: string | null;
  remoteVersion: number | null;
  createdAt: string;
  /** Non null solo quando DRAFT per irraggiungibilità dal server. */
  pushPackage: PushPackage | null;
}

export interface AppConfigActive {
  source: string;
  configJson: unknown;
}

export const CHANNELS = ['mobile', 'web', 'totem'] as const;
export type ChannelId = (typeof CHANNELS)[number];

export const TENANT_SLUG_PATTERN = /^[a-z0-9-]+$/;
