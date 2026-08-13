import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestWithAuth, apiFetch, formatImageUrl, API_URL } from './core';

function jsonResponse(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('always sends credentials: include so the httpOnly auth cookie is attached', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/some-url', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledWith('/some-url', expect.objectContaining({ credentials: 'include' }));
  });
});

describe('requestWithAuth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the response directly on success without attempting a refresh', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await requestWithAuth('/api/orders');

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('on 401, refreshes the token once and retries the original request exactly once', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401)) // lần gọi gốc
      .mockResolvedValueOnce(jsonResponse(200, { refreshed: true })) // POST /auth/refresh-token
      .mockResolvedValueOnce(jsonResponse(200, { ok: true })); // retry lần 2
    vi.stubGlobal('fetch', fetchMock);

    const res = await requestWithAuth('/api/orders');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(200);
  });

  it('when refresh fails, dispatches auth:expired and rethrows instead of retrying forever', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401)) // lần gọi gốc
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }); // refresh cũng thất bại
    vi.stubGlobal('fetch', fetchMock);

    const expiredHandler = vi.fn();
    window.addEventListener('auth:expired', expiredHandler);

    await expect(requestWithAuth('/api/orders')).rejects.toThrow();

    expect(expiredHandler).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2); // không gọi lại request gốc lần 3 (không loop vô hạn)

    window.removeEventListener('auth:expired', expiredHandler);
  });

  it('strips the Content-Type header when the body is FormData (let the browser set the boundary)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200));
    vi.stubGlobal('fetch', fetchMock);

    const formData = new FormData();
    await requestWithAuth('/api/upload', { method: 'POST', body: formData });

    const callArgs = fetchMock.mock.calls[0][1];
    expect(callArgs.headers['Content-Type']).toBeUndefined();
  });
});

describe('formatImageUrl', () => {
  it('returns a placeholder for empty urls', () => {
    expect(formatImageUrl('')).toContain('unsplash.com');
    expect(formatImageUrl(null)).toContain('unsplash.com');
  });

  it('prefixes /uploads/ paths with API_URL (backend serves uploads under /api)', () => {
    expect(formatImageUrl('/uploads/prescriptions/abc.jpg')).toBe(
      `${API_URL}/uploads/prescriptions/abc.jpg`
    );
  });

  it('leaves absolute urls untouched', () => {
    expect(formatImageUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
  });
});
