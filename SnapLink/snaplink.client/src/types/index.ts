export interface CreateShortUrlRequest {
  originalUrl: string;
  customAlias?: string;
}

export interface ShortUrlResponse {
  id: number;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  clickCount: number;
  createdAt: string;
}
