export interface Tenant {
  id: string;
  installationId: string;
  slug: string;
  name: string;
  active: boolean;
  createdAt: string;
  provisionPackage?: ProvisionPackage | null;
}

export interface TenantCreateRequest {
  slug: string;
  name: string;
}

export interface TenantCloneRequest {
  slug: string;
  name: string;
  overwrite: boolean;
}

export interface PendingConfigPush {
  tenantId: string;
  tenantSlug: string;
  channelId: string;
  entity: string;
  pushPackage: PushPackage;
}

export interface TenantCloneResponse {
  tenant: Tenant;
  configsTotal: number;
  configsSynced: number;
  overwritten: boolean;
  pendingConfigPush: PendingConfigPush[];
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

/**
 * Package per il provisioning browser-assisted di risorse on-prem.
 * Usato quando il central non riesce a raggiungere l'on-prem (es. behind VPN).
 * Il browser deve fare:
 *   POST targetUrl
 *   Headers: Content-Type: application/json, X-API-Key: adminApiKey
 *   Body: body
 */
export interface ProvisionPackage {
  adminApiKey: string;
  targetUrl: string;
  body: string;
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

export interface EntityInfo {
  entity: string;
  enabled: boolean;
}

export interface PushNotificationConfig {
  notificatorUrl: string;
  notificatorTenant: string;
  apiKey: string;
  /** Non restituito dal server in lettura — solo in scrittura. */
  secret?: string;
  apiKeyConfigured: boolean;
  secretConfigured: boolean;
}

export interface PushNotificationConfigRequest {
  notificatorUrl: string;
  notificatorTenant: string;
  apiKey: string;
  secret: string;
}

export type PushNoticeType = 'INFO' | 'WARNING' | 'ERROR';

export interface PushSendRequest {
  title: string;
  message: string;
  noticeType: PushNoticeType;
  /** Identificativi utente in chiaro: il backend li trasforma in hash SHA-256 prima di inviarli al notificator. */
  users: string[];
}

export interface PushSendResult {
  status: string;
  tokens: number;
}

export interface DraftConfigSummary {
  configId: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  installationId: string;
  installationName: string;
  customerId: string;
  customerName: string;
  channelId: string;
  entity: string;
  version: number;
  syncError: string | null;
  createdAt: string;
}
