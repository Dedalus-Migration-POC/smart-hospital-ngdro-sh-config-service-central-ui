export interface Customer {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  /** ISO-8601 LocalDateTime serializzato dal backend (es. "2026-05-04T20:06:52.710"). */
  createdAt: string;
}

export interface CustomerCreateRequest {
  slug: string;
  name: string;
}

export interface CustomerUpdateRequest {
  name: string;
  active?: boolean;
}

/** Regex slug come da CustomerCreateRequest @Pattern lato backend. */
export const CUSTOMER_SLUG_PATTERN = /^[a-z0-9-]+$/;
