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
}

export interface AppConfigActive {
  source: string;
  configJson: unknown;
}

export const CHANNELS = ['mobile', 'web', 'totem'] as const;
export type ChannelId = (typeof CHANNELS)[number];

export const TENANT_SLUG_PATTERN = /^[a-z0-9-]+$/;
