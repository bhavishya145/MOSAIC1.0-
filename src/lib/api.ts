/**
 * Centralized API Client for MOSAIC
 * Handles authentication tokens, normalized base URLs, and clean error messages.
 */

// Normalized API base URL - safely handles trailing slashes and environment configuration
const envApiUrl = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = envApiUrl.replace(/\/+$/, '') + '/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Token storage key
const TOKEN_KEY = 'mosaic_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers: customHeaders, ...restOptions } = options;

  // Normalize path so it always begins with single slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${API_BASE_URL}${cleanEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (restOptions.body && !(restOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
      credentials: 'same-origin',
    });
  } catch (err: any) {
    throw new ApiError(
      'Unable to connect to the MOSAIC editorial server. Please check your internet connection and try again.',
      0,
      err
    );
  }

  let responseData: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    let friendlyMessage = 'An unexpected error occurred.';

    if (responseData && typeof responseData === 'object' && responseData.error) {
      friendlyMessage = responseData.error;
    } else if (response.status === 401) {
      friendlyMessage = 'Please sign in to continue.';
    } else if (response.status === 403) {
      friendlyMessage = "You don't have permission to perform this action.";
    } else if (response.status === 404) {
      friendlyMessage = 'The requested content could not be found.';
    } else if (response.status === 409) {
      friendlyMessage = 'This record or action already exists.';
    } else if (response.status >= 500) {
      friendlyMessage = 'Something went wrong on our side. Please try again.';
    }

    throw new ApiError(friendlyMessage, response.status, responseData);
  }

  return responseData as T;
}
