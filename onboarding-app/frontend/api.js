// Fix base URL
const API_BASE = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

// Updated fetch wrapper — sends token automatically
async function apiFetch(method, path, body) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // If token expired, log out
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
      }
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.warn(`[API] ${method} ${path} failed:`, e.message);
    throw e;
  }
}

// Auth
const ApiAuth = {
  login:    (data) => apiFetch('POST', '/auth/login', data),
  register: (data) => apiFetch('POST', '/auth/register', data),
  me:       ()     => apiFetch('GET',  '/auth/me'),
};

// Fixed endpoints
const ApiClients = {
  getAll:  ()        => apiFetch('GET',    '/clients'),
  getById: (id)      => apiFetch('GET',    `/clients/${id}`),
  create:  (data)    => apiFetch('POST',   '/clients', data),
  update:  (id, d)   => apiFetch('PUT',    `/clients/${id}`, d),
  remove:  (id)      => apiFetch('DELETE', `/clients/${id}`),
};

const ApiDocuments = {
  getAll:  ()        => apiFetch('GET',    '/documents'),
  getById: (id)      => apiFetch('GET',    `/documents/${id}`),
  create:  (data)    => apiFetch('POST',   '/documents', data),
  update:  (id, d)   => apiFetch('PUT',    `/documents/${id}`, d),
  remove:  (id)      => apiFetch('DELETE', `/documents/${id}`),
};