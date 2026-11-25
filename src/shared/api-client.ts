import type { ApiEnvelope, ApiErrorResponse } from '@/contracts/api.types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const TOKEN_STORAGE_KEY = 'naisee_test_token';
const TOKEN_EVENT_NAME = 'naisee-token-change';
const UNAUTHORIZED_EVENT_NAME = 'naisee-unauthorized';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  window.dispatchEvent(new Event(TOKEN_EVENT_NAME));
}

export function subscribeTokenChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(TOKEN_EVENT_NAME, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(TOKEN_EVENT_NAME, callback);
  };
}

function makeError(
  code: string,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    typeof (payload as { success?: unknown }).success === 'boolean'
  );
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    return makeError(
      'NETWORK_ERROR',
      err instanceof Error
        ? `Không thể kết nối máy chủ API: ${err.message}`
        : 'Không thể kết nối máy chủ API',
    );
  }

  if (
    response.status === 401 &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/demo-switch') &&
    token
  ) {
    setStoredToken(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT_NAME));
    }
  }

  const rawText = await response.text();
  if (!rawText) {
    return response.ok
      ? makeError('EMPTY_RESPONSE', 'Máy chủ trả về phản hồi rỗng')
      : makeError(
          `HTTP_${response.status}`,
          response.statusText || `Lỗi HTTP ${response.status}`,
        );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return makeError(
      `HTTP_${response.status || 'INVALID_JSON'}`,
      `Phản hồi không đúng định dạng JSON (HTTP ${response.status})`,
      rawText.slice(0, 300),
    );
  }

  if (isApiEnvelope<T>(parsed)) {
    return parsed;
  }

  if (!response.ok) {
    return makeError(
      `HTTP_${response.status}`,
      response.statusText || `Lỗi HTTP ${response.status}`,
      parsed,
    );
  }

  return {
    success: true,
    data: parsed as T,
  };
}

export const apiClient = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body ?? {}),
    }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
