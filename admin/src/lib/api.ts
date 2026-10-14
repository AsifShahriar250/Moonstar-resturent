const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "moonstar_admin_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (response.status === 401 && endpoint !== "/auth/login") {
    clearAuthToken();
    window.dispatchEvent(new Event("moonstar:unauthorized"));
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data as T;
}

export async function checkApiHealth() {
  return apiRequest<{ success: boolean; api: string; database: string }>(
    "/health",
  );
}
