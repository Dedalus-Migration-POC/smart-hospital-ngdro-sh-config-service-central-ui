export interface AuditLog {
  id: string;
  at: string;
  actorUsername: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  outcome: string;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuditLogPage {
  content: AuditLog[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditFilter {
  actor?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  outcome?: string;
  from?: string;
  to?: string;
}
