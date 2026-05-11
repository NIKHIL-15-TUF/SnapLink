import apiClient from "./apiClient";

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  expiresAt: string;
}

export const register = async (
  data: RegisterRequest
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>(
    "/Auth/register",
    data
  );
  return response.data;
};

export const login = async (
  data: LoginRequest
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>(
    "/Auth/login",
    data
  );
  return response.data;
};