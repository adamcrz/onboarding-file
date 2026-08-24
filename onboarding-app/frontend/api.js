// Fix base URL
const API_BASE = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

// The session travels in an httpOnly cookie the server sets at login. Script
// on this page cannot read it — which is the point: an injected script can no
// longer copy the session and use it elsewhere. `credentials: 'include'` is
// what tells fetch to send it.
async function apiFetch(method, path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Session gone or expired — clear the whole local session marker, not
      // just part of it. Leaving sessionRole/sessionActive set let the
      // DOMContentLoaded restore check still treat this as "logged in",
      // landing on a broken partial session instead of a clean login screen.
      if (res.status === 401) {
        clearLocalSession();
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

// Only the cookie is the session. These keys are UI state — which portal was
// chosen, the display name — and never a credential.
function clearLocalSession() {
  localStorage.removeItem('token');       // legacy key from before cookie sessions
  localStorage.removeItem('sessionRole');
  localStorage.removeItem('sessionActive');
  localStorage.removeItem('user');
}

// Auth
const ApiAuth = {
  login:    (data) => apiFetch('POST', '/auth/login', data),
  register: (data) => apiFetch('POST', '/auth/register', data),
  me:       ()     => apiFetch('GET',  '/auth/me'),
};

// REPLACE WITH:
const ApiClients = {
  getAll:    ()       => apiFetch('GET',    '/clients'),
  getById:   (id)     => apiFetch('GET',    `/clients/${id}`),
  create:    (data)   => apiFetch('POST',   '/clients', data),
  update:    (id, d)  => apiFetch('PUT',    `/clients/${id}`, d),
  remove:    (id)     => apiFetch('DELETE', `/clients/${id}`),
};

const ApiDocuments = {
  getAll:    ()       => apiFetch('GET',    '/documents'),
  getById:   (id)     => apiFetch('GET',    `/documents/${id}`),
  create:    (data)   => apiFetch('POST',   '/documents', data),
  update:    (id, d)  => apiFetch('PUT',    `/documents/${id}`, d),
  remove:    (id)     => apiFetch('DELETE', `/documents/${id}`),
};