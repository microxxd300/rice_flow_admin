/**
 * Reverse-geocode lat/lng using OpenStreetMap Nominatim — the same
 * service the mobile app uses for resolving farm pin locations.
 * Results are cached in localStorage so we hit the API at most once
 * per unique coordinate pair across the admin session.
 *
 * Returns { barangay, city, province } or null on failure.
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';

function cacheKey(lat, lng) {
  return `riceflow_geo:${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}

/**
 * Synchronous cache lookup — returns the cached address if we've
 * already resolved these coords (in any previous session). Returns
 * null without a network call if not cached.
 */
export function getCachedGeocode(lat, lng) {
  if (!isFinite(lat) || !isFinite(lng)) return null;
  const cached = localStorage.getItem(cacheKey(lat, lng));
  if (!cached) return null;
  try { return JSON.parse(cached); } catch { return null; }
}

/**
 * Returns the resolved address. Reads localStorage first; only makes
 * a network call on a cache miss. The boolean second return value
 * tells the caller whether a real network request happened — so it
 * can avoid throttling on cache hits.
 */
export async function reverseGeocode(lat, lng) {
  if (!isFinite(lat) || !isFinite(lng)) return { result: null, fromNetwork: false };
  const key = cacheKey(lat, lng);
  const cached = localStorage.getItem(key);
  if (cached) {
    try { return { result: JSON.parse(cached), fromNetwork: false }; }
    catch { /* fall through */ }
  }
  try {
    const url = `${NOMINATIM}?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return { result: null, fromNetwork: true };
    const data = await res.json();
    const a = data.address || {};
    const result = {
      barangay: a.village || a.suburb || a.hamlet || a.neighbourhood || a.quarter || '',
      city:     a.city || a.town || a.municipality || a.county || '',
      province: a.state || a.region || '',
    };
    localStorage.setItem(key, JSON.stringify(result));
    return { result, fromNetwork: true };
  } catch {
    return { result: null, fromNetwork: true };
  }
}
