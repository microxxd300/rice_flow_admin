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
