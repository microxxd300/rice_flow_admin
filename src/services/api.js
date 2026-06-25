const BASE = 'http://localhost:8000/api';

function getToken() {
  return localStorage.getItem('admin_token');
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
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
