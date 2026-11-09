import { useEffect, useRef } from 'react';
import { api } from './services/api';

export const LIVE_REFRESH_MS = 15_000;

/**
 * Reloads every 15 seconds while the page is showing, and as soon as it is shown again.
 * The saved answers are dropped first, or the reload would only replay them.
 * Returns the function that stops it.
 */
export function startLiveRefresh(reload, invalidate, doc = document) {
  const tick = () => {
    if (doc.visibilityState !== 'visible') return;
    invalidate();
    reload();
  };
  const timer = setInterval(tick, LIVE_REFRESH_MS);
  doc.addEventListener('visibilitychange', tick);
  return () => { clearInterval(timer); doc.removeEventListener('visibilitychange', tick); };
}

export function useLiveRefresh(reload) {
  const latest = useRef(reload);
  useEffect(() => { latest.current = reload; });
  useEffect(() => startLiveRefresh(() => latest.current(), () => api.invalidate()), []);
}
