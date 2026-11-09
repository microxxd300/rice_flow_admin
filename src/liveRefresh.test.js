import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVE_REFRESH_MS, startLiveRefresh } from './liveRefresh';

vi.mock('./services/api', () => ({ api: { invalidate: vi.fn() } }));

function fakeDocument(visibilityState) {
  const handlers = [];
  return {
    visibilityState,
    addEventListener: (_name, fn) => handlers.push(fn),
    removeEventListener: () => handlers.pop(),
    show() { this.visibilityState = 'visible'; handlers.forEach(fn => fn()); },
  };
}

describe('startLiveRefresh', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('drops the saved answers, then reloads, on every tick', () => {
    const order = [];
    const stop = startLiveRefresh(() => order.push('reload'), () => order.push('invalidate'), fakeDocument('visible'));
    vi.advanceTimersByTime(LIVE_REFRESH_MS);
    expect(order).toEqual(['invalidate', 'reload']);
    stop();
  });

  it('waits while the tab is hidden and reloads when it is shown', () => {
    const reload = vi.fn();
    const doc = fakeDocument('hidden');
    const stop = startLiveRefresh(reload, vi.fn(), doc);
    vi.advanceTimersByTime(LIVE_REFRESH_MS * 3);
    expect(reload).not.toHaveBeenCalled();
    doc.show();
    expect(reload).toHaveBeenCalledTimes(1);
    stop();
  });
});
