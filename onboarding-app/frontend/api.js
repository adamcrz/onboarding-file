/* ============================================================
   API LAYER — connects frontend to Express backend
   Base URL auto-detects: localhost:5000 in dev, same origin in prod
   ============================================================ */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

/* ---- Core fetch wrapper ---- */
async function apiFetch(method, path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.warn(`[API] ${method} ${path} failed:`, e.message);
    throw e;
  }
}

/* ============================================================
   HEALTH
   ============================================================ */
const ApiHealth = {
  check: () => apiFetch('GET', '/health'),
};

/* ============================================================
   CLIENTS  (maps to /api/folders in your backend)
   Rename your backend route to /api/clients for clarity — see note below
   ============================================================ */
// AFTER ✅
const ApiClients = {
  getAll:   () => apiFetch('GET', '/clients'),
  getById:  (id) => apiFetch('GET', `/clients/${id}`),
  create:   (data) => apiFetch('POST', '/clients', data),
  update:   (id, d) => apiFetch('PUT', `/clients/${id}`, d),
  remove:   (id) => apiFetch('DELETE', `/clients/${id}`),
};

const ApiDocuments = {
  getAll:   () => apiFetch('GET', '/documents'),
  getById:  (id) => apiFetch('GET', `/documents/${id}`),
  create:   (data) => apiFetch('POST', '/documents', data),
  update:   (id, d) => apiFetch('PUT', `/documents/${id}`, d),
  remove:   (id) => apiFetch('DELETE', `/documents/${id}`),
};
/* ============================================================
   SYNC HELPERS
   These push State changes to the backend automatically.
   Call them after you mutate State.clients or State.clients[x].documents.
   ============================================================ */

/** Save a full client record to the backend */
async function syncClient(client) {
  try {
    const existing = await ApiClients.getById(client.id).catch(() => null);
    if (existing) {
      await ApiClients.update(client.id, client);
    } else {
      await ApiClients.create(client);
    }
  } catch (e) {
    console.warn('[sync] Could not sync client:', e.message);
  }
}

/** Save a document record to the backend */
async function syncDocument(doc) {
  try {
    const existing = await ApiDocuments.getById(doc.id).catch(() => null);
    if (existing) {
      await ApiDocuments.update(doc.id, doc);
    } else {
      await ApiDocuments.create(doc);
    }
  } catch (e) {
    console.warn('[sync] Could not sync document:', e.message);
  }
}

/* ============================================================
   LOAD STATE FROM BACKEND ON STARTUP
   Call loadStateFromBackend() before rendering the app.
   Falls back to the hardcoded State if the backend is unreachable.
   ============================================================ */
async function loadStateFromBackend() {
  try {
    await ApiHealth.check();           // quick ping
    console.log('[API] Backend reachable — loading live data');

    const [clients, documents] = await Promise.all([
      ApiClients.getAll(),
      ApiDocuments.getAll(),
    ]);

    // Only replace State if the backend actually has data
    if (clients && clients.length > 0) {
      State.clients = clients;
    }

    // Attach documents to their parent clients
    if (documents && documents.length > 0) {
      documents.forEach(doc => {
        const client = State.clients.find(c => c.id === doc.clientId);
        if (client) {
          // avoid duplicates
          const already = client.documents.find(d => d.id === doc.id);
          if (!already) client.documents.push(doc);
        }
      });
    }

    showToast('success', 'Live data loaded from backend.');
  } catch (e) {
    console.warn('[API] Backend unavailable — using demo data.', e.message);
    // App continues normally with hardcoded State — no crash
  }
}

/* ============================================================
   WRAPPERS — drop-in replacements for key State mutations
   These mirror what app.js already does but also persist to backend.
   ============================================================ */

/** Use instead of pushing directly to State.clients */
async function createClientAndSync(clientObj) {
  State.clients.unshift(clientObj);
  await syncClient(clientObj);
}

/** Use after approving a client */
async function approveClientAndSync(id) {
  const c = State.clients.find(c => c.id === id);
  if (!c) return;
  c.status = 'approved';
  c.progress = 100;
  c.auditTrail.push({
    action: 'Case approved by compliance officer',
    user: 'Compliance Officer',
    time: new Date().toLocaleString(),
    type: 'approved',
  });
  await syncClient(c);
}

/** Use after rejecting a client */
async function rejectClientAndSync(id) {
  const c = State.clients.find(c => c.id === id);
  if (!c) return;
  c.status = 'rejected';
  c.auditTrail.push({
    action: 'Case rejected by compliance officer',
    user: 'Compliance Officer',
    time: new Date().toLocaleString(),
    type: 'rejected',
  });
  await syncClient(c);
}

/** Use after uploading a document */
async function uploadDocumentAndSync(clientId, docObj) {
  const client = State.clients.find(c => c.id === clientId);
  if (!client) return;
  client.documents.push(docObj);
  await syncDocument({ ...docObj, clientId });
}
