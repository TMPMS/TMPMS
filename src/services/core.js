export const API_URL = import.meta.env.VITE_API_URL ?? '';

export const FALLBACK_MED_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="12" fill="#f1f5f9"/><circle cx="100" cy="82" r="34" fill="#0f766e" opacity="0.15"/><path d="M100 74v28M86 88h28" stroke="#0f766e" stroke-width="5" stroke-linecap="round"/><rect x="62" y="120" width="76" height="14" rx="7" fill="#0f766e" opacity="0.25"/><rect x="78" y="142" width="44" height="10" rx="5" fill="#0f766e" opacity="0.18"/></svg>'
);

// Low-level fetch wrapper: always sends the httpOnly auth cookie set by the backend on
// login/refresh. Every call in this file goes through this instead of the global fetch.
export function apiFetch(url, options = {}) {
  return window.fetch(url, { ...options, credentials: 'include' });
}

export function getAuthHeaders() {
  return { 'Content-Type': 'application/json' };
}

let refreshPromise = null;

// Exchange the httpOnly refresh_token cookie for a fresh access_token cookie (rotation on the server).
export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const res = await apiFetch(`${API_URL}/auth/refresh-token`, { method: 'POST' });
    if (!res.ok) throw new Error('Refresh token request failed');
    return res.json();
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

// Authenticated fetch with automatic silent token refresh + single retry on 401.
export async function requestWithAuth(url, options = {}) {
  const mergeHeaders = (extra = {}) => {
    const headers = { ...getAuthHeaders(), ...extra };
    if (options.body instanceof FormData) delete headers['Content-Type'];
    return headers;
  };
  let res = await apiFetch(url, { ...options, headers: mergeHeaders(options.headers) });
  if (res.status === 401) {
    try {
      await refreshAccessToken();
      res = await apiFetch(url, { ...options, headers: mergeHeaders(options.headers) });
    } catch (err) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:expired'));
      throw err;
    }
  }
  return res;
}

export function formatImageUrl(url) {
  if (!url) return 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500';
  if (url.startsWith('/uploads/')) {
    return `${API_URL}${url}`;
  }
  return url;
}
