export interface CreateShortUrlRequest {
  originalUrl: string;
  customAlias?: string;
  expiresAt?: string;
}

export interface ShortUrlResponse {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  clickCount: number;
  createdAt: string;
  expiresAt?: string | null;
}

export type SortField = 'createdAt' | 'clickCount' | 'expiresAt';
export type SortDir = 'asc' | 'desc';
export type FilterStatus = 'all' | 'active' | 'expired';
