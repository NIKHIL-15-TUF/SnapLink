import axios from "axios";

const api = axios.create({
    baseURL: "https://localhost:7175/api",
});

export interface CreateShortUrlRequest {
    originalUrl: string;
    customAlias?: string | null;
    expiresAt?: string | null;
}

export interface ShortUrlResponse {
    id: string;
    originalUrl: string;
    shortCode: string;
    shortUrl: string;
    createdAt: string;
    clickCount: number;
}

export const createShortUrl = async (
    data: CreateShortUrlRequest
): Promise<ShortUrlResponse> => {
    const response = await api.post<ShortUrlResponse>("/Urls", data);
    return response.data;
};

export const getAllUrls = async (): Promise<ShortUrlResponse[]> => {
    const response = await api.get<ShortUrlResponse[]>("/Urls");
    return response.data;
};