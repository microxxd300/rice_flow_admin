import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

function jsonResponse(data, status = 200) {
  return { status, ok: status >= 200 && status < 300, json: async () => data };
}

beforeEach(() => {
  api.invalidate();
  vi.stubGlobal('localStorage', { getItem: () => 'test-token' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('sends the stored token as a Bearer header', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ users: 3 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.stats()).resolves.toEqual({ users: 3 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/admin-stats\/$/);
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('shares one request between concurrent GETs and caches the result', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ users: 3 }));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([api.stats(), api.stats()]);
    await api.stats();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(api.isWarm('auth/admin-stats/')).toBe(true);
  });

  it('clears cached reads after a write', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true })));

    await api.stats();
    expect(api.isWarm('auth/admin-stats/')).toBe(true);

    await api.login('admin@example.com', 'secret');
    expect(api.isWarm('auth/admin-stats/')).toBe(false);
  });

  it('joins every DRF error string into one message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(
      { email: ['Enter a valid email.'], password: ['This field is required.'] }, 400,
    )));

    await expect(api.login('bad', '')).rejects.toThrow(
      'Enter a valid email. · This field is required.',
    );
  });
});

describe('token refresh', () => {
  let store;
  let dispatchEvent;

  beforeEach(() => {
    store = { admin_token: 'old-access', admin_refresh: 'refresh-1' };
    vi.stubGlobal('localStorage', {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
    dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
  });

  it('refreshes on 401, keeps the rotated refresh token, and retries', async () => {
    const fetchMock = vi.fn(async (url, init) => {
      if (url.endsWith('/token/refresh/')) return jsonResponse({ access: 'new-access', refresh: 'refresh-2' });
      return init.headers.Authorization === 'Bearer new-access'
        ? jsonResponse({ users: 3 })
        : jsonResponse({ detail: 'expired' }, 401);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.stats()).resolves.toEqual({ users: 3 });
    expect(store).toMatchObject({ admin_token: 'new-access', admin_refresh: 'refresh-2' });
  });

  it('shares one refresh between parallel 401s', async () => {
    const fetchMock = vi.fn(async (url, init) => {
      if (url.endsWith('/token/refresh/')) return jsonResponse({ access: 'new-access', refresh: 'refresh-2' });
      return init.headers.Authorization === 'Bearer new-access'
        ? jsonResponse({ ok: true })
        : jsonResponse({ detail: 'expired' }, 401);
    });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([api.stats(), api.users(), api.systemHealth()]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => url.endsWith('/token/refresh/'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('ends the session when the refresh token is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ detail: 'invalid' }, 401)));

    await expect(api.stats()).rejects.toThrow('invalid');
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:expired' }));
  });
});
