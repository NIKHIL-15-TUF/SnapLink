import type { CreateShortUrlRequest, ShortUrlResponse } from '../types';

const BASE_URL = '/api';

export async function createShortUrl(data: CreateShortUrlRequest): Promise<ShortUrlResponse> {
  const response = await fetch(`${BASE_URL}/urls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to create short URL');
  }
  return response.json();
}

export async function getAllUrls(): Promise<ShortUrlResponse[]> {
  const response = await fetch(`${BASE_URL}/urls`);
  if (!response.ok) throw new Error('Failed to fetch URLs');
  return response.json();
}

export async function getUrlStats(id: number): Promise<ShortUrlResponse> {
  const response = await fetch(`${BASE_URL}/urls/${id}`);
  if (!response.ok) throw new Error('Failed to fetch URL stats');
  return response.json();
}

export async function deleteUrl(id: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/urls/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete URL');
}
