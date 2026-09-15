const BASE = 'http://localhost:8000/api';

function getToken() {
  return localStorage.getItem('admin_token');
}

/* ── GET cache ────────────────────────────────────────────────────────────
   Every page refetched on mount, so navigating away and back meant another
   full round trip to the API (and on to Supabase) before the skeleton
   cleared. GETs are now cached briefly and served from memory on revisit,
   which is what makes page-to-page navigation feel instant.

   - Only GETs are cached, for TTL_MS.
   - Any write clears the cache, so a mutation is never followed by a stale
     read.
   - Concurrent GETs for the same path share one request instead of two.
   - api.invalidate() lets an explicit Refresh force real network I/O.        */
const TTL_MS = 60_000;
const cache = new Map();     // path -> { data, ts }
const inflight = new Map();  // path -> Promise
let warmed = false;

function cacheClear() {
  cache.clear();
  inflight.clear();
  warmed = false;
}

function fire(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return (async () => {
    const res = await fetch(`${BASE}/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await handleResponse(res);
    if (method === 'GET') cache.set(path, { data, ts: Date.now() });
    else cacheClear();          // a write invalidates every cached read
    return data;
  })();
}

async function request(method, path, body = null, opts = {}) {
  const isGet = method === 'GET';
  if (!isGet) return fire(method, path, body);

  if (!opts.fresh) {
    const hit = cache.get(path);
    if (hit) {
      // Stale-while-revalidate: hand back what we have straight away so the
      // page never shows a skeleton on a revisit, and quietly refresh in the
      // background once the entry is older than TTL_MS.
      if (Date.now() - hit.ts >= TTL_MS && !inflight.has(path)) {
        const bg = fire('GET', path).catch(() => {});
        inflight.set(path, bg);
        bg.finally(() => inflight.delete(path));
      }
      return hit.data;
    }
    const pending = inflight.get(path);
    if (pending) return pending;
  }

  const run = fire('GET', path, body);
  inflight.set(path, run);
  run.finally(() => inflight.delete(path));
  return run;
}

/**
 * Upload a single file via multipart/form-data. Used by CSV import.
 * Does NOT set Content-Type — the browser adds the multipart boundary.
 */
async function uploadFile(method, path, file, fieldName = 'file') {
  const fd = new FormData();
  fd.append(fieldName, file);

  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/${path}`, { method, headers, body: fd });
  return handleResponse(res);
}

async function handleResponse(res) {

  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    // DRF validation errors arrive as a dict of arrays-of-strings.
    // Collect every string in the response so the caller can show
    // a complete error message instead of just the first one.
    const collected = []
      .concat(data.detail ? [data.detail] : [])
      .concat(data.error  ? [data.error]  : [])
      .concat(Object.values(data).flat())
      .filter(v => typeof v === 'string');
    const msg = collected.length
      ? Array.from(new Set(collected)).join(' · ')
      : 'Request failed';
    const err = new Error(msg);
    err.payload = data;
    throw err;
  }
  return data;
}

export const api = {
  /* Drop every cached GET. Call this before a manual Refresh so the button
     performs real network I/O instead of replaying the cache. */
  invalidate: () => cacheClear(),

  /* True if this path is already cached — lets a page skip its skeleton. */
  isWarm: (path) => cache.has(path),

  /* Pull the data every page needs into the cache once, shortly after login,
     so the first visit to each page is already warm. Errors are swallowed:
     this is opportunistic, and each page still fetches for itself. */
  warm() {
    if (warmed) return;
    warmed = true;
    ['auth/admin-stats/', 'auth/users/', 'farms/all/', 'varieties/?all=1',
     'progress/admin/cycles/', 'recommendations/rules/']
      .forEach(p => { request('GET', p).catch(() => {}); });
  },

  login:        (email, password) => request('POST', 'auth/login/', { email, password }),
  stats:        ()                => request('GET',  'auth/admin-stats/'),
  systemHealth: ()                => request('GET',  'auth/system-health/'),

  users:        ()                => request('GET',    'auth/users/'),
  user:         (id)              => request('GET',    `auth/users/${id}/`),
  createUser:   (data)            => request('POST',   'auth/users/', data),
  updateUser:   (id, data)        => request('PATCH',  `auth/users/${id}/`, data),
  deleteUser:   (id)              => request('DELETE', `auth/users/${id}/`),
  toggleUser:   (id, is_active)   => request('PATCH',  'auth/users/', { id, is_active }),

  farms:        ()                => request('GET',  'farms/all/').then(d => Array.isArray(d) ? d : (d.results ?? [])),
  deleteFarm:   (id)             => request('DELETE', `farms/admin/${id}/`),
  cleanupFarms: ()               => request('POST',   'farms/cleanup/'),

  farmCycles:   ()               => request('GET',    'progress/admin/cycles/'),
  deleteCycle:  (id)             => request('DELETE', `progress/admin/cycles/${id}/`),

  varieties:        ()          => request('GET',    'varieties/?all=1'),
  variety:          (id)        => request('GET',    `varieties/${id}/`),
  createVariety:    (data)      => request('POST',   'varieties/', data),
  updateVariety:    (id, data)  => request('PATCH',  `varieties/${id}/`, data),
  deleteVariety:    (id)        => request('DELETE', `varieties/${id}/`),
  importVarietyCSV: (file)      => uploadFile('POST', 'varieties/import-csv/', file),

  models:      ()                => request('GET',  'predictions/models/'),
  trainModels: ()                => request('POST', 'predictions/train/'),

  rules:       ()                => request('GET',  'recommendations/rules/'),
  saveRules:   (payload)         => request('PUT',  'recommendations/rules/', { payload }),
};
