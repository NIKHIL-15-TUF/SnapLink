import apiClient from "./apiClient";

export interface CreateShortUrlRequest {
  originalUrl: string;
  customAlias?: string;
  expiresAt?: string | null;
}

// FIX: Added UpdateShortUrlRequest (mirrors the backend DTO)
export interface UpdateShortUrlRequest {
  originalUrl: string;
  customAlias?: string;
  expiresAt?: string | null;
}

export interface ShortUrlResponse {
  id: string;        // FIX: UUID from backend → string, not number
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  clickCount: number;
  createdAt: string;
  expiresAt?: string | null;
}

export const createShortUrl = async (
  data: CreateShortUrlRequest
): Promise<ShortUrlResponse> => {
  const response = await apiClient.post<ShortUrlResponse>("/Urls", data);
  return response.data;
};

export const getAllUrls = async (): Promise<ShortUrlResponse[]> => {
  const response = await apiClient.get<ShortUrlResponse[]>("/Urls");
  return response.data;
};

// FIX: id is string (UUID), not number
export const deleteUrl = async (id: string): Promise<void> => {
  await apiClient.delete(`/Urls/${id}`);
};

// FIX: Added missing updateUrl — the backend PUT /Urls/{id} endpoint existed
// but had no corresponding frontend API function.
export const updateUrl = async (
  id: string,
  data: UpdateShortUrlRequest
): Promise<ShortUrlResponse> => {
  const response = await apiClient.put<ShortUrlResponse>(`/Urls/${id}`, data);
  return response.data;
};
