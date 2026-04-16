import { api } from '@mira/ui/shared/api/client';
import { LoginCredentials, RegisterData, AuthResponse } from '../../types/auth.types';
import { ENDPOINTS } from '@mira/ui/shared/api/constants';

export const authApi = {
  /**
   * Login with email and password
   * POST /api/v2/auth/login
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(ENDPOINTS.AUTH_LOGIN, {
      email: credentials.email,
      password: credentials.password,
    });
    return data;
  },

  /**
   * Register new user
   * POST /api/v2/auth/register
   */
  register: async (registerData: RegisterData): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(ENDPOINTS.AUTH_REGISTER, {
      email: registerData.email,
      password: registerData.password,
    });
    return data;
  },

  /**
   * Refresh access token
   * POST /api/v2/auth/refresh
   */
  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(ENDPOINTS.AUTH_REFRESH, {
      refresh_token: refreshToken,
    });
    return data;
  },

  /**
   * Get Google OAuth URL
   * GET /api/v2/auth/google/url
   */
  getGoogleOAuthUrl: async (redirectPort: number = 4280): Promise<{ url: string; state: string }> => {
    const { data } = await api.get<{ url: string; state: string }>(ENDPOINTS.AUTH_GOOGLE_URL, {
      params: { redirect_port: redirectPort },
    });
    return data;
  },

  /**
   * Exchange Google OAuth code for tokens
   * POST /api/v2/auth/google/callback
   */
  googleCallback: async (code: string, state: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(ENDPOINTS.AUTH_GOOGLE_CALLBACK, {
      code,
      state,
    });
    return data;
  },
};