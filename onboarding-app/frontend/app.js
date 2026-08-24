/* ============================================================
   APP.JS — COMPLIANCE OS FRONT END
   ============================================================ */

/* ============================================================
   GLOBAL STATE
   ============================================================ */
const State = {
  currentRole: 'compliance',
  currentPage: 'dashboard',
  selectedClientId: null,
  clientType: null,

  // All business data below is loaded from the database (see refreshClients(),
  // refreshNotifications(), renderKycCorrections(), etc.) —
  // these start empty rather than seeded with mock/demo records, so a fresh
  // environment reflects only what's actually been created through the app.
  notifications: [],
  clients: [],
  mandates: [],
  kycCorrections: [],

  clientSubmissions: {},

  kycTasks: [],
  _activeKycTask: null,
  _activeCorrectionFieldKey: null,

  documentCorrections: [],

  riskAnswers: {},
  riskScores: {}
};

/* ============================================================
   ROLE DEFINITIONS
   ============================================================ */
// True for any compliance role variant (internal or external) — use this instead of
// comparing against the literal 'compliance' string, so permission checks stay correct
// for both.
function isCompliance(role) {
  return role === 'compliance' || role === 'compliance_external';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ROLES = {
  compliance: {
    label: 'Internal Compliance Officer',
    description: 'Internal Compliance Dept.',
    initial: 'C',
    badge: 'Internal Compliance',
    nav: [
      { section: 'Compliance' },
      { id: 'dashboard', label: 'Dashboard', icon: homeIcon() },
      { id: 'clients', label: 'All Cases', icon: usersIcon() },
      { id: 'kyc-tasks', label: 'KYC & Mandate Risk Tasks', icon: formIcon() },
      { id: 'contract-prep', label: 'Contract Tasks', icon: contractIcon() },
      { id: 'audit', label: 'Audit Trail', icon: auditIcon() },
      { section: 'Tools' },
      { id: 'contract-building', label: 'Contract Building', icon: fileIcon() },
      { id: 'kyc-form', label: 'KYC Schema', icon: formIcon() },
      { id: 'mandate-risk-schema', label: 'Mandate Risk Schema', icon: formIcon() },
    ]
  },
  // External Compliance — same format/permissions as Internal Compliance for now.
  compliance_external: {
    label: 'External Compliance Officer',
    description: 'External Compliance Dept.',
    initial: 'E',
    badge: 'External Compliance',
    nav: [
      { section: 'Compliance' },
      { id: 'dashboard', label: 'Dashboard', icon: homeIcon() },
      { id: 'clients', label: 'All Cases', icon: usersIcon() },
      { id: 'kyc-tasks', label: 'KYC & Mandate Risk Tasks', icon: formIcon() },
      { id: 'contract-prep', label: 'Contract Tasks', icon: contractIcon() },
      { id: 'audit', label: 'Audit Trail', icon: auditIcon() },
      { section: 'Tools' },
      { id: 'contract-building', label: 'Contract Building', icon: fileIcon() },
      { id: 'kyc-form', label: 'KYC Schema', icon: formIcon() },
      { id: 'mandate-risk-schema', label: 'Mandate Risk Schema', icon: formIcon() },
    ]
  },
  rm: {
    label: 'Sarah Mitchell',
    description: 'Relationship Manager',
    initial: 'S',
    badge: 'Rel. Manager',
    nav: [
      { section: 'My Clients' },
      { id: 'dashboard', label: 'Dashboard', icon: homeIcon() },
      { id: 'kyc-tasks', label: 'KYC & Mandate Risk Tasks', icon: formIcon() },
      { id: 'contract-prep', label: 'Contract Tasks', icon: contractIcon() },
      { id: 'clients', label: 'My Clients', icon: usersIcon() },
      { section: 'Tools' },
      { id: 'contract-building', label: 'Contract Building', icon: fileIcon() },
    ]
  },
  client: {
    label: 'John Smith',
    description: 'Client',
    initial: 'J',
    badge: 'Client',
    nav: [
      { section: 'My Application' },
      { id: 'dashboard', label: 'Application Status', icon: statusIcon() },
      // Same Contract Tasks screen the staff roles use — one place to
      // download the blank, upload the completed version and see what is
      // still outstanding, instead of two separate client-only pages.
      { id: 'contract-prep', label: 'Contract Tasks', icon: contractIcon() },
      { id: 'client-contract', label: 'Contract Package', icon: contractIcon() },
      { id: 'audit', label: 'Activity', icon: clockIcon() },
    ]
  }
};

/* ============================================================
   SVG ICONS
   ============================================================ */
function homeIcon()    { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`; }
function usersIcon()   { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`; }
function fileIcon()    { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>`; }
function auditIcon()   { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>`; }
function settingsIcon(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0117 3.34a10 10 0 00-10 0A10 10 0 004.93 4.93a10 10 0 00-1.59 2.07A10 10 0 003 9a10 10 0 000 6 10 10 0 001.34 2a10 10 0 002.07 1.59A10 10 0 009 21 10 10 0 0015 21a10 10 0 002-.34 10 10 0 002.07-1.59A10 10 0 0021 17a10 10 0 000-6 10 10 0 00-1.93-4.07z"/></svg>`; }
function barChartIcon(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`; }
function checklistIcon(){return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`; }
function shieldIcon()  { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`; }
function plusIcon()    { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`; }
function formIcon()    { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>`; }
function downloadIcon(){ return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`; }
function eyeIcon()     { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`; }
function uploadIcon()  { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>`; }
function checkIcon()   { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>`; }
function xIcon()       { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`; }
function alertIcon()   { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`; }
function statusIcon()  { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`; }
function contractIcon(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M10 13l1.5 1.5L15 11"/></svg>`; }
function clockIcon()   { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`; }

/* ============================================================
   AUTH PANEL — state machine for the login card
   ============================================================ */
const AuthState = { panel: 'login', pendingEmail: '', resetToken: '', selectedRole: '', emailPreviewUrl: '' };

function setAuthPanel(panel) {
  AuthState.panel = panel;
  renderAuthPanel();
}

function renderAuthPanel() {
  const el = document.getElementById('auth-panel');
  if (!el) return;
  const map = {
    'login':           loginFormHTML,
    'role-login':      roleLoginFormHTML,
    'register':        registerFormHTML,
    'verify-pending':  verifyPendingHTML,
    'login-code':      loginCodeHTML,
    'forgot-password': forgotPasswordHTML,
    'reset-sent':      resetSentHTML,
    'reset-password':  resetPasswordFormHTML,
  };
  el.innerHTML = (map[AuthState.panel] || loginFormHTML)();
}

/* --- HTML generators -------------------------------------------------- */

// Shown when a sign-in is challenged: the password was accepted, and the
// address on the account is being re-confirmed before the session is issued.
function loginCodeHTML() {
  return `
    <button class="auth-back-btn" onclick="setAuthPanel('role-login')">&larr; Back</button>
    <h1 class="login-title" style="text-align:center;">Confirm it's you</h1>
    <p class="login-subtitle" style="text-align:center;">
      We emailed a 6-digit code to <strong>${escapeHtml(AuthState.pendingEmail || '')}</strong>.
      It expires in 10 minutes.
    </p>
    <div class="form-group">
      <label class="form-label" for="login-code-input">Code</label>
      <input class="form-input" id="login-code-input" type="text" inputmode="numeric"
             autocomplete="one-time-code" maxlength="6" placeholder="123456"
             style="letter-spacing:8px;text-align:center;font-size:22px;"
             onkeydown="if(event.key==='Enter')submitLoginCode()">
    </div>
    <button class="btn-primary btn-full" id="login-code-btn" onclick="submitLoginCode()">Confirm</button>
    <p style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:14px;">
      No email? Check spam, or go back and sign in again to get a new code.
    </p>
  `;
}

async function submitLoginCode() {
  const code = (document.getElementById('login-code-input')?.value || '').trim();
  if (!code) { showToast('error', 'Enter the code from the email.'); return; }

  const btn = document.getElementById('login-code-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
  const reset = () => { if (btn) { btn.disabled = false; btn.textContent = 'Confirm'; } };

  try {
    const res = await fetch(`${API_BASE}/auth/verify-login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: AuthState.pendingEmail, role: AuthState.pendingRole, code }),
    });
    const data = await res.json();
    if (!res.ok) { showToast('error', data.error || 'That code is not right.'); reset(); return; }
    completeSignIn(data);
  } catch (err) {
    showToast('error', 'Could not reach the server. Try again.');
    reset();
  }
}


function loginFormHTML() {
  return `
    <h1 class="login-title" style="text-align:center;">Welcome back</h1>
    <p class="login-subtitle" style="text-align:center;margin-bottom:0;">Select your portal to continue</p>

    <div class="role-portal-grid">
      <button class="role-portal-card role-portal-compliance" onclick="goToRoleLogin('compliance')">
        <div class="role-portal-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        </div>
        <div class="role-portal-name">Internal Compliance</div>
        <div class="role-portal-desc">Review &amp; approve cases</div>
      </button>
      <button class="role-portal-card role-portal-compliance-external" onclick="goToRoleLogin('compliance_external')">
        <div class="role-portal-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        </div>
        <div class="role-portal-name">External Compliance</div>
        <div class="role-portal-desc">Review &amp; approve cases</div>
      </button>
      <button class="role-portal-card role-portal-rm" onclick="goToRoleLogin('rm')">
        <div class="role-portal-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
        </div>
        <div class="role-portal-name">Rel. Manager</div>
        <div class="role-portal-desc">Manage client onboarding</div>
      </button>
      <button class="role-portal-card role-portal-client" onclick="goToRoleLogin('client')">
        <div class="role-portal-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </div>
        <div class="role-portal-name">Client</div>
        <div class="role-portal-desc">Track your application</div>
      </button>
    </div>

    <p class="login-subtitle" style="text-align:center;margin-top:8px;font-size:12.5px;">Pick a portal above to sign in or create an account for it.</p>

    <p class="login-footer" style="margin-top:24px;">SHA cryptography &nbsp;·&nbsp; Protected by 256-bit TLS encryption</p>
  `;
}

const ROLE_META = {
  compliance: {
    name: 'Internal Compliance Officer', portal: 'Internal Compliance Portal',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
  },
  compliance_external: {
    name: 'External Compliance Officer', portal: 'External Compliance Portal',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
  },
  rm: {
    name: 'Relationship Manager', portal: 'RM Portal',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`,
  },
  client: {
    name: 'Client', portal: 'Client Portal',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  },
};

function goToRoleLogin(role) {
  AuthState.selectedRole = role;
  State.currentRole = role;
  setAuthPanel('role-login');
}

function roleLoginFormHTML() {
  const role = AuthState.selectedRole || 'compliance';
  const meta = ROLE_META[role] || ROLE_META.compliance;
  return `
    <button class="auth-back-btn" onclick="setAuthPanel('login')">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back
    </button>

    <div class="role-login-badge-row">
      <span class="role-login-badge">${meta.icon} ${meta.portal}</span>
    </div>

    <h1 class="login-title">Sign in</h1>
    <p class="login-subtitle">Logging in as <strong>${escapeHtml(meta.name)}</strong></p>

    <div class="form-group" style="margin-top:20px;">
      <label for="login-email">Email</label>
      <input type="email" id="login-email" placeholder="you@institution.com"
             autocomplete="email" onkeydown="if(event.key==='Enter')login()" />
    </div>
    <div class="form-group">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <label for="login-password" style="margin:0;">Password</label>
        <button class="auth-link-btn" onclick="setAuthPanel('forgot-password')">Forgot password?</button>
      </div>
      <input type="password" id="login-password" placeholder="••••••••"
             autocomplete="current-password" onkeydown="if(event.key==='Enter')login()" />
    </div>

    <button class="btn-primary btn-full" id="login-btn" onclick="login()">
      Sign In
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>

    ${role === 'client' ? `
      <div style="text-align:center;margin-top:16px;">
        <button class="auth-link-btn" onclick="setAuthPanel('register')">New to the portal? Create account</button>
      </div>
    ` : `
      <p style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-muted);">Staff accounts are provisioned by an administrator.</p>
    `}

    <p class="login-footer" style="margin-top:20px;">SHA cryptography &nbsp;·&nbsp; Protected by 256-bit TLS encryption</p>
  `;
}

function registerFormHTML() {
  const role = AuthState.selectedRole;
  const meta = ROLE_META[role];
  if (role && role !== 'client') {
    return `
      <button class="auth-back-btn" onclick="setAuthPanel('role-login')">&larr; Back</button>
      <h1 class="login-title">Staff account required</h1>
      <p class="login-subtitle">${escapeHtml(meta?.name || 'Staff')} accounts are provisioned by an administrator. Please sign in with your assigned account.</p>
      <button class="btn-primary btn-full" onclick="setAuthPanel('role-login')">Return to Sign In</button>
    `;
  }
  return `
    <button class="auth-back-btn" onclick="setAuthPanel('login')">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back
    </button>

    ${meta ? `
      <div class="role-login-badge-row">
        <span class="role-login-badge">${meta.icon} ${meta.portal}</span>
      </div>
    ` : ''}

    <div class="auth-tabs">
      <button class="auth-tab"         onclick="setAuthPanel('${role ? 'role-login' : 'login'}')">Sign In</button>
      <button class="auth-tab active"  onclick="setAuthPanel('register')">Create Account</button>
    </div>

    <h1 class="login-title">Create account</h1>
    <p class="login-subtitle">${meta ? `Creating a new ${escapeHtml(meta.name)} account` : 'Join your compliance portal'}</p>

    <div class="form-group">
      <label for="reg-name">Full Name *</label>
      <input type="text" id="reg-name" placeholder="Your full name" autocomplete="name" />
    </div>
    <div class="form-group">
      <label for="reg-email">Email *</label>
      <input type="email" id="reg-email" placeholder="you@institution.com" autocomplete="email" />
    </div>
    <div class="form-group">
      <label for="reg-password">Password *</label>
      <input type="password" id="reg-password" placeholder="At least 8 characters" autocomplete="new-password" />
    </div>
    <div class="form-group">
      <label for="reg-confirm">Confirm Password *</label>
      <input type="password" id="reg-confirm" placeholder="Repeat password"
             autocomplete="new-password" onkeydown="if(event.key==='Enter')register()" />
    </div>
    <button class="btn-primary btn-full" id="register-btn" onclick="register()">
      Create Account
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>

    <p class="login-footer">SHA cryptography &nbsp;·&nbsp; Protected by 256-bit TLS encryption</p>
  `;
}

function verifyPendingHTML() {
  const devBanner = AuthState.emailPreviewUrl ? `
    <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:14px 16px;margin-bottom:20px;text-align:left;">
      <div style="font-size:12px;font-weight:700;color:#713f12;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Dev mode — no real email sent</div>
      <p style="font-size:12px;color:#854d0e;margin:0 0 10px;">SMTP is not configured. Click below to preview the email in your browser.</p>
      <a href="${AuthState.emailPreviewUrl}" target="_blank"
         style="display:inline-block;padding:8px 16px;background:#005073;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">
        View email in browser →
      </a>
    </div>` : '';
  return `
    <div style="text-align:center;padding:20px 0 8px;">
      <div style="font-size:52px;margin-bottom:14px;">📧</div>
      <h1 class="login-title" style="font-size:20px;">Check your email</h1>
      <p class="login-subtitle">We sent a verification link to</p>
      <p style="font-weight:700;color:var(--accent-purple);font-size:14px;margin:6px 0 20px;">${AuthState.pendingEmail}</p>
      ${devBanner}
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:24px;line-height:1.6;">
        Click the link in the email to activate your account.<br>
        Check your spam folder if you don't see it within a few minutes.
      </p>
      <button class="btn-secondary btn-full" id="resend-btn" onclick="resendVerification()">
        Resend verification email
      </button>
      <button class="auth-link-btn" style="display:block;margin-top:16px;width:100%;text-align:center;"
              onclick="setAuthPanel('login')">← Back to sign in</button>
    </div>
  `;
}

function forgotPasswordHTML() {
  return `
    <button class="auth-link-btn" style="display:block;margin-bottom:20px;"
            onclick="setAuthPanel('role-login')">← Back to sign in</button>
    <h1 class="login-title" style="font-size:20px;">Reset password</h1>
    <p class="login-subtitle">Enter your email and we'll send you a reset link.</p>

    <div class="form-group" style="margin-top:20px;">
      <label for="forgot-email">Email</label>
      <input type="email" id="forgot-email" placeholder="you@institution.com"
             autocomplete="email" onkeydown="if(event.key==='Enter')forgotPassword()" />
    </div>

    <button class="btn-primary btn-full" id="forgot-btn" onclick="forgotPassword()">
      Send Reset Link
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
  `;
}

function resetSentHTML() {
  const devBanner = AuthState.emailPreviewUrl ? `
    <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:14px 16px;margin:16px 0;text-align:left;">
      <div style="font-size:12px;font-weight:700;color:#713f12;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Dev mode — no real email sent</div>
      <p style="font-size:12px;color:#854d0e;margin:0 0 10px;">SMTP is not configured. Click below to preview the reset email.</p>
      <a href="${AuthState.emailPreviewUrl}" target="_blank"
         style="display:inline-block;padding:8px 16px;background:#005073;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">
        View email in browser →
      </a>
    </div>` : '';
  return `
    <div style="text-align:center;padding:20px 0 8px;">
      <div style="font-size:52px;margin-bottom:14px;">✉️</div>
      <h1 class="login-title" style="font-size:20px;">Reset link sent</h1>
      <p class="login-subtitle">
        If that email is registered you'll receive a reset link shortly.<br>
        Check your spam folder too.
      </p>
      ${devBanner}
      <button class="btn-secondary btn-full" style="margin-top:28px;"
              onclick="setAuthPanel('login')">Back to sign in</button>
    </div>
  `;
}

function resetPasswordFormHTML() {
  return `
    <h1 class="login-title" style="font-size:20px;">Set new password</h1>
    <p class="login-subtitle">Enter your new password below.</p>

    <div class="form-group" style="margin-top:20px;">
      <label for="reset-new">New Password *</label>
      <input type="password" id="reset-new" placeholder="At least 8 characters"
             autocomplete="new-password" />
    </div>
    <div class="form-group">
      <label for="reset-confirm">Confirm New Password *</label>
      <input type="password" id="reset-confirm" placeholder="Repeat new password"
             autocomplete="new-password" onkeydown="if(event.key==='Enter')doResetPassword()" />
    </div>

    <button class="btn-primary btn-full" id="reset-btn" onclick="doResetPassword()">
      Set New Password
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>
    </button>
  `;
}

/* ============================================================
   AUTH
   ============================================================ */
async function enterApp(role) {
  localStorage.setItem('sessionRole', role);
  localStorage.setItem('sessionActive', '1');
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('main-screen').classList.add('active');
  State.currentRole = role;
  // Both run concurrently, but neither page navigation nor any per-field
  // correction status can be trusted until both have actually landed.
  await Promise.all([setupRoleUI(role), loadStateFromBackend()]);
  if (role === 'rm') updateMyClientsBadge();
  navigateTo('dashboard');
}

async function login() {
  const email    = (document.getElementById('login-email')?.value || '').trim();
  const password = document.getElementById('login-password')?.value || '';
  const demoRole = AuthState.selectedRole || State.currentRole;
  const btn      = document.getElementById('login-btn');

  if (!email || !password) {
    showToast('warning', 'Please enter your email and password.');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: demoRole }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();

    // Periodic re-confirmation: the password was right, but it has been long
    // enough that the address behind the account is being checked again.
    if (res.ok && data.reverifyRequired) {
      AuthState.pendingEmail = data.email || email;
      AuthState.pendingRole  = data.role || demoRole;
      setAuthPanel('login-code');
      showToast('info', data.message || 'Enter the code we just emailed you.');
      return;
    }

    if (res.status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
      AuthState.pendingEmail    = data.email || email;
      AuthState.emailPreviewUrl = '';
      setAuthPanel('verify-pending');
      return;
    }

    if (!res.ok) {
      // The backend already checks the account for the selected portal and,
      // if the credentials match a different-category account instead,
      // returns a "wrong portal" message — surface whatever it says.
      showToast('error', data.error || 'Login failed.');
      resetLoginBtn();
      return;
    }

    completeSignIn(data);

  } catch (err) {
    const isNetwork = err.name === 'AbortError'
      || err.message.includes('Failed to fetch')
      || err.message.includes('NetworkError')
      || err.message.includes('fetch');
    if (isNetwork) {
      enterApp(demoRole); // demo / offline fallback
    } else {
      showToast('error', err.message);
      resetLoginBtn();
    }
  }
}

// The one place a successful sign-in is turned into a session, whether it came
// straight from the password or from the emailed code afterwards.
function completeSignIn(data) {
  // The session itself is the httpOnly cookie the server just set. Nothing
  // credential-bearing is kept here — only who is signed in, for the UI.
  localStorage.setItem('sessionActive', '1');
  localStorage.setItem('user', JSON.stringify(data.user));
  enterApp(data.user.role);
}

// Deletes a mandate and everything the app holds for it: the case, its KYC
// task, its corrections, its notifications and its files in the database.
//
// Two confirmations, because there is no undo and the second one is the point
// where somebody who clicked by accident stops. Typing the case number is not
// bureaucracy — it is the difference between deleting the mandate you meant
// and the one you happened to have open.
async function deleteMandate(clientId) {
  const client = State.clients.find(c => c.id === clientId);
  const name = client ? client.name : clientId;
  const docCount = client ? (client.documents || []).length : 0;

  const warning = [
    `Delete the mandate for ${name}?`,
    '',
    `This removes the case ${clientId}, its KYC task, its corrections,`,
    `its notifications and its ${docCount} document${docCount === 1 ? '' : 's'} from the app.`,
    '',
    'It cannot be undone.',
    '',
    'The copies already written to the SharePoint archive are NOT deleted —',
    'those stay as the permanent record. Remove that folder by hand if this',
    'was only a test.',
  ].join('\n');
  if (!confirm(warning)) return;

  const typed = prompt(`To confirm, type the case number:  ${clientId}`);
  if (typed === null) return;
  if (typed.trim().toUpperCase() !== String(clientId).toUpperCase()) {
    showToast('error', 'That did not match — nothing was deleted.');
    return;
  }

  try {
    await apiFetch('DELETE', `/clients/${encodeURIComponent(clientId)}`);
    showToast('success', `${name} deleted.`);
    State.clients = State.clients.filter(c => c.id !== clientId);
    await Promise.all([refreshClients(), refreshKycTasks(), refreshCorrectionsBadge()]);
    navigateTo('clients');
  } catch (err) {
    showToast('error', err.message || 'Could not delete this mandate.');
  }
}

function resetLoginBtn() {
  const btn = document.getElementById('login-btn');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = 'Sign In <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
}

async function logout() {
  // Only the server can clear an httpOnly cookie; without this call the
  // session would stay valid until it expired on its own.
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (_) { /* sign out locally regardless */ }
  // A poll left running would keep asking for the signed-out user's bell.
  stopNotificationPolling();
  State.notifications = [];
  notificationsLoadedOnce = false;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('sessionRole');
  localStorage.removeItem('sessionActive');
  AuthState.selectedRole = '';
  document.getElementById('main-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');
  setAuthPanel('login');
}

async function register() {
  const name     = (document.getElementById('reg-name')?.value || '').trim();
  const email    = (document.getElementById('reg-email')?.value || '').trim();
  const password = document.getElementById('reg-password')?.value || '';
  const confirm  = document.getElementById('reg-confirm')?.value  || '';
  const role     = AuthState.selectedRole || 'client'; // determined by which portal card was selected on the login screen
  const btn      = document.getElementById('register-btn');

  if (!name || !email || !password) {
    showToast('warning', 'Please fill in all required fields.');
    return;
  }
  if (password.length < 8) {
    showToast('warning', 'Password must be at least 8 characters.');
    return;
  }
  if (password !== confirm) {
    showToast('error', 'Passwords do not match.');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const res  = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
      signal: controller.signal,
    });
    const data = await res.json();

    if (!res.ok) {
      showToast('error', data.error || 'Registration failed.');
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
      return;
    }

    AuthState.pendingEmail    = data.email || email;
    AuthState.emailPreviewUrl = data.emailPreviewUrl || '';
    setAuthPanel('verify-pending');

  } catch (err) {
    showToast('error', 'Could not reach the server. Please check the backend is running.');
    if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
  }
}

async function resendVerification() {
  const btn = document.getElementById('resend-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    const res  = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: AuthState.pendingEmail }),
    });
    const data = await res.json();
    if (res.ok && data.emailPreviewUrl) {
      AuthState.emailPreviewUrl = data.emailPreviewUrl;
      setAuthPanel('verify-pending');
    } else {
      showToast(res.ok ? 'success' : 'error', data.message || data.error);
    }
  } catch (_) {
    showToast('error', 'Could not reach the server.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Resend verification email'; }
  }
}

async function forgotPassword() {
  const email = (document.getElementById('forgot-email')?.value || '').trim();
  const btn   = document.getElementById('forgot-btn');
  if (!email) { showToast('warning', 'Please enter your email.'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    const res  = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    AuthState.emailPreviewUrl = data.emailPreviewUrl || '';
    setAuthPanel('reset-sent');
  } catch (_) {
    showToast('error', 'Could not reach the server.');
    if (btn) { btn.disabled = false; btn.textContent = 'Send Reset Link'; }
  }
}

async function doResetPassword() {
  const password = document.getElementById('reset-new')?.value     || '';
  const confirm  = document.getElementById('reset-confirm')?.value || '';
  const btn      = document.getElementById('reset-btn');

  if (password.length < 8) { showToast('warning', 'Password must be at least 8 characters.'); return; }
  if (password !== confirm) { showToast('error', 'Passwords do not match.'); return; }
  if (!AuthState.resetToken) { showToast('error', 'Missing reset token.'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const res  = await fetch(`${API_BASE}/auth/reset-password/${AuthState.resetToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) { showToast('error', data.error || 'Reset failed.'); if (btn) { btn.disabled = false; btn.textContent = 'Set New Password'; } return; }

    localStorage.setItem('sessionActive', '1');
    localStorage.setItem('user', JSON.stringify(data.user));
    AuthState.resetToken = '';
    showToast('success', 'Password updated! Signing you in…');
    setTimeout(() => enterApp(data.user.role), 1000);
  } catch (_) {
    showToast('error', 'Could not reach the server.');
    if (btn) { btn.disabled = false; btn.textContent = 'Set New Password'; }
  }
}

async function handleEmailVerification(token) {
  try {
    const res  = await fetch(`${API_BASE}/auth/verify-email/${token}`);
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('sessionActive', '1');
      localStorage.setItem('user', JSON.stringify(data.user));
      showToast('success', 'Email verified! Welcome to ComplianceOS.');
      setTimeout(() => enterApp(data.user.role), 800);
    } else {
      showToast('error', data.error || 'Verification failed.');
      setAuthPanel('login');
    }
  } catch (_) {
    showToast('error', 'Could not reach the server to verify email.');
    setAuthPanel('login');
  }
}

function selectRole(el, role) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  State.currentRole = role;
}

/* ============================================================
   SHELL SETUP
   ============================================================ */
async function setupRoleUI(role) {
  const cfg = ROLES[role];
  // Prefer the real logged-in user's own name over the static per-role demo
  // label — cfg.label ("Sarah Mitchell" etc.) is only a fallback for sessions
  // where no real user record is available.
  let realName = null;
  try { realName = JSON.parse(localStorage.getItem('user') || 'null')?.name || null; } catch (_) {}
  const displayName = realName || cfg.label;

  document.getElementById('user-avatar-sidebar').textContent = (realName || cfg.initial)[0].toUpperCase();
  document.getElementById('user-name-sidebar').textContent = displayName;
  document.getElementById('user-role-sidebar').textContent = cfg.description;
  document.getElementById('topbar-role-badge').textContent = cfg.badge;

  // Build nav
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';
  cfg.nav.forEach(item => {
    if (item.section) {
      nav.innerHTML += `<div class="nav-section-label">${item.section}</div>`;
    } else {
      nav.innerHTML += `
        <button class="nav-item" id="nav-${item.id}" onclick="navigateTo('${item.id}')">
          ${item.icon}
          <span>${escapeHtml(item.label)}</span>
          ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
          ${item.id === 'kyc-tasks' ? `<span class="nav-badge" id="navbadge-kyc-tasks" style="display:none;"></span>` : ''}
          ${item.id === 'contract-prep' ? `<span class="nav-badge" id="navbadge-contract-prep" style="display:none;"></span>` : ''}
          ${item.id === 'clients' && role === 'rm' ? `<span class="nav-badge" id="navbadge-clients" style="display:none;"></span>` : ''}
        </button>
      `;
    }
  });

  // Notifications panel
  refreshNotifications();
  // Both awaited (unlike refreshNotifications above): refreshKycTasks calls
  // rerenderCurrentDashboard when it resolves, which would clobber whatever
  // page the user has already navigated to if it lands after the fact — and
  // every KYC correction status badge/glow (KYC form, Client Detail tab,
  // Corrections page) reads from State.kycCorrections, so a page reached
  // before refreshCorrectionsBadge resolves would silently show every field
  // as if it had no correction at all, regardless of its real status.
  await Promise.all([
    refreshKycTasks(),
    refreshCorrectionsBadge(),
    // The Contract Tasks badge counts mandates, so the list has to be in
    // before the count means anything.
    refreshClients(),
  ]);
  if (role === 'rm') updateMyClientsBadge();
  startNotificationPolling();
}

// A task counting as "still needs attention" depends on the explicit workflow
// plus any field reopened by Compliance. Only approved, correction-free KYCs
// are allowed into the final green state.
function clientForKycTask(task) {
  return State.clients.find(c => c.id === task.clientId || c.clientId === task.clientId)
    || (State.myClientProfile
      && (State.myClientProfile.id === task.clientId || State.myClientProfile.clientId === task.clientId)
      ? State.myClientProfile
      : null);
}

function clientKycWorkflowStatus(client) {
  if (['draft', 'under_review', 'approved'].includes(client?.kycStatus)) {
    return client.kycStatus;
  }
  if (!client?.kycSubmittedBy) return 'draft';
  return client.kycAwaitingVerification ? 'under_review' : 'approved';
}

function kycTaskHasActionableFields(task) {
  return (State.kycCorrections || []).some(c =>
    c.clientId === task.clientId && c.autoGenerated
    && (c.status === 'pending' || c.status === 'needs_correction' || c.status === 'saved')
  );
}

// Normalize new workflow responses and pre-workflow records into the only
// three states the UI communicates. A submitted questionnaire is never shown
// as complete while Compliance still needs to sign it off.
function kycTaskWorkflowStatus(task) {
  if (kycTaskHasActionableFields(task)) return 'pending';

  const client = clientForKycTask(task);
  const status = task.kycStatus || task.status;
  if (status === 'approved' || client?.kycStatus === 'approved') return 'approved';
  if (status === 'under_review' || status === 'under-review'
      || client?.kycStatus === 'under_review' || client?.kycAwaitingVerification) {
    return 'under_review';
  }
  // Legacy `completed` tasks predate the explicit lifecycle. The linked
  // Client flags decide whether they are still under review or were approved.
  if (status === 'completed') {
    return client?.kycAwaitingVerification ? 'under_review' : 'approved';
  }
  return 'pending';
}

function kycTaskStillNeedsAttention(task) {
  return kycTaskWorkflowStatus(task) === 'pending';
}

// Shows/hides a sidebar count. Kept in one place so every nav entry that
// needs a badge behaves identically.
function setNavBadge(id, count) {
  const badge = document.getElementById(`navbadge-${id}`);
  if (!badge) return;
  if (count > 0) { badge.textContent = count; badge.style.display = 'flex'; }
  else badge.style.display = 'none';
}

function updateKycTasksBadge() {
  const kycCount = isCompliance(State.currentRole)
    ? State.kycTasks.filter(task => kycTaskWorkflowStatus(task) === 'under_review').length
    : State.kycTasks.filter(kycTaskStillNeedsAttention).length;
  // The Tasks entry covers both tabs, so its badge counts both.
  const riskCount = State.kycTasks.filter(t =>
    (t.mandateRiskMissing || 0) > 0 && (t.mandateRiskStatus || 'draft') !== 'approved').length;
  setNavBadge('kyc-tasks', kycCount + riskCount);
}

// Mandates with outstanding work on the Contract Tasks screen.
//
// A flagged document is one kind of outstanding work, but it was the only kind
// this counted — so an RM with a mandate whose paperwork simply isn't in yet
// saw no badge at all and had nothing telling them to open the page. Anything
// short of its full document set counts, which is the same n-documents figure
// the progress bars show.
function updateContractTasksBadge() {
  const open = new Set((State.documentCorrections || [])
    .filter(c => c.status !== 'corrected')
    .map(c => c.clientId));

  const mine = State.currentRole === 'client'
    ? (State.myClientProfile ? [State.myClientProfile] : [])
    : State.clients.filter(c => State.currentRole !== 'rm' || c.rm === currentRmName());
  mine.forEach(c => {
    const p = c.documentProgress;
    if (p && p.total > 0 && p.outstanding > 0) open.add(c.id || c.clientId);
  });

  setNavBadge('contract-prep', open.size);
}

// Every list here is already scoped server-side to the logged-in RM's own
// records (or unscoped for compliance/admin) — the badge just reflects
// whatever the backend actually returned, never a separate/looser count.
async function refreshCorrectionsBadge() {
  if (!hasAuthToken()) return;
  try {
    const [kyc, docs] = await Promise.all([
      apiFetch('GET', '/corrections/kyc'),
      apiFetch('GET', '/corrections/documents'),
    ]);
    // Cached here (not just counted) so the Client Detail KYC tab can show
    // which fields are flagged without a separate per-client fetch.
    State.kycCorrections = kyc.map(c => ({ ...c, id: c._id }));
    State.documentCorrections = docs.map(c => ({ ...c, id: c._id }));
    updateContractTasksBadge();
    updateKycTasksBadge();
    // This runs after essentially every action that changes someone's queue,
    // so it is also the natural moment to pick up whatever that action just
    // raised. Not awaited: a slow bell must not hold up the badges.
    refreshNotifications({ announce: true });
  } catch (_) { /* leave badge hidden */ }
}

function updateMyClientsBadge() {
  setNavBadge('clients', State.clients.length);
}

function updateNotifBadge() {
  const unread = State.notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  if (unread > 0) { badge.textContent = unread; badge.style.display = 'flex'; }
  else badge.style.display = 'none';
}

// Pulls the current notification list from the backend into the State cache
// (mapping Mongo's `_id` to the plain `id` the rest of the app expects, and
// `createdAt` to a display string), then re-renders the dropdown.
// Whether this session has already seen a full list. Distinguishes "nothing
// new" from "we haven't looked yet" — going by the cached list being empty
// would swallow the first notification of every session that started with an
// empty bell, which is exactly the case worth announcing.
let notificationsLoadedOnce = false;

async function refreshNotifications({ announce = false } = {}) {
  const seenBefore = new Set(State.notifications.map(n => n.id));
  const hadBaseline = notificationsLoadedOnce;
  try {
    const items = await apiFetch('GET', '/notifications');
    State.notifications = items.map(n => ({ ...n, id: n._id, time: new Date(n.createdAt).toLocaleString() }));
    notificationsLoadedOnce = true;
    // Anything unread that wasn't in the list a moment ago has just happened,
    // so it is shown rather than left sitting silently behind the bell. Never
    // on the session's first load — that would fire a toast for every
    // notification in the backlog at once.
    if (announce && hadBaseline) {
      State.notifications
        .filter(n => !n.read && !seenBefore.has(n.id))
        .slice(0, 3)
        .forEach(n => showToast(n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'info', n.text));
    }
  } catch (_) { /* keep whatever was cached */ }
  renderNotificationDropdown();
}

// The bell is only useful if it fills in while the page is open — otherwise a
// flagged document raised by Compliance is invisible to the RM until they
// happen to reload.
let notificationPollTimer = null;
function startNotificationPolling() {
  if (notificationPollTimer) clearInterval(notificationPollTimer);
  notificationPollTimer = setInterval(() => {
    if (!hasAuthToken()) return;
    // Nothing to poll for behind a hidden tab; the next visible tick catches up.
    if (document.hidden) return;
    refreshNotifications({ announce: true });
  }, 30000);
}

function stopNotificationPolling() {
  if (notificationPollTimer) clearInterval(notificationPollTimer);
  notificationPollTimer = null;
}

function renderNotificationDropdown() {
  const el = document.getElementById('notif-dropdown');
  el.innerHTML = `
    <div style="padding:16px;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:14px;font-weight:600;">Notifications</span>
      <button onclick="markAllRead()" style="background:none;border:none;font-size:12px;color:var(--accent-purple-light);cursor:pointer;">Mark all read</button>
    </div>
    ${State.notifications.length ? State.notifications.map(n => `
      <div style="padding:14px 16px;border-bottom:1px solid var(--border-subtle);${!n.read ? 'background:rgba(99,102,241,0.04)' : ''};cursor:pointer;" onclick="openNotification('${escapeHtml(n.id)}')">
        <div style="font-size:13px;color:var(--text-primary);">${escapeHtml(n.text)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${escapeHtml(n.time)}</div>
      </div>
    `).join('') : `<div style="padding:20px 16px;font-size:13px;color:var(--text-muted);text-align:center;">Nothing new.</div>`}
  `;
  updateNotifBadge();
}

async function markAllRead() {
  State.notifications.forEach(n => n.read = true);
  renderNotificationDropdown();
  try { await apiFetch('POST', '/notifications/read-all'); } catch (_) { /* best-effort */ }
}

async function markRead(id) {
  const n = State.notifications.find(n => n.id === id);
  if (n) n.read = true;
  renderNotificationDropdown();
  try { await apiFetch('POST', `/notifications/${id}/read`); } catch (_) { /* best-effort */ }
}

// Clicking a notification should take you to the work it is about, not just
// grey it out — the page it names is where the thing actually gets done.
function openNotification(id) {
  const n = State.notifications.find(x => x.id === id);
  markRead(id);
  // Only somewhere this role actually has: a notification can outlive the nav
  // it was written for, and navigating to a page that isn't there would blank
  // the screen.
  if (n?.page && document.getElementById(`nav-${n.page}`)) {
    document.getElementById('notif-dropdown').classList.remove('open');
    navigateTo(n.page);
  }
}

function toggleNotifications() {
  document.getElementById('notif-dropdown').classList.toggle('open');
  refreshNotifications();
}
document.addEventListener('click', e => {
  if (!e.target.closest('#notif-btn') && !e.target.closest('#notif-dropdown')) {
    document.getElementById('notif-dropdown').classList.remove('open');
  }
});

// Live feedback for every editable KYC field. Gold means the value is either
// empty or differs from the last value persisted by Save Progress. Typing a
// value therefore does not make the warning disappear prematurely: the field
// remains gold until the save request succeeds and the form is re-rendered
// from canonical Client.kyc data.
function kycLiveGlowSync(target) {
  const group = target.closest('[data-kyc-control]');
  if (!group) return;
  const glowEl = group.querySelector('[data-kyc-glow-eligible]');
  if (!glowEl) return;
  const key = group.dataset.kycKey;
  const controls = Array.from(group.querySelectorAll('input, select, textarea'));
  const selected = controls.find(c => c.name === key && (c.type !== 'radio' || c.checked));
  const currentValue = String(selected?.value ?? '').trim();
  const savedValue = String(group.dataset.kycSavedValue ?? '').trim();
  const stillRejected = group.dataset.kycCorrectionStatus === 'pending'
    || group.dataset.kycCorrectionStatus === 'needs_correction';
  glowEl.classList.toggle('kyc-field-missing', stillRejected || !currentValue || currentValue !== savedValue);
}
document.addEventListener('input', e => kycLiveGlowSync(e.target));
document.addEventListener('change', e => kycLiveGlowSync(e.target));

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

function nowTs() {
  return new Date().toLocaleString();
}

function addClientAudit(clientId, action, type, user) {
  const client = State.clients.find(c => c.id === clientId);
  if (!client) return;
  client.auditTrail.push({
    action,
    user: user || (isCompliance(State.currentRole) ? ROLES[State.currentRole].label : State.currentRole === 'rm' ? 'Relationship Manager' : 'Client'),
    time: nowTs(),
    type
  });
}

function getActiveClientForUpload() {
  if (State.selectedClientId) {
    return State.clients.find(c => c.id === State.selectedClientId) || null;
  }
  if (State.currentRole === 'client') {
    return State.myClientProfile || State.clients[0] || null;
  }
  return null;
}

function ensureClientSubmissionBucket(clientId) {
  if (!State.clientSubmissions[clientId]) {
    State.clientSubmissions[clientId] = [];
  }
  return State.clientSubmissions[clientId];
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function navigateTo(page) {
  State.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    clients: isCompliance(State.currentRole) ? 'All Cases' : 'My Clients',
    'contract-building': 'Contract Building',
    documents: 'Documents',
    audit: 'Audit Trail',
    analytics: 'Analytics',
    settings: 'Settings',
    'new-client': 'New Client Onboarding',
    'kyc-form': 'KYC Schema',
    'kyc-tasks': 'KYC & Mandate Risk Tasks',
    'kyc-corrections': 'KYC Uploads',
    'client-contract': 'Contract Package',
    'client-upload': 'Upload Signed Documents',
    risk: 'Risk Ratings',
    'client-detail': 'Client Details',
    'kyc-fill': 'KYC Questionnaire',
    'kyc-review': 'KYC Review',
    'contract-prep': 'Contract Tasks',
    'party-kyc': 'Related-Party KYC',
    'mandate-risk': 'Mandate Risk',
    'mandate-risk-schema': 'Mandate Risk Schema',
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;

  const content = document.getElementById('page-content');
  content.innerHTML = '';

  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'contract-building': renderContractBuilding(); break;
    case 'clients': renderClients(); break;
    case 'documents': renderDocuments(); break;
    case 'audit': renderAuditPage(); break;
    case 'analytics': renderAnalytics(); break;
    case 'settings': renderSettings(); break;
    case 'new-client': renderNewClient(); break;
    case 'kyc-form': renderKycForm(); break;
    case 'kyc-tasks': renderKycTasksPage(); break;
    case 'kyc-corrections': renderKycCorrections(); break;
    case 'client-contract': renderClientContract(); break;
    case 'client-upload': renderClientUpload(); break;
    case 'risk': renderRiskRatings(); break;
    case 'client-detail': renderClientDetail(); break;
    case 'kyc-fill': renderKycFill(); break;
    case 'kyc-review': renderKycReview(); break;
    case 'contract-prep': renderContractPreparation(); break;
    case 'party-kyc': renderRelatedPartyKyc(); break;
    case 'mandate-risk': renderMandateRisk(); break;
    case 'mandate-risk-schema': renderMandateRiskSchema(); break;
  }
}

/* ============================================================
   PAGE: DASHBOARD
   ============================================================ */
// Pulls the current KYC task list from the backend into the State.kycTasks cache
// (mapping Mongo's `_id` to the plain `id` the rest of the app already expects),
// then re-renders whichever dashboard is showing — a stale-while-revalidate
// refresh so the first paint isn't blocked on the fetch. Re-renders the role's
// own dashboard function directly (not renderDashboard) to avoid re-triggering
// this same fetch in a loop.
function rerenderCurrentDashboard() {
  if (State.currentPage !== 'dashboard') return;
  if (State.currentRole === 'client') renderClientDashboard();
  else if (isCompliance(State.currentRole)) renderComplianceDashboard();
  else if (State.currentRole === 'rm') renderRMDashboard();
}

// The app supports an offline/demo session (sessionRole+sessionActive but no
// real JWT — see enterApp's network-failure fallback) that runs entirely off
// the bundled mock State data. Endpoints that require `protect` will 401 (and
// apiFetch force-reloads on 401), so anything that fires automatically on
// login/navigation must skip the call rather than fall through to that.
// Script cannot read an httpOnly cookie, so "signed in" is answered by the
// marker set at login and cleared on 401 — the server remains the authority.
function hasAuthToken() { return localStorage.getItem('sessionActive') === '1'; }

async function refreshKycTasks() {
  if (!hasAuthToken()) return;
  try {
    const tasks = await apiFetch('GET', '/kyc-tasks');
    State.kycTasks = tasks.map(t => ({ ...t, id: t._id }));
    updateKycTasksBadge();
    rerenderCurrentDashboard();
    if (State.currentPage === 'kyc-tasks') renderKycTasksPage();
  } catch (_) { /* keep whatever was cached */ }
}

function renderDashboard() {
  const role = State.currentRole;
  const content = document.getElementById('page-content');

  refreshKycTasks();
  refreshClients().then(rerenderCurrentDashboard);

  if (role === 'client') { renderClientDashboard(); return; }
  if (isCompliance(role)) { renderComplianceDashboard(); return; }
  if (role === 'rm') { renderRMDashboard(); return; }

  content.innerHTML = `
    <div class="stats-grid">
      ${statCard('#10b981', '1', 'Approved', 'this month', true, `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>`)}
      ${statCard('#ef4444', '1', 'Rejected', '', false, `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`)}
      ${statCard('#8b5cf6', '14', 'Documents Pending', '-3 today', false, `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`)}
      ${statCard('#06b6d4', '3', 'Expiring Docs (30d)', '', false, `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`)}
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Client Activity</div>
            <div class="card-subtitle">Latest onboarding submissions</div>
          </div>
          <button class="btn-secondary btn-sm" onclick="navigateTo('clients')">View All</button>
        </div>
        <div>
          ${State.clients.slice(0,4).map(c => `
            <div class="client-row" onclick="openClientDetail('${c.id}')">
              <div class="client-avatar" style="background:${clientGradient(c.type)}">${c.name[0]}</div>
              <div class="client-info">
                <div class="client-name">${escapeHtml(c.name)}</div>
                <div class="client-type">${escapeHtml(c.type)} · ${escapeHtml(c.country)}</div>
              </div>
              <div class="client-meta">
                <span class="status-badge status-${escapeHtml(c.status)}">${statusLabel(c.status)}</span>
                <div class="client-date">${c.created}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Onboarding Progress</div>
            <div class="card-subtitle">Completion tracking per client</div>
          </div>
        </div>
        <div class="card-body">
          ${State.clients.map(c => `
            <div style="margin-bottom:18px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:13px;font-weight:500;">${escapeHtml(c.name)}</span>
                <span style="font-size:12px;color:var(--text-muted);">${c.progress}%</span>
              </div>
              <div class="progress-bar-wrap">
                <div class="progress-bar" style="width:${c.progress}%;background:${progressColor(c.progress)};"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Document Status Overview</div>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px;">
          ${docsStatusSummary()}
        </div>
      </div>
    </div>
  `;
}

function docsStatusSummary() {
  const allDocs = State.clients.flatMap(c => c.documents);
  const groups = { approved: 0, pending: 0, 'under-review': 0, 'info-requested': 0, rejected: 0, draft: 0 };
  allDocs.forEach(d => { if (groups[d.status] !== undefined) groups[d.status]++; });
  const labels = { approved: 'Approved', pending: 'Pending', 'under-review': 'Under Review', 'info-requested': 'Info Requested', rejected: 'Rejected', draft: 'Not Submitted' };
  return Object.entries(groups).map(([s, c]) => `
    <div style="text-align:center;padding:16px;background:var(--bg-elevated);border-radius:var(--radius-md);border:1px solid var(--border-subtle);">
      <div style="font-size:28px;font-weight:800;color:var(--text-primary);">${c}</div>
      <span class="status-badge status-${s}" style="margin-top:6px;">${labels[s]}</span>
    </div>
  `).join('');
}

function progressColor(p) {
  if (p < 30) return 'linear-gradient(90deg,#ef4444,#f97316)';
  if (p < 70) return 'linear-gradient(90deg,#f59e0b,#eab308)';
  return 'linear-gradient(90deg,#10b981,#06b6d4)';
}

function clientGradient(type) {
  const map = { Corporate: 'linear-gradient(135deg,#6366f1,#8b5cf6)', Individual: 'linear-gradient(135deg,#06b6d4,#3b82f6)', Trust: 'linear-gradient(135deg,#f59e0b,#f97316)', Foundation: 'linear-gradient(135deg,#10b981,#06b6d4)' };
  return map[type] || 'linear-gradient(135deg,#6366f1,#8b5cf6)';
}

// `onClick` turns the tile into a way into the page it counts — the number on
// its own tells you something is waiting without saying where to deal with it.
function statCard(color, value, label, change, positive, icon, onClick = '') {
  return `
    <div class="stat-card"${onClick ? ` onclick="${onClick}" style="cursor:pointer;" title="Open ${escapeHtml(label)}"` : ''}>
      <div class="stat-header">
        <div class="stat-icon" style="background:${color}22;color:${color}">${icon}</div>
        ${change ? `<span class="stat-change ${positive ? 'positive' : 'negative'}">${change}</span>` : ''}
      </div>
      <div class="stat-value" style="color:${color}">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

// The four conditions a mandate has to meet before it can leave the system,
// each answerable from the client record alone. Kept in one place so the
// export list, the per-row checklist and the validate action can never
// disagree about what "ready" means.
function exportReadiness(client) {
  const docs = client.documents || [];
  const withFiles = docs.filter(d => d.filePath);
  const outstanding = docs.filter(d => d.required && !d.filePath);
  return {
    kyc: clientKycWorkflowStatus(client) === 'approved',
    risk: (client.mandateRisk || {}).status === 'approved',
    documentsIn: outstanding.length === 0,
    outstanding: outstanding.length,
    // Nothing to validate is not the same as validated: a mandate with no
    // documents at all must not read as signed off.
    contracts: withFiles.length > 0 && withFiles.every(d => d.status === 'approved'),
    toValidate: withFiles.filter(d => d.status !== 'approved').length,
    documentCount: withFiles.length,
  };
}

// One mandate in the export zone: what it still needs, or the click that
// downloads it. The checklist is shown either way — a reviewer should be able
// to see why something is or isn't exportable without opening the case.
function exportRowHTML(c) {
  const r = exportReadiness(c);
  const line = (ok, label, detail) => `
    <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:2px 0;">
      <span style="color:${ok ? 'var(--status-approved)' : 'var(--status-info-requested)'};font-weight:700;width:12px;">${ok ? '✓' : '○'}</span>
      <span style="min-width:118px;color:var(--text-secondary);">${escapeHtml(label)}</span>
      <span style="color:${ok ? 'var(--status-approved)' : 'var(--text-muted)'};">${escapeHtml(detail)}</span>
    </div>`;

  const canExport = r.contracts;
  return `
    <div class="client-row" style="align-items:flex-start;${canExport ? 'cursor:pointer;' : 'cursor:default;'}"
         ${canExport ? `onclick="downloadMandateExport('${escapeHtml(c.id)}')" title="Download the full export for ${escapeHtml(c.name)}"` : ''}>
      <div class="client-avatar" style="background:${clientGradient(c.type)}">${escapeHtml((c.name || '?')[0])}</div>
      <div class="client-info" style="flex:1;">
        <div class="client-name">${escapeHtml(c.name)}</div>
        <div class="client-type" style="margin-bottom:6px;">${escapeHtml(c.id)} · ${escapeHtml(c.type)} · RM: ${escapeHtml(c.rm || '—')}</div>
        ${line(r.kyc, 'KYC', 'Approved')}
        ${line(r.risk, 'Mandate Risk', 'Approved')}
        ${line(r.contracts, 'Contracts', r.contracts
          ? `Validated · ${r.documentCount} document${r.documentCount === 1 ? '' : 's'}`
          : `${r.toValidate} to validate`)}
      </div>
      <div class="client-meta" style="display:flex;align-items:center;gap:10px;">
        ${canExport
          ? `<span class="status-badge status-approved">Ready to export</span>`
          : isCompliance(State.currentRole)
            ? `<button class="btn-primary btn-sm" onclick="event.stopPropagation();validateContracts('${escapeHtml(c.id)}')">Validate contracts</button>`
            : `<span class="status-badge status-pending">Awaiting contract validation</span>`}
      </div>
    </div>`;
}

// Compliance signing off the contract paperwork — the last gate before a
// mandate can be exported.
async function validateContracts(clientId) {
  const client = resolveKycClient(clientId);
  const count = exportReadiness(client || {}).toValidate;
  if (!confirm(`Validate the contract paperwork for ${decodeEntities(client?.name || clientId)}?\n\n${count} document${count === 1 ? '' : 's'} will be marked as checked and approved by Compliance, and the mandate becomes ready to export.`)) return;
  try {
    const res = await apiFetch('POST', `/clients/${clientId}/validate-contracts`, {});
    showToast('success', `Contracts validated — ${res.validated} document${res.validated === 1 ? '' : 's'} approved. Ready to export.`);
    await refreshClients();
    renderComplianceDashboard();
  } catch (err) {
    showToast('error', err.message || 'Could not validate the contracts.');
  }
}

/* --- Compliance Dashboard --- */
function renderComplianceDashboard() {
  const content = document.getElementById('page-content');
  const pending = State.clients.filter(c => clientKycWorkflowStatus(c) === 'under_review');
  const approvedKyc = State.clients.filter(c => clientKycWorkflowStatus(c) === 'approved');
  // A mandate reaches the export zone when its questionnaires are signed off
  // and its paperwork is all in. Whether the contracts themselves have been
  // validated decides what it can do there — see exportReadiness.
  const readyForExport = State.clients.filter(c => {
    const r = exportReadiness(c);
    return r.kyc && r.risk && r.documentsIn;
  });
  const rejected = State.clients.filter(c => c.status === 'rejected');
  // The mandate-risk questionnaire has its own lifecycle alongside the KYC, so
  // it gets its own tiles rather than being invisible until someone opens Tasks.
  const riskStatusOf = (t) => t.mandateRiskStatus || 'draft';
  const riskOutstanding = (State.kycTasks || []).filter(t => ['draft', 'saved'].includes(riskStatusOf(t)));
  const riskUnderReview = (State.kycTasks || []).filter(t => riskStatusOf(t) === 'under_review');

  content.innerHTML = `
    <div class="page-header">
      <h1>Compliance Dashboard</h1>
      <p>Pending cases and Assetmax data export</p>
    </div>
    <div class="stats-grid">
      ${statCard('#f59e0b', pending.length, 'KYC Awaiting Review', '', false, checklistIcon(), `openTasksTab('kyc')`)}
      ${statCard('#10b981', approvedKyc.length, 'KYC Approved', '', true, checkIcon(), `openTasksTab('kyc')`)}
      ${statCard('#8b5cf6', riskOutstanding.length, 'Mandate Risk Outstanding', '', false, shieldIcon(), `openTasksTab('risk')`)}
      ${statCard('#0ea5e9', riskUnderReview.length, 'Mandate Risk Under Review', '', false, shieldIcon(), `openTasksTab('risk')`)}
      ${statCard('#ef4444', rejected.length, 'Rejected Cases', '', false, xIcon(), `navigateTo('clients')`)}
      ${statCard('#06b6d4', readyForExport.length, 'Ready for Assetmax Export', '', false, `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`, `document.getElementById('assetmax-export')?.scrollIntoView({behavior:'smooth'})`)}
    </div>
    <div class="info-box warning">
      <p><strong>⚠ Action Required:</strong> ${pending.length} KYC questionnaire(s) are under review. Open KYC Tasks to validate every field and approve them.</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div class="card-title">KYC Awaiting Review (${pending.length})</div>
          <button class="btn-secondary btn-sm" onclick="navigateTo('kyc-tasks')">Open KYC Tasks</button>
        </div>
        <div>
          ${pending.map(c => `
            <div class="client-row" onclick="openClientDetail('${c.id}')">
              <div class="client-avatar" style="background:${clientGradient(c.type)}">${c.name[0]}</div>
              <div class="client-info">
                <div class="client-name">${escapeHtml(c.name)}</div>
                <div class="client-type">${escapeHtml(c.type)} · Risk: <span class="risk-${c.risk.toLowerCase()}">${escapeHtml(c.risk)}</span> · RM: ${escapeHtml(c.rm)}</div>
              </div>
              <div class="client-meta">
                <span class="status-badge status-under-review">Under Review by Compliance</span>
                <div class="client-date">${c.created}</div>
              </div>
            </div>
          `).join('')}
          ${pending.length === 0 ? `<p style="padding:16px;font-size:13px;color:var(--text-muted);">No KYC questionnaires are awaiting review.</p>` : ''}
        </div>
      </div>

      <div class="card" id="assetmax-export">
        <div class="card-header">
          <div>
            <div class="card-title">Assetmax Export (${readyForExport.length})</div>
            <div class="card-subtitle">One .zip per mandate: KYC sheet, Mandatsrisiko sheet, and every document</div>
          </div>
        </div>
        <div>
          ${readyForExport.length === 0
            ? `<p style="padding:16px;font-size:13px;color:var(--text-muted);">No mandates are ready yet. A mandate appears here once its KYC and Mandate Risk are approved and every required document is in.</p>`
            : readyForExport.map(c => exportRowHTML(c)).join('')}
        </div>
      </div>
    </div>
  `;
}

// The completed KYC as a spreadsheet, built from the answers as they stand.
// Only available once the questionnaire has been handed to Compliance — the
// server refuses a draft, and says so.
async function downloadKycExcel(clientId) {
  try {
    const res = await fetch(`${API_BASE}/clients/${clientId}/kyc-export`, { credentials: 'include' });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Export failed');
    const blob = await res.blob();
    const served = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = served || `${clientId}_KYC.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('success', 'KYC exported.');
  } catch (err) {
    showToast('error', err.message || 'Could not export the KYC.');
  }
}

// Everything the external system needs for one mandate, in one file: the KYC
// sheet, the Mandatsrisiko sheet and every uploaded document. Fetched as a blob
// so the Authorization header travels with the request.
async function downloadMandateExport(clientId) {
  try {
    showToast('info', 'Building the export…');
        const res = await fetch(`${API_BASE}/clients/${clientId}/export`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Export failed');
    const blob = await res.blob();
    const served = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = served || `${clientId}_Export.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('success', 'Export downloaded — KYC and Mandatsrisiko sheets plus all documents.');
  } catch (err) {
    showToast('error', err.message || 'Could not build the export.');
  }
}

// Downloads a real PDF summary of the client's KYC record — the .xlsx export
// only has Question-Ident mappings for 3 fields today, so this is the
// working option in the meantime (see kycPdfExport.service.js).
async function downloadKycPdf(clientId) {
  try {
        const response = await fetch(`${API_BASE}/kyc/export/pdf/${clientId}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || 'Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KYC_${clientId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    const c = State.clients.find(c => c.id === clientId);
    if (c) c.auditTrail.push({ action: 'KYC data exported (.pdf)', user: 'Compliance Officer', time: new Date().toLocaleString(), type: 'submitted' });
    showToast('success', 'KYC PDF downloaded.');
  } catch (err) {
    showToast('error', err.message || 'Failed to download KYC PDF.');
  }
}

function exportToAssetmax(clientId) {
  const c = State.clients.find(c => c.id === clientId);
  if (!c) return;
  const filename = c.name.replace(/\s+/g, '_');
  c.auditTrail.push({ action: 'Mandate Risk Profile exported (.xlsx)', user: 'Compliance Officer', time: new Date().toLocaleString(), type: 'submitted' });
  showToast('success', `Mandate_Risk_Profile_${filename}.xlsx downloaded.`);
}

// Dedicated KYC Tasks page — RM and Compliance both see the full list here (not
// just as a card buried on the dashboard), and either can fill one in since
// there's no single delegate anymore.
async function renderKycTasksPage() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="page-header"><h1>KYC Tasks</h1></div><div class="cb-loading">Loading KYC tasks…</div>`;
  if (hasAuthToken()) {
    try {
      ensureMandateRiskSchema(() => {
        if (State.currentPage === 'kyc-tasks') renderKycTasksPage();
      });
      const [tasks] = await Promise.all([
        apiFetch('GET', '/kyc-tasks'),
        refreshClients(),
        // Each task now lists its own outstanding fields inline, so the
        // corrections behind them have to be loaded here too.
        refreshCorrectionsBadge(),
      ]);
      State.kycTasks = tasks.map(t => ({ ...t, id: t._id }));
    } catch (err) {
      content.innerHTML = `<div class="page-header"><h1>KYC Tasks</h1></div><p style="color:var(--accent-red);padding:16px;">Failed to load KYC tasks: ${err.message}</p>`;
      return;
    }
  }
  updateKycTasksBadge();

  // The Mandate Risk tab is grouped exactly like the KYC one — outstanding,
  // with Compliance, done — rather than one undifferentiated list.
  const riskStatus = (t) => t.mandateRiskStatus || 'draft';
  const riskPending = State.kycTasks.filter(t => ['draft', 'saved'].includes(riskStatus(t)));
  const riskUnderReview = State.kycTasks.filter(t => riskStatus(t) === 'under_review');
  // Approved work is finished work. The full history lives on each case; a
  // task list that keeps every completed item forever stops being a list of
  // things to do. Newest first, most recent few only.
  const APPROVED_SHOWN = 3;
  const newestFirst = (a, b) =>
    new Date(b.approvedAt || b.completedAt || b.updatedAt || 0) -
    new Date(a.approvedAt || a.completedAt || a.updatedAt || 0);

  const riskApprovedAll = State.kycTasks.filter(t => riskStatus(t) === 'approved').sort(newestFirst);
  const riskApproved = riskApprovedAll.slice(0, APPROVED_SHOWN);

  const pending = State.kycTasks.filter(t => kycTaskWorkflowStatus(t) === 'pending');
  const underReview = State.kycTasks.filter(t => kycTaskWorkflowStatus(t) === 'under_review');
  const approvedAll = State.kycTasks.filter(t => kycTaskWorkflowStatus(t) === 'approved').sort(newestFirst);
  const approved = approvedAll.slice(0, APPROVED_SHOWN);

  // Each task is a dropdown: the header carries the client and its status,
  // and expanding it lists exactly which fields are still outstanding — with
  // a button that opens the form on that field. The old separate Corrections
  // list for these is no longer needed, because the gaps live on the task
  // they belong to.
  const taskRow = (t, workflowStatus) => {
    const openItems = (State.kycCorrections || []).filter(c =>
      c.clientId === t.clientId && c.autoGenerated && c.status !== 'corrected');
    // Status only. Opening the questionnaire — or the Compliance review of it —
    // is what clicking the row does, so no button repeats it.
    // data-task-status marks the questionnaire's own status, as opposed to the
    // per-field badges inside the dropdown — both are .status-badge, so the
    // whole-task one needs to stay addressable on its own.
    const action = workflowStatus === 'pending'
      ? `<span class="status-badge ${KYC_CORRECTION_STATUS_META.pending.badge}" data-task-status>${KYC_CORRECTION_STATUS_META.pending.label}</span>`
      : workflowStatus === 'under_review'
        ? `<span class="status-badge status-under-review" data-task-status>Under Review by Compliance</span>`
        : `<span class="status-badge status-approved" data-task-status>Approved by Compliance${(t.approvedAt || t.completedAt) ? ` · ${new Date(t.approvedAt || t.completedAt).toLocaleDateString()}` : ''}</span>`;
    const openRow = workflowStatus === 'under_review' && isCompliance(State.currentRole)
      ? `reviewKycTask('${t.id}')`
      : `openKycTask('${t.id}')`;

    // The name opens the questionnaire; the chevron expands the field list.
    // Both have to be reachable — every task now lists its fields, so the row
    // is always a dropdown, and without this there is no way in at all.
    const header = `
      <div class="client-avatar" style="background:${clientGradient('Individual')}">${escapeHtml((t.clientName || '?')[0])}</div>
      <div class="client-info" style="flex:1;cursor:pointer;" title="Open the questionnaire"
           onclick="event.preventDefault();event.stopPropagation();${openRow}">
        <div class="client-name">${escapeHtml(t.clientName || '')}</div>
        <div class="client-type">${escapeHtml(t.clientId || '—')}${t.clientEmail ? ` · ${escapeHtml(t.clientEmail)}` : ''} · Kundenberater: ${escapeHtml(t.rmName || '—')}${openItems.length ? ` · ${openItems.length} field${openItems.length === 1 ? '' : 's'} outstanding` : ''}</div>
      </div>
      <div class="client-meta" style="display:flex;align-items:center;gap:10px;">${action}</div>`;

    // Every questionnaire expands to the same thing the Mandate Risk tab shows:
    // one line per field, with where that individual field currently stands.
    // A field with an open correction reads from the correction; everything
    // else follows the questionnaire's own state.
    const correctionByKey = new Map(openItems.map(c => [c.fieldKey, c]));
    // A field Compliance has already confirmed shows as confirmed here too,
    // not as still under review — same as the mandate-risk list.
    const confirmedByKey = new Map((State.kycCorrections || [])
      .filter(c => c.clientId === t.clientId && c.autoGenerated && c.status === 'corrected' && c.everFilled)
      .map(c => [c.fieldKey, c]));
    const fieldRows = (t.sections || []).flatMap(sec => (sec.fields || []).map(f => {
      const correction = correctionByKey.get(f.key || f.id);
      const filled = String(f.value ?? '').trim();
      // Same rule the forms use: only a mandatory blank is still owed. An
      // optional one is "Optional" while it can still be filled in, and
      // "Not provided" once the questionnaire has been handed over.
      const submitted = workflowStatus !== 'pending';
      const meta = correction
        ? KYC_CORRECTION_STATUS_META[correction.status] || KYC_CORRECTION_STATUS_META.pending
        : filled && confirmedByKey.has(f.key || f.id) ? KYC_CORRECTION_STATUS_META.corrected
        : !filled
          ? (f.required !== false ? KYC_CORRECTION_STATUS_META.pending
            : { label: submitted ? 'Not provided' : 'Optional', badge: 'status-neutral' })
        : workflowStatus === 'approved' ? KYC_CORRECTION_STATUS_META.corrected
        : workflowStatus === 'under_review' ? KYC_CORRECTION_STATUS_META.resubmitted
        : KYC_CORRECTION_STATUS_META.saved;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--border-subtle);">
          <div style="flex:1;font-size:12.5px;">
            ${escapeHtml(f.label || f.key)}
            <span style="color:var(--text-muted);margin-left:6px;">${filled ? escapeHtml(filled) : '—'}</span>
            <span style="color:var(--accent-orange);font-size:11px;margin-left:6px;">${escapeHtml(sec.title || '')}</span>
            ${correction?.status === 'needs_correction' && correction.rejectionReason
              ? `<div style="font-size:11px;color:var(--accent-gold);">Compliance: ${escapeHtml(correction.rejectionReason)}</div>` : ''}
          </div>
          <span class="status-badge ${meta.badge}">${escapeHtml(meta.label)}</span>
          ${workflowStatus === 'approved' || (!filled && f.required === false) ? '' : `<button class="btn-primary btn-xs" onclick="openKycTaskAtField('${t.id}','${escapeHtml(f.key || f.id)}')">Fill in</button>`}
        </div>`;
    }));

    if (!fieldRows.length) {
      return `<div class="client-row" onclick="${openRow}">${header}</div>`;
    }
    return `
      <details class="client-row doc-collapsible" style="display:block;padding:0;">
        <summary style="display:flex;align-items:center;gap:12px;padding:14px 20px;cursor:pointer;list-style:none;">
          ${header}
          <span class="doc-chevron" style="color:var(--text-muted);font-size:12px;margin-left:4px;">▾</span>
        </summary>
        <div style="padding:0 20px 14px 76px;">
          ${fieldRows.join('')}
        </div>
      </details>`;
  };

  content.innerHTML = `
    <div class="page-header">
      <h1>KYC &amp; Mandate Risk Tasks</h1>
      <p>Questionnaires created from Contract Building — the Kundenberater, Compliance, and the client (if they have a portal account) can all complete the same one.</p>
    </div>

    <div class="tabs">
      <button class="tab-btn active" id="tasktab-btn-kyc" onclick="switchTasksTab('kyc')">KYC (${pending.length + underReview.length})</button>
      <button class="tab-btn" id="tasktab-btn-risk" onclick="switchTasksTab('risk')">Mandate Risk (${State.kycTasks.filter(t => (t.mandateRiskStatus || 'draft') !== 'approved').length})</button>
    </div>

    <div id="tasktab-kyc" class="tab-content active">

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><div class="card-title">To Complete (${pending.length})</div></div>
      <div>
        ${pending.map(t => taskRow(t, 'pending')).join('') || `<p style="padding:16px;font-size:13px;color:var(--text-muted);">Nothing outstanding.</p>`}
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><div class="card-title">Under Review by Compliance (${underReview.length})</div></div>
      <div>
        ${underReview.map(t => taskRow(t, 'under_review')).join('') || `<p style="padding:16px;font-size:13px;color:var(--text-muted);">No questionnaires are awaiting Compliance review.</p>`}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Approved by Compliance${approvedAll.length > approved.length ? ` — ${approved.length} most recent of ${approvedAll.length}` : ` (${approvedAll.length})`}</div></div>
      <div>
        ${approved.map(t => taskRow(t, 'approved')).join('') || `<p style="padding:16px;font-size:13px;color:var(--text-muted);">No KYC questionnaires have been approved yet.</p>`}
        ${approvedAll.length > approved.length ? `<p style="padding:12px 16px;font-size:12px;color:var(--text-muted);">${approvedAll.length - approved.length} older approved questionnaire${approvedAll.length - approved.length === 1 ? '' : 's'} — open the case to see them.</p>` : ''}
      </div>
    </div>
    </div>

    <div id="tasktab-risk" class="tab-content">
      ${[
        { title: 'To Complete', empty: 'Nothing outstanding.',
          rows: riskPending },
        { title: 'Under Review by Compliance', empty: 'No questionnaires are awaiting Compliance review.',
          rows: riskUnderReview },
        { title: 'Approved by Compliance', empty: 'No mandate-risk questionnaires have been approved yet.',
          rows: riskApproved, hidden: riskApprovedAll.length - riskApproved.length },
      ].map(group => `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><div class="card-title">${group.title}${group.hidden ? ` — ${group.rows.length} most recent of ${group.rows.length + group.hidden}` : ` (${group.rows.length})`}</div></div>
          <div>
            ${group.rows.map(t => mandateRiskRow(t)).join('')
              || `<p style="padding:16px;font-size:13px;color:var(--text-muted);">${group.empty}</p>`}
            ${group.hidden ? `<p style="padding:12px 16px;font-size:12px;color:var(--text-muted);">${group.hidden} older approved questionnaire${group.hidden === 1 ? '' : 's'} — open the case to see them.</p>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Restore whichever tab is current. This runs on every render, not just the
  // first: refreshKycTasks() redraws this page when data arrives, and without
  // this the view would jump back to KYC underneath the reader.
  switchTasksTab(State.tasksTab || 'kyc');
}

// Opens the Tasks page on a named tab. Used by the schema screens, so "open the
// tasks for this questionnaire" lands on the right one.
function openTasksTab(name) {
  State.tasksTab = name;
  if (State.currentPage === 'kyc-tasks') switchTasksTab(name);
  else navigateTo('kyc-tasks');
}

function switchTasksTab(name) {
  State.tasksTab = name;
  ['kyc', 'risk'].forEach((n) => {
    document.getElementById(`tasktab-btn-${n}`)?.classList.toggle('active', n === name);
    document.getElementById(`tasktab-${n}`)?.classList.toggle('active', n === name);
  });
}

// One mandate-risk questionnaire per mandate, shown beside the KYC it belongs
// to so both live under a single Tasks entry in the sidebar.
function mandateRiskRow(t) {
  const status = t.mandateRiskStatus || 'draft';
  const meta = status === 'approved' ? KYC_CORRECTION_STATUS_META.corrected
    : status === 'under_review' ? KYC_CORRECTION_STATUS_META.resubmitted
    : status === 'saved' ? { label: 'Saved', badge: 'status-neutral' }
    : KYC_CORRECTION_STATUS_META.pending;

  const answers = t.mandateRiskAnswers || {};
  const reviews = t.mandateRiskReviews || {};
  const fields = State.mandateRiskSchema || [];
  const missingFields = t.mandateRiskMissingFields || [];
  // Compliance reviews a submitted questionnaire here, question by question,
  // exactly as it reviews a KYC. Everything else just reads its state.
  const reviewing = status === 'under_review' && isCompliance(State.currentRole);
  const flaggedCount = Object.values(reviews).filter(r => r && r.status === 'flagged').length;

  const header = `
    <div class="client-avatar" style="background:${clientGradient('Corporate')}">${escapeHtml((t.clientName || '?')[0])}</div>
    <div class="client-info" style="flex:1;cursor:pointer;" title="Open the questionnaire"
         onclick="event.preventDefault();event.stopPropagation();openMandateRisk('${escapeHtml(t.clientId)}')">
      <div class="client-name">${escapeHtml(t.clientName || '')}</div>
      <div class="client-type">${escapeHtml(t.clientId || '')} · Kundenberater: ${escapeHtml(t.rmName || '—')}${missingFields.length ? ` · ${missingFields.length} question${missingFields.length === 1 ? '' : 's'} outstanding` : ''}${flaggedCount ? ` · ${flaggedCount} sent back` : ''}</div>
    </div>
    <div class="client-meta" style="display:flex;align-items:center;gap:10px;">
      <span class="status-badge ${meta.badge}">${escapeHtml(meta.label)}</span>
      ${reviewing ? `<button class="btn-success btn-sm" onclick="event.stopPropagation();approveAllMandateRisk('${escapeHtml(t.clientId)}')">Approve all</button>` : ''}
    </div>`;

  // Under review, every question is listed with its answer so it can be judged.
  // Otherwise only what is still outstanding is worth showing.
  const rows = reviewing && fields.length
    ? fields.map(f => {
        const value = String(answers[f.key] ?? '').trim();
        const decision = reviews[f.key] || null;
        // Nothing to judge on a question that was left blank — it is part of
        // the submitted record as "not provided", the same way the KYC review
        // reads. Only an answer gets a decision.
        const badge = decision?.status === 'approved' ? KYC_CORRECTION_STATUS_META.corrected
          : decision?.status === 'flagged' ? KYC_CORRECTION_STATUS_META.needs_correction
          : value ? KYC_CORRECTION_STATUS_META.resubmitted
          : { label: 'Not provided', badge: 'status-neutral' };
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--border-subtle);">
            <div style="flex:1;font-size:12.5px;">
              ${escapeHtml(f.label)}
              <span style="color:var(--text-muted);margin-left:6px;">${value ? escapeHtml(value) : '—'}</span>
              <span style="color:var(--accent-orange);font-size:11px;margin-left:6px;">${escapeHtml(f.page || '')}</span>
              ${decision?.status === 'flagged' && decision.reason
                ? `<div style="font-size:11px;color:var(--accent-gold);">Compliance: ${escapeHtml(decision.reason)}</div>` : ''}
            </div>
            <span class="status-badge ${badge.badge}">${escapeHtml(badge.label)}</span>
            ${decision?.status === 'approved' || !value ? '' : `
              <button class="btn-success btn-xs" title="Confirm this answer" onclick="reviewMandateRiskField('${escapeHtml(t.clientId)}','${escapeHtml(f.key)}','approve')">✓</button>
              <button class="btn-danger btn-xs" title="Send this question back" onclick="reviewMandateRiskField('${escapeHtml(t.clientId)}','${escapeHtml(f.key)}','flag')">⚑</button>`}
          </div>`;
      })
    : missingFields.map(f => `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--border-subtle);">
          <div style="flex:1;font-size:12.5px;">
            ${escapeHtml(f.label)}
            <span class="status-badge ${KYC_CORRECTION_STATUS_META.pending.badge}" style="margin-left:6px;">${KYC_CORRECTION_STATUS_META.pending.label}</span>
            <span style="color:var(--accent-orange);font-size:11px;margin-left:6px;">${escapeHtml(f.page)}</span>
          </div>
          <button class="btn-primary btn-xs" onclick="openMandateRisk('${escapeHtml(t.clientId)}')">Fill in</button>
        </div>`);

  if (!rows.length) {
    return `<div class="client-row" style="cursor:default;">${header}</div>`;
  }
  return `
    <details class="client-row doc-collapsible" style="display:block;padding:0;">
      <summary style="display:flex;align-items:center;gap:12px;padding:14px 20px;cursor:pointer;list-style:none;">
        ${header}
        <span class="doc-chevron" style="color:var(--text-muted);font-size:12px;margin-left:4px;">▾</span>
      </summary>
      <div style="padding:0 20px 14px 76px;">${rows.join('')}</div>
    </details>`;
}

// Compliance's decision on one question — the mandate-risk twin of confirming
// or flagging a single KYC field.
async function reviewMandateRiskField(clientId, fieldKey, action) {
  let reason;
  if (action === 'flag') {
    reason = prompt('What is wrong with this answer? (shown to whoever has to correct it)');
    if (reason === null || !reason.trim()) return;
  }
  try {
    await apiFetch('POST', `/clients/${clientId}/mandate-risk/review`, { fieldKey, action, reason });
    showToast(action === 'approve' ? 'success' : 'warning',
      action === 'approve' ? 'Answer confirmed.' : 'Question sent back for correction.');
    await Promise.all([refreshClients(), refreshKycTasks()]);
    if (State.currentPage === 'mandate-risk') renderMandateRisk();
    else renderKycTasksPage();
  } catch (err) {
    showToast('error', err.message || 'Could not record that decision.');
  }
}

// Everything is right — sign the questionnaire off in one action rather than
// ticking all 32 questions individually.
async function approveAllMandateRisk(clientId) {
  const client = resolveKycClient(clientId);
  if (!confirm(`Approve the whole mandate-risk questionnaire for ${decodeEntities(client?.name || clientId)}?`)) return;
  try {
    await apiFetch('PUT', `/clients/${clientId}/mandate-risk`, { approve: true });
    showToast('success', 'Mandate-risk questionnaire approved by Compliance.');
    await Promise.all([refreshClients(), refreshKycTasks()]);
    if (State.currentPage === 'mandate-risk') renderMandateRisk();
    else renderKycTasksPage();
  } catch (err) {
    showToast('error', err.message || 'Could not approve the questionnaire.');
  }
}

function openKycTaskAtField(taskId, fieldKey) {
  State._activeCorrectionFieldKey = fieldKey;
  openKycTask(taskId);
}

function openKycTask(taskId) {
  const task = State.kycTasks.find(t => t.id === taskId);
  if (!task) return;
  State._activeKycTask = task;
  navigateTo('kyc-fill');
}

// "Edit KYC" from the Client Detail page — the KYC Details tab there is now
// a read-only snapshot, so editing always happens on the real KYC Tasks form.
function editClientKycFromDetail(clientId) {
  const task = (State.kycTasks || []).find(t => t.clientId === clientId);
  if (task) {
    State._activeKycTask = task;
    navigateTo('kyc-fill');
  } else {
    navigateTo('kyc-tasks');
  }
}

function reviewKycTask(taskId) {
  const task = State.kycTasks.find(t => t.id === taskId);
  const client = task && clientForKycTask(task);
  if (!client) {
    showToast('error', 'The client linked to this KYC task is unavailable.');
    return;
  }
  State.selectedClientId = client.id || client.clientId;
  navigateTo('kyc-review');
}

function kycSchemaFor(client) {
  const schema = Array.isArray(client?.kycSchema) && client.kycSchema.length
    ? client.kycSchema
    : (REQUIRED_KYC_FIELDS[client?.type] || []).map(([key, label, page, required = true]) => ({
        key,
        label,
        page,
        ...(BUNDLED_KYC_FIELD_INPUT_META[key] || {}),
        required,
      }));

  return schema.map((field) => ({
    ...field,
    type: ['text', 'email', 'date', 'number', 'select', 'textarea', 'yesno'].includes(field.type)
      ? field.type
      : 'text',
    required: field.required !== false,
    options: Array.isArray(field.options) ? [...field.options] : [],
  }));
}

function kycSectionsForClient(client) {
  const sections = [];
  const byPage = new Map();
  const values = client.kyc || {};
  kycSchemaFor(client).forEach((field) => {
    if (!byPage.has(field.page)) {
      const section = { title: field.page, fields: [] };
      byPage.set(field.page, section);
      sections.push(section);
    }
    byPage.get(field.page).fields.push({
      id: field.key,
      key: field.key,
      label: field.label,
      type: field.type || 'text',
      required: field.required !== false,
      options: field.options || [],
      value: values[field.key] ?? '',
    });
  });
  return sections;
}

// Single source of truth for how each raw KycCorrection.status reads in the
// UI — reused by the field-level badges below and the Compliance corrections
// list so the two views can never drift into different wording for the same
// status.
const KYC_CORRECTION_STATUS_META = {
  pending:          { label: 'Please Fill In',            badge: 'status-pending' },
  needs_correction: { label: 'Please Fill In',            badge: 'status-needs-correction' },
  saved:            { label: 'Saved',                     badge: 'status-in-progress' },
  resubmitted:      { label: 'Under Review by Compliance', badge: 'status-under-review' },
  corrected:        { label: 'Approved by Compliance',     badge: 'status-approved' },
};

// One renderer for every editable KYC field. KYC Tasks and the correction
// editor both receive this exact metadata from client.kycSchema, so input
// type, dropdown options and requiredness cannot drift between the two views.
//
// correctionStatus is the raw KycCorrection.status for this field (or null
// if there's no open correction) and drives both the badge and the glow:
//   'pending' / 'needs_correction' — empty, hard gold glow, still needs RM input
//   'saved'                        — RM saved a value but hasn't pressed Submit KYC yet: soft highlight
//   'resubmitted'                  — submitted, awaiting Compliance review: badge only, no glow
//   null/undefined                 — no open correction for this field
function kycEditableFieldHTML(field, { page = field.page || '', value = '', correctionStatus = null, correctionReason = '', disabled = false, marginBottom = '14px', clientId = '', canFlag = false, submitted = false } = {}) {
  const key = String(field.key || field.id || '');
  const label = String(field.label || key);
  const type = ['text', 'email', 'date', 'number', 'select', 'textarea', 'yesno'].includes(field.type)
    ? field.type
    : 'text';
  const options = Array.isArray(field.options) ? field.options.map(String) : [];
  const required = field.required !== false;
  const stringValue = String(value ?? '');
  const id = `clientkyc_${key}`;
  const disabledAttr = disabled ? ' disabled' : '';
  // Gold means "this is stopping the questionnaire being submitted". An
  // optional question left blank is a legitimate answer, not an omission, so
  // it stays plain — only a mandatory blank, or a field Compliance flagged,
  // is highlighted.
  const needsGold = (required && !stringValue.trim())
    || correctionStatus === 'pending'
    || correctionStatus === 'needs_correction';
  const statusClass = needsGold ? 'kyc-field-missing'
    : correctionStatus === 'saved' ? 'kyc-field-saved'
    : '';
  // Every control is eligible: an already-saved field must turn gold as soon
  // as it is edited or cleared, and only a successful save may clear it again.
  const glowEligibleAttr = ' data-kyc-glow-eligible="true"';
  const sharedStyle = 'width:100%;padding:7px 10px;font-size:13px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-primary);color:var(--text-primary);';
  const fieldMetadata = `data-kyc-key="${escapeHtml(key)}" data-kyc-label="${escapeHtml(label)}" data-kyc-type="${escapeHtml(type)}" data-kyc-required="${required ? 'true' : 'false'}" data-kyc-options="${escapeHtml(JSON.stringify(options))}" data-page="${escapeHtml(page)}"`;
  const metadata = `data-kyc-control ${fieldMetadata} data-kyc-saved-value="${escapeHtml(stringValue.trim())}" data-kyc-correction-status="${escapeHtml(correctionStatus || '')}"`;
  const nameAttr = `name="${escapeHtml(key)}"`;
  const requiredMetadata = required ? ' aria-required="true"' : '';

  let control;
  if (type === 'select') {
    control = `<select id="${escapeHtml(id)}" ${nameAttr} ${fieldMetadata}${requiredMetadata}${disabledAttr}${glowEligibleAttr} class="${statusClass}" style="${sharedStyle}">
      <option value="">&mdash; select &mdash;</option>
      ${options.map(option => `<option value="${escapeHtml(option)}" ${stringValue === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
    </select>`;
  } else if (type === 'textarea') {
    control = `<textarea id="${escapeHtml(id)}" ${nameAttr} ${fieldMetadata}${requiredMetadata}${disabledAttr}${glowEligibleAttr} rows="3" placeholder="${escapeHtml(label)}" class="${statusClass}" style="${sharedStyle}resize:vertical;">${escapeHtml(stringValue)}</textarea>`;
  } else if (type === 'yesno') {
    const normalized = stringValue.trim().toLowerCase();
    control = `<div id="${escapeHtml(id)}" role="radiogroup" aria-label="${escapeHtml(label)}"${glowEligibleAttr} class="${statusClass}" style="display:flex;gap:16px;margin-top:4px;">
      <label style="font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" ${nameAttr} value="Yes" ${normalized === 'yes' ? 'checked' : ''}${disabledAttr}> Yes</label>
      <label style="font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" ${nameAttr} value="No" ${normalized === 'no' ? 'checked' : ''}${disabledAttr}> No</label>
    </div>`;
  } else {
    control = `<input id="${escapeHtml(id)}" ${nameAttr} ${fieldMetadata}${requiredMetadata}${disabledAttr}${glowEligibleAttr} type="${escapeHtml(type)}" placeholder="${escapeHtml(label)}" value="${escapeHtml(stringValue)}" class="${statusClass}" style="${sharedStyle}">`;
  }

  // A field can be filled or empty without ever having a tracked
  // KycCorrection record (e.g. it was never flagged, or was resolved before
  // one was ever created) — the badge must never be omitted just because no
  // correction row happens to exist. Empty follows the same rule as the gold
  // glow above (`needsGold`); a filled field with nothing actively tracked
  // gets a plain neutral "Saved" tag, distinct from the blue one, which is
  // reserved for a field genuinely mid-workflow (saved but not yet
  // submitted) — otherwise every field on the form reads as blue and the
  // handful that actually need attention stop standing out.
  const statusMeta = KYC_CORRECTION_STATUS_META[correctionStatus]
    || (needsGold ? KYC_CORRECTION_STATUS_META.pending
      : stringValue.trim() ? { label: 'Saved', badge: 'status-neutral' }
      // Blank and not required: nothing was saved and nothing is owed, so
      // neither "Saved" nor "Please Fill In" is true. Once the questionnaire
      // has been handed over, that blank is a finished answer.
      : { label: submitted ? 'Not provided' : 'Optional', badge: 'status-neutral' });
  const statusLabel = statusMeta
    ? ` <span class="status-badge ${statusMeta.badge}" style="margin-left:4px;">${escapeHtml(statusMeta.label)}</span>`
    : '';
  const reasonHtml = correctionStatus === 'needs_correction' && correctionReason
    ? `<div style="font-size:11px;color:var(--accent-gold);margin:2px 0 4px;">Compliance: ${escapeHtml(correctionReason)}</div>`
    : '';

  // Compliance can flag a currently-filled field as wrong right here, on the
  // same questionnaire RM/client fill it out on — flagging isn't limited to
  // whichever specific sub-page a reviewer happens to land on.
  const flagButtonHtml = canFlag && stringValue.trim()
    ? `<button type="button" class="kyc-flag-btn" title="Flag as incorrect" data-client-id="${escapeHtml(clientId)}" data-field-key="${escapeHtml(key)}" data-field-label="${escapeHtml(label)}" onclick="flagKycFieldPrompt(this.dataset.clientId,this.dataset.fieldKey,this.dataset.fieldLabel)">⚑</button>`
    : '';

  return `
    <div class="form-group" ${metadata} style="margin-bottom:${escapeHtml(marginBottom)};">
      <label for="${escapeHtml(id)}" style="font-size:12px;font-weight:600;">${escapeHtml(label)}${required ? ' <span style="color:var(--accent-red);">*</span>' : ''}${statusLabel}</label>
      ${reasonHtml}
      ${flagButtonHtml ? `<div style="display:flex;align-items:center;gap:2px;"><div style="flex:1;">${control}</div>${flagButtonHtml}</div>` : control}
    </div>
  `;
}

function collectKycControlValues(root = document, page = null) {
  const fieldGroups = Array.from(root.querySelectorAll('[data-kyc-control][data-page]'))
    .filter(group => page === null || group.dataset.page === page);
  const values = {};
  fieldGroups.forEach(group => {
    const key = group.dataset.kycKey;
    if (!key) return;
    const controls = Array.from(group.querySelectorAll('input, select, textarea'));
    const selected = controls.find(control => control.name === key && (control.type !== 'radio' || control.checked));
    values[key] = String(selected?.value ?? '').trim();
  });
  return values;
}

function kycSubmissionState(client, root) {
  const values = collectKycControlValues(root);
  const missing = [];
  const unsaved = [];

  kycSchemaFor(client).forEach(field => {
    const value = String(values[field.key] ?? '').trim();
    const savedValue = String(client.kyc?.[field.key] ?? '').trim();
    // Only a mandatory blank blocks submission. Every answer still has to be
    // saved before it can be submitted, optional ones included — that check is
    // about unsaved edits, not about whether an answer is owed.
    if (!value) { if (field.required !== false) missing.push(field); }
    else if (value !== savedValue) unsaved.push(field);
  });

  return { values, missing, unsaved, ready: missing.length === 0 && unsaved.length === 0 };
}

function syncKycSubmissionGate(client, formEl) {
  const state = kycSubmissionState(client, formEl);
  const blockedKeys = new Set([...state.missing, ...state.unsaved].map(field => field.key));

  formEl.querySelectorAll('[data-kyc-control]').forEach(group => {
    const glowEl = group.querySelector('[data-kyc-glow-eligible]');
    if (!glowEl) return;
    const rejected = group.dataset.kycCorrectionStatus === 'pending'
      || group.dataset.kycCorrectionStatus === 'needs_correction';
    glowEl.classList.toggle('kyc-field-missing', rejected || blockedKeys.has(group.dataset.kycKey));
  });

  const submitBtn = formEl.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = !state.ready;
    submitBtn.setAttribute('aria-disabled', state.ready ? 'false' : 'true');
    submitBtn.title = state.ready
      ? 'Submit this saved KYC for Compliance review'
      : 'Complete and save every gold field before submitting';
  }

  const hint = formEl.querySelector('#kyc-submit-hint');
  if (hint) {
    hint.className = `kyc-submit-hint ${state.ready ? 'ready' : 'blocked'}`;
    if (state.missing.length) {
      hint.textContent = `${state.missing.length} field${state.missing.length === 1 ? ' is' : 's are'} empty. Save a non-empty value in every gold field before submitting.`;
    } else if (state.unsaved.length) {
      hint.textContent = `${state.unsaved.length} field${state.unsaved.length === 1 ? ' has' : 's have'} unsaved changes. Save Progress before submitting.`;
    } else {
      hint.textContent = 'All fields are complete and saved. Ready to submit for Compliance review.';
    }
  }
  formEl.dataset.kycReady = state.ready ? 'true' : 'false';
  return state;
}

// The ONE real KYC form — used for a client's first submission (via KYC
// Tasks) and for every later correction (via clicking a flagged item in KYC
// Corrections). There is no separate correction-editing view: the same
// fields, same ids, same data. Fields with an open correction (pending or
// needs_correction) glow gold; everything else shows its already-submitted
// value and doesn't need to be re-entered, though it's still editable here
// since this is the one real form either way.
function renderKycFill() {
  const task = State._activeKycTask;
  const content = document.getElementById('page-content');
  if (!task) {
    content.innerHTML = `<div class="page-header"><h1>KYC Form</h1><p>No active KYC task found.</p></div>`;
    return;
  }

  const isRM = State.currentRole === 'rm';
  const fillerLabel = isRM ? `Filling on behalf of: <strong>${escapeHtml(task.clientName)}</strong>` : `Please complete all required fields below.`;

  // The task and profile both use the schema that arrived with the linked
  // Client. The API no longer returns unlinked tasks or persists a separate
  // browser-supplied template snapshot.
  const client = task.clientId ? resolveKycClient(task.clientId) : null;
  if (!client) {
    content.innerHTML = `<div class="page-header"><h1>KYC Form</h1><p>This KYC task is no longer linked to an available client.</p></div>`;
    return;
  }

  const correctionByKey = client ? new Map(
    (State.kycCorrections || [])
      .filter(c => c.clientId === client.id && c.autoGenerated && c.status !== 'corrected')
      .map(c => [c.fieldKey, c])
  ) : new Map();
  const sections = kycSectionsForClient(client);
  sections.forEach((section) => section.fields.forEach((field) => {
    const correction = correctionByKey.get(field.id);
    field.correctionStatus = correction ? correction.status : null;
    field.correctionReason = correction?.rejectionReason || '';
  }));

  content.innerHTML = `
    <div class="page-header">
      <h1>KYC Questionnaire</h1>
      <p>${fillerLabel}</p>
    </div>

    <div class="info-box" style="margin-bottom:20px;">
      <p>Your information is processed strictly for compliance purposes and kept confidential. Complete and save every field before submitting. Gold fields still need to be filled in. After submission, the KYC remains under review until Compliance approves it.</p>
    </div>

    <form id="kyc-fill-form">
      ${sections.map(sec => `
        <div class="card" data-kyc-page="${escapeHtml(sec.title)}" style="margin-bottom:16px;">
          <div class="card-header" style="padding:12px 16px;">
            <div style="font-size:14px;font-weight:700;">${escapeHtml(sec.title)}</div>
          </div>
          <div class="card-body">
            ${sec.fields.map(f => kycEditableFieldHTML(
              { ...f, key: f.key || f.id },
              { page: sec.title, value: f.value, correctionStatus: f.correctionStatus, correctionReason: f.correctionReason, clientId: client.id, canFlag: isCompliance(State.currentRole) }
            )).join('')}
          </div>
        </div>
      `).join('')}

      <div id="kyc-submit-hint" class="kyc-submit-hint blocked" role="status" aria-live="polite"></div>
      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:8px;margin-bottom:32px;">
        <button type="button" class="btn-secondary" onclick="navigateTo('dashboard')">Cancel</button>
        <button type="button" class="btn-secondary" id="kyc-save-btn">Save Progress</button>
        <button type="submit" class="btn-primary" id="kyc-submit-btn">Submit KYC Form</button>
      </div>
    </form>
  `;

  // Landed here from a specific flagged correction — scroll to and focus it.
  if (State._activeCorrectionFieldKey) {
    const el = document.getElementById(`clientkyc_${State._activeCorrectionFieldKey}`);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
    State._activeCorrectionFieldKey = null;
  }

  const formEl = document.getElementById('kyc-fill-form');

  // Save persists whatever's currently filled in but never advances an open
  // correction past 'saved' — it must not resolve, approve, or submit it to
  // Compliance. Submit KYC is the only action that hands corrected fields
  // back to Compliance for review.
  async function saveProgress() {
    const answers = collectKycControlValues(formEl);
    if (task.id) {
      await apiFetch('POST', `/kyc-tasks/${task.id}/save`, { answers, completedBy: State.currentRole });
    } else {
      // No task record to hang this off (e.g. reached straight from a
      // correction with none found) — save straight against the client.
      await apiFetch('POST', '/corrections/kyc/save-section', { clientId: client.id, values: answers });
    }
    // Re-render needs both the fresh correction statuses (pending→saved) and
    // the fresh Client.kyc values, or the just-typed value would flash back
    // to blank even though it's already been persisted.
    if (State.currentRole === 'client') {
      const updated = await apiFetch('GET', '/clients/me').catch(() => null);
      if (updated) State.myClientProfile = { ...updated, id: updated.clientId };
      await refreshCorrectionsBadge();
    } else {
      await Promise.all([refreshCorrectionsBadge(), refreshClients()]);
    }
    showToast('success', 'Progress saved. Empty fields remain gold until they have a saved value.');
    renderKycFill();
  }

  async function submitKyc() {
    const gate = kycSubmissionState(client, formEl);
    if (!gate.ready) {
      throw new Error(gate.missing.length
        ? 'Every KYC field must contain a saved, non-empty value before submission.'
        : 'Save all KYC changes before submission.');
    }
    const answers = gate.values;
    if (task.id) {
      await apiFetch('POST', `/kyc-tasks/${task.id}/complete`, { answers, completedBy: State.currentRole });
    } else {
      await apiFetch('POST', '/corrections/kyc/resubmit-section', { clientId: client.id, values: answers });
    }
    if (State.currentRole === 'client') {
      const updated = await apiFetch('GET', '/clients/me').catch(() => null);
      if (updated) State.myClientProfile = { ...updated, id: updated.clientId };
      await Promise.all([refreshCorrectionsBadge(), refreshKycTasks()]);
    } else {
      await Promise.all([refreshCorrectionsBadge(), refreshClients(), refreshKycTasks()]);
    }
    State._activeKycTask = null;
    showToast('success', `KYC form for ${task.clientName} submitted. It is now under review by Compliance.`);
    setTimeout(() => navigateTo(State.currentRole === 'client' ? 'dashboard' : 'kyc-tasks'), 1200);
  }

  document.getElementById('kyc-save-btn').addEventListener('click', async function() {
    const saveBtn = this;
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try {
      await saveProgress();
    } catch (err) {
      showToast('error', err.message || 'Failed to save progress.');
      saveBtn.disabled = false; saveBtn.textContent = 'Save Progress';
    }
  });

  formEl.addEventListener('submit', async function(e) {
    e.preventDefault();
    const gate = syncKycSubmissionGate(client, formEl);
    if (!gate.ready) {
      const firstBlocked = formEl.querySelector('.kyc-field-missing');
      firstBlocked?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('warning', gate.missing.length
        ? 'Complete and save every gold field before submitting.'
        : 'Save your changes before submitting.');
      return;
    }
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }
    try {
      await submitKyc();
    } catch (err) {
      showToast('error', err.message || 'Failed to submit KYC form.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit KYC Form'; }
    }
  });
  formEl.addEventListener('input', () => syncKycSubmissionGate(client, formEl));
  formEl.addEventListener('change', () => syncKycSubmissionGate(client, formEl));
  syncKycSubmissionGate(client, formEl);
}

/* --- RM Dashboard --- */
function renderRMDashboard() {
  const content = document.getElementById('page-content');
  const myClients = State.clients.filter(c => c.rm === currentRmName());
  const myKycTasks = State.kycTasks.filter(kycTaskStillNeedsAttention);
  let firstName = 'there';
  try { firstName = (JSON.parse(localStorage.getItem('user') || 'null')?.name || '').split(' ')[0] || 'there'; } catch (_) {}

  content.innerHTML = `
    <div class="page-header">
      <h1>Hello, ${firstName}</h1>
      <p>Relationship Manager Dashboard</p>
    </div>
    <div class="stats-grid">
      ${statCard('#6366f1', myClients.length, 'My Clients', '', false, usersIcon())}
      ${statCard('#f59e0b', myClients.filter(c=>c.status==='under-review'||c.status==='pending'||c.status==='in-progress').length, 'In Progress', '', false, checklistIcon())}
      ${statCard('#10b981', myClients.filter(c=>c.status==='approved').length, 'Approved', '', true, checkIcon())}
      ${statCard('#8b5cf6', myKycTasks.length, 'KYC Tasks Pending', '', myKycTasks.length===0, formIcon())}
    </div>

    ${myKycTasks.length > 0 ? `
    <div class="card" style="margin-bottom:20px;border-color:rgba(139,92,246,0.35);background:rgba(139,92,246,0.04);">
      <div class="card-header">
        <div>
          <div class="card-title" style="color:var(--accent-purple);">KYC Tasks Assigned to You</div>
          <div class="card-subtitle">${myKycTasks.length} questionnaire${myKycTasks.length!==1?'s':''} to complete</div>
        </div>
      </div>
      <div class="card-body" style="padding:0 16px 12px;">
        ${myKycTasks.map(t => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-subtle);">
            <div>
              <div style="font-size:13px;font-weight:600;">${escapeHtml(t.clientName)}</div>
              <div style="font-size:11.5px;color:var(--text-muted);">${escapeHtml(t.clientId || '—')}${t.clientEmail ? ` · ${escapeHtml(t.clientEmail)}` : ''} · Assigned ${t.createdAt}</div>
            </div>
            <button class="btn-primary btn-sm" onclick="openKycTask('${t.id}')">Fill KYC Form</button>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-header">
        <div class="card-title">My Clients</div>
        <button class="btn-primary btn-sm" onclick="navigateTo('contract-building')">+ New Client</button>
      </div>
      <div>
        ${myClients.map(c => `
          <div class="client-row" onclick="openClientDetail('${c.id}')">
            <div class="client-avatar" style="background:${clientGradient(c.type)}">${c.name[0]}</div>
            <div class="client-info">
              <div class="client-name">${escapeHtml(c.name)}</div>
              <div class="client-type">${escapeHtml(c.type)} · ${escapeHtml(c.country)}</div>
              <div style="margin-top:6px;">
                <div class="progress-bar-wrap" style="width:120px;">
                  <div class="progress-bar" style="width:${c.progress}%;background:${progressColor(c.progress)};"></div>
                </div>
              </div>
            </div>
            <div class="client-meta">
              <span class="status-badge status-${escapeHtml(c.status)}">${statusLabel(c.status)}</span>
              <div class="client-date">${c.created}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function clientFillKycTask(taskId) {
  const task = State.kycTasks.find(t => t.id === taskId);
  if (!task) return;
  State._activeKycTask = task;
  navigateTo('kyc-fill');
}

/* --- Client Dashboard --- */
function renderClientDashboard() {
  const content = document.getElementById('page-content');
  const client = State.myClientProfile || State.clients[0];
  if (!client) {
    content.innerHTML = `<div class="page-header"><h1>Application Status</h1></div><p style="padding:20px;color:var(--text-muted);">No application found yet for this account.</p>`;
    return;
  }

  const ref      = client.clientId || client.id || '—';
  const status   = client.status   || 'pending';
  const progress = client.progress || 0;
  const docs     = client.documents    || [];
  const audit    = client.auditTrail   || [];

  // Matched on the case number, not the email address. A mandate prepared
  // without portal access has no email — a perfectly normal case — and matching
  // on one then pairs the wrong task with the wrong client, or none at all.
  const pendingKycTask = State.kycTasks.find(t =>
    kycTaskStillNeedsAttention(t) && String(t.clientId || '') === String(client.id || client.clientId || '')
  );

  const steps = [
    { label: 'KYC Form',           status: progress >= 20 ? 'done' : progress > 0 ? 'active' : '' },
    { label: 'Documents',          status: progress >= 40 ? 'done' : progress >= 20 ? 'active' : '' },
    { label: 'Compliance Review',  status: progress >= 70 ? 'done' : progress >= 40 ? 'active' : '' },
    { label: 'Decision',           status: progress >= 90 ? 'done' : progress >= 70 ? 'active' : '' },
    { label: 'Account Open',       status: progress >= 100 ? 'done' : progress >= 90 ? 'active' : '' },
  ];

  content.innerHTML = `
    <div class="page-header">
      <h1>Application Status</h1>
      <p>Track your onboarding progress for <strong>${escapeHtml(client.name)}</strong> · Category: <strong>${State.clientType}</strong></p>
    </div>

    ${pendingKycTask ? `
    <div class="card" style="margin-bottom:20px;background:rgba(139,92,246,0.07);border-color:rgba(139,92,246,0.35);">
      <div class="card-body" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:13px;color:var(--accent-purple);font-weight:700;">Action Required — KYC Questionnaire</div>
          <div style="font-size:13px;color:var(--text-primary);margin-top:4px;">Your Kundenberater has requested that you complete the KYC questionnaire. Please fill it in at your earliest convenience.</div>
        </div>
        <button class="btn-primary btn-sm" style="background:var(--accent-purple);border-color:var(--accent-purple);" onclick="clientFillKycTask('${pendingKycTask.id}')">Complete KYC Form</button>
      </div>
    </div>` : ''}

    <div class="card" style="margin-bottom:20px;background:rgba(16,185,129,0.06);border-color:rgba(16,185,129,0.24);">
      <div class="card-body" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:13px;color:var(--accent-green);font-weight:700;">Contract Package Ready</div>
          <div style="font-size:14px;color:var(--text-primary);margin-top:4px;">Full onboarding package for <strong>${State.clientType}</strong> is prepared and available.</div>
        </div>
        <button class="btn-primary btn-sm" onclick="navigateTo('client-contract')">Open Contract Package</button>
      </div>
    </div>

    <div class="card" style="background:linear-gradient(135deg,rgba(99,102,241,0.08),rgba(124,58,237,0.04));border-color:rgba(99,102,241,0.2);">
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:24px;">
          <div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Case Reference</div>
            <div style="font-size:22px;font-weight:700;">${ref}</div>
          </div>
          <span class="status-badge status-${status}" style="font-size:13px;padding:6px 14px;">${statusLabel(status)}</span>
        </div>
        <div class="step-tracker">
          ${steps.map((s,i) => `
            <div class="step-item ${escapeHtml(s.status)}">
              <div class="step-dot">${s.status === 'done' ? '✓' : i+1}</div>
              <div class="step-label">${escapeHtml(s.label)}</div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;">Overall progress</span>
            <span style="font-size:13px;font-weight:600;">${progress}%</span>
          </div>
          <div class="progress-bar-wrap"><div class="progress-bar" style="width:${progress}%"></div></div>
        </div>
      </div>
    </div>

    ${kycSchemaFor(client).length ? `
      <div style="margin-top:20px;">
        ${clientKycEditableFormHTML(client)}
      </div>
    ` : ''}

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Document Status</div>
          <button class="btn-secondary btn-sm" onclick="navigateTo('client-upload')">Manage</button>
        </div>
        <div class="card-body" style="padding-top:12px;">
          ${docs.length === 0
            ? `<p style="font-size:13px;color:var(--text-muted);">No documents uploaded yet.</p>`
            : docs.map(d => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-subtle);">
                  <span style="font-size:13px;">${escapeHtml(d.name)}</span>
                  <span class="status-badge status-${escapeHtml(d.status)}">${statusLabel(d.status)}</span>
                </div>
              `).join('')
          }
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Recent Activity</div></div>
        <div class="card-body" style="padding-top:12px;">
          ${audit.length === 0
            ? `<p style="font-size:13px;color:var(--text-muted);">No activity yet.</p>`
            : audit.slice(-4).reverse().map(a => `
                <div class="audit-item">
                  <div class="audit-dot" style="background:${auditColor(a.type)}22;color:${auditColor(a.type)};font-size:10px;">
                    ${auditEmoji(a.type)}
                  </div>
                  <div class="audit-content">
                    <div class="audit-description">${a.action}</div>
                    <div class="audit-meta">${a.user} · ${a.time}</div>
                  </div>
                </div>
              `).join('')
          }
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   PAGE: CLIENTS LIST
   ============================================================ */
// The real logged-in RM's Kundenberater code (e.g. "ACR") — a client only ever
// belongs to "my" list when its rm field matches this. This is a display/UX
// convenience only; the backend independently enforces the same scoping on
// every relevant endpoint using the authenticated user's identity, so this
// value being wrong can hide records but can never expose someone else's.
function currentRmName() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.rmCode || ROLES.rm.label;
}

// Real Client docs carry Mongo's `createdAt` (ISO timestamp) and `clientId`
// (e.g. "CLT-0001"), not the mock data's plain `created`/`id` fields — map them
// so every existing `c.id` / `c.created` reference keeps working either way.
function normalizeClientRecord(c) {
  return {
    ...c,
    id: c.clientId || c.id,
    created: c.created || (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'),
    // Real Document sub-docs carry `docId` (e.g. "D001"), not the mock data's plain `id`.
    documents: (c.documents || []).map(d => ({ ...d, id: d.docId || d.id })),
  };
}

async function refreshClients() {
  if (!hasAuthToken()) return;
  // The staff list endpoint 403s for a client account, which owns exactly one
  // case. Route that role to its own record instead so shared callers work
  // for every role without each one having to branch.
  if (State.currentRole === 'client') return refreshMyClientProfile();
  try {
    const clients = await apiFetch('GET', '/clients');
    if (Array.isArray(clients) && clients.length > 0) {
      State.clients = clients.map(normalizeClientRecord);
    }
    // The Contract Tasks count is derived from the mandates themselves now, so
    // it has to be recomputed whenever the list is refreshed — not only when
    // the corrections are.
    updateContractTasksBadge();
    if (State.currentRole === 'rm') updateMyClientsBadge();
  } catch (_) { /* keep whatever was cached */ }
}

async function renderClients() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="cb-loading">Loading clients…</div>`;
  await refreshClients();
  renderClientsList();
}

function renderClientsList() {
  const content = document.getElementById('page-content');
  const showAll = State.currentRole !== 'rm';
  let clients = showAll ? State.clients : State.clients.filter(c => c.rm === currentRmName());

  content.innerHTML = `
    <div class="page-header">
      <h1>${State.currentRole === 'rm' ? 'My Clients' : 'All Clients'}</h1>
      <p>${clients.length} client${clients.length !== 1 ? 's' : ''} in the system</p>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="filter-bar">
          <div class="search-input-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="search-input" id="client-search" placeholder="Search clients..." oninput="filterClients()" />
          </div>
          <select class="filter-select" id="status-filter" onchange="filterClients()">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="under-review">Under Review</option>
            <option value="in-progress">In Progress</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select class="filter-select" id="type-filter" onchange="filterClients()">
            <option value="">All Types</option>
            <option value="Individual">Individual</option>
            <option value="Corporate">Corporate</option>
            <option value="Trust">Trust</option>
            <option value="Foundation">Foundation</option>
          </select>
          <select class="filter-select" id="risk-filter" onchange="filterClients()">
            <option value="">All Risk</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          ${showAll ? `
          <select class="filter-select" id="rm-filter" onchange="filterClients()">
            <option value="">All Kundenberater</option>
            ${[...new Set(State.clients.map(c=>c.rm))].sort().map(rm=>`<option value="${rm}">${rm}</option>`).join('')}
          </select>
          ` : ''}
        </div>
        ${State.currentRole === 'rm' ? '<button class="btn-primary btn-sm" onclick="navigateTo(\'contract-building\')">+ New Client</button>' : ''}
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table" id="clients-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Progress</th>
              <th>RM</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="clients-tbody">
            ${renderClientRows(clients)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderClientRows(clients) {
  if (!clients.length) return `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No clients found</td></tr>`;
  return clients.map(c => `
    <tr style="cursor:pointer;" onclick="openClientDetail('${c.id}')">
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="client-avatar" style="width:32px;height:32px;font-size:12px;background:${clientGradient(c.type)}">${c.name[0]}</div>
          <div>
            <div style="font-weight:500;">${escapeHtml(c.name)}</div>
            <div class="td-secondary">${escapeHtml(c.country)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(c.type)}</td>
      <td><span class="risk-${c.risk.toLowerCase()}" style="font-weight:600;">${escapeHtml(c.risk)}</span></td>
      <td><span class="status-badge status-${escapeHtml(c.status)}">${statusLabel(c.status)}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="progress-bar-wrap" style="width:80px;"><div class="progress-bar" style="width:${c.progress}%;background:${progressColor(c.progress)};"></div></div>
          <span style="font-size:12px;color:var(--text-muted);">${c.progress}%</span>
        </div>
      </td>
      <td class="td-secondary">${escapeHtml(c.rm)}</td>
      <td class="td-secondary">${c.created}</td>
      <td onclick="event.stopPropagation()">
        <div class="actions-row">
          ${isCompliance(State.currentRole)
            && (c.status === 'under-review' || c.status === 'pending')
            && clientKycWorkflowStatus(c) === 'approved' ? `
            ${allClientDocumentsSubmitted(c)
              ? `<button class="btn-success btn-xs" onclick="event.stopPropagation();approveClient('${c.id}')">Approve</button>`
              : `<button class="btn-success btn-xs" disabled title="Every requested document must be submitted first" style="opacity:.5;cursor:not-allowed;">Approve</button>`}
            <button class="btn-secondary btn-xs" onclick="event.stopPropagation();rejectClient('${c.id}')">Reject</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function filterClients() {
  const search = document.getElementById('client-search').value.toLowerCase();
  const status = document.getElementById('status-filter').value;
  const type = document.getElementById('type-filter').value;
  const risk = document.getElementById('risk-filter').value;
  const rm = document.getElementById('rm-filter')?.value || '';
  const showAll = State.currentRole !== 'rm';
  let clients = showAll ? State.clients : State.clients.filter(c => c.rm === currentRmName());
  if (search) clients = clients.filter(c => c.name.toLowerCase().includes(search) || c.country.toLowerCase().includes(search));
  if (status) clients = clients.filter(c => c.status === status);
  if (type) clients = clients.filter(c => c.type === type);
  if (risk) clients = clients.filter(c => c.risk === risk);
  if (rm) clients = clients.filter(c => c.rm === rm);
  document.getElementById('clients-tbody').innerHTML = renderClientRows(clients);
}

async function approveClient(id) {
  const c = State.clients.find(c => c.id === id);
  if (!c) return;
  try {
    if (clientKycWorkflowStatus(c) !== 'approved') {
      throw new Error('Approve this KYC in the Compliance review first. A draft or under-review KYC cannot complete the case.');
    }
    const updated = await ApiClients.update(c.id, { status: 'approved', progress: 100 });
    Object.assign(c, normalizeClientRecord(updated));
    showToast('success', `${c.name} has been approved.`);
    if (State.currentPage === 'client-detail') renderClientDetail();
    else renderClients();
  } catch (err) {
    showToast('error', err.message || 'Could not approve this case.');
  }
}

// KYC approval is deliberately separate from the overall case decision. This
// action remains available in the KYC tab even if the broader client case has
// already moved to another status, and the server performs the final
// completeness/correction checks before recording Compliance sign-off.
async function approveKycFromReview(clientId) {
  const client = State.clients.find(c => c.id === clientId || c.clientId === clientId);
  if (!client) return;
  try {
    await apiFetch('POST', `/kyc-tasks/client/${encodeURIComponent(client.id || client.clientId)}/verify`, {});
    await Promise.all([refreshClients(), refreshKycTasks(), refreshCorrectionsBadge()]);
    showToast('success', `KYC for ${client.name} approved by Compliance.`);
    if (State.currentPage === 'client-detail') {
      renderClientDetail();
      switchTab('kyc');
    } else if (State.currentPage === 'kyc-review') {
      renderKycReview();
    }
  } catch (err) {
    showToast('error', err.message || 'KYC could not be approved. Review every field and resolve all corrections first.');
  }
}

function rejectClient(id) {
  const c = State.clients.find(c => c.id === id);
  if (!c) return;
  c.status = 'rejected';
  c.auditTrail.push({ action: 'Case rejected by compliance officer', user: 'Compliance Officer', time: new Date().toLocaleString(), type: 'rejected' });
  showToast('error', `${c.name} has been rejected.`);
  renderClients();
}



/* ============================================================
   PAGE: CLIENT DETAIL
   ============================================================ */
function openClientDetail(id) {
  State.selectedClientId = id;
  navigateTo('client-detail');
}

function renderClientDetail() {
  const client = State.clients.find(c => c.id === State.selectedClientId);
  if (!client) return;
  const content = document.getElementById('page-content');
  document.getElementById('topbar-title').textContent = client.name;
  // The Mandate Risk tab needs the question list; fetch it if this is the
  // first screen that has asked for it, then redraw once it lands.
  ensureMandateRiskSchema(() => {
    if (State.currentPage === 'client-detail') {
      const active = document.querySelector('.tab-content.active')?.id?.replace('tab-', '') || 'overview';
      renderClientDetail();
      switchTab(active);
    }
  });

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <button class="btn-secondary btn-sm" onclick="navigateTo('clients')">← Back</button>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="client-avatar" style="width:48px;height:48px;font-size:18px;background:${clientGradient(client.type)}">${client.name[0]}</div>
          <div>
            <h1 style="font-size:20px;font-weight:700;">${escapeHtml(client.name)}</h1>
            <div style="color:var(--text-secondary);font-size:13px;">${escapeHtml(client.type)} · ${escapeHtml(client.country)} · Case ${client.id}</div>
          </div>
          <span class="status-badge status-${escapeHtml(client.status)}" style="font-size:13px;padding:6px 14px;">${statusLabel(client.status)}</span>
          <span style="font-weight:600;font-size:13px;" class="risk-${client.risk.toLowerCase()}">Risk: ${escapeHtml(client.risk)}</span>
        </div>
      </div>
      <div class="actions-row">
        ${isCompliance(State.currentRole)
          && (client.status === 'under-review' || client.status === 'pending')
          && clientKycWorkflowStatus(client) === 'approved' ? `
          ${allClientDocumentsSubmitted(client)
            ? `<button class="btn-success btn-sm" onclick="approveClientFromDetail('${client.id}')">✓ Approve</button>`
            : `<button class="btn-success btn-sm" disabled title="Every requested document must be submitted first" style="opacity:.5;cursor:not-allowed;">✓ Approve</button>`}
          <button class="btn-secondary btn-sm" onclick="rejectClientFromDetail('${client.id}')">Reject</button>
        ` : ''}
        ${State.currentRole === 'rm' ? `<button class="btn-secondary btn-sm" onclick="editClientKycFromDetail('${escapeHtml(client.id)}')">Edit KYC</button>` : ''}
        ${isCompliance(State.currentRole)
          ? `<button class="btn-danger btn-sm" onclick="deleteMandate('${escapeHtml(client.id)}')" title="Delete this mandate and everything belonging to it">Delete</button>`
          : ''}
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('overview')">Overview</button>
      <button class="tab-btn" onclick="switchTab('kyc')">KYC Details</button>
      <button class="tab-btn" onclick="switchTab('risk')">Mandate Risk</button>
      <button class="tab-btn" onclick="switchTab('docs')">Documents (${client.documents.length})</button>
      <button class="tab-btn" onclick="switchTab('audit-trail')">Audit Trail</button>
    </div>

    <div id="tab-overview" class="tab-content active">
      ${renderClientOverviewTab(client)}
    </div>
    <div id="tab-kyc" class="tab-content">
      ${renderClientKycTab(client)}
    </div>
    <div id="tab-risk" class="tab-content">
      ${renderClientMandateRiskTab(client)}
    </div>
    <div id="tab-docs" class="tab-content">
      ${renderClientDocsTab(client)}
    </div>
    <div id="tab-audit-trail" class="tab-content">
      ${renderClientAuditTab(client)}
    </div>
  `;
}

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach((b,i) => {
    const tabs = ['overview','kyc','risk','docs','audit-trail'];
    b.classList.toggle('active', tabs.indexOf(name) === i);
  });
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
}

function renderClientOverviewTab(client) {
  return `
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Case Information</div></div>
        <div class="card-body">
          ${infoRow('Case ID', client.id)}
          ${infoRow('Client Type', client.type)}
          ${infoRow('Country', client.country)}
          ${infoRow('Industry', client.industry)}
          ${infoRow('Risk Level', `<span class="risk-${client.risk.toLowerCase()}" style="font-weight:700;">${escapeHtml(client.risk)}</span>`)}
          ${infoRow('Relationship Manager', client.rm)}
          ${infoRow('Date Created', client.created)}
          ${infoRow('Status', `<span class="status-badge status-${escapeHtml(client.status)}">${statusLabel(client.status)}</span>`)}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Onboarding Progress</div></div>
        <div class="card-body">
          <div style="text-align:center;margin-bottom:20px;">
            <div style="font-size:48px;font-weight:800;color:${client.progress===100 ? 'var(--accent-green)' : 'var(--accent-purple-light)'};">${client.progress}%</div>
            <div style="color:var(--text-muted);">Overall Completion</div>
            ${client.documentProgress && client.documentProgress.total
              ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${client.documentProgress.completed} of ${client.documentProgress.total} documents complete</div>`
              : ''}
          </div>
          <div class="progress-bar-wrap" style="height:10px;margin-bottom:20px;">
            <div class="progress-bar" style="width:${client.progress}%;background:${progressColor(client.progress)};"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="text-align:center;padding:12px;background:var(--bg-elevated);border-radius:var(--radius-md);">
              <div style="font-size:20px;font-weight:700;">${client.documents.filter(d=>d.status==='approved').length}</div>
              <div style="font-size:11px;color:var(--accent-green);">Approved Docs</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--bg-elevated);border-radius:var(--radius-md);">
              <div style="font-size:20px;font-weight:700;">${client.documents.filter(d=>d.status!=='approved').length}</div>
              <div style="font-size:11px;color:var(--status-pending);">Pending Docs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// One signed-document row. Read-only: downloads only, no approve/flag here —
// document decisions live in Contract Tasks.
function documentRowHTML(d, client) {
  return `
    <div class="doc-item" style="${d.missingNote ? 'border-color:rgba(249,115,22,0.4);background:rgba(249,115,22,0.03);' : ''}">
      <div class="doc-icon" style="background:${docIconColor(d.type)}22;color:${docIconColor(d.type)}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
      </div>
      <div class="doc-info">
        <div class="doc-name">${escapeHtml(d.name)}</div>
        <div class="doc-meta">
          ${escapeHtml(d.type)}
          &nbsp;·&nbsp;<span style="color:var(--accent-green);font-weight:500;">✓ Signed version received</span>
          ${d.date && d.date !== '-' ? ` · Uploaded ${escapeHtml(d.date)}` : ''} ${d.size && d.size !== '-' ? `· ${escapeHtml(d.size)}` : ''}
        </div>
        ${d.missingNote ? `<div style="font-size:11.5px;color:var(--status-info-requested);margin-top:5px;">⚠&nbsp;${escapeHtml(d.missingNote)}</div>` : ''}
      </div>
      <div class="doc-actions">
        <span class="status-badge status-${escapeHtml(d.status)}">${statusLabel(d.status)}</span>
        <button class="btn-secondary btn-xs" onclick="downloadDoc('${escapeHtml(client.id)}','${escapeHtml(d.docId || d.id)}')">${downloadIcon()} Download</button>
      </div>
    </div>
  `;
}

function renderClientKycTab(client) {
  // Shared with the client's own portal (clientKycEditableFormHTML) so RM,
  // Compliance and the client see the exact same correction state — pending/
  // saved/resubmitted/awaiting-review badges and the gold glow on whatever
  // still needs RM input, never a separately-maintained read-only mirror.
  if (!kycSchemaFor(client).length) {
    return `<div class="card"><div class="card-body"><p class="text-muted">KYC details not available.</p></div></div>`;
  }
  return clientKycEditableFormHTML(client, false, { allowReview: false });
}

// The mandate-risk result as a record: every question, its answer, and where
// Compliance landed on it. Strictly read-only — answering happens in the
// questionnaire, deciding happens in KYC & Mandate Risk Tasks, and a third
// place to act on the same thing would only let the two disagree.
// The mandate-risk question list is global and rarely changes, so it is
// fetched once and reused. Any screen that renders those questions calls this;
// the first call re-renders when the answer arrives.
async function ensureMandateRiskSchema(onLoad) {
  if (State.mandateRiskSchema && State.mandateRiskSchema.length) return State.mandateRiskSchema;
  try {
    const data = await apiFetch('GET', '/mandate-risk-schema');
    State.mandateRiskSchema = data.fields || [];
    if (typeof onLoad === 'function') onLoad();
  } catch (_) {
    State.mandateRiskSchema = State.mandateRiskSchema || [];
  }
  return State.mandateRiskSchema;
}

function renderClientMandateRiskTab(client) {
  const risk = client.mandateRisk || {};
  const answers = risk.answers || {};
  const reviews = risk.reviews || {};
  const prefilled = new Set(risk.prefilledKeys || []);
  const fields = State.mandateRiskSchema || [];
  const status = risk.status || 'draft';
  const meta = status === 'approved' ? KYC_CORRECTION_STATUS_META.corrected
    : status === 'under_review' ? KYC_CORRECTION_STATUS_META.resubmitted
    : status === 'saved' ? { label: 'Saved', badge: 'status-neutral' }
    : KYC_CORRECTION_STATUS_META.pending;

  if (!fields.length) {
    return `<div class="card"><div class="card-body"><p class="text-muted">Mandate-risk questions are still loading. Open KYC &amp; Mandate Risk Tasks once, then come back.</p></div></div>`;
  }

  const sections = [];
  const byPage = new Map();
  fields.forEach(f => {
    if (!byPage.has(f.page)) { byPage.set(f.page, { page: f.page, fields: [] }); sections.push(byPage.get(f.page)); }
    byPage.get(f.page).fields.push(f);
  });

  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div>
          <div class="card-title">Fragebogen zum Mandatsrisiko</div>
          <div class="card-subtitle">Risk rating: <strong class="risk-${escapeHtml(String(client.risk || '').toLowerCase())}">${escapeHtml(client.risk || '—')}</strong>${risk.submittedBy ? ` · submitted by ${escapeHtml(risk.submittedBy)}` : ''}${risk.approvedBy ? ` · approved by ${escapeHtml(risk.approvedBy)}` : ''}</div>
        </div>
        <span class="status-badge ${meta.badge}">${escapeHtml(meta.label)}</span>
      </div>
    </div>
    ${sections.map(sec => `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-header" style="padding:12px 16px;"><div class="card-title">${escapeHtml(sec.page)}</div></div>
        <div class="card-body" style="padding:0 16px 14px;">
          ${sec.fields.map(f => {
            const value = String(answers[f.key] ?? '').trim();
            const decision = reviews[f.key] || null;
            const badge = decision?.status === 'approved' ? KYC_CORRECTION_STATUS_META.corrected
              : decision?.status === 'flagged' ? KYC_CORRECTION_STATUS_META.needs_correction
              : value ? { label: 'Saved', badge: 'status-neutral' }
              : KYC_CORRECTION_STATUS_META.pending;
            return `
              <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
                <div style="flex:1;font-size:13px;">
                  <div>${escapeHtml(f.label)}${f.affectsRisk ? ` <span style="color:var(--accent-orange);font-size:11px;">(*r)</span>` : ''}</div>
                  <div style="color:var(--text-secondary);margin-top:2px;">${value ? escapeHtml(value) : '—'}</div>
                  ${prefilled.has(f.key) && value ? `<div style="font-size:11px;color:var(--text-muted);">Pre-filled from KYC / contract</div>` : ''}
                  ${decision?.status === 'flagged' && decision.reason ? `<div style="font-size:11px;color:var(--accent-gold);">Compliance: ${escapeHtml(decision.reason)}</div>` : ''}
                </div>
                <span class="status-badge ${badge.badge}">${escapeHtml(badge.label)}</span>
              </div>`;
          }).join('')}
        </div>
      </div>
    `).join('')}
  `;
}

function screeningBadge(label, val) {
  const clear = val === 'No' || val === 'Clear';
  return `
    <div style="text-align:center;padding:14px;background:${clear ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.1)'};border:1px solid ${clear ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};border-radius:var(--radius-md);">
      <div style="font-size:14px;font-weight:700;color:${clear ? 'var(--accent-green)' : 'var(--accent-red)'};">${clear ? '✓ Clear' : '⚠ Flag'}</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${label}</div>
    </div>
  `;
}

function renderClientDocsTab(client) {
  // Compliance can upload a signed package on the client's behalf same as an
  // RM can — the backend already accepts and labels it (uploadedBy:
  // 'Compliance'); the widget was just never shown to that role, so nothing
  // ever ran the signature/checkbox check on a Compliance-uploaded file.
  // Work-in-progress sits in its own group: a saved version is a document
  // Only genuinely signed documents belong here. A contract slot always
  // carries a file (the blank template), so `filePath` alone would list an
  // unsigned contract as "signed" — signedVersion is the real signal, and it
  // is only set once someone uploads a completed version over it.
  const signedDocs = client.documents.filter(d => d.signedVersion && d.filePath);

  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Signed Documents</div>
          <div class="card-subtitle">Completed documents received for this client. Blank templates and uploads live in Contract Tasks.</div>
        </div>
      </div>
      <div class="card-body" style="padding-top:4px;">
        ${signedDocs.length
          ? signedDocs.map(d => documentRowHTML(d, client)).join('')
          : `<div style="font-size:13px;color:var(--text-muted);">Nothing signed yet.</div>`}
      </div>
    </div>
  `;
}

function renderClientAuditTab(client) {
  return `
    <div class="card">
      <div class="card-header"><div class="card-title">Audit Trail</div><div class="card-subtitle">${client.auditTrail.length} events recorded</div></div>
      <div class="card-body">
        ${client.auditTrail.slice().reverse().map(a => `
          <div class="audit-item">
            <div class="audit-dot" style="background:${auditColor(a.type)}22;color:${auditColor(a.type)};">
              ${auditEmoji(a.type)}
            </div>
            <div class="audit-content">
              <div class="audit-description">${a.action}</div>
              <div class="audit-meta">${a.user} · ${a.time}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function downloadTemplate(docId) {
  showToast('info', 'Template downloaded. Please print, sign and scan before re-uploading.');
}

function uploadToAssetmax(docId) {
  showToast('success', 'Document forwarded to Assetmax successfully.');
}

async function approveClientFromDetail(id) {
  await approveClient(id);
  openClientDetail(id);
}

function rejectClientFromDetail(id) {
  rejectClient(id);
  openClientDetail(id);
}

// A case can only be approved once every document the contract asked for has
// actually been provided. Requirement slots created at contract time carry no
// file until someone uploads against them, so an outstanding slot is exactly
// "still waiting on this document".
function allClientDocumentsSubmitted(client) {
  const docs = client?.documents || [];
  if (!docs.length) return true;
  return docs.every(d => d.type === 'Template' || Boolean(d.filePath));
}

async function approveDoc(clientId, docId) {
  const c = State.clients.find(c => c.id === clientId);
  const d = c && c.documents.find(d => d.id === docId);
  if (!d) return;
  try {
    await apiFetch('POST', `/clients/${clientId}/documents/${docId}/approve`);
    d.status = 'approved';
    showToast('success', `${d.name} approved.`);
    refreshNotifications();
    if (d.name === 'KYC Form') await exportConfirmedKyc(c);
    renderClientDetail();
    switchTab('docs');
  } catch (err) {
    showToast('error', err.message || 'Failed to approve document.');
  }
}

// Once Compliance confirms the KYC Form document, add the confirmed answers to
// the running NaturalPersonKYC export store (backend/data/kycExportRecords.json).
// It accumulates every confirmed client and can be downloaded any time via
// "Export Completed KYCs" on the KYC Questionnaire page (kycExportAll()). Only
// first name, last name and occupation have a known Question-Ident mapping so
// far — see backend/services/kycExport.service.js.
async function exportConfirmedKyc(client) {
  const kyc = client.kyc || {};
  if (!kyc.firstName && !kyc.lastName && !kyc.occupation) return; // nothing mapped to export
  try {
    await apiFetch('POST', '/kyc/confirm', {
      clientId: client.id, firstName: kyc.firstName, lastName: kyc.lastName, occupation: kyc.occupation,
    });
    client.auditTrail.push({ action: 'KYC added to NaturalPersonKYC export for external system', user: 'Compliance Officer', time: new Date().toLocaleString(), type: 'approved' });
  } catch (err) {
    showToast('error', 'KYC confirmed, but adding it to the export failed: ' + err.message);
  }
}

// Downloads the accumulated NaturalPersonKYC.xlsx — every client confirmed so far.
//
// DEPRECATED: no longer offered anywhere in the UI. The export only ever mapped
// first name, last name and occupation to Question Idents, so it produced a
// file that looked complete but carried almost none of the questionnaire. The
// function and its endpoint are kept so the accumulated records stay reachable
// and the mapping can be finished later; nothing calls this today.
async function kycExportAll() {
  try {
        const response = await fetch(`${API_BASE}/kyc/export/natural-person`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NaturalPersonKYC.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast('error', err.message || 'Export failed');
  }
}

// The whole completed contract package as one zip, once every document has
// a real file on record — not just the individually corrected pages.
async function downloadFullPackage(clientId) {
  try {
        const response = await fetch(`${API_BASE}/clients/${clientId}/documents/package`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || 'Package download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clientId}_Full_Package.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Full contract package downloaded.');
  } catch (err) {
    showToast('error', err.message || 'Failed to download the full package.');
  }
}

// Downloads whatever file is currently on record for this document slot —
// the actual generated/uploaded bytes, not a stub.
async function downloadDoc(clientId, docId) {
  try {
        const response = await fetch(`${API_BASE}/clients/${clientId}/documents/${docId}/download`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || 'Download failed');
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : 'document';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast('error', err.message || 'Failed to download document.');
  }
}

function showUploadModal(docId) {
  triggerFileInputFor(docId);
}

// Finds which CONTRACT_TEMPLATE_LABELS entry a Contract Package document's
// name belongs to — buildDocEntries names it "<template label> — Contract
// Package" on the backend, so the label is always a substring.
function inferContractTemplateId(docName) {
  const name = docName || '';
  const entry = Object.entries(CONTRACT_TEMPLATE_LABELS).find(([, label]) => {
    if (name.includes(label)) return true;
    // buildDocEntries names the doc "<template name> — Contract Package" on
    // the backend, using the TEMPLATES catalog's name — a separate string
    // from this label, which additionally carries a "(EN)"/"(DE)" suffix the
    // doc name never has. Strip it before comparing.
    const core = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return core.length > 0 && name.includes(core);
  });
  return entry ? entry[0] : null;
}

// The generic Upload Signed Document widget defaults its Document Type to
// "Other Signed Document", which silently skips the automatic signature/
// checkbox check entirely. Uploading against a specific document row already
// tells us what that document is — pre-select the matching type (and, for a
// Contract Package, the matching template) so the check actually runs
// instead of depending on the uploader remembering to switch the dropdown.
function triggerFileInputFor(docId) {
  const client = getActiveClientForUpload();
  const doc = docId ? client?.documents.find(d => d.id === docId || d.docId === docId) : null;
  const typeSelect = document.getElementById('upload-doc-type');
  if (doc && typeSelect) {
    if (doc.type === 'Template') {
      typeSelect.value = 'Signed Contract';
      cbToggleContractTemplateSelect();
      const templateSelect = document.getElementById('upload-contract-template');
      const inferredId = inferContractTemplateId(doc.name);
      if (templateSelect && inferredId) templateSelect.value = inferredId;
    } else if (doc.type === 'ID Document') {
      typeSelect.value = 'ID Document';
      cbToggleContractTemplateSelect();
    }
  }
  triggerFileInput();
}

function triggerFileInput() {
  const input = document.getElementById('file-input');
  if (input) input.click();
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  files.forEach(f => simulateUpload(f));
}

function cbToggleContractTemplateSelect() {
  const docType = document.getElementById('upload-doc-type')?.value;
  const wrap = document.getElementById('upload-contract-template-wrap');
  if (wrap) wrap.style.display = docType === 'Signed Contract' ? 'block' : 'none';
  const expiryWrap = document.getElementById('upload-id-expiry-wrap');
  if (expiryWrap) expiryWrap.style.display = docType === 'ID Document' ? 'block' : 'none';
}

// Just the id -> label list, for the "Contract Template Used" dropdown and
// for guessing which template a client's existing Template document belongs
// to. The actual checkbox/region geometry lives server-side now
// (backend/config/contractValidationMaps.js) — the signature/checkbox check
// itself runs there too, in a real headless browser via Playwright
// (backend/services/pdfChecker.service.js), so it fires reliably for every
// upload regardless of who uploads or which browser they're using, instead
// of depending on the uploader's own browser to run it.
const CONTRACT_TEMPLATE_LABELS = {
  'en-disc-all-in': 'Discretionary All-In (EN)',
  'en-advisory': 'Advisory Contract (EN)',
};

// Uploads a document for real (persisted server-side — see clients.controller
// uploadDocument), which also runs the signature/checkbox check server-side
// and reports back whether anything needs correction. A "Signed Contract"
// upload targets the client's existing Contract Package document slot so it
// replaces/versions that one rather than creating an unrelated new document; other
// upload types create a fresh document entry.
async function simulateUpload(file) {
  const client = getActiveClientForUpload();
  if (!client) {
    showToast('warning', 'No active client selected for upload.');
    return;
  }
  State.selectedClientId = client.id;
  // The dedicated "Upload Signed Documents" page has no Document Type
  // dropdown at all — every upload there is, by that page's own stated
  // purpose, the signed contract package. Only the generic Documents-tab
  // widget (which does have the dropdown) needs the selector's value.
  const docTypeSelect = document.getElementById('upload-doc-type');
  const docType = docTypeSelect ? (docTypeSelect.value || 'Uploaded Document') : 'Signed Contract';

  let targetDocId = '';
  let templateId = null;
  if (docType === 'Signed Contract') {
    // A client can (rarely, e.g. old test data or a template switch) have
    // more than one Template-type document. Picking just any one of them is
    // how a real upload used to end up checked against the wrong contract's
    // checkbox regions — resolve the actual Template doc explicitly instead:
    // if a template was picked in the dropdown, match the doc whose name
    // belongs to that template; otherwise fall back to whichever Template
    // doc is still outstanding (unsigned), preferring the most recent one.
    const templateDocs = client.documents.filter(d => d.type === 'Template');
    const explicitTemplateId = document.getElementById('upload-contract-template')?.value || '';
    let templateDoc = null;
    if (explicitTemplateId) {
      const label = CONTRACT_TEMPLATE_LABELS[explicitTemplateId];
      templateDoc = templateDocs.find(d => label && inferContractTemplateId(d.name) === explicitTemplateId);
    }
    if (!templateDoc) {
      const outstanding = templateDocs.filter(d => !d.signedVersion);
      templateDoc = (outstanding.length ? outstanding : templateDocs).slice(-1)[0] || null;
    }
    if (templateDoc) targetDocId = templateDoc.docId;
    // No template dropdown on the dedicated Upload Signed Documents page —
    // infer which contract this client actually has from its Template doc's
    // name (buildDocEntries always names it "<template label> — Contract
    // Package" on the backend).
    templateId = explicitTemplateId || inferContractTemplateId(templateDoc?.name);
  }
  const expiryDate = docType === 'ID Document' ? (document.getElementById('upload-id-expiry')?.value || '') : '';

  // Real persistence — the file actually lands on disk, the document entry
  // it belongs to gets its filePath (and version history) updated, and the
  // signature/checkbox check runs server-side (Playwright, see
  // clients.controller uploadDocument) so it fires the same way regardless
  // of who's uploading or which browser they're using.
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('type', docType);
  if (targetDocId) formData.append('docId', targetDocId);
  if (templateId) formData.append('templateId', templateId);
  if (expiryDate) formData.append('expiryDate', expiryDate);

  let missingNote = '';
  try {
        const res = await fetch(`${API_BASE}/clients/${client.id}/documents/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || 'Upload failed');
    missingNote = result.missingNote || '';
    // The backend response carries the full, authoritative client record —
    // adopt it wholesale so State stays in sync with what was actually saved.
    Object.assign(client, normalizeClientRecord(result.client));
  } catch (err) {
    showToast('error', `Failed to save the uploaded file: ${err.message}`);
    return;
  }

  if (missingNote) {
    showToast('warning', `${file.name} uploaded, but flagged for correction: ${missingNote}`);
  }

  const submissions = ensureClientSubmissionBucket(client.id);
  submissions.unshift({
    id: `sub-${Date.now()}`,
    name: file.name,
    date: new Date().toISOString().slice(0,10),
    status: 'pending',
    size: (file.size/1024/1024).toFixed(1)+' MB',
  });
  client.progress = Math.min(client.progress + 10, 95);
  if (!missingNote) showToast('success', `${file.name} uploaded successfully.`);
  if (State.currentPage === 'client-upload') {
    renderClientUpload();
    return;
  }
  renderClientDetail();
  switchTab('docs');
}

function dragOver(e) { e.preventDefault(); document.getElementById('upload-zone').classList.add('drag-over'); }
function dragLeave(e) { document.getElementById('upload-zone').classList.remove('drag-over'); }
function dropFile(e) {
  e.preventDefault(); document.getElementById('upload-zone').classList.remove('drag-over');
  Array.from(e.dataTransfer.files).forEach(f => simulateUpload(f));
}

function infoRow(label, value) {
  return `<div style="padding:8px 0;border-bottom:1px solid var(--border-subtle);grid-column:span 1;">
    <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">${label}</div>
    <div style="font-size:13.5px;color:var(--text-primary);">${value || '—'}</div>
  </div>`;
}

function docIconColor(type) {
  const map = { 'ID Document': '#6366f1', 'Corporate Doc': '#06b6d4', 'AML Doc': '#f59e0b', 'Financial': '#10b981', 'Trust Doc': '#8b5cf6', 'Address Doc': '#f97316', 'Other': '#6b7280' };
  return map[type] || '#6366f1';
}

/* ============================================================
   PAGE: DOCUMENTS (GLOBAL)
   ============================================================ */
function renderDocuments() {
  const content = document.getElementById('page-content');
  const role = State.currentRole;
  const allDocs = State.clients.flatMap(c => c.documents.map(d => ({ ...d, clientName: c.name, clientId: c.id })));
  const blankDocs = allDocs.filter(d => d.templateAvailable || d.signedVersion === false || d.uploadedBy === 'Compliance');
  const signedDocs = allDocs.filter(d => d.signedVersion || d.uploadedBy === 'Client' || d.uploadedBy === 'RM');

  content.innerHTML = `
    <div class="page-header">
      <h1>Document Repository</h1>
      <p>${allDocs.length} documents across all clients · grouped into Blank and Signed</p>
    </div>
    ${renderDocumentSection('Blank Documents', 'Templates and unsigned versions shared with client', blankDocs, role)}
    ${renderDocumentSection('Signed Documents', 'Scanned and signed files returned by client', signedDocs, role)}
  `;
}

function renderDocumentSection(title, subtitle, docs, role) {
  return `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header">
        <div>
          <div class="card-title">${title}</div>
          <div class="card-subtitle">${subtitle}</div>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Client</th>
              <th>Type</th>
              <th>Status</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th>Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${renderDocRows(docs, role)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function filterDocs(search) {
  let allDocs = State.clients.flatMap(c => c.documents.map(d => ({ ...d, clientName: c.name, clientId: c.id })));
  if (search) {
    allDocs = allDocs.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) || d.clientName.toLowerCase().includes(search.toLowerCase())
    );
  }
  return allDocs;
}

function renderDocRows(docs, role) {
  if (!docs.length) return `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No documents found</td></tr>`;
  return docs.map(d => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="color:${docIconColor(d.type)}">${fileIcon()}</div>
          <span style="font-weight:500;">${escapeHtml(d.name)}</span>
        </div>
      </td>
      <td><button style="background:none;border:none;color:var(--accent-purple-light);cursor:pointer;font-size:13px;" onclick="openClientDetail('${escapeHtml(d.clientId)}')">${escapeHtml(d.clientName)}</button></td>
      <td class="td-secondary">${escapeHtml(d.type)}</td>
      <td><span class="status-badge status-${escapeHtml(d.status)}">${statusLabel(d.status)}</span></td>
      <td class="td-secondary">${d.uploadedBy}</td>
      <td class="td-secondary">${d.date}</td>
      <td class="td-secondary">${d.size}</td>
      <td>
        <div class="actions-row">
          ${d.date !== '-' ? `<button class="btn-icon" title="Download">${downloadIcon()}</button>` : ''}
          ${isCompliance(role) && d.status === 'pending' ? `<button class="btn-success btn-xs" onclick="approveDoc('${escapeHtml(d.clientId)}','${d.id}')">Approve</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

/* ============================================================
   PAGE: AUDIT TRAIL (GLOBAL)
   ============================================================ */
function renderAuditPage() {
  const content = document.getElementById('page-content');

  const isClient = State.currentRole === 'client';
  const events = isClient
    ? (State.myClientProfile?.auditTrail || []).slice().reverse()
    : State.clients.flatMap(c =>
        c.auditTrail.map(a => ({ ...a, clientName: c.name, clientId: c.id || c.clientId }))
      ).sort((a, b) => new Date(b.time) - new Date(a.time));

  const title    = isClient ? 'My Activity' : 'Audit Trail';
  const subtitle = isClient
    ? `Activity log for your application`
    : `Complete activity log across all cases`;

  content.innerHTML = `
    <div class="page-header">
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="card">
      <div class="card-body" style="padding:0;">
        ${events.length === 0
          ? `<p style="padding:24px;font-size:13px;color:var(--text-muted);">No activity recorded yet.</p>`
          : events.map((a, i) => `
            <div style="display:flex;gap:12px;padding:12px 20px;${i < events.length - 1 ? 'border-bottom:1px solid var(--border-subtle);' : ''}align-items:flex-start;">
              <div style="flex-shrink:0;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;background:${auditColor(a.type)}18;color:${auditColor(a.type)};">
                ${auditEmoji(a.type)}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;color:var(--text-primary);line-height:1.4;">${a.action}${!isClient && a.clientName ? `<span style="color:var(--accent-purple-light);margin-left:6px;font-size:12px;">→ ${escapeHtml(a.clientName)}</span>` : ''}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${a.user} · ${a.time}</div>
              </div>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

/* ============================================================
   PAGE: CONTRACT BUILDING
   ============================================================ */
// Default currency allocation: the mandate/portfolio currency (chosen in Step 1)
// gets 0–100%, every other listed currency defaults to 0–50%, and the "Other"
// catch-all row always defaults to 0–30% regardless of mandate currency.
function defaultCurrencyWeights(mandateCcy) {
  const keys = ['CHF','USD','EUR','AUD','GBP','JPY'];
  const base = keys.includes(mandateCcy) ? mandateCcy : 'CHF';
  const weights = { Other: { min: 0, max: 30 } };
  keys.forEach(k => { weights[k] = k === base ? { min: 0, max: 100 } : { min: 0, max: 50 }; });
  return weights;
}

/* ============================================================
   CONTRACT BUILDER — state
   ============================================================ */
const CB = {
  step: 1, lang: 'EN', currency: 'CHF',
  templates: [], selectedId: null, fields: [], result: null,
  contractTypeNew: true,
  uo: false,
  mandatsname: '',
  person2: { lastName: '', firstName: '', dob: '', nationality: '', address1: '', address2: '', city: '', country: '' },
  kundenberater: '', kundenberaterEmail: '',
  investmentProfile: 'balanced',
  allocations: {
    equities:    { min: 20, max: 70 },
    fixedIncome: { min: 20, max: 50 },
    cash:        { min:  5, max: 30 },
    other:       { min:  0, max: 15 },
  },
  includePreciousMetals: false,
  preciousMetals: { min: 0, max: 0 },
  hasPreciousMetalsRow: false,
  currencyWeights: defaultCurrencyWeights('CHF'),
  investmentComments: '',
  managementFee: '', performanceFee: '', performanceFeeFrequency: 'semiannual', vorabPct: '',
  clientType: 'individual', formularBookmark: false,
  hasOwnProductsChoice: false, ownProductsChoice: '',
  createClientAccount: true, requiredDocuments: [],
  // Set once a draft has been saved, so saving again updates it in place
  // rather than leaving a trail of near-identical drafts.
  draftId: null,
};

// Required-document checklist the RM can ask the client to upload, shown on the
// client's own portal under Required Documents. Backed by the DocumentRequirement
// catalog in the database (loaded via loadDocumentRequirements below) — this
// hardcoded object is only the fallback used if that fetch fails. Varies by
// the client's legal form; RMs can also add their own custom entries on top.
const ALWAYS_REQUIRED_DOCUMENTS = ['Power of Attorney (EAM)'];
let DOCUMENT_CHECKLIST_OPTIONS = {
  individual: [
    'Copy of Official Identification Document (Passport / ID / Driving Licence)',
    'Proof of Residential Address (max. 3 months old)',
    'Confirmation of Tax Compliance Status',
  ],
  domiciliary: [
    'Commercial Register Extract (Zefix, < 12 months)',
    'Memorandum & Articles of Association (Statutes/Bylaws)',
    'Certificate of Incorporation',
    'Certificate of Good Standing',
    'Certificate of Incumbency',
    'Board Resolution Confirming Signing Authority',
    'Copy of ID — Authorized Signatories',
    'Confirmation of Tax Compliance Status',
  ],
  company: [
    'Commercial Register Extract (Zefix, < 12 months)',
    'Memorandum & Articles of Association (Statutes/Bylaws)',
    'Certificate of Incorporation',
    'Certificate of Good Standing',
    'Certificate of Incumbency',
    'List of Beneficial Owners / UBO Register Extract',
    'Board Resolution Confirming Signing Authority',
    'Copy of ID — Authorized Signatories',
    'Confirmation of Tax Compliance Status',
  ],
  foundation: [
    'Certificate of Incorporation / Declaration of Foundation',
    'Foundation Act / Foundation Agreement (Statutes/Bylaws)',
    'Commercial Register Extract (if applicable)',
    'List of Authorised Signatures / Board Resolution',
    'Copy of ID — Authorized Signatories',
    'Copy of ID — Beneficial Owner(s)',
    'Confirmation of Tax Compliance Status',
  ],
  trust: [
    'Trust Deed / Declaration of Trust',
    'Letter of Wishes (if available)',
    'Deed of Retirement and Appointment of Trustee (DORA) — existing mandates',
    'Form A/K — Settlor Identification',
    'Form A/K — Trustee Identification',
    'Form A/K — Protector Identification (if appointed)',
    'Copy of ID — Settlor',
    'Copy of ID — Trustee',
    'Copy of ID — Protector (if appointed)',
    'Investment Manager Appointment Letter (if delegated)',
    'FATCA/CRS Classification Report',
    'Confirmation of Tax Compliance Status',
  ],
};

// Legal form of the contracting party — determines which VSB 20 beneficial-owner
// appendix (Formular A/K/S/T) applies. Only relevant for templates containing the
// FormularLetter bookmark (currently the DE All-In and DE Advisory contracts).
// Domiciliary Company and Foundation were previously bundled as one option under
// Formular S — they're separate legal forms with separate forms: a Domiciliary
// Company uses Formular A (same beneficial-owner identification as a natural
// person), an Operating Company uses Formular K, and Foundation keeps Formular S.
const CLIENT_LEGAL_FORMS = [
  { value: 'individual',  letter: 'A', label: 'Individual / Natural Person' },
  { value: 'domiciliary', letter: 'A', label: 'Domiciliary Company' },
  { value: 'company',     letter: 'K', label: 'Operating Company' },
  { value: 'foundation',  letter: 'S', label: 'Foundation' },
  { value: 'trust',       letter: 'T', label: 'Trust' },
];

// Real Kundenberater (RM) short codes, sourced from the firm's own portfolio export —
// these replace the earlier placeholder demo names. No portal accounts exist for these
// yet (that's a separate step); they're just the selectable identity on a contract.
const KUNDENBERATER = [
  { name: 'ACR', email: '' },
  { name: 'AGA', email: '' },
  { name: 'ASC', email: '' },
  { name: 'CWO', email: '' },
  { name: 'CZG', email: '' },
  { name: 'DSC', email: '' },
  { name: 'GDA', email: '' },
  { name: 'KMU', email: '' },
  { name: 'MHO', email: '' },
  { name: 'MLA', email: '' },
  { name: 'MSH', email: '' },
  { name: 'MTH', email: '' },
  { name: 'RGE', email: '' },
  { name: 'RMU', email: '' },
  { name: 'TGE', email: '' },
  { name: 'UEI', email: '' },
  { name: 'WME', email: '' },
];

const PROFILE_PRESETS = {
  balanced: { equities:{min:20,max:70}, fixedIncome:{min:20,max:50}, cash:{min:5,max:30},  other:{min:0,max:15} },
  growth:   { equities:{min:50,max:90}, fixedIncome:{min:0, max:35}, cash:{min:0,max:15},  other:{min:0,max:10} },
  open:     { equities:{min:0, max:0},  fixedIncome:{min:0, max:0},  cash:{min:0, max:0},  other:{min:0, max:0}  },
};

async function renderContractBuilding() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <h1>Contract Builder</h1>
      <p>Select a template, fill client details, and send a secure portal invitation</p>
    </div>
    <div id="cb-body"></div>
  `;
  CB.step = 1; CB.selectedId = null; CB.fields = []; CB.result = null;
  CB.contractTypeNew = true;
  CB.uo = false;
  CB.mandatsname = '';
  CB.person2 = { lastName: '', firstName: '', dob: '', nationality: '', address1: '', address2: '', city: '', country: '' };
  // RM-role users can only ever build contracts under their own Kundenberater
  // code — pre-filled and locked, not just defaulted, since the backend
  // enforces this identity regardless of what the client sends anyway.
  CB.kundenberater = State.currentRole === 'rm' ? currentRmName() : '';
  CB.kundenberaterEmail = '';
  CB.investmentProfile = 'balanced';
  const bp = PROFILE_PRESETS.balanced;
  CB.allocations = { equities:{...bp.equities}, fixedIncome:{...bp.fixedIncome}, cash:{...bp.cash}, other:{...bp.other} };
  CB.currencyWeights = defaultCurrencyWeights(CB.currency);
  CB.investmentComments = '';
  CB.managementFee = ''; CB.performanceFee = ''; CB.performanceFeeFrequency = 'semiannual'; CB.vorabPct = '';
  CB.clientType = 'individual'; CB.formularBookmark = false;
  CB.createClientAccount = true; CB.requiredDocuments = [...ALWAYS_REQUIRED_DOCUMENTS];
  CB.draftId = null;
  await cbRenderStep();
}

async function cbRenderStep() {
  if (CB.step === 1) await cbStep1();
  else if (CB.step === 2) await cbStep2();
  else cbStep3();
}

/* ── Step 1: Choose language + template ─────────────────────── */
async function cbStep1() {
  const el = document.getElementById('cb-body');
  el.innerHTML = `<div class="cb-loading">Loading templates…</div>`;

  try {
    const templates = await apiFetch('GET', '/contracts/templates');
    CB.templates = templates;
  } catch (_) {
    CB.templates = [
      { id:'de-all-in',      lang:'DE', name:'Vertragsset All-In',   type:'All-In'              },
      { id:'de-advisory',    lang:'DE', name:'Advisory Vertrag',      type:'Advisory'            },
      { id:'en-disc-all-in', lang:'EN', name:'Discretionary All-In',  type:'Discretionary All-In'},
      { id:'en-advisory',    lang:'EN', name:'Advisory Contract',      type:'Advisory'            },
      { id:'en-execution',   lang:'EN', name:'Execution Only',         type:'Execution Only'      },
    ];
  }

  try {
    const rows = await apiFetch('GET', '/document-requirements');
    if (rows.length) {
      const grouped = {};
      rows.forEach(r => { (grouped[r.clientType] = grouped[r.clientType] || []).push(r.name); });
      DOCUMENT_CHECKLIST_OPTIONS = grouped;
    }
  } catch (_) {
    // Falls back to the hardcoded DOCUMENT_CHECKLIST_OPTIONS defined above.
  }

  // Offer unfinished work before offering a new start.
  let drafts = [];
  try { drafts = await apiFetch('GET', '/contract-drafts'); } catch (_) { /* a listing failure must not block the builder */ }

  const filtered = CB.templates.filter(t => t.lang === CB.lang);
  el.innerHTML = `
    ${cbDraftsListHTML(drafts)}
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Step 1 of 3 — Select Contract Template</div>
          <div class="card-subtitle">Choose the language and contract type</div>
        </div>
        <div class="cb-lang-toggle">
          <button class="cb-lang-btn ${CB.lang==='EN'?'active':''}" onclick="cbSetLang('EN')">EN</button>
          <button class="cb-lang-btn ${CB.lang==='DE'?'active':''}" onclick="cbSetLang('DE')">DE</button>
        </div>
      </div>
      <div class="card-body">
        <div class="cb-template-grid" id="cb-template-grid">
          ${filtered.map(t => `
            <div class="cb-template-wrap">
              <button class="cb-template-card ${CB.selectedId===t.id?'selected':''}"
                      onclick="cbSelectTemplate('${t.id}')">
                <div class="cb-template-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <path d="M10 13l1.5 1.5L15 11"/>
                  </svg>
                </div>
                <div class="cb-template-name">${escapeHtml(t.name)}</div>
                <div class="cb-template-type">${escapeHtml(t.type)}</div>
              </button>
              <div style="display:flex;gap:6px;margin-top:4px;">
                <a class="cb-dl-btn" style="flex:1;" href="${API_BASE}/contracts/download/${t.id}"
                   download title="Download original template"
                   onclick="event.stopPropagation()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download
                </a>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border-subtle);">
          <div class="cb-section-label" style="margin-bottom:10px;">Relationship Manager (Kundenberater)</div>
          <select id="cb-rm-select" onchange="cbSetRM(this.value)" ${State.currentRole === 'rm' ? 'disabled' : ''}
                  style="width:100%;max-width:380px;padding:8px 10px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-primary);color:var(--text-primary);font-size:13px;${State.currentRole === 'rm' ? 'opacity:0.7;cursor:not-allowed;' : ''}">
            <option value="">— Select RM —</option>
            ${KUNDENBERATER.map(rm => `<option value="${escapeHtml(rm.name)}" ${CB.kundenberater===rm.name?'selected':''}>${escapeHtml(rm.name)}</option>`).join('')}
          </select>
          ${State.currentRole === 'rm' ? `<div style="margin-top:6px;font-size:12px;color:var(--text-muted);">Locked to your own Kundenberater code.</div>` : ''}
          ${CB.kundenberaterEmail ? `<div style="margin-top:6px;font-size:12px;color:var(--text-muted);">${CB.kundenberaterEmail}</div>` : ''}
        </div>
        <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border-subtle);">
          <div class="cb-section-label" style="margin-bottom:10px;">Portfolio Currency</div>
          <div class="cb-currency-selector">
            ${['CHF','EUR','USD','GBP','JPY','SGD'].map(c => `
              <button class="cb-currency-btn${CB.currency===c?' active':''}" onclick="cbSetCurrency('${c}')">${c}</button>
            `).join('')}
          </div>
        </div>
        <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border-subtle);">
          <div class="cb-section-label" style="margin-bottom:10px;">Contract Status</div>
          <div style="display:flex;gap:20px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
              <input type="radio" name="cb-contract-type" value="new" ${CB.contractTypeNew?'checked':''} onchange="CB.contractTypeNew=true">
              <span>☑ New Contract</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
              <input type="radio" name="cb-contract-type" value="replace" ${!CB.contractTypeNew?'checked':''} onchange="CB.contractTypeNew=false">
              <span>☐ Replaces existing Contract</span>
            </label>
          </div>
        </div>
        <div style="margin-top:24px;display:flex;justify-content:flex-end;">
          <button class="btn-primary" onclick="cbGoStep2()" ${CB.selectedId?'':'disabled'} id="cb-next-btn">
            Next: Fill Details
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function cbSetLang(lang) {
  CB.lang = lang;
  CB.selectedId = null;
  cbStep1();
}

function cbSelectTemplate(id) {
  CB.selectedId = id;
  document.querySelectorAll('.cb-template-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`.cb-template-card[onclick*="${id}"]`);
  if (card) card.classList.add('selected');
  const btn = document.getElementById('cb-next-btn');
  if (btn) btn.disabled = false;
}

async function cbGoStep2() {
  if (!CB.selectedId) return;
  CB.step = 2;
  CB.currencyWeights = defaultCurrencyWeights(CB.currency); // reflect the Step 1 currency choice
  await cbStep2();
}

/* ── Step 2: Fill fields ─────────────────────────────────────── */
async function cbStep2() {
  const el = document.getElementById('cb-body');
  const tpl = CB.templates.find(t => t.id === CB.selectedId);
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Step 2 of 3 — Client & Contract Details</div>
          <div class="card-subtitle">${tpl?.name || CB.selectedId}</div>
        </div>
        <button class="btn-secondary btn-sm" onclick="CB.step=1;cbRenderStep()">← Back</button>
      </div>
      <div class="card-body">
        <div id="cb-fields-area">
          <div class="cb-loading">Scanning template for fields…</div>
        </div>
      </div>
    </div>
  `;

  try {
    const data = await apiFetch('GET', `/contracts/placeholders/${CB.selectedId}`);
    CB.fields = data.fields || [];
    CB.formularBookmark = !!data.bookmarks?.includes('FormularLetter');
    // Not every template has a management fee, a performance-fee clause, or a
    // currency allocation table — Advisory has a management fee but no
    // performance-fee mechanism or currency table; Execution Only has none of
    // the three. Only show each piece when the template actually has somewhere
    // to put the value.
    CB.hasManagementFee = !!data.bookmarks?.includes('Fee');
    CB.hasPerfFee = !!data.bookmarks?.includes('PerfClauseAnnual');
    CB.hasCurrencyTable = !!data.bookmarks?.includes('CHF');
    CB.hasPreciousMetalsRow = !!data.bookmarks?.includes('Roh');
    CB.hasOwnProductsChoice = !!data.bookmarks?.includes('OwnProductsChoice');
    if (data.bookmarks?.length) {
      console.log(`[Contract Builder] Bookmarks in "${CB.selectedId}":`, data.bookmarks);
    }
  } catch (_) {
    CB.formularBookmark = false;
    CB.hasManagementFee = false;
    CB.hasPerfFee = false;
    CB.hasCurrencyTable = false;
    CB.hasPreciousMetalsRow = false;
    CB.hasOwnProductsChoice = false;
    CB.fields = [
      { key:'client_last_name',   label:'Last Name',                   type:'text',  required:true  },
      { key:'client_first_name',  label:'First Name',                  type:'text',  required:true  },
      { key:'client_email',       label:'Client Email Address',        type:'email', required:true  },
      { key:'client_dob',         label:'Date of Birth',               type:'date',  required:true  },
      { key:'client_address1',    label:'Street Address',              type:'text',  required:true  },
      { key:'client_address2',    label:'Address Line 2',              type:'text',  required:true  },
      { key:'client_city',        label:'City',                        type:'text',  required:true  },
      { key:'client_country',     label:'Country',                     type:'text',  required:true  },
      { key:'client_nationality', label:'Nationality',                 type:'text',  required:true  },
      { key:'contract_date',      label:'Contract Date',               type:'date',  required:true  },
      { key:'depot_bank',         label:'Custodian Bank',              type:'text',  required:true  },
      { key:'portfolio_number',   label:'Portfolio Number',            type:'text',  required:true  },
    ];
  }

  const stdKeys = ['client_last_name','client_first_name','client_email','client_dob',
                   'client_address1','client_address2','client_city','client_country',
                   'client_nationality','contract_date','depot_bank','portfolio_number'];
  const stdFields      = CB.fields.filter(f => stdKeys.includes(f.key));
  const checkboxFields = CB.fields.filter(f => f.type === 'checkbox');
  const extraFields    = CB.fields.filter(f => !stdKeys.includes(f.key) && f.type !== 'checkbox');

  try { document.getElementById('cb-fields-area').innerHTML = `
    <div class="cb-section-label">Client Information</div>
    <div class="cb-fields-grid">
      ${stdFields.map(f => cbFieldHTML(f)).join('')}
    </div>
    ${extraFields.length ? `
      <div class="cb-section-label" style="margin-top:24px;">Contract-Specific Fields</div>
      <div class="cb-fields-grid">
        ${extraFields.map(f => cbFieldHTML(f)).join('')}
      </div>
    ` : ''}

    <div style="margin-top:28px;">
      <div class="cb-section-label" style="margin-bottom:8px;">Mandatsname
        <span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:6px;">auto-filled from client name — editable</span>
      </div>
      <input type="text" id="cb_mandatsname" value="${CB.mandatsname}"
             style="width:100%;padding:9px 12px;border:1px solid var(--border-default);border-radius:var(--radius-md);
                    background:var(--bg-primary);color:var(--text-primary);font-size:13px;font-weight:600;"
             placeholder="e.g. Müller Max  or  Müller Max u/o Müller Anna"
             oninput="CB.mandatsname=this.value">
    </div>

    <div style="margin-top:20px;padding:14px 16px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-secondary);">
      <div class="cb-section-label" style="margin-bottom:8px;">Beneficial-Owner Declaration</div>
      <div class="cb-fields-grid">
        <div class="form-group" style="margin-bottom:0;">
          <label for="cb_client_type">Client Legal Form</label>
          <select id="cb_client_type" onchange="cbSetClientType(this.value)">
            ${CLIENT_LEGAL_FORMS.map(f => `<option value="${escapeHtml(f.value)}" ${CB.clientType===f.value?'selected':''}>${escapeHtml(f.label)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="margin-top:10px;font-size:12px;color:var(--text-muted);" id="cb_formular_status">
        ${cbFormularStatusHTML()}
      </div>
    </div>

    <div id="cb-uo-outer" style="display:${CB.clientType === 'individual' ? 'block' : 'none'};margin-top:20px;padding:14px 16px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-secondary);">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;font-weight:600;">
        <input type="checkbox" id="cb-uo-toggle" ${CB.uo?'checked':''} onchange="cbToggleUO(this.checked)"
               style="width:16px;height:16px;accent-color:var(--accent-blue);">
        Und/Oder Vertrag — Joint Account (2 Contracting Parties)
      </label>
      <div id="cb-person2-section" style="display:${CB.uo?'block':'none'};margin-top:16px;">
        <div class="cb-section-label" style="margin-bottom:12px;color:var(--accent-blue);">Second Account Holder</div>
        <div class="cb-fields-grid">
          <div class="form-group" style="margin-bottom:0;">
            <label for="cb_p2_last_name">Last Name <span style="color:var(--accent-red)">*</span></label>
            <input type="text" id="cb_p2_last_name" placeholder="Last Name" value="${CB.person2.lastName}"
                   oninput="cbUpdateMandatsname()">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="cb_p2_first_name">First Name <span style="color:var(--accent-red)">*</span></label>
            <input type="text" id="cb_p2_first_name" placeholder="First Name" value="${CB.person2.firstName}"
                   oninput="cbUpdateMandatsname()">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="cb_p2_dob">Date of Birth</label>
            <input type="date" id="cb_p2_dob" value="${CB.person2.dob}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="cb_p2_nationality">Nationality</label>
            <input type="text" id="cb_p2_nationality" placeholder="Nationality" value="${CB.person2.nationality}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="cb_p2_address1">Street Address</label>
            <input type="text" id="cb_p2_address1" placeholder="Street Address" value="${CB.person2.address1}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="cb_p2_address2">Address Line 2</label>
            <input type="text" id="cb_p2_address2" placeholder="Address Line 2 (optional)" value="${CB.person2.address2}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="cb_p2_city">City</label>
            <input type="text" id="cb_p2_city" placeholder="City" value="${CB.person2.city}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="cb_p2_country">Country</label>
            <input type="text" id="cb_p2_country" placeholder="Country" value="${CB.person2.country}">
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top:20px;padding:14px 16px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-secondary);">
      <div class="cb-section-label" style="margin-bottom:8px;">Required Documents <span style="font-size:11px;font-weight:400;color:var(--text-muted);">(optional)</span></div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">Select any supporting documents the client must upload — these appear on their portal under Required Documents.</div>
      <div id="cb-required-docs-checklist">${cbRequiredDocsChecklistHTML()}</div>
      <div style="display:flex;gap:8px;margin-top:12px;max-width:420px;">
        <input type="text" id="cb-custom-doc-input" placeholder="Add another required document…"
               style="flex:1;padding:8px 10px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-primary);color:var(--text-primary);font-size:13px;"
               onkeydown="if(event.key==='Enter'){event.preventDefault();cbAddCustomDocument();}">
        <button class="btn-secondary btn-sm" onclick="cbAddCustomDocument()">Add</button>
      </div>
    </div>

    <div style="margin-top:20px;padding:14px 16px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-secondary);">
      <div class="cb-section-label" style="margin-bottom:8px;">Client Portal Account</div>
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;">
        <input type="checkbox" id="cb-create-account-toggle" ${CB.createClientAccount?'checked':''}
               onchange="cbSetCreateAccount(this.checked)">
        Create a portal login for this client once approved
      </label>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px;margin-left:26px;">
        If a portal account already exists for this client's email, this contract is simply added to it — no duplicate account is created.
        Leave unchecked to process the case without giving the client self-service portal access.
      </div>
    </div>

    <div class="cb-section-label" style="margin-top:28px;">Investment Profile</div>
    <div class="cb-profile-grid">
      <button class="cb-profile-btn${CB.investmentProfile==='balanced'?' active':''}" onclick="cbSetProfile('balanced')">
        <div class="cb-profile-name">Balanced</div>
        <div class="cb-profile-hint">60% Equities · 30% Fixed Income · 10% Cash</div>
      </button>
      <button class="cb-profile-btn${CB.investmentProfile==='growth'?' active':''}" onclick="cbSetProfile('growth')">
        <div class="cb-profile-name">Growth</div>
        <div class="cb-profile-hint">80% Equities · 15% Fixed Income · 5% Cash</div>
      </button>
      <button class="cb-profile-btn${CB.investmentProfile==='open'?' active':''}" onclick="cbSetProfile('open')">
        <div class="cb-profile-name">Open / Custom</div>
        <div class="cb-profile-hint">Define allocations manually</div>
      </button>
    </div>
    <div class="cb-alloc-wrap" style="margin-top:12px;">
      <table class="cb-alloc-table">
        <thead>
          <tr>
            <th>Asset Class</th>
            <th style="text-align:right;">Min %</th>
            <th style="text-align:right;">Max %</th>
          </tr>
        </thead>
        <tbody>
          ${[
            ['cash',        'alloc_cash',        'Cash & Liquidity',     CB.allocations.cash],
            ['fixedIncome', 'alloc_fixedincome', 'Fixed Income / Bonds', CB.allocations.fixedIncome],
            ['equities',    'alloc_equities',    'Equities',             CB.allocations.equities],
            ['other',       'alloc_other',       'Other / Alternatives', CB.allocations.other],
          ].map(([_key, id, lbl, vals]) => `
            <tr>
              <td style="font-size:13px;">${lbl}</td>
              <td><div class="cb-alloc-input-wrap">
                <input type="number" id="${id}_min" value="${vals.min}" min="0" max="100" step="1" oninput="cbUpdateAllocTotal()">
                <span class="cb-pct-label">%</span>
              </div></td>
              <td><div class="cb-alloc-input-wrap">
                <input type="number" id="${id}_max" value="${vals.max}" min="0" max="100" step="1" oninput="cbUpdateAllocTotal()">
                <span class="cb-pct-label">%</span>
              </div></td>
            </tr>
          `).join('')}
          ${CB.hasPreciousMetalsRow && CB.includePreciousMetals ? `
            <tr id="alloc-metals-row">
              <td style="font-size:13px;">Edelmetalle &amp; Rohstoffe</td>
              <td><div class="cb-alloc-input-wrap">
                <input type="number" id="alloc_metals_min" value="${CB.preciousMetals.min}" min="0" max="100" step="1" oninput="cbUpdateAllocTotal()">
                <span class="cb-pct-label">%</span>
              </div></td>
              <td><div class="cb-alloc-input-wrap">
                <input type="number" id="alloc_metals_max" value="${CB.preciousMetals.max}" min="0" max="100" step="1" oninput="cbUpdateAllocTotal()">
                <span class="cb-pct-label">%</span>
              </div></td>
            </tr>
          ` : ''}
          <tr class="cb-alloc-total" id="alloc-total-row">
            <td style="font-size:13px;font-weight:700;">Total</td>
            <td style="text-align:right;"><strong id="alloc-total-min">${CB.allocations.equities.min+CB.allocations.fixedIncome.min+CB.allocations.cash.min+CB.allocations.other.min+(CB.includePreciousMetals?CB.preciousMetals.min:0)}%</strong></td>
            <td style="text-align:right;"><strong id="alloc-total-max">${CB.allocations.equities.max+CB.allocations.fixedIncome.max+CB.allocations.cash.max+CB.allocations.other.max+(CB.includePreciousMetals?CB.preciousMetals.max:0)}%</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    ${CB.hasPreciousMetalsRow ? `
      <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:var(--text-secondary);cursor:pointer;">
        <input type="checkbox" ${CB.includePreciousMetals?'checked':''} onchange="cbTogglePreciousMetals(this.checked)">
        Include Edelmetalle &amp; Rohstoffe as a separate allocation category
      </label>
    ` : ''}

    ${CB.hasManagementFee ? `
      <div class="cb-section-label" style="margin-top:28px;">Fee Structure</div>
      <div class="cb-fields-grid" style="margin-top:12px;max-width:500px;">
        <div class="form-group" style="margin-bottom:0;">
          <label for="cb_management_fee">Annual Management Fee <span style="color:var(--accent-red)">*</span> <span style="font-size:11px;color:var(--text-muted);font-weight:400;">% p.a.</span></label>
          <input type="number" id="cb_management_fee" step="0.01" min="0" max="100" required
                 placeholder="e.g. 1.00" value="${CB.managementFee||''}">
        </div>
        ${CB.hasPerfFee ? `
          <div class="form-group" style="margin-bottom:0;">
            <label for="cb_performance_fee">Performance Fee <span style="font-size:11px;color:var(--text-muted);font-weight:400;">% (optional — leave blank if none applies)</span></label>
            <input type="number" id="cb_performance_fee" step="0.01" min="0" max="100"
                   placeholder="e.g. 10.00" value="${CB.performanceFee||''}" oninput="cbTogglePerfFreq()">
          </div>
          <div class="form-group" id="cb_perf_freq_wrap" style="margin-bottom:0;display:${CB.performanceFee ? 'block' : 'none'};">
            <label for="cb_performance_fee_frequency">Performance Fee Settlement</label>
            <select id="cb_performance_fee_frequency" onchange="cbTogglePerfFreq()">
              <option value="annual"     ${CB.performanceFeeFrequency !== 'semiannual' ? 'selected' : ''}>Jährlich</option>
              <option value="semiannual" ${CB.performanceFeeFrequency === 'semiannual' ? 'selected' : ''}>Halbjährlich</option>
            </select>
          </div>
          <div class="form-group" id="cb_vorab_wrap" style="margin-bottom:0;display:${CB.performanceFee ? 'block' : 'none'};">
            <label for="cb_vorab_pct">Hurdle Rate % <span style="font-size:11px;color:var(--text-muted);font-weight:400;">(optional — leave blank to omit the hurdle-rate sentence)</span></label>
            <input type="number" id="cb_vorab_pct" step="0.01" min="0" max="100"
                   placeholder="e.g. 5.00" value="${CB.vorabPct||''}">
          </div>
        ` : ''}
      </div>
    ` : ''}

    <div style="margin-top:20px;">
      <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Further Comments / Investment Instructions <span style="font-size:11px;color:var(--text-muted);font-weight:400;">(optional)</span></label>
      <textarea id="cb_investment_comments" class="cb-comments-input" rows="3"
                placeholder="Additional instructions, restrictions, or specific remarks…">${CB.investmentComments}</textarea>
    </div>

    ${CB.hasOwnProductsChoice ? `
      <div class="cb-section-label" style="margin-top:28px;">Einsatz eigener Produkte <span style="color:var(--accent-red)">*</span></div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
        ${[
          ['yes',       'Eigene Produkte Ja — bis zu 100% des Portfolios in eigene Produkte (Fonds/Zertifikate), Vermögensverwaltungsgebühr fällt an'],
          ['yes_no_dd', 'Eigene Produkte Ja (ohne Double Dipping) — keine Vermögensverwaltungsgebühr auf diese Vermögenswerte'],
          ['no',        'Eigene Produkte Nein — keine Anlagen in eigene Produkte'],
        ].map(([val, lbl]) => `
          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:13px;">
            <input type="radio" name="cb_own_products_choice" value="${val}" style="margin-top:2px;"
                   ${CB.ownProductsChoice===val?'checked':''} onchange="CB.ownProductsChoice='${val}'">
            <span>${lbl}</span>
          </label>
        `).join('')}
      </div>
    ` : ''}

    ${CB.hasCurrencyTable ? `
      <div class="cb-section-label" style="margin-top:28px;">Currency Allocation</div>
      <div class="cb-alloc-wrap" style="margin-top:12px;">
        <table class="cb-alloc-table">
          <thead>
            <tr>
              <th>Currency</th>
              <th style="text-align:right;">Min %</th>
              <th style="text-align:right;">Max %</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['ccy_CHF', 'CHF — Swiss Franc',      CB.currencyWeights.CHF || {min:0,max:0}],
              ['ccy_USD', 'USD — US Dollar',         CB.currencyWeights.USD || {min:0,max:0}],
              ['ccy_EUR', 'EUR — Euro',              CB.currencyWeights.EUR || {min:0,max:0}],
              ['ccy_AUD', 'AUD — Australian Dollar', CB.currencyWeights.AUD || {min:0,max:0}],
              ['ccy_GBP', 'GBP — Pound Sterling',    CB.currencyWeights.GBP || {min:0,max:0}],
              ['ccy_JPY', 'JPY — Japanese Yen',      CB.currencyWeights.JPY || {min:0,max:0}],
              ['ccy_Other', 'Other',                 CB.currencyWeights.Other || {min:0,max:30}],
            ].map(([id, lbl, vals]) => `
              <tr>
                <td style="font-size:13px;">${lbl}</td>
                <td><div class="cb-alloc-input-wrap">
                  <input type="number" id="${id}_min" value="${vals.min}" min="0" max="100" step="1" oninput="cbUpdateCcyTotal()">
                  <span class="cb-pct-label">%</span>
                </div></td>
                <td><div class="cb-alloc-input-wrap">
                  <input type="number" id="${id}_max" value="${vals.max}" min="0" max="100" step="1" oninput="cbUpdateCcyTotal()">
                  <span class="cb-pct-label">%</span>
                </div></td>
              </tr>
            `).join('')}
            <tr class="cb-alloc-total" id="ccy-total-row">
              <td style="font-size:13px;font-weight:700;">Total</td>
              <td style="text-align:right;"><strong id="ccy-total-min">${['CHF','USD','EUR','AUD','GBP','JPY','Other'].reduce((a,k)=>a+(CB.currencyWeights[k]?.min||0),0)}%</strong></td>
              <td style="text-align:right;"><strong id="ccy-total-max">${['CHF','USD','EUR','AUD','GBP','JPY','Other'].reduce((a,k)=>a+(CB.currencyWeights[k]?.max||0),0)}%</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    ` : ''}

    <div style="margin-top:28px;display:flex;justify-content:flex-end;align-items:center;gap:12px;flex-wrap:wrap;">
      <button class="btn-secondary" style="display:inline-flex;align-items:center;gap:7px;" onclick="cbDownloadFilled()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download Filled
      </button>
      <button class="btn-secondary" onclick="cbSaveDraft()" title="Keep this contract to finish later">
        Save Draft
      </button>
      <button class="btn-primary" onclick="cbSubmit()">
        Send Contract & Invite Client
      </button>
    </div>
  `; } catch(e) {
    console.error('cbStep2 render error:', e);
    document.getElementById('cb-fields-area').innerHTML =
      `<p style="color:red;padding:16px;font-family:monospace;">Render error: ${e.message}</p>`;
  }
}

// Turning the portal account on or off changes whether the email is required,
// so the field has to be redrawn — otherwise the asterisk and the browser's own
// `required` attribute keep saying whatever they said when the step was opened.
// Whatever has already been typed is carried across the redraw.
async function cbSetCreateAccount(checked) {
  CB.createClientAccount = checked;
  const entered = cbCollectAllValues();
  await cbStep2();
  Object.entries(entered).forEach(([key, value]) => {
    const el = document.getElementById(`cb_${key}`);
    if (el && value && !el.value) el.value = value;
  });
}

function cbFieldHTML(f) {
  if (f.type === 'checkbox') {
    return `
      <label class="cb-checkbox-label">
        <input type="checkbox" id="cb_${f.key}" name="${f.key}">
        <span>${escapeHtml(f.label)}</span>
      </label>
    `;
  }
  const nameKeys = ['client_last_name', 'client_first_name'];
  const extraAttrs = nameKeys.includes(f.key) ? ' oninput="cbUpdateMandatsname()"' : '';
  // client_email is only truly needed to create the client's portal login — if
  // that's been switched off (Client Portal Account, step 2), don't force it here.
  const required = f.key === 'client_email' ? (f.required && CB.createClientAccount) : f.required;
  return `
    <div class="form-group" style="margin-bottom:0;">
      <label for="cb_${f.key}">${escapeHtml(f.label)}${required?' <span style="color:var(--accent-red)">*</span>':''}</label>
      <input type="${f.type||'text'}" id="cb_${f.key}" name="${f.key}"
             placeholder="${f.type==='date'?'YYYY-MM-DD':f.label}"
             ${required?'required':''}${extraAttrs} />
    </div>
  `;
}

function cbUpdateMandatsname() {
  const fn1 = document.getElementById('cb_client_first_name')?.value?.trim() || '';
  const ln1 = document.getElementById('cb_client_last_name')?.value?.trim() || '';
  const full1 = [fn1, ln1].filter(Boolean).join(' ');
  let computed = full1;
  if (CB.uo) {
    const fn2 = document.getElementById('cb_p2_first_name')?.value?.trim() || '';
    const ln2 = document.getElementById('cb_p2_last_name')?.value?.trim() || '';
    const full2 = [fn2, ln2].filter(Boolean).join(' ');
    if (full2) computed = `${full1} u/o ${full2}`;
  }
  const el = document.getElementById('cb_mandatsname');
  if (el) el.value = computed;
  CB.mandatsname = computed;
}

function cbSetRM(name) {
  const rm = KUNDENBERATER.find(r => r.name === name);
  CB.kundenberater = name;
  CB.kundenberaterEmail = rm ? rm.email : '';
  const hint = document.querySelector('#cb-rm-select + div');
  if (hint) hint.textContent = CB.kundenberaterEmail || '';
}

// Renders just the checklist portion (standard options + any custom additions),
// so it can be refreshed in place without losing whatever the RM has already
// typed elsewhere on Step 2.
function cbRequiredDocsChecklistHTML() {
  const options = cbChecklistOptions();
  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${options.map(label => {
        // Always-required documents (the EAM power of attorney) are ticked and
        // locked: they authorise the manager to act, so a contract is never
        // sent without them.
        const alwaysOn = ALWAYS_REQUIRED_DOCUMENTS.includes(label);
        return `
        <label style="display:flex;align-items:center;gap:10px;cursor:${alwaysOn ? 'default' : 'pointer'};font-size:13px;">
          <input type="checkbox" ${alwaysOn || CB.requiredDocuments.includes(label) ? 'checked' : ''} ${alwaysOn ? 'disabled' : ''} onchange="cbToggleRequiredDoc('${label.replace(/'/g,"\\'")}', this.checked)">
          ${label}${alwaysOn ? ' <span style="font-size:11px;color:var(--text-muted);">(always required)</span>' : ''}
        </label>
      `;}).join('')}
      ${CB.requiredDocuments.filter(d => !options.includes(d) && !ALWAYS_REQUIRED_DOCUMENTS.includes(d)).map(label => `
        <label style="display:flex;align-items:center;gap:10px;font-size:13px;">
          <input type="checkbox" checked onchange="cbToggleRequiredDoc('${label.replace(/'/g,"\\'")}', this.checked)">
          ${label} <span style="font-size:11px;color:var(--text-muted);">(custom)</span>
        </label>
      `).join('')}
    </div>
  `;
}

// The catalog for the selected legal form, with the always-required documents
// guaranteed present even if the seeded catalog predates them.
function cbChecklistOptions() {
  const options = DOCUMENT_CHECKLIST_OPTIONS[CB.clientType] || [];
  const missing = ALWAYS_REQUIRED_DOCUMENTS.filter(d => !options.includes(d));
  return [...options, ...missing];
}

// Keeps the always-required documents in CB.requiredDocuments regardless of
// how the RM got here (legal-form switch, step navigation, custom additions).
function cbEnsureAlwaysRequiredDocs() {
  ALWAYS_REQUIRED_DOCUMENTS.forEach(d => {
    if (!CB.requiredDocuments.includes(d)) CB.requiredDocuments.push(d);
  });
}

function cbRefreshRequiredDocsChecklist() {
  cbEnsureAlwaysRequiredDocs();
  const el = document.getElementById('cb-required-docs-checklist');
  if (el) el.innerHTML = cbRequiredDocsChecklistHTML();
}

function cbToggleRequiredDoc(label, checked) {
  // An always-required document cannot be unticked.
  if (ALWAYS_REQUIRED_DOCUMENTS.includes(label)) { cbEnsureAlwaysRequiredDocs(); return; }
  const options = cbChecklistOptions();
  if (checked) {
    if (!CB.requiredDocuments.includes(label)) CB.requiredDocuments.push(label);
  } else {
    CB.requiredDocuments = CB.requiredDocuments.filter(d => d !== label);
    if (!options.includes(label)) cbRefreshRequiredDocsChecklist(); // drop the now-unchecked custom row
  }
}

function cbAddCustomDocument() {
  const input = document.getElementById('cb-custom-doc-input');
  const label = (input?.value || '').trim();
  if (!label) return;
  if (!CB.requiredDocuments.includes(label)) CB.requiredDocuments.push(label);
  input.value = '';
  cbRefreshRequiredDocsChecklist();
}

function cbToggleUO(checked) {
  CB.uo = checked;
  const sec = document.getElementById('cb-person2-section');
  if (sec) sec.style.display = checked ? 'block' : 'none';
  cbUpdateMandatsname();
}

function cbSetCurrency(c) {
  CB.currency = c;
  document.querySelectorAll('.cb-currency-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`.cb-currency-btn`).forEach(b => {
    if (b.textContent.trim() === c) b.classList.add('active');
  });
}

function cbSetProfile(profile) {
  CB.investmentProfile = profile;
  document.querySelectorAll('.cb-profile-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cb-profile-btn').forEach(b => {
    if (b.querySelector('.cb-profile-name')?.textContent.toLowerCase().startsWith(profile)) b.classList.add('active');
  });
  const preset = PROFILE_PRESETS[profile];
  if (preset) {
    const s = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    s('alloc_equities_min',    preset.equities.min);    s('alloc_equities_max',    preset.equities.max);
    s('alloc_fixedincome_min', preset.fixedIncome.min); s('alloc_fixedincome_max', preset.fixedIncome.max);
    s('alloc_cash_min',        preset.cash.min);        s('alloc_cash_max',        preset.cash.max);
    s('alloc_other_min',       preset.other.min);       s('alloc_other_max',       preset.other.max);
    cbUpdateAllocTotal();
  }
}

function cbTogglePerfFreq() {
  const hasFee = !!document.getElementById('cb_performance_fee')?.value?.trim();
  const wrap = document.getElementById('cb_perf_freq_wrap');
  if (wrap) wrap.style.display = hasFee ? 'block' : 'none';

  const vorabWrap = document.getElementById('cb_vorab_wrap');
  if (vorabWrap) vorabWrap.style.display = hasFee ? 'block' : 'none';
}

// Honest status message for the Beneficial-Owner Declaration section: the letter
// swap only actually takes effect on templates containing the FormularLetter
// bookmark (currently DE All-In and DE Advisory) — CB.formularBookmark reflects
// whether the currently selected template is one of those.
function cbFormularStatusHTML() {
  const letter = CLIENT_LEGAL_FORMS.find(f => f.value === CB.clientType)?.letter || 'A';
  if (!CB.formularBookmark) {
    return `<span style="color:var(--accent-amber);">⚠ The selected template has no beneficial-owner declaration section — this selection won't change the generated contract.</span>`;
  }
  return `Contract will reference Formular <strong>${letter}</strong> for the VSB 20 beneficial-owner declaration.
    <a href="#" onclick="cbDownloadAppendix();return false;" style="margin-left:8px;">Download</a>`;
}

function cbSetClientType(val) {
  if (val !== CB.clientType) {
    // Required Documents is a different checklist per legal form — carrying
    // selections over from the previous category made no sense (and could show
    // an item as "selected" in the new category just because it happens to
    // share the same label, e.g. "Confirmation of Tax Compliance Status").
    CB.requiredDocuments = [];
  }
  CB.clientType = val;
  const status = document.getElementById('cb_formular_status');
  if (status) status.innerHTML = cbFormularStatusHTML();

  const uoOuter = document.getElementById('cb-uo-outer');
  if (uoOuter) uoOuter.style.display = val === 'individual' ? 'block' : 'none';
  if (val !== 'individual' && CB.uo) {
    CB.uo = false;
    const toggle = document.getElementById('cb-uo-toggle');
    if (toggle) toggle.checked = false;
    const p2 = document.getElementById('cb-person2-section');
    if (p2) p2.style.display = 'none';
  }
  cbRefreshRequiredDocsChecklist();
}

async function cbDownloadAppendix() {
  try {
        const response = await fetch(`${API_BASE}/contracts/appendix/download/${CB.clientType}/${CB.lang}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(err.error || 'Download failed');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const letter = CLIENT_LEGAL_FORMS.find(f => f.value === CB.clientType)?.letter || 'A';
    a.href = url;
    a.download = `Formular ${letter} (${CB.lang}).docx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast('error', err.message || 'Download failed');
  }
}

function cbTogglePreciousMetals(checked) {
  CB.includePreciousMetals = checked;
  cbUpdateAllocTotal();
  const area = document.getElementById('cb-fields-area');
  if (area) cbStep2();
}

function cbUpdateAllocTotal() {
  const ids = ['equities','fixedincome','cash','other'];
  const mins = ids.map(id => parseFloat(document.getElementById(`alloc_${id}_min`)?.value) || 0);
  const maxs = ids.map(id => parseFloat(document.getElementById(`alloc_${id}_max`)?.value) || 0);
  CB.allocations = {
    equities:    { min: mins[0], max: maxs[0] },
    fixedIncome: { min: mins[1], max: maxs[1] },
    cash:        { min: mins[2], max: maxs[2] },
    other:       { min: mins[3], max: maxs[3] },
  };
  const metalsMin = CB.includePreciousMetals ? (parseFloat(document.getElementById('alloc_metals_min')?.value) || 0) : 0;
  const metalsMax = CB.includePreciousMetals ? (parseFloat(document.getElementById('alloc_metals_max')?.value) || 0) : 0;
  if (CB.includePreciousMetals) CB.preciousMetals = { min: metalsMin, max: metalsMax };
  const totalMin = mins.reduce((a,b)=>a+b,0) + metalsMin;
  const totalMax = maxs.reduce((a,b)=>a+b,0) + metalsMax;
  const minEl = document.getElementById('alloc-total-min');
  const maxEl = document.getElementById('alloc-total-max');
  if (minEl) minEl.textContent = totalMin + '%';
  if (maxEl) {
    maxEl.textContent = totalMax + '%';
    maxEl.closest('tr')?.classList.toggle('cb-alloc-over', Math.round(totalMax) !== 100);
  }
}

function cbUpdateCcyTotal() {
  const ids  = ['ccy_CHF','ccy_USD','ccy_EUR','ccy_AUD','ccy_GBP','ccy_JPY','ccy_Other'];
  const keys = ['CHF','USD','EUR','AUD','GBP','JPY','Other'];
  const mins = ids.map(id => parseFloat(document.getElementById(`${id}_min`)?.value) || 0);
  const maxs = ids.map(id => parseFloat(document.getElementById(`${id}_max`)?.value) || 0);
  const totalMin = mins.reduce((a,b)=>a+b,0);
  const totalMax = maxs.reduce((a,b)=>a+b,0);
  CB.currencyWeights = {};
  keys.forEach((k,i) => { CB.currencyWeights[k] = { min: mins[i], max: maxs[i] }; });
  const minEl = document.getElementById('ccy-total-min');
  const maxEl = document.getElementById('ccy-total-max');
  if (minEl) minEl.textContent = totalMin + '%';
  if (maxEl) {
    maxEl.textContent = totalMax + '%';
    maxEl.closest('tr')?.classList.toggle('cb-alloc-over', Math.round(totalMax) !== 100);
  }
}

// Validates required fields + client email, returning collected field values or
// null (after showing a toast) if invalid. Shared by the direct-invite and
// submit-for-review paths.
function cbValidateBeforeSubmit() {
  // The email is only needed when a portal account is being created — that is
  // the only thing it is used for at this stage. Preparing a contract without
  // one is a normal case, and requiring an address there forces people to
  // invent one.
  const emailNeeded = CB.createClientAccount !== false;
  const missingRequired = CB.fields
    .filter(f => f.required && f.type !== 'checkbox')
    .filter(f => !(f.key === 'client_email' && !emailNeeded))
    .filter(f => { const el = document.getElementById(`cb_${f.key}`); return !el?.value?.trim(); })
    .map(f => f.label);

  if (missingRequired.length) {
    showToast('warning', `Please fill in: ${missingRequired.join(', ')}`);
    return null;
  }

  if (CB.hasManagementFee && !document.getElementById('cb_management_fee')?.value?.trim()) {
    showToast('warning', 'Please fill in: Annual Management Fee');
    return null;
  }

  if (CB.hasOwnProductsChoice && !CB.ownProductsChoice) {
    showToast('warning', 'Please select an option under "Einsatz eigener Produkte".');
    return null;
  }

  const fieldValues = cbCollectAllValues();
  const clientName  = [fieldValues['client_first_name'], fieldValues['client_last_name']].filter(Boolean).join(' ');
  const clientEmail = fieldValues['client_email'] || '';

  // An address that was given still has to be a real one, whether or not an
  // account is being created — a typo here would send the invitation nowhere.
  if ((emailNeeded || clientEmail.trim()) && !clientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    showToast('warning', emailNeeded
      ? 'Please enter a valid client email address — it is needed to create the portal account.'
      : 'That email address does not look valid. Correct it, or leave it empty.');
    return null;
  }

  return { fieldValues, clientName, clientEmail };
}

// Creates the client's KYC task. Persisted on the backend so it's visible across
// sessions, like Contract Reviews. No delegation choice anymore — the Kundenberater
// (RM), the client, and Compliance can all see and complete the same task.
async function cbCreateKycTask(rmName, clientName, clientEmail, clientId) {
  try {
    // The backend resolves identity and the canonical field schema from this
    // clientId. No browser-owned template snapshot is stored on the task.
    await apiFetch('POST', '/kyc-tasks', { rmName, clientId });
  } catch (err) {
    showToast('error', `Failed to create KYC task: ${err.message}`);
  }
}

/* ── Drafts ──────────────────────────────────────────────────
   A contract half-filled is easy to lose: the builder is a long form, and
   before this the only way out of it was to finish or to abandon. Drafts live
   in the database rather than the browser, so one started on the hosted app
   can be finished from a local copy, or picked up on another machine.
   ─────────────────────────────────────────────────────────── */

// Everything needed to put the builder back exactly as it was. The typed
// values are read from the DOM here rather than from CB, because that is where
// they actually live until the contract is submitted.
function cbDraftState() {
  const values = {};
  (CB.fields || []).forEach((f) => {
    const el = document.getElementById(`cb_${f.key}`);
    if (el) values[f.key] = f.type === 'checkbox' ? (el.checked ? 'true' : 'false') : el.value;
  });
  return {
    values,
    lang: CB.lang,
    currency: CB.currency,
    selectedId: CB.selectedId,
    contractTypeNew: CB.contractTypeNew,
    uo: CB.uo,
    mandatsname: CB.mandatsname,
    person2: CB.person2,
    kundenberater: CB.kundenberater,
    kundenberaterEmail: CB.kundenberaterEmail,
    investmentProfile: CB.investmentProfile,
    allocations: CB.allocations,
    includePreciousMetals: CB.includePreciousMetals,
    preciousMetals: CB.preciousMetals,
    currencyWeights: CB.currencyWeights,
    investmentComments: CB.investmentComments,
    managementFee: CB.managementFee,
    performanceFee: CB.performanceFee,
    performanceFeeFrequency: CB.performanceFeeFrequency,
    vorabPct: CB.vorabPct,
    clientType: CB.clientType,
    ownProductsChoice: CB.ownProductsChoice,
    createClientAccount: CB.createClientAccount,
    requiredDocuments: CB.requiredDocuments,
  };
}

async function cbSaveDraft() {
  if (!CB.selectedId) { showToast('error', 'Choose a template first.'); return; }

  const state = cbDraftState();
  // Name it after whoever the contract is for, as far as that has been typed.
  // "Untitled draft" three times over helps nobody find the right one.
  const typedName = [state.values.client_first_name, state.values.client_last_name]
    .filter(Boolean).join(' ').trim();
  const tpl = CB.templates.find((t) => t.id === CB.selectedId);
  const name = typedName || CB.mandatsname || `${tpl?.name || CB.selectedId} (no name yet)`;

  const btn = document.querySelector('#cb-body button[onclick="cbSaveDraft()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const res = await apiFetch('POST', '/contract-drafts', {
      draftId: CB.draftId || undefined,   // same sitting updates in place
      name,
      templateId: CB.selectedId,
      templateName: tpl?.name || CB.selectedId,
      state,
    });
    CB.draftId = res.draftId;
    showToast('success', `Draft saved as “${name}”. Pick it up from step 1 whenever you like.`);
  } catch (err) {
    showToast('error', err.message || 'Could not save the draft.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Draft'; }
  }
}

// Shown at the top of step 1, so a half-finished contract is the first thing
// offered rather than something to remember.
function cbDraftsListHTML(drafts) {
  if (!drafts.length) return '';
  const when = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} h ago`;
    return new Date(d).toLocaleDateString();
  };
  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div>
          <div class="card-title">Continue a draft (${drafts.length})</div>
          <div class="card-subtitle">Contracts you started and have not sent yet</div>
        </div>
      </div>
      <div class="card-body" style="padding-top:4px;">
        ${drafts.map((d) => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--border-subtle);">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;">${escapeHtml(d.name)}</div>
              <div style="font-size:11px;color:var(--text-muted);">
                ${escapeHtml(d.templateName || d.templateId || 'No template')} · saved ${escapeHtml(when(d.updatedAt))}${d.ownerName ? ` · ${escapeHtml(d.ownerName)}` : ''}
              </div>
            </div>
            <button class="btn-primary btn-xs" onclick="cbResumeDraft('${escapeHtml(d.draftId)}')">Resume</button>
            <button class="btn-secondary btn-xs" onclick="cbDeleteDraft('${escapeHtml(d.draftId)}','${escapeHtml(d.name)}')">Delete</button>
          </div>
        `).join('')}
      </div>
    </div>`;
}

async function cbResumeDraft(draftId) {
  try {
    const draft = await apiFetch('GET', `/contract-drafts/${encodeURIComponent(draftId)}`);
    const s = draft.state || {};

    // Put the builder back as it was, then let step 2 fetch the template's
    // fields and fill them from the saved values.
    Object.assign(CB, {
      draftId: draft.draftId,
      lang: s.lang || CB.lang,
      currency: s.currency || CB.currency,
      selectedId: s.selectedId || draft.templateId,
      contractTypeNew: s.contractTypeNew !== false,
      uo: Boolean(s.uo),
      mandatsname: s.mandatsname || '',
      person2: s.person2 || CB.person2,
      kundenberater: s.kundenberater || CB.kundenberater,
      kundenberaterEmail: s.kundenberaterEmail || '',
      investmentProfile: s.investmentProfile || CB.investmentProfile,
      allocations: s.allocations || CB.allocations,
      includePreciousMetals: Boolean(s.includePreciousMetals),
      preciousMetals: s.preciousMetals || CB.preciousMetals,
      currencyWeights: s.currencyWeights || CB.currencyWeights,
      investmentComments: s.investmentComments || '',
      managementFee: s.managementFee || '',
      performanceFee: s.performanceFee || '',
      performanceFeeFrequency: s.performanceFeeFrequency || 'semiannual',
      vorabPct: s.vorabPct || '',
      clientType: s.clientType || 'individual',
      ownProductsChoice: s.ownProductsChoice || '',
      createClientAccount: s.createClientAccount !== false,
      requiredDocuments: s.requiredDocuments || [...ALWAYS_REQUIRED_DOCUMENTS],
      // Held until step 2 has rendered its inputs; there is nothing to fill in
      // before that.
      _pendingDraftValues: s.values || {},
    });

    CB.step = 2;
    await cbStep2();
    cbApplyDraftValues();
    showToast('success', 'Draft restored — carry on where you left off.');
  } catch (err) {
    showToast('error', err.message || 'Could not open that draft.');
  }
}

// Runs after step 2 has built its inputs. Anything the current template no
// longer has a field for is simply skipped: a draft saved against an older
// version of a template should reopen, not fail.
function cbApplyDraftValues() {
  const values = CB._pendingDraftValues;
  if (!values) return;
  Object.entries(values).forEach(([key, value]) => {
    const el = document.getElementById(`cb_${key}`);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = value === 'true';
    else el.value = value;
  });
  CB._pendingDraftValues = null;
}

async function cbDeleteDraft(draftId, name) {
  if (!confirm(`Delete the draft “${decodeEntities(name)}”?\n\nNothing has been sent to anyone, so only the half-filled form is lost.`)) return;
  try {
    await apiFetch('DELETE', `/contract-drafts/${encodeURIComponent(draftId)}`);
    showToast('success', 'Draft deleted.');
    if (CB.draftId === draftId) CB.draftId = null;
    await cbStep1();
  } catch (err) {
    showToast('error', err.message || 'Could not delete the draft.');
  }
}

async function cbSubmit() {
  const valid = cbValidateBeforeSubmit();
  if (!valid) return;
  const { fieldValues, clientName, clientEmail } = valid;

  const btn = document.querySelector('#cb-body .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  const tpl = CB.templates.find(t => t.id === CB.selectedId);

  try {
    const res = await apiFetch('POST', '/contracts/invite', {
      clientName, clientEmail, templateId: CB.selectedId, templateName: tpl?.name || CB.selectedId, fieldValues,
      rmName: CB.kundenberater, createClientAccount: CB.createClientAccount, requiredDocuments: CB.requiredDocuments,
    });
    // Without the real clientId the KYC Task cannot resolve back to this
    // client, so it cannot render the questionnaire against the client's own
    // record — the task and the client's profile would show different things.
    await cbCreateKycTask(CB.kundenberater, clientName, clientEmail, res.clientId);
    CB.result = { otp: res.otp, clientName, clientEmail };
    CB.step = 3;
    cbStep3();
  } catch (err) {
    showToast('error', err.message || 'Failed to send invitation.');
    if (btn) { btn.disabled = false; btn.textContent = 'Send Contract & Invite Client'; }
  }
}

/* ── Step 3: Confirmation ────────────────────────────────────── */
function cbStep3() {
  const el = document.getElementById('cb-body');
  const { otp, clientName, clientEmail } = CB.result || {};
  const tpl = CB.templates.find(t => t.id === CB.selectedId);

  el.innerHTML = `
    <div class="card">
      <div class="card-body" style="text-align:center;padding:48px 32px;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(97,206,112,0.15);
                    display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
        </div>
        <h2 style="color:var(--text-primary);margin-bottom:8px;">${otp ? 'Invitation Sent!' : 'Contract Processed'}</h2>
        <p style="color:var(--text-secondary);margin-bottom:28px;">
          ${otp
            ? `A portal access email has been sent to <strong>${clientEmail}</strong>`
            : `No portal account was created, per the Client Portal Account setting.`}
        </p>

        <div style="background:var(--bg-secondary);border:1px solid var(--border-default);
                    border-radius:var(--radius-lg);padding:24px;max-width:360px;margin:0 auto 28px;text-align:left;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
                      color:var(--text-muted);margin-bottom:14px;">${otp ? 'Account Details' : 'Contract Details'}</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div><span style="font-size:12px;color:var(--text-muted);">Client</span>
              <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${clientName}</div>
            </div>
            <div><span style="font-size:12px;color:var(--text-muted);">Email</span>
              <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${clientEmail}</div>
            </div>
            <div><span style="font-size:12px;color:var(--text-muted);">Contract</span>
              <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${tpl?.name || CB.selectedId}</div>
            </div>
            ${otp ? `
            <div><span style="font-size:12px;color:var(--text-muted);">One-Time Password</span>
              <div style="font-size:22px;font-weight:700;font-family:monospace;color:var(--accent-purple);
                          letter-spacing:4px;margin-top:2px;">${otp}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                Share this with the client if the email isn't received
              </div>
            </div>
            ` : ''}
          </div>
        </div>

        <button class="btn-primary" onclick="renderContractBuilding()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Build Another Contract
        </button>
      </div>
    </div>
  `;
}
function cbCollectAllValues() {
  const fv = {};
  CB.fields.forEach(f => {
    const el = document.getElementById(`cb_${f.key}`);
    if (el) fv[f.key] = f.type === 'checkbox' ? (el.checked ? 'true' : 'false') : el.value.trim();
  });
  cbUpdateAllocTotal();
  cbUpdateCcyTotal();
  Object.assign(fv, {
    contract_type:           CB.contractTypeNew ? 'new' : 'replace',
    portfolio_currency:      CB.currency,
    investment_profile:      CB.investmentProfile.charAt(0).toUpperCase() + CB.investmentProfile.slice(1),
    alloc_equities_min:      String(CB.allocations.equities.min),
    alloc_equities_max:      String(CB.allocations.equities.max),
    alloc_fixed_income_min:  String(CB.allocations.fixedIncome.min),
    alloc_fixed_income_max:  String(CB.allocations.fixedIncome.max),
    alloc_cash_min:          String(CB.allocations.cash.min),
    alloc_cash_max:          String(CB.allocations.cash.max),
    alloc_other_min:         String(CB.allocations.other.min),
    alloc_other_max:         String(CB.allocations.other.max),
    alloc_precious_metals_min: CB.includePreciousMetals ? String(CB.preciousMetals.min) : '',
    alloc_precious_metals_max: CB.includePreciousMetals ? String(CB.preciousMetals.max) : '',
    investment_comments:     document.getElementById('cb_investment_comments')?.value?.trim() || '',
    management_fee:          document.getElementById('cb_management_fee')?.value?.trim()      || '',
    performance_fee:         document.getElementById('cb_performance_fee')?.value?.trim()     || '',
    performance_fee_frequency: document.getElementById('cb_performance_fee_frequency')?.value || 'semiannual',
    vorab_pct:                document.getElementById('cb_vorab_pct')?.value?.trim()          || '',
    own_products_choice:      CB.ownProductsChoice || '',
    client_type:              CB.clientType || 'individual',
    ccy_chf_min: String(CB.currencyWeights.CHF?.min||0), ccy_chf_max: String(CB.currencyWeights.CHF?.max||0),
    ccy_eur_min: String(CB.currencyWeights.EUR?.min||0), ccy_eur_max: String(CB.currencyWeights.EUR?.max||0),
    ccy_usd_min: String(CB.currencyWeights.USD?.min||0), ccy_usd_max: String(CB.currencyWeights.USD?.max||0),
    ccy_gbp_min: String(CB.currencyWeights.GBP?.min||0), ccy_gbp_max: String(CB.currencyWeights.GBP?.max||0),
    ccy_aud_min: String(CB.currencyWeights.AUD?.min||0), ccy_aud_max: String(CB.currencyWeights.AUD?.max||0),
    ccy_jpy_min: String(CB.currencyWeights.JPY?.min||0), ccy_jpy_max: String(CB.currencyWeights.JPY?.max||0),
    ccy_other_min: String(CB.currencyWeights.Other?.min||0), ccy_other_max: String(CB.currencyWeights.Other?.max||0),
    uo_vertrag:           CB.uo ? 'true' : 'false',
    p2_last_name:         document.getElementById('cb_p2_last_name')?.value?.trim()    || '',
    p2_first_name:        document.getElementById('cb_p2_first_name')?.value?.trim()   || '',
    p2_dob:               document.getElementById('cb_p2_dob')?.value?.trim()          || '',
    p2_nationality:       document.getElementById('cb_p2_nationality')?.value?.trim()  || '',
    p2_address1:          document.getElementById('cb_p2_address1')?.value?.trim()     || '',
    p2_address2:          document.getElementById('cb_p2_address2')?.value?.trim()     || '',
    p2_city:              document.getElementById('cb_p2_city')?.value?.trim()         || '',
    p2_country:           document.getElementById('cb_p2_country')?.value?.trim()      || '',
    kundenberater_name:   CB.kundenberater,
    kundenberater_email:  CB.kundenberaterEmail,
    mandatsname:          document.getElementById('cb_mandatsname')?.value?.trim() || '',
  });
  return fv;
}

async function cbDownloadFilled() {
  const valid = cbValidateBeforeSubmit();
  if (!valid) return;
  const { fieldValues } = valid;
  try {
        const response = await fetch(`${API_BASE}/contracts/generate/${CB.selectedId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldValues, fieldDefs: CB.fields }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(err.error || 'Download failed');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const tpl = CB.templates.find(t => t.id === CB.selectedId);
    a.href = url;
    a.download = tpl?.file || `${CB.selectedId}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast('error', err.message || 'Download failed');
  }
}

function docSummaryMini(client) {
  const groups = { approved: 0, pending: 0, 'info-requested': 0, draft: 0 };
  client.documents.forEach(d => {
    if (groups[d.status] !== undefined) groups[d.status]++;
    else groups['pending']++;
  });
  return Object.entries(groups).map(([s,v]) => v > 0 ? `
    <div style="text-align:center;padding:10px;background:var(--bg-elevated);border-radius:var(--radius-md);">
      <div style="font-size:20px;font-weight:700;">${v}</div>
      <span class="status-badge status-${s}" style="margin-top:4px;">${statusLabel(s)}</span>
    </div>
  ` : '').join('');
}

/* ============================================================
   PAGE: NEW CLIENT / ONBOARDING
   ============================================================ */
function renderNewClient() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <h1>New Client Onboarding</h1>
      <p>Start a new compliance case and invite the client to complete their KYC</p>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="kyc-form-section">
          <div class="kyc-section-title">Client Type</div>
          <div class="form-row">
            <div class="form-group">
              <label>Client Category</label>
              <select id="new-client-type" onchange="updateNewClientForm()">
                <option value="individual">Individual / Personal</option>
                <option value="corporate">Corporate Entity</option>
                <option value="trust">Trust</option>
                <option value="foundation">Foundation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Anticipated Risk Level</label>
              <select>
                <option>Low</option>
                <option>Medium</option>
                <option selected>High</option>
              </select>
            </div>
          </div>
        </div>

        <div class="kyc-form-section" id="new-client-fields">
          <div class="kyc-section-title">Basic Information</div>
          <div class="form-row">
            <div class="form-group">
              <label>Legal / Full Name *</label>
              <input type="text" placeholder="As per official documents" />
            </div>
            <div class="form-group">
              <label>Country of Registration / Residence *</label>
              <input type="text" placeholder="United Kingdom" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Primary Contact Name</label>
              <input type="text" placeholder="Contact person name" />
            </div>
            <div class="form-group">
              <label>Primary Contact Email *</label>
              <input type="email" placeholder="contact@company.com" />
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label>Purpose of Relationship</label>
              <textarea rows="2" placeholder="Describe the expected banking relationship and services required..."></textarea>
            </div>
          </div>
        </div>

        <div class="kyc-form-section">
          <div class="kyc-section-title">Case Configuration</div>
          <div class="form-row">
            <div class="form-group">
              <label>Assigned Relationship Manager</label>
              <select>
                <option selected>Sarah Mitchell</option>
                <option>Michael Torres</option>
                <option>Emily Clarke</option>
                <option>James Okafor</option>
              </select>
            </div>
            <div class="form-group">
              <label>Compliance Officer</label>
              <select>
                <option selected>Auto-assign</option>
                <option>Team A</option>
                <option>Team B</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Client Portal Access</label>
              <select>
                <option selected>Send invite email to client</option>
                <option>Manual onboarding (RM completes)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Required Document Checklist</label>
              <select>
                <option selected>Standard KYC</option>
                <option>Enhanced Due Diligence (EDD)</option>
                <option>Simplified DD (low risk only)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="kyc-form-section">
          <div class="kyc-section-title">Required Documents Checklist</div>
          <div class="info-box">
            <p>The following documents will be requested from the client. You can customise this list before creating the case.</p>
          </div>
          <div id="doc-checklist">
            ${defaultDocChecklist()}
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:8px;">
          <button class="btn-secondary" onclick="navigateTo('clients')">Cancel</button>
          <button class="btn-secondary" onclick="showToast('info','Case saved as draft.')">Save Draft</button>
          <button class="btn-primary" onclick="createCase()">Create Case & Invite Client →</button>
        </div>
      </div>
    </div>
  `;
}

function defaultDocChecklist() {
  const docs = [
    'Power of Attorney (Vollmacht)',
    'Client Categorisation (FIDLEG)',
    'Investment Profile',
    'Risk Profile Questionnaire',
    'Mandate Risk Profile',
    'KYC Form',
    'Form A/T/K/S — Ownership Structure',
    'Advisory / Asset Management Agreement',
    'ID Document (Passport or National ID)',
  ];
  return docs.map(d => `
    <div class="checkbox-group">
      <input type="checkbox" id="doc-${d.replace(/[\s/()]/g,'_')}" checked />
      <label for="doc-${d.replace(/[\s/()]/g,'_')}">${d}</label>
    </div>
  `).join('');
}

function createCase() {
  const nextId = `C${String(State.clients.length + 1).padStart(3, '0')}`;
  const typeMap = { individual: 'Individual', corporate: 'Corporate', trust: 'Trust', foundation: 'Foundation', other: 'Corporate' };
  const selectedType = document.getElementById('new-client-type')?.value || 'corporate';
  const newClient = {
    id: nextId,
    name: `New ${typeMap[selectedType]} Client`,
    type: typeMap[selectedType],
    risk: 'Medium',
    status: 'pending',
    rm: 'Sarah Mitchell',
    created: new Date().toISOString().slice(0, 10),
    progress: 5,
    country: 'TBD',
    industry: 'TBD',
    documents: [],
    auditTrail: [{ action: 'Case created and client invite sent', user: 'Relationship Manager', time: nowTs(), type: 'created' }],
    kyc: {}
  };
  State.clients.unshift(newClient);
  showToast('success', `New client case ${nextId} created. Invitation sent to client email.`);
  setTimeout(() => navigateTo('clients'), 1200);
}


/* ============================================================
   PAGE: KYC SCHEMA
   The questionnaire itself, and — for Compliance — the place it is edited.
   Built the same way as the Mandate Risk Schema screen, because the two
   questionnaires are maintained the same way and one pattern is easier to
   follow than two that merely resemble each other.
   ============================================================ */
async function renderKycForm() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="page-header"><h1>KYC Schema</h1></div><div class="cb-loading">Loading…</div>`;

  // Read from its own endpoint rather than from whichever client happened to
  // be first in the list: the schema belongs to the questionnaire, not to any
  // one mandate, and it has to be visible before any client exists.
  let fields = [];
  let removed = [];
  try {
    const data = await apiFetch('GET', '/kyc-schema');
    fields = data.fields || [];
    removed = data.removed || [];
  } catch (err) {
    content.innerHTML = `
      <div class="page-header"><h1>KYC Schema</h1></div>
      <p style="color:var(--accent-red);padding:16px;">Failed to load the KYC schema: ${escapeHtml(err.message)}</p>`;
    return;
  }

  const canEdit = isCompliance(State.currentRole);
  const pages = [];
  const byPage = new Map();
  fields.forEach((f) => {
    if (!byPage.has(f.page)) { byPage.set(f.page, { page: f.page, idx: pages.length, fields: [] }); pages.push(byPage.get(f.page)); }
    byPage.get(f.page).fields.push(f);
  });
  const typeLabels = {
    text: 'Text', email: 'Email', date: 'Date', number: 'Number',
    select: 'Dropdown', textarea: 'Long text', yesno: 'Yes / No',
  };

  content.innerHTML = `
    <div class="page-header">
      <h1>KYC Schema</h1>
      <p>The KYC questionnaire, exactly as every client&rsquo;s form renders it.${canEdit
        ? ' Add or remove a question here and every KYC form, gap check and export follows immediately.'
        : ' Compliance maintains this list.'}</p>
    </div>
    <div class="info-box" style="margin-bottom:20px;">
      <p>One list serves every legal form. A removed question stops being asked and stops being required — answers already given are kept, and come back if it is restored.</p>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:12px;flex-wrap:wrap;">
      <div style="font-size:13px;color:var(--text-muted);">${pages.length} section${pages.length === 1 ? '' : 's'} · ${fields.length} questions total</div>
      <button class="btn-primary btn-sm" onclick="openTasksTab('kyc')">Open KYC Tasks</button>
    </div>
    ${pages.map(sec => `
      <div class="card" data-kyc-schema-page="${escapeHtml(sec.page)}" style="margin-bottom:12px;">
        <div class="card-header" style="padding:12px 16px;">
          <div class="card-title">${escapeHtml(sec.page)}</div>
          ${canEdit ? `<button class="btn-secondary btn-xs" onclick="toggleAddKycField(${sec.idx})">+ Add Question</button>` : ''}
        </div>
        <div class="card-body" style="padding:0 16px 14px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);border-bottom:1px solid var(--border-default);">
                <th style="padding:8px 0;text-align:left;">Question</th>
                <th style="padding:8px 6px;text-align:left;">Control</th>
                <th style="padding:8px 6px;text-align:left;">Options</th>
                <th style="padding:8px 0;text-align:center;">Required</th>
                ${canEdit ? `<th style="padding:8px 0;text-align:right;"></th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${sec.fields.map(f => `
                <tr data-kyc-schema-field data-kyc-key="${escapeHtml(f.key)}" data-kyc-label="${escapeHtml(f.label)}" data-kyc-type="${escapeHtml(f.type || 'text')}" data-kyc-required="${f.required ? 'true' : 'false'}" data-kyc-options="${escapeHtml(JSON.stringify(f.options || []))}" style="border-bottom:1px solid var(--border-subtle);">
                  <td style="padding:9px 0;font-size:13px;">
                    ${escapeHtml(f.label)}
                    ${f.builtIn === false ? `<span style="color:var(--accent-blue);font-size:11px;margin-left:6px;">Added</span>` : ''}
                  </td>
                  <td style="padding:9px 6px;font-size:12px;">${escapeHtml(typeLabels[f.type] || f.type || 'Text')}</td>
                  <td style="padding:9px 6px;font-size:11px;color:var(--text-muted);">${f.options && f.options.length ? f.options.map(escapeHtml).join(', ') : '—'}</td>
                  <td style="padding:9px 0;text-align:center;font-size:12px;">${f.required ? '<span style="color:var(--accent-red);">Yes</span>' : '<span style="color:var(--text-muted);">No</span>'}</td>
                  ${canEdit ? `<td style="padding:9px 0;text-align:right;">
                    <button class="btn-secondary btn-xs" onclick="deleteKycField('${escapeHtml(f.key)}','${escapeHtml(f.label)}')">Delete</button>
                  </td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${canEdit ? kycFieldFormHTML(sec) : ''}
        </div>
      </div>
    `).join('')}

    ${canEdit && removed.length ? `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-header" style="padding:12px 16px;"><div class="card-title">Removed Questions (${removed.length})</div></div>
        <div class="card-body" style="padding:0 16px 14px;">
          <p style="font-size:12px;color:var(--text-muted);padding:8px 0;">Part of the shipped questionnaire but currently switched off. Nobody is asked them, and they are not required for submission.</p>
          ${removed.map(f => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--border-subtle);">
              <div style="flex:1;font-size:13px;">${escapeHtml(f.label)}<span style="color:var(--text-muted);font-size:11px;margin-left:6px;">${escapeHtml(f.page)}</span></div>
              <button class="btn-secondary btn-xs" onclick="restoreKycField('${escapeHtml(f.key)}')">Restore</button>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

// The add form sits inside the section it will add to, so there is never any
// doubt about where the question lands.
function kycFieldFormHTML(sec) {
  const i = sec.idx;
  return `
    <div id="kycf-form-${i}" style="display:none;border-top:1px solid var(--border-default);margin-top:10px;padding-top:14px;">
      <div class="form-group">
        <label class="form-label">Question</label>
        <input type="text" class="form-input" id="kycf-label-${i}" placeholder="e.g. Zweite Staatsangehörigkeit">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Control</label>
          <select class="form-input" id="kycf-type-${i}" onchange="document.getElementById('kycf-options-row-${i}').style.display = this.value === 'select' ? '' : 'none';">
            <option value="text">Text</option>
            <option value="textarea">Long text</option>
            <option value="select">Dropdown</option>
            <option value="date">Date</option>
            <option value="number">Number</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Required</label>
          <select class="form-input" id="kycf-required-${i}">
            <option value="yes">Yes — must be answered before submission</option>
            <option value="no">No — optional</option>
          </select>
        </div>
      </div>
      <div class="form-group" id="kycf-options-row-${i}" style="display:none;">
        <label class="form-label">Dropdown options (comma separated)</label>
        <input type="text" class="form-input" id="kycf-options-${i}" placeholder="Ja, Nein">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button class="btn-secondary btn-sm" onclick="toggleAddKycField(${i})">Cancel</button>
        <button class="btn-primary btn-sm" onclick="submitAddKycField(${i},'${escapeHtml(sec.page)}')">Add Question</button>
      </div>
    </div>`;
}

function toggleAddKycField(i) {
  const form = document.getElementById(`kycf-form-${i}`);
  if (!form) return;
  form.style.display = form.style.display === 'none' ? '' : 'none';
  if (form.style.display === '') document.getElementById(`kycf-label-${i}`)?.focus();
}

async function submitAddKycField(i, page) {
  const label = document.getElementById(`kycf-label-${i}`).value.trim();
  if (!label) { showToast('error', 'Enter the question text.'); return; }
  const type = document.getElementById(`kycf-type-${i}`).value;
  const options = document.getElementById(`kycf-options-${i}`).value;
  if (type === 'select' && !options.trim()) { showToast('error', 'A dropdown needs at least one option.'); return; }
  try {
    await apiFetch('POST', '/kyc-schema/fields', {
      label, page, type, options,
      required: document.getElementById(`kycf-required-${i}`).value === 'yes',
    });
    showToast('success', 'Question added to the KYC questionnaire.');
    renderKycForm();
  } catch (err) {
    showToast('error', err.message || 'Could not add the question.');
  }
}

async function deleteKycField(key, label) {
  if (!confirm(`Remove "${decodeEntities(label)}" from the KYC questionnaire?\n\nIt stops being asked and stops being required for submission. Answers already given are kept, and return if it is restored.`)) return;
  try {
    await apiFetch('DELETE', `/kyc-schema/fields/${encodeURIComponent(key)}`);
    showToast('success', 'Question removed.');
    renderKycForm();
  } catch (err) {
    showToast('error', err.message || 'Could not remove the question.');
  }
}

async function restoreKycField(key) {
  try {
    await apiFetch('POST', `/kyc-schema/fields/${encodeURIComponent(key)}/restore`, {});
    showToast('success', 'Question restored.');
    renderKycForm();
  } catch (err) {
    showToast('error', err.message || 'Could not restore the question.');
  }
}

function submitKyc() {
  const client = getActiveClientForUpload();
  if (client) {
    client.status = 'under-review';
    client.progress = Math.max(client.progress, 70);
    addClientAudit(client.id, 'KYC questionnaire submitted for compliance review', 'submitted', 'Client');
  }
  showToast('success', 'KYC form submitted successfully. Compliance review has started.');
  setTimeout(() => navigateTo('dashboard'), 1200);
}


/* ============================================================
   PAGE: KYC CORRECTIONS (RM view - simplified)   [jumped here]
   ============================================================ */
function _kycFormStubEnd_placeholder() {
  // old static form removed — see renderKycForm template builder above
  const _unused = `<div class="page-header"><h1>KYC Self-Declaration Form</h1><p>Replaced by template builder.</p></div>

    <div class="info-box">
      <p>Your information is processed strictly for compliance purposes and kept confidential. You will be asked to sign this form physically and upload a scanned copy.</p>
    </div>

    <div class="card">
      <div class="card-body">
        <!-- Section 1: Personal Details -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">1. Personal Information</div>
          <div class="form-row three">
            <div class="form-group">
              <label>Title</label>
              <select>
                <option>Mr</option><option>Mrs</option><option>Ms</option><option>Dr</option><option>Prof</option>
              </select>
            </div>
            <div class="form-group">
              <label>First Name(s) *</label>
              <input type="text" value="John" placeholder="First name" />
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input type="text" value="Smith" placeholder="Last name" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Maiden Name (if applicable)</label>
              <input type="text" placeholder="Previous surname" />
            </div>
            <div class="form-group">
              <label>Full Name as per Passport *</label>
              <input type="text" value="John Robert Smith" placeholder="Exactly as on passport" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Gender</label>
              <select>
                <option selected>Male</option><option>Female</option><option>Other / Prefer not to say</option>
              </select>
            </div>
            <div class="form-group">
              <label>Place of Birth</label>
              <input type="text" placeholder="City, Country" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date of Birth *</label>
              <input type="date" value="1975-04-12" />
            </div>
            <div class="form-group">
              <label>Place of Birth</label>
              <input type="text" placeholder="City, Country" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Nationality *</label>
              <input type="text" value="British" placeholder="Nationality" />
            </div>
            <div class="form-group">
              <label>Country of Residence *</label>
              <input type="text" value="United Kingdom" placeholder="Country" />
            </div>
          </div>
        </div>

        <!-- Section 2: ID -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">2. Identity Documents</div>
          <div class="form-row">
            <div class="form-group">
              <label>ID Document Type *</label>
              <select>
                <option selected>Passport</option>
                <option>National ID Card</option>
                <option>Driver's Licence</option>
              </select>
            </div>
            <div class="form-group">
              <label>Document Number *</label>
              <input type="text" value="GB123456" placeholder="e.g. GB123456" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Issue Date</label>
              <input type="date" value="2017-03-10" />
            </div>
            <div class="form-group">
              <label>Expiry Date *</label>
              <input type="date" value="2027-03-09" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Issuing Country *</label>
              <input type="text" value="United Kingdom" />
            </div>
            <div class="form-group">
              <label>Issuing Authority</label>
              <input type="text" placeholder="e.g. HM Passport Office" />
            </div>
          </div>
        </div>

        <!-- Section 3: Address -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">3. Residential Address</div>
          <div class="form-row single">
            <div class="form-group">
              <label>Street Address *</label>
              <input type="text" value="123 Business Park" placeholder="Building, street" />
            </div>
          </div>
          <div class="form-row three">
            <div class="form-group">
              <label>City *</label>
              <input type="text" value="London" />
            </div>
            <div class="form-group">
              <label>State / Province</label>
              <input type="text" value="England" />
            </div>
            <div class="form-group">
              <label>Postal / ZIP Code</label>
              <input type="text" value="EC1A 1BB" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Country *</label>
              <input type="text" value="United Kingdom" />
            </div>
            <div class="form-group">
              <label>Duration at Address</label>
              <select>
                <option>Less than 1 year</option>
                <option>1–3 years</option>
                <option selected>3–5 years</option>
                <option>More than 5 years</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section 4: Tax -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">4. Tax Information</div>
          <div class="form-row">
            <div class="form-group">
              <label>Primary Tax Residency *</label>
              <input type="text" value="United Kingdom" />
            </div>
            <div class="form-group">
              <label>Tax Identification Number (TIN) *</label>
              <input type="text" value="GB987654321" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Additional Tax Residency</label>
              <input type="text" placeholder="If applicable" />
            </div>
            <div class="form-group">
              <label>Additional TIN</label>
              <input type="text" placeholder="If applicable" />
            </div>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="us-person" />
            <label for="us-person">I am a US Person (citizen, green card holder, or resident for tax purposes)</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="fatca" />
            <label for="fatca">I am subject to FATCA reporting obligations</label>
          </div>
        </div>

        <!-- Section 5: Employment & Income -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">5. Employment & Financial Profile</div>
          <div class="form-row">
            <div class="form-group">
              <label>Employment Status *</label>
              <select>
                <option>Employed</option>
                <option selected>Self-Employed / Director</option>
                <option>Retired</option>
                <option>Investor</option>
                <option>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Job Title / Occupation</label>
              <input type="text" value="Managing Director" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Employer / Business Name</label>
              <input type="text" value="Acme Corporation Ltd" />
            </div>
            <div class="form-group">
              <label>Annual Income (Net) *</label>
              <select>
                <option>Under £50,000</option>
                <option>£50,000 – £100,000</option>
                <option>£100,000 – £250,000</option>
                <option selected>£250,000 – £500,000</option>
                <option>Over £500,000</option>
              </select>
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label>Source of Wealth (primary) *</label>
              <select>
                <option selected>Business income / Salary</option>
                <option>Sale of property / assets</option>
                <option>Inheritance</option>
                <option>Investment returns</option>
                <option>Other</option>
              </select>
              <small>Please describe the origin of funds to be deposited</small>
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label>Source of Wealth — Additional Details</label>
              <textarea rows="3" placeholder="Provide details supporting your source of wealth declaration...">Income derived from Acme Corporation Ltd, a UK manufacturing company incorporated in 2015. Profit distributions and director salary over multiple years.</textarea>
            </div>
          </div>
        </div>

        <!-- Section 6: Contact Details -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">6. Contact Details</div>
          <div class="form-row three">
            <div class="form-group">
              <label>Phone (Private)</label>
              <input type="tel" placeholder="+44 20 7000 0001" />
            </div>
            <div class="form-group">
              <label>Phone (Mobile) *</label>
              <input type="tel" placeholder="+44 7700 900000" />
            </div>
            <div class="form-group">
              <label>Phone (Business)</label>
              <input type="tel" placeholder="+44 20 7000 0002" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Email Address *</label>
              <input type="email" value="john.smith@acmecorp.co.uk" />
            </div>
            <div class="form-group">
              <label>Preferred Communication Channel</label>
              <select>
                <option selected>Email</option>
                <option>Post</option>
                <option>Phone</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Correspondence Language</label>
              <select>
                <option selected>English</option>
                <option>German</option>
                <option>French</option>
                <option>Italian</option>
                <option>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Correspondence Address (if different)</label>
              <input type="text" placeholder="Leave blank if same as residential" />
            </div>
          </div>
        </div>

        <!-- Section 7: Family & Related Persons -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">7. Family &amp; Related Persons</div>
          <div class="form-row">
            <div class="form-group">
              <label>Marital Status</label>
              <select>
                <option>Single</option>
                <option selected>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
                <option>Civil Partnership</option>
              </select>
            </div>
            <div class="form-group">
              <label>Number of Dependent Children</label>
              <input type="number" value="2" min="0" max="20" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Spouse / Partner Full Name</label>
              <input type="text" placeholder="Full name as per ID" />
            </div>
            <div class="form-group">
              <label>Spouse / Partner Nationality</label>
              <input type="text" placeholder="Nationality" />
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label>Close Associated Persons (PEP exposure)</label>
              <textarea rows="2" placeholder="List any close associates or family members who are or have been politically exposed persons..."></textarea>
              <small>Include name, relationship, and nature of political exposure if applicable</small>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Description of Relationship with Client</label>
              <input type="text" placeholder="e.g. Direct client, referred by..." />
            </div>
            <div class="form-group">
              <label>Personal Contact Confirmed (Date &amp; Place)</label>
              <input type="text" placeholder="e.g. London, 2026-03-14" />
            </div>
          </div>
        </div>

        <!-- Section 8: Financial Situation -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">8. Financial Situation</div>
          <div class="form-row">
            <div class="form-group">
              <label>Annual Net Income *</label>
              <select>
                <option>Under £50,000</option>
                <option>£50,000 – £150,000</option>
                <option>£150,000 – £500,000</option>
                <option selected>£500,000 – £1,000,000</option>
                <option>Over £1,000,000</option>
              </select>
            </div>
            <div class="form-group">
              <label>Additional Income Sources</label>
              <input type="text" placeholder="Dividends, rental income, etc." />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Estimated Annual Living Expenses</label>
              <select>
                <option>Under £30,000</option>
                <option selected>£30,000 – £100,000</option>
                <option>£100,000 – £250,000</option>
                <option>Over £250,000</option>
              </select>
            </div>
            <div class="form-group">
              <label>Planned Major Expenditures</label>
              <input type="text" placeholder="e.g. property purchase, education" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Number of Financial Dependents</label>
              <input type="number" value="2" min="0" />
            </div>
            <div class="form-group">
              <label>Outstanding Liabilities / Loans</label>
              <input type="text" placeholder="Mortgage, loans, etc." />
            </div>
          </div>
        </div>

        <!-- Section 9: Source of Wealth & Assets -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">9. Source of Wealth &amp; Assets</div>
          <div class="form-row">
            <div class="form-group">
              <label>Primary Origin of Wealth *</label>
              <select>
                <option selected>Business income / Salary</option>
                <option>Sale of business</option>
                <option>Sale of property / assets</option>
                <option>Inheritance / Gift</option>
                <option>Investment returns</option>
                <option>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Total Net Assets (Range) *</label>
              <select>
                <option>Under CHF 500,000</option>
                <option>CHF 500K – 1M</option>
                <option selected>CHF 1M – 5M</option>
                <option>CHF 5M – 20M</option>
                <option>Over CHF 20M</option>
              </select>
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label>Source of Wealth — Detailed Description *</label>
              <textarea rows="3" placeholder="Describe in detail the origin of your wealth...">Income derived from Acme Corporation Ltd, a UK manufacturing company incorporated in 2015. Profit distributions and director salary accumulated over multiple years of business operation.</textarea>
            </div>
          </div>
          <div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">Asset Breakdown (Approximate)</div>
            <div class="form-row three">
              <div class="form-group">
                <label>Cash / Liquid Assets</label>
                <input type="text" placeholder="e.g. £500,000" />
              </div>
              <div class="form-group">
                <label>Real Estate</label>
                <input type="text" placeholder="e.g. £1,200,000" />
              </div>
              <div class="form-group">
                <label>Private Equity / Business</label>
                <input type="text" placeholder="e.g. £3,000,000" />
              </div>
            </div>
            <div class="form-row three">
              <div class="form-group">
                <label>Listed Securities</label>
                <input type="text" placeholder="e.g. £200,000" />
              </div>
              <div class="form-group">
                <label>Pension / Retirement</label>
                <input type="text" placeholder="e.g. £400,000" />
              </div>
              <div class="form-group">
                <label>Other Holdings</label>
                <input type="text" placeholder="e.g. art, collectibles" />
              </div>
            </div>
          </div>
        </div>

        <!-- Section 10: Education & Career -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">10. Education &amp; Career Background</div>
          <div class="form-row">
            <div class="form-group">
              <label>Highest Education Level</label>
              <select>
                <option>Secondary / A-Levels</option>
                <option>Bachelor's Degree</option>
                <option selected>Master's Degree / MBA</option>
                <option>Doctoral Degree (PhD)</option>
                <option>Professional Qualification (CFA, CA, etc.)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Field of Study</label>
              <input type="text" placeholder="e.g. Engineering, Finance" />
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label>Career Milestones &amp; Additional Background</label>
              <textarea rows="3" placeholder="Brief career summary, significant roles, or relevant background..."></textarea>
              <small>Optional — helps us understand your professional context</small>
            </div>
          </div>
          <div class="form-row single">
            <div class="form-group">
              <label>General Remarks / Additional Information</label>
              <textarea rows="2" placeholder="Any other information you consider relevant..."></textarea>
            </div>
          </div>
        </div>

        <!-- Section 11: PEP & Sanctions -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">11. PEP &amp; Regulatory Declarations</div>
          <div class="info-box">
            <p>A Politically Exposed Person (PEP) is someone who holds or has held a prominent public position. Please answer all questions honestly.</p>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="pep-self" />
            <label for="pep-self">I am currently or have previously been a Politically Exposed Person (PEP)</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="pep-related" />
            <label for="pep-related">I am a close associate or family member of a PEP</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="sanctions" />
            <label for="sanctions">I am or have been subject to any sanctions, embargoes, or financial restrictions</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="legal" />
            <label for="legal">I am or have been involved in any criminal proceedings or regulatory investigations</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="bankrupt" />
            <label for="bankrupt">I have been declared bankrupt or subject to insolvency proceedings in the last 10 years</label>
          </div>

          <div style="margin-top:16px;" class="form-row single">
            <div class="form-group">
              <label>If you answered YES to any above, please provide details:</label>
              <textarea rows="3" placeholder="Provide relevant details if applicable..."></textarea>
            </div>
          </div>
        </div>

        <!-- Section 7: Declaration -->
        <div class="kyc-form-section">
          <div class="kyc-section-title">7. Declaration & Consent</div>
          <div class="info-box success">
            <p>By submitting this form, you confirm all information provided is accurate and complete. You consent to us conducting identity and screening checks.</p>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="declare-accurate" checked />
            <label for="declare-accurate">I confirm that all information provided in this form is true, accurate and complete to the best of my knowledge.</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="declare-notify" checked />
            <label for="declare-notify">I agree to notify the bank immediately of any material changes to the information provided.</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="declare-consent" checked />
            <label for="declare-consent">I consent to identity verification, screening checks (PEP, sanctions, adverse media) and data processing for compliance purposes.</label>
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="declare-privacy" />
            <label for="declare-privacy">I have read and agree to the Privacy Policy and Terms of Service.</label>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:8px;">
          <button class="btn-secondary" onclick="showToast('info','Progress saved as draft.')">Save Progress</button>
  `;
}

/* ============================================================
   PAGE: KYC CORRECTIONS (RM view - simplified)
   ============================================================ */
// Required client.kyc fields per client type, shown/editable on the KYC correction
// detail view. Any of these left empty glows orange until the RM fills it in.
// Mirrors backend/config/kycRequiredFields.js exactly (key, label, page) —
// keep both in sync, the backend copy is what actually drives gap detection
// and correction records; this one only needs to render/group the same way.
const REQUIRED_KYC_FIELDS = {
  Individual: [
    ['title','Title','1. Personal Information',false], ['firstName','First Name(s)','1. Personal Information'],
    ['lastName','Last Name','1. Personal Information'], ['dob','Date of Birth','1. Personal Information'],
    ['nationality','Nationality','1. Personal Information'], ['residency','Country of Residence','1. Personal Information'],
    ['placeOfBirth','Place of Birth','1. Personal Information',false],
    ['passportNumber','Passport Number','2. Identity Documents'], ['passportExpiry','Passport Expiry','2. Identity Documents'],
    ['passportCountry','Issuing Country','2. Identity Documents',false],
    ['address','Address Line 1','3. Residential Address'], ['addressLine2','Address Line 2','3. Residential Address',false],
    ['city','City','3. Residential Address'], ['postalCode','Postal Code','3. Residential Address'],
    ['addressCountry','Country','3. Residential Address'],
    ['taxResidency','Tax Residency Country','4. Tax Information'], ['taxId','Tax Identification Number (TIN)','4. Tax Information'],
    ['employmentStatus','Employment Status','5. Employment & Financial Profile'], ['occupation','Occupation / Job Title','5. Employment & Financial Profile',false],
    ['employer','Employer / Company','5. Employment & Financial Profile',false], ['annualIncome','Annual Income Range','5. Employment & Financial Profile'],
    ['sourceOfWealth','Source of Wealth (description)','6. Source of Wealth & Assets'], ['netAssets','Estimated Net Assets','6. Source of Wealth & Assets'],
    ['pep','Politically Exposed Person (PEP)?','7. PEP & Regulatory Declarations'],
    ['sanctions','Subject to any sanctions?','7. PEP & Regulatory Declarations'],
    ['adverse','Adverse media or legal proceedings?','7. PEP & Regulatory Declarations'],
  ],
  Corporate: [
    ['legalName','Legal Name','Page 1 — Entity Details'], ['tradingName','Trading Name','Page 1 — Entity Details'],
    ['registrationNumber','Registration Number','Page 1 — Entity Details'], ['registrationDate','Registration Date','Page 1 — Entity Details'],
    ['registrationCountry','Registration Country','Page 1 — Entity Details'], ['jurisdiction','Jurisdiction','Page 1 — Entity Details'],
    ['address','Registered Address','Page 1 — Entity Details'],
    ['businessType','Business Type','Page 2 — Business Profile'], ['industry','Industry','Page 2 — Business Profile'],
    ['website','Website','Page 2 — Business Profile'], ['purpose','Purpose of Account','Page 2 — Business Profile'],
    ['annualTurnover','Annual Turnover','Page 3 — Financial Profile'], ['netAssets','Net Assets','Page 3 — Financial Profile'],
    ['employees','Employees','Page 3 — Financial Profile'],
  ],
  Domiciliary: [
    ['legalName','Legal Name','Page 1 — Entity Details'], ['registrationNumber','Registration Number','Page 1 — Entity Details'],
    ['registrationDate','Registration Date','Page 1 — Entity Details'], ['registrationCountry','Registration Country','Page 1 — Entity Details'],
    ['jurisdiction','Jurisdiction','Page 1 — Entity Details'], ['address','Registered Address','Page 1 — Entity Details'],
    ['purpose','Purpose of Account','Page 2 — Beneficial Ownership'],
    ['beneficialOwnerName','Beneficial Owner Name','Page 2 — Beneficial Ownership'],
    ['beneficialOwnerNationality','Beneficial Owner Nationality','Page 2 — Beneficial Ownership'],
    ['sourceOfWealth','Source of Wealth','Page 3 — Financial Profile'], ['netAssets','Net Assets','Page 3 — Financial Profile'],
  ],
  Foundation: [
    ['foundationName','Foundation Name','Page 1 — Entity Details'], ['registrationNumber','Registration Number','Page 1 — Entity Details'],
    ['registrationDate','Registration Date','Page 1 — Entity Details'], ['registrationCountry','Registration Country','Page 1 — Entity Details'],
    ['jurisdiction','Jurisdiction','Page 1 — Entity Details'], ['address','Registered Address','Page 1 — Entity Details'],
    ['purpose','Purpose / Object of Foundation','Page 2 — Beneficial Ownership'], ['founderName','Founder Name','Page 2 — Beneficial Ownership'],
    ['beneficialOwnerName','Beneficial Owner / Board Member Name','Page 2 — Beneficial Ownership'],
    ['sourceOfWealth','Source of Wealth','Page 3 — Financial Profile'], ['netAssets','Net Assets','Page 3 — Financial Profile'],
  ],
  Trust: [
    ['trustName','Trust Name','Page 1 — Trust Details'], ['trustDeedDate','Trust Deed Date','Page 1 — Trust Details'],
    ['jurisdiction','Jurisdiction','Page 1 — Trust Details'],
    ['settlorName','Settlor Name','Page 2 — Parties'], ['settlorNationality','Settlor Nationality','Page 2 — Parties'],
    ['trusteeName','Trustee Name','Page 2 — Parties'], ['protectorName','Protector Name (if appointed)','Page 2 — Parties'],
    ['beneficiaries','Beneficiaries','Page 2 — Parties'],
    ['purpose','Purpose of Trust','Page 3 — Financial Profile'], ['sourceOfWealth','Source of Wealth','Page 3 — Financial Profile'],
    ['netAssets','Net Assets','Page 3 — Financial Profile'],
  ],
};

// Emergency rendering metadata for environments where an older API response
// does not yet expose client.kycSchema. Normal task/profile/correction views
// use the server-supplied schema; this keeps the bundled fallback faithful to
// the same canonical control types instead of silently turning everything into
// text inputs.
const BUNDLED_KYC_FIELD_INPUT_META = {
  dob: { type: 'date' },
  passportExpiry: { type: 'date' },
  registrationDate: { type: 'date' },
  trustDeedDate: { type: 'date' },
  address: { type: 'textarea' },
  addressLine2: { type: 'textarea' },
  sourceOfWealth: { type: 'textarea' },
  beneficiaries: { type: 'textarea' },
  title: { type: 'select', options: ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'] },
  employmentStatus: { type: 'select', options: ['Employed', 'Self-Employed / Director', 'Retired', 'Student', 'Other'] },
  annualIncome: { type: 'select', options: ['< CHF 100K', 'CHF 100K – 500K', 'CHF 500K – 1M', '> CHF 1M'] },
  netAssets: { type: 'select', options: ['< CHF 500K', 'CHF 500K – 2M', 'CHF 2M – 10M', '> CHF 10M'] },
  pep: { type: 'select', options: ['No', 'Yes'] },
  sanctions: { type: 'select', options: ['No', 'Yes'] },
  adverse: { type: 'select', options: ['No', 'Yes'] },
};

async function renderKycCorrections() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="page-header"><h1>Corrections</h1></div><div class="cb-loading">Loading corrections…</div>`;
  if (hasAuthToken()) {
    try {
      const [kyc, docs] = await Promise.all([
        apiFetch('GET', '/corrections/kyc'),
        apiFetch('GET', '/corrections/documents'),
        // A mandate's whole-KYC approval status (used to decide whether it
        // still belongs in this list) lives on the client record, not the
        // correction rows — refresh it too or a just-approved mandate keeps
        // showing here until some other page happens to refresh it. A client
        // account cannot call the staff list endpoint, so it refreshes its
        // own case instead.
        State.currentRole === 'client' ? refreshMyClientProfile() : refreshClients(),
        // The Mandate Risk tab is derived from the task list, so it has to be
        // loaded here too rather than only on the Tasks screen.
        refreshKycTasks(),
      ]);
      State.kycCorrections = kyc.map(c => ({ ...c, id: c._id }));
      State.documentCorrections = docs.map(c => ({ ...c, id: c._id }));
    } catch (err) {
      content.innerHTML = `<div class="page-header"><h1>Corrections</h1></div><p style="color:var(--accent-red);padding:16px;">Failed to load corrections: ${err.message}</p>`;
      return;
    }
  }
  renderKycCorrectionsList();
}

// Groups correction items by mandate (client) so each renders as its own box
// instead of one long flat table mixing every client's fields together.
function kycGroupsByMandate(items) {
  const byClient = new Map();
  items.forEach(c => {
    if (!byClient.has(c.clientId)) byClient.set(c.clientId, []);
    byClient.get(c.clientId).push(c);
  });
  return Array.from(byClient.entries());
}

function renderKycCorrectionsList() {
  const content = document.getElementById('page-content');
  const scopeToOwn = c => State.currentRole !== 'rm' || State.clients.find(cl => cl.id === c.clientId)?.rm === currentRmName();

  const kycItems = State.kycCorrections.filter(scopeToOwn).map(item => ({
    ...item,
    clientName: resolveKycClient(item.clientId)?.name || 'Unknown',
  }));
  const docItems = State.documentCorrections.filter(scopeToOwn).map(item => ({
    ...item,
    clientName: resolveKycClient(item.clientId)?.name || 'Unknown',
    // Only a correction tied to one specific PDF page (the auto-checker's
    // format is always exactly "Page N") can be fixed by splicing in just
    // that page — anything else needs the full document re-uploaded.
    pageNum: /^Page (\d+)$/.exec(item.page || '')?.[1] || null,
  }));

  const kycStatusMeta = KYC_CORRECTION_STATUS_META;
  // Mandate-risk questionnaires are not DocumentCorrection rows — an
  // unanswered mandatory question is the outstanding item itself, so they are
  // derived from the task list rather than from a corrections collection.
  const mandateRiskItems = (State.kycTasks || []).filter(t =>
    (t.mandateRiskMissing || 0) > 0 && (t.mandateRiskStatus || 'draft') !== 'approved');

  content.innerHTML = `
    <div class="page-header">
      <h1>Corrections</h1>
      <p>Items flagged for follow-up${State.currentRole==='rm' ? ' on your clients' : ''}. Download the affected page, complete it, and upload the corrected version.</p>
    </div>

    <div class="tabs">
      <button class="tab-btn active" id="corrtab-btn-kyc" onclick="switchCorrectionsTab('kyc')">KYC Uploads (${kycItems.filter(c=>c.status!=='corrected').length})</button>
      <button class="tab-btn" id="corrtab-btn-docs" onclick="switchCorrectionsTab('docs')">Document Uploads (${docItems.filter(c=>c.status==='pending').length})</button>
      <button class="tab-btn" id="corrtab-btn-risk" onclick="switchCorrectionsTab('risk')">Mandate Risk (${mandateRiskItems.reduce((n, t) => n + (t.mandateRiskMissing || 0), 0)})</button>
    </div>

    <div id="corrtab-kyc" class="tab-content active">
      ${(() => {
        // A mandate only drops off this list once the whole KYC has been
        // approved (the explicit "Approve KYC" sign-off) — every individual
        // field correction being resolved is not the same thing: Compliance
        // still needs to review the questionnaire as a whole and approve it,
        // so it must keep showing here as a reminder until that happens.
        const openMandates = kycGroupsByMandate(kycItems).filter(([clientId]) => {
          const client = resolveKycClient(clientId);
          return clientKycWorkflowStatus(client) !== 'approved';
        });
        if (!openMandates.length) {
          return `<div class="card"><div class="card-body"><p style="text-align:center;color:var(--text-muted);padding:20px;">No KYC uploads.</p></div></div>`;
        }
        return openMandates.map(([clientId, items]) => {
        const openCount = items.filter(c=>c.status!=='corrected').length;
        const correctedCount = items.filter(c=>c.status==='corrected').length;
        return `
          <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
              <div>
                <div class="card-title">${items[0].mandateId} — ${items[0].clientName}</div>
                <div class="card-subtitle">${openCount} open · ${correctedCount} corrected</div>
              </div>
            </div>
            <div class="card-body" style="padding:0;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>KYC Issue</th>
                    <th>Page Ref.</th>
                    <th>Status</th>
                    <th style="text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(c => `
                    <tr style="${c.status!=='corrected'?'background:rgba(249,115,22,0.04);':''}cursor:pointer;" onclick="openKycCorrectionDetail('${c.id}')">
                      <td style="color:${c.status!=='corrected'?'var(--text-primary)':'var(--text-secondary)'};">
                        ${escapeHtml(c.issue)}
                        ${c.status==='needs_correction' && c.rejectionReason ? `<div style="font-size:11px;color:var(--accent-gold);margin-top:2px;">Compliance: ${escapeHtml(c.rejectionReason)}</div>` : ''}
                      </td>
                      <td><span style="color:var(--accent-orange);font-size:12px;">${escapeHtml(c.page)}</span></td>
                      <td>
                        <span class="status-badge ${kycStatusMeta[c.status]?.badge || 'status-pending'}">
                          ${kycStatusMeta[c.status]?.label || c.status}
                        </span>
                      </td>
                      <td onclick="event.stopPropagation()" style="text-align:right;white-space:nowrap;">
                        ${c.status==='resubmitted' && isCompliance(State.currentRole) ? `
                          <button class="btn-success btn-xs" onclick="updateKycCorrectionStatus('${c.id}','corrected')">Confirm</button>
                          <button class="btn-secondary btn-xs" onclick="denyKycCorrection('${c.id}')">Deny</button>
                        ` : c.status!=='corrected' ? `
                          <button class="btn-primary btn-xs" onclick="openKycCorrectionDetail('${c.id}')">Open field</button>
                        ` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
        }).join('');
      })()}
    </div>

    <div id="corrtab-docs" class="tab-content">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Document Uploads</div>
          <div class="card-subtitle">${docItems.filter(c=>c.status==='pending').length} pending · ${docItems.filter(c=>c.status==='corrected').length} corrected</div>
        </div>
        <div class="card-body">
          ${docItems.length === 0 ? `<p style="text-align:center;color:var(--text-muted);padding:20px;">No document uploads.</p>` : docItems.map(c => documentCorrectionItemHTML(c)).join('')}
        </div>
      </div>
    </div>

    <div id="corrtab-risk" class="tab-content">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Mandate Risk</div>
            <div class="card-subtitle">Questionnaires with mandatory questions still unanswered.</div>
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          ${mandateRiskItems.length === 0
            ? `<p style="text-align:center;color:var(--text-muted);padding:20px;">Nothing outstanding.</p>`
            : `<table class="data-table">
                <thead>
                  <tr>
                    <th>Risk Question</th>
                    <th>Section</th>
                    <th>Status</th>
                    <th style="text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${mandateRiskItems.flatMap(t => {
                    const status = t.mandateRiskStatus || 'draft';
                    const meta = status === 'under_review' ? KYC_CORRECTION_STATUS_META.resubmitted
                      : status === 'saved' ? { label: 'Saved', badge: 'status-neutral' }
                      : KYC_CORRECTION_STATUS_META.pending;
                    // One row per unanswered question, exactly like a KYC gap.
                    return (t.mandateRiskMissingFields || []).map(f => `
                      <tr style="background:rgba(249,115,22,0.04);">
                        <td>
                          Missing: ${escapeHtml(f.label)}
                          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${escapeHtml(t.clientName || '')} · ${escapeHtml(t.clientId || '')}</div>
                        </td>
                        <td><span style="color:var(--accent-orange);font-size:12px;">${escapeHtml(f.page)}</span></td>
                        <td><span class="status-badge ${meta.badge}">${escapeHtml(meta.label)}</span></td>
                        <td style="text-align:right;white-space:nowrap;">
                          <button class="btn-primary btn-xs" onclick="openMandateRisk('${escapeHtml(t.clientId)}')">Open question</button>
                        </td>
                      </tr>`);
                  }).join('')}
                </tbody>
              </table>`}
        </div>
      </div>
    </div>
  `;
}

// One focused correction item: says exactly which contract, which document
// type, which page, and what is missing — with the download/upload pair that
// resolves it — instead of dumping the whole contract at the reviewer.
function documentCorrectionItemHTML(c) {
  const canAct = State.currentRole === 'rm' || isCompliance(State.currentRole) || State.currentRole === 'client';
  const pageLabel = c.pageFrom
    ? (c.pageTo && c.pageTo !== c.pageFrom ? `Seite ${c.pageFrom}–${c.pageTo}` : `Seite ${c.pageFrom}`)
    : null;
  // "Vertrag → Seite 7 → Auftragsvertrag → Unterschrift des Kunden fehlt"
  const trail = ['Vertrag', pageLabel, c.documentType || c.docName]
    .filter(Boolean)
    .map(part => `<span>${escapeHtml(part)}</span>`)
    .join('<span style="color:var(--text-muted);margin:0 6px;">→</span>');
  const statusBadge = c.status === 'pending'
    ? '<span class="status-badge status-pending">Pending Correction</span>'
    : c.status === 'corrected'
      ? '<span class="status-badge status-approved">Corrected</span>'
      : '<span class="status-badge status-under-review">Awaiting Compliance Review</span>';

  // An item with no page range concerns the whole document; it is fixed by
  // downloading and re-uploading the document itself, so it is just as
  // actionable as a page-scoped one.
  const canFix = c.status !== 'corrected' && canAct;
  return `
    <div class="doc-item" style="align-items:flex-start;${c.status === 'pending' ? 'border-color:rgba(249,115,22,0.4);background:rgba(249,115,22,0.03);' : ''}">
      <div class="doc-info" style="flex:1;">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:2px;font-size:13px;font-weight:600;margin-bottom:4px;">${trail}</div>
        <div style="font-size:12.5px;color:var(--text-primary);margin-bottom:3px;">${escapeHtml(c.issue || '')}</div>
        ${c.remedy ? `<div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:4px;">${escapeHtml(c.remedy)}</div>` : ''}
        <div style="font-size:11px;color:var(--text-muted);">
          ${escapeHtml(c.clientName || '')} · ${escapeHtml(c.clientId || '')}${c.contractType ? ` · ${escapeHtml(c.contractType)}` : ''}
        </div>
      </div>
      <div class="doc-actions" style="flex-direction:column;align-items:flex-end;gap:6px;">
        ${statusBadge}
        ${canFix ? `
          <div style="display:flex;gap:6px;">
            <button class="btn-secondary btn-xs" onclick="downloadCorrectionPages('${escapeHtml(c.id)}')">${downloadIcon()} ${escapeHtml(pageLabel || 'Document')}</button>
            <button class="btn-secondary btn-xs" onclick="navigateTo('contract-prep')">Fix in Contract Tasks</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Drag-and-drop lives in Contract Tasks (see contractPrepCardHTML): each
// outstanding correction gets its own dropzone there, so a dropped file can
// only ever land on the correction it was dropped onto. Corrections itself is
// the read-only list of what is wrong.
function correctionDragOver(event, correctionId) {
  event.preventDefault();
  document.getElementById(`corrzone-${correctionId}`)?.classList.add('drag-over');
}
function correctionDragLeave(event, correctionId) {
  event.preventDefault();
  document.getElementById(`corrzone-${correctionId}`)?.classList.remove('drag-over');
}
function correctionDrop(event, correctionId) {
  event.preventDefault();
  document.getElementById(`corrzone-${correctionId}`)?.classList.remove('drag-over');
  const file = event.dataTransfer?.files?.[0];
  if (file) uploadCorrectedPages(correctionId, file);
}

// Downloads just this correction's page range. Uses a blob rather than a
// plain link so the Authorization header still travels with the request.
async function downloadCorrectionPages(correctionId) {
  try {
        const res = await fetch(`${API_BASE}/corrections/documents/${correctionId}/download`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Download failed');
    const blob = await res.blob();
    // A whole-document correction can be any file type the client uploaded, so
    // keep the server's own filename/extension rather than assuming PDF.
    const served = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = served || `correction-${correctionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('success', 'Downloaded the page that needs correcting.');
  } catch (err) {
    showToast('error', err.message || 'Failed to download the correction page.');
  }
}

function promptUploadCorrectedPages(correctionId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.docx,.doc,.jpg,.jpeg,.png';
  input.onchange = () => {
    const file = input.files[0];
    if (file) uploadCorrectedPages(correctionId, file);
  };
  input.click();
}

async function uploadCorrectedPages(correctionId, file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
        const res = await fetch(`${API_BASE}/corrections/documents/${correctionId}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || 'Upload failed');
    if (result.validationPassed) {
      showToast('success', 'Corrected page merged into the contract and verified.');
    } else {
      showToast('warning', `Page merged, but still not complete: ${result.detail || 'validation failed'}`);
    }
    // Re-render wherever the fix was actually performed.
    if (State.currentPage === 'contract-prep') await renderContractPreparation();
    else await renderKycCorrections();
  } catch (err) {
    showToast('error', err.message || 'Failed to upload the corrected page.');
  }
}

/* ============================================================
   PAGE: CONTRACT PREPARATION (draft contracts)
   Blank → saved version → final. Document work only: no accept,
   approve or request-info actions live here.
   ============================================================ */
// Re-reads the signed-in client's own case. Staff use refreshClients(); a
// client account has no access to that list endpoint and owns exactly one
// case, so it refreshes through /clients/me instead.
async function refreshMyClientProfile() {
  try {
    const me = await apiFetch('GET', '/clients/me');
    if (me) {
      State.myClientProfile = { ...me, id: me.clientId };
      if (me.type) State.clientType = me.type;
      // Same reason as refreshClients(): the Contract Tasks count comes from
      // the mandate itself, so it moves when the mandate does.
      updateContractTasksBadge();
    }
  } catch (err) {
    console.warn('Could not refresh client profile:', err.message);
  }
  return State.myClientProfile;
}

async function renderContractPreparation() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="page-header"><h1>Contract Tasks</h1></div><div class="cb-loading">Loading contracts…</div>`;

  // A client account has exactly one case and cannot call the staff list
  // endpoint (it 403s), so resolve its own profile instead of refreshing the
  // whole client list. Everything below is then identical for every role.
  const isClientRole = State.currentRole === 'client';
  await Promise.all([
    isClientRole ? refreshMyClientProfile() : refreshClients(),
    // Contract Tasks now hosts the fix-this-page dropzones, so it needs the
    // open document corrections, not just the contract state.
    refreshCorrectionsBadge(),
  ]);
  const scoped = isClientRole
    ? (State.myClientProfile ? [State.myClientProfile] : [])
    : State.clients.filter(c => State.currentRole !== 'rm' || c.rm === currentRmName());
  if (!scoped.length) {
    content.innerHTML = `
      <div class="page-header"><h1>Contract Tasks</h1></div>
      <div class="card"><div class="card-body"><p style="text-align:center;color:var(--text-muted);padding:20px;">No contracts to prepare yet.</p></div></div>`;
    return;
  }

  const states = await Promise.all(scoped.map(async (c) => {
    try { return await apiFetch('GET', `/clients/${c.id}/contract-preparation`); }
    catch (_) { return null; }
  }));

  // A mandate whose paperwork is entirely approved is finished business. It
  // stays reachable, but it stops sitting in a list of things to do — a task
  // list that never shortens is one nobody reads.
  const live = states.filter(Boolean);
  const isSettled = (s) => {
    const p = s.documentProgress;
    return Boolean(p && p.total > 0 && p.completed === p.total && s.allApproved);
  };
  const outstanding = live.filter((s) => !isSettled(s));
  const settled = live.filter(isSettled);

  content.innerHTML = `
    <div class="page-header">
      <h1>Contract Tasks</h1>
      <p>Download each document, review it, and upload the completed version back onto the same field.</p>
    </div>
    ${outstanding.length
      ? outstanding.map(s => contractPrepCardHTML(s)).join('')
      : `<div class="card"><div class="card-body" style="text-align:center;padding:28px;">
           <div style="font-size:15px;font-weight:600;margin-bottom:4px;">Nothing outstanding</div>
           <div style="font-size:13px;color:var(--text-muted);">Every mandate's paperwork is in and approved.</div>
         </div></div>`}

    ${settled.length ? `
      <div class="card" style="margin-top:8px;">
        <div class="card-header" style="padding:12px 16px;">
          <div>
            <div class="card-title">Completed (${settled.length})</div>
            <div class="card-subtitle">All documents uploaded and approved by Compliance</div>
          </div>
          <button class="btn-secondary btn-xs" onclick="toggleSettledMandates()">
            ${State._showSettledMandates ? 'Hide' : 'Show'}
          </button>
        </div>
        <div class="card-body" style="padding:0 16px 12px;${State._showSettledMandates ? '' : 'display:none;'}" id="settled-mandates">
          ${settled.map(s => `
            <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--border-subtle);">
              <span style="color:var(--accent-green);font-size:15px;">✓</span>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:600;">${escapeHtml(s.clientName)} — ${escapeHtml(s.clientId)}</div>
                <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(s.contractType || 'Contract')} · ${s.documentProgress.total} document${s.documentProgress.total === 1 ? '' : 's'}, all approved</div>
              </div>
              <button class="btn-secondary btn-xs" onclick="openClientDetail('${escapeHtml(s.clientId)}')">Open case</button>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function toggleSettledMandates() {
  State._showSettledMandates = !State._showSettledMandates;
  renderContractPreparation();
}

// Findings from the automatic signature/checkbox checks are switched off on
// this page for now: every document is simply downloaded, reviewed by hand, and
// uploaded again. The detection, the correction records and the per-page
// download/merge all still work — flip this back to true and the flagged items,
// their warnings and their per-page fields reappear exactly as before.
const SHOW_DOCUMENT_CORRECTIONS = false;

// A flag raised by a person is not one of those findings: Compliance wrote a
// reason and is asking for the document again, so it always shows.
const isManualFlag = (c) => c.ruleKind === 'manual';

// One card per client, split by document. Every document reads the same way:
// a Blank version to download and an Uploaded version to send back. The
// intermediate saved/final/signed distinction is deliberately not surfaced as
// separate rows — it is one document moving through states, and Corrections is
// where the detail of what still needs signing lives.
function contractPrepCardHTML(s) {
  // resolveKycClient already handles both stores (staff list + the client's
  // own profile), so this works for every role.
  const client = resolveKycClient(s.clientId);
  const docs = client?.documents || [];
  const isContractDoc = (d) => ['Template', 'Draft Contract', 'Final Contract', 'Signed Contract'].includes(d.type);
  // Everything else on this card comes from what the Vertrag actually asked
  // for (the required-documents checklist chosen at contract creation) plus
  // anything since uploaded against it. Nothing is invented: a category with
  // no documents simply isn't shown.
  // The mandate-risk questionnaire is a document of the mandate, but it has
  // its own dedicated section below — listing it here as well would show the
  // same thing twice.
  // Other Documents is for the supporting paperwork the Vertrag asked for.
  // A contract never belongs here — neither by document type nor by being one
  // of the known contract packages under another slot's name. Its corrections
  // are not lost: anything with no row of its own is listed under Contract
  // (see the grouping below).
  const supporting = docs.filter(d => !isContractDoc(d)
    // The KYC and mandate-risk sheets are output of their questionnaires, not
    // contract paperwork. They are reviewed in KYC & Mandate Risk Tasks and
    // read in All Cases; showing them here would invite a second, competing
    // place to act on them.
    && !['Fragebogen zum Mandatsrisiko', 'KYC Questionnaire'].includes(d.name)
    && !inferContractTemplateId(d.name));
  // A checklist entry with no file is a requirement that hasn't been met yet,
  // not a document the client has provided.

  // The contract's uploaded state, newest wins: a signed upload supersedes a
  // plain saved one, and a submitted final supersedes both.
  const uploaded = s.final
    ? { ...s.final, stage: 'Final contract submitted' }
    : s.signed && s.signed.received
      ? { docId: s.signed.docId, date: s.signed.date, uploadedBy: s.signed.uploadedBy, stage: 'Signed version received' }
      : s.draft
        ? { ...s.draft, stage: 'Saved version uploaded' }
        : null;

  // A correction belongs to the document it was raised against, so it is shown
  // inside that document's row. Only issues on the contract file itself belong
  // under Contract — an ID/passport problem reported there would read as if the
  // contract were at fault.
  const openCorrections = openCorrectionsFor(s.clientId)
    .filter(c => SHOW_DOCUMENT_CORRECTIONS || isManualFlag(c));
  const supportingDocIds = new Set(supporting.map(d => String(d.docId || d.id)));
  const correctionsByDoc = new Map();
  const contractCorrections = [];
  for (const c of openCorrections) {
    // Anything that cannot be placed on a row of its own stays with the
    // contract rather than disappearing — an issue nobody can see is an issue
    // nobody fixes.
    if (!c.docId || !supportingDocIds.has(String(c.docId))) { contractCorrections.push(c); continue; }
    if (!correctionsByDoc.has(String(c.docId))) correctionsByDoc.set(String(c.docId), []);
    correctionsByDoc.get(String(c.docId)).push(c);
  }
  const correctionsFor = (docId) => (correctionsByDoc.get(String(docId)) || []).map(correctionFixHTML).join('');

  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div>
          <div class="card-title">${escapeHtml(s.clientName)} — ${escapeHtml(s.clientId)}</div>
          <div class="card-subtitle">${escapeHtml(s.contractType || 'Contract')}</div>
        </div>
        ${(() => {
          if (SHOW_DOCUMENT_CORRECTIONS && s.openIssues > 0) {
            return `<span class="status-badge status-pending">${s.openIssues} item${s.openIssues === 1 ? '' : 's'} to correct</span>`;
          }
          // The mandate's completion, stated as the documents it is actually
          // made of — the same figure the dashboards show, so the two can
          // never disagree about what "complete" means.
          const p = s.documentProgress;
          if (!p || !p.total) return uploaded ? `<span class="status-badge status-approved">Complete</span>` : '';
          return `
            <div style="text-align:right;min-width:150px;">
              <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:4px;">
                <span style="font-size:12px;color:var(--text-secondary);">${p.completed} of ${p.total} documents</span>
                <span class="status-badge ${p.percent === 100 ? 'status-approved' : 'status-pending'}">${p.percent}%</span>
              </div>
              <div class="progress-bar-wrap" style="width:150px;">
                <div class="progress-bar" style="width:${p.percent}%;background:${progressColor(p.percent)};"></div>
              </div>
            </div>`;
        })()}
      </div>
      <div class="card-body" style="padding-top:4px;">

        ${contractPrepGroup('Contract', `
          ${contractPrepRow({
            title: 'Blank version',
            state: s.blank && s.blank.hasFile ? 'ready' : 'missing',
            stateLabel: s.blank && s.blank.hasFile ? 'Ready to download' : 'Not generated yet',
            meta: s.blank ? escapeHtml(s.blank.name) : 'Not generated yet',
            actions: s.blank && s.blank.hasFile
              ? `<button class="btn-secondary btn-xs" onclick="downloadDoc('${escapeHtml(s.clientId)}','${escapeHtml(s.blank.docId)}')">${downloadIcon()} Download Blank</button>`
              : '',
          })}
          ${contractPrepRow({
            title: 'Uploaded version',
            state: !uploaded ? 'missing'
              : (s.signed && s.signed.received && s.signedStatus === 'approved') || s.final ? 'approved'
              : s.signedStatus === 'info-requested' ? 'flagged'
              : 'uploaded',
            open: contractCorrections.length > 0,
            meta: uploaded
              ? `${escapeHtml(uploaded.stage)}${uploaded.date ? ` · ${escapeHtml(uploaded.date)}` : ''}${uploaded.uploadedBy ? ` by ${escapeHtml(uploaded.uploadedBy)}` : ''}${uploaded.versionCount ? ` · ${uploaded.versionCount} earlier version${uploaded.versionCount === 1 ? '' : 's'}` : ''}`
              : 'Fill in the blank version, then upload it here — signatures and checkboxes are checked on upload',
            warn: contractCorrections.length
              ? `${contractCorrections.length} item${contractCorrections.length === 1 ? '' : 's'} still missing — fix the page below, or upload a complete replacement`
              : null,
            // Same as the other documents: the per-item fields take a fix for
            // one issue, and the general field stays available for replacing
            // the whole contract, which is often the easier way to resolve it.
            extra: contractDropzoneHTML(s.clientId, s.templateId || '', Boolean(uploaded)),
            // Review is download → check by hand → approve or send back.
            actions: uploaded
              ? `<button class="btn-secondary btn-xs" onclick="downloadDoc('${escapeHtml(s.clientId)}','${escapeHtml(uploaded.docId)}')">${downloadIcon()} Download</button>`
                + (isCompliance(State.currentRole) && s.signedStatus !== 'approved' ? `
                  <button class="btn-success btn-xs" onclick="acceptDocument('${escapeHtml(s.clientId)}','${escapeHtml(uploaded.docId)}')">✓ Approve</button>
                  <button class="btn-danger btn-xs" onclick="promptFlagDocument('${escapeHtml(s.clientId)}','${escapeHtml(uploaded.docId)}')">⚑ Flag</button>` : '')
              : '',
          })}
          ${contractCorrections.map(correctionFixHTML).join('')}
        `)}



        ${(() => {
          const others = supporting;
          return others.length ? contractPrepGroup('Other Documents', `
          ${others.map(d => contractPrepRow({
            title: decodeEntities(d.name),
            state: docState(d),
            open: Boolean(correctionsByDoc.get(String(d.docId || d.id))),
            meta: d.filePath
              ? `<span class="status-badge status-${escapeHtml(d.status || 'pending')}">${statusLabel(d.status || 'pending')}</span>`
                + `${d.date && d.date !== '-' ? ` &nbsp;uploaded ${escapeHtml(d.date)}` : ''}`
              : 'Requested in the contract, not provided yet',
            warn: (SHOW_DOCUMENT_CORRECTIONS || d.status === 'info-requested') ? d.missingNote : null,
            // Both ways back in, when something has been flagged.
            //
            // The correction's own field takes the fix for that specific issue.
            // But an issue is often easier to resolve by redoing the document
            // than by patching the page it was raised against, and hiding the
            // ordinary upload field left no way to do that — the only field on
            // screen asked for a corrected page, so a whole replacement had
            // nowhere to go.
            extra: correctionsFor(d.docId || d.id)
              + documentDropzoneHTML(s.clientId, d.docId || d.id,
                  correctionsByDoc.has(String(d.docId || d.id))
                    ? 'complete replacement document'
                    : (d.filePath ? 'replacement' : 'document')),
            // Download it, read it, then decide: approve it, or send it back
            // with a reason. Re-uploading happens on the same field above.
            actions: d.filePath
              ? `<button class="btn-secondary btn-xs" onclick="downloadDoc('${escapeHtml(s.clientId)}','${escapeHtml(d.docId || d.id)}')">${downloadIcon()} Download</button>`
                + (isCompliance(State.currentRole) && d.status !== 'approved' ? `
                  <button class="btn-success btn-xs" onclick="acceptDocument('${escapeHtml(s.clientId)}','${escapeHtml(d.docId || d.id)}')">✓ Approve</button>
                  <button class="btn-danger btn-xs" onclick="promptFlagDocument('${escapeHtml(s.clientId)}','${escapeHtml(d.docId || d.id)}')">⚑ Flag</button>` : '')
              : '',
          })).join('')}
        `) : '';
        })()}



        ${(s.relatedParties || []).length ? contractPrepGroup(`Related-Party KYC (${s.relatedParties.length})`, `
          ${s.relatedParties.map(p => {
            const meta = p.status === 'approved'
              ? KYC_CORRECTION_STATUS_META.corrected
              : p.status === 'under_review'
                ? KYC_CORRECTION_STATUS_META.resubmitted
                : KYC_CORRECTION_STATUS_META.pending;
            return contractPrepRow({
              title: `${escapeHtml(p.role)}${p.name ? ` — ${escapeHtml(p.name)}` : ''}`,
              meta: `<span class="status-badge ${meta.badge}">${escapeHtml(meta.label)}</span>${p.missingCount ? ` &nbsp;${p.missingCount} field${p.missingCount === 1 ? '' : 's'} outstanding` : ''}${p.sourceDocument ? ` &nbsp;·&nbsp; required by: ${escapeHtml(decodeEntities(p.sourceDocument))}` : ''}`,
              warn: null,
              actions: `<button class="btn-primary btn-xs" onclick="openRelatedPartyKyc('${escapeHtml(s.clientId)}','${escapeHtml(p.partyId)}')">${p.status === 'draft' ? 'Fill KYC' : 'Open KYC'}</button>`,
            });
          }).join('')}
        `) : ''}



      </div>
    </div>
  `;
}

// Some document names arrive already HTML-escaped (e.g. a requirement named
// "... (Zefix, &lt; 12 months)"). Decode them back to plain text here; the
// caller escapes exactly once when rendering, so the entity never shows
// through as literal "&lt;".
function decodeEntities(value) {
  const el = document.createElement('textarea');
  el.innerHTML = String(value ?? '');
  return el.value;
}

// Uploading against an outstanding checklist requirement fills that specific
// slot rather than creating a loose extra document.
function promptUploadRequiredDocument(clientId, docId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.docx,.doc,.jpg,.jpeg,.png';
  input.onchange = () => {
    if (input.files[0]) uploadRequiredDocumentFile(clientId, docId, input.files[0]);
  };
  input.click();
}

// Shared by the file picker and the row's drop field, so a dragged file and a
// browsed one are the same upload.
async function uploadRequiredDocumentFile(clientId, docId, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('type', 'Uploaded Document');
  formData.append('docId', docId);
  await postClientDocument(clientId, formData, 'Document');
}

// Manual Compliance review, now that automatic verification is off: accept
// the document as-is, or record exactly what is wrong and on which page.
async function acceptDocument(clientId, docId) {
  try {
    await apiFetch('POST', `/clients/${clientId}/documents/${docId}/approve`, {});
    showToast('success', 'Document accepted.');
    await refreshClients();
    renderContractPreparation();
  } catch (err) {
    showToast('error', err.message || 'Could not accept this document.');
  }
}

async function promptFlagDocument(clientId, docId) {
  const issue = prompt('What is wrong with this document? (shown to whoever has to fix it)');
  if (issue === null || !issue.trim()) return;
  const page = prompt('Which page? Leave blank if it applies to the whole document.');
  if (page === null) return;
  try {
    await apiFetch('POST', `/clients/${clientId}/documents/${docId}/flag`, { issue: issue.trim(), page: page.trim() || undefined });
    showToast('warning', 'Document flagged — it now appears in Corrections.');
    await Promise.all([refreshClients(), refreshCorrectionsBadge()]);
    renderContractPreparation();
  } catch (err) {
    showToast('error', err.message || 'Could not flag this document.');
  }
}

/* ============================================================
   RELATED-PARTY KYC FORM
   Same shared questionnaire the client's own KYC uses, bound to one connected
   person (settlor, trustee, ...) instead of the client record.
   ============================================================ */
/* ============================================================
   MANDATE RISK QUESTIONNAIRE (Fragebogen zum Mandatsrisiko)
   Part of every Vertrag, and reachable from KYC Tasks. Answers already
   established by the KYC or the contract are carried in automatically and
   land as "saved" — the RM only fills what genuinely isn't known yet.
   ============================================================ */
function openMandateRisk(clientId) {
  State._activeMandateRisk = { clientId };
  navigateTo('mandate-risk');
}

// Read-only reference for the Fragebogen zum Mandatsrisiko, mirroring the
// KYC Schema screen: the same field list the questionnaire renders, so the
// two are visibly one definition rather than two that could drift.
async function renderMandateRiskSchema() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="page-header"><h1>Mandate Risk Schema</h1></div><div class="cb-loading">Loading…</div>`;

  // The schema is a property of the questionnaire, not of any one mandate, so
  // it is read from its own endpoint rather than from whichever client
  // happened to be first in the list.
  let fields = [];
  let removed = [];
  try {
    const data = await apiFetch('GET', '/mandate-risk-schema');
    fields = data.fields || [];
    removed = data.removed || [];
  } catch (err) {
    content.innerHTML = `
      <div class="page-header"><h1>Mandate Risk Schema</h1></div>
      <p style="color:var(--accent-red);padding:16px;">Failed to load the mandate-risk schema: ${escapeHtml(err.message)}</p>`;
    return;
  }
  const canEdit = isCompliance(State.currentRole);

  const pages = [];
  const byPage = new Map();
  fields.forEach((f) => {
    if (!byPage.has(f.page)) { byPage.set(f.page, { page: f.page, idx: pages.length, fields: [] }); pages.push(byPage.get(f.page)); }
    byPage.get(f.page).fields.push(f);
  });
  const typeLabels = { text: 'Text', date: 'Date', select: 'Dropdown', textarea: 'Long text', number: 'Number' };

  content.innerHTML = `
    <div class="page-header">
      <h1>Mandate Risk Schema</h1>
      <p>The Fragebogen zum Mandatsrisiko, exactly as the questionnaire renders it.${canEdit ? ' Add or remove a question here and every mandate&rsquo;s questionnaire follows immediately.' : ' Compliance maintains this list.'}</p>
    </div>
    <div class="info-box" style="margin-bottom:20px;">
      <p><strong>(*r)</strong> marks a question that feeds the mandate-risk calculation. <strong>Compliance</strong> marks a section only Compliance or the Geschäftsleitung completes.</p>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:12px;flex-wrap:wrap;">
      <div style="font-size:13px;color:var(--text-muted);">${pages.length} section${pages.length === 1 ? '' : 's'} · ${fields.length} questions total</div>
      <button class="btn-primary btn-sm" onclick="openTasksTab('risk')">Open Mandate Risk Tasks</button>
    </div>
    ${pages.map(sec => `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-header" style="padding:12px 16px;">
          <div class="card-title">${escapeHtml(sec.page)}</div>
          ${canEdit ? `<button class="btn-secondary btn-xs" onclick="toggleAddMandateRiskField(${sec.idx})">+ Add Question</button>` : ''}
        </div>
        <div class="card-body" style="padding:0 16px 14px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);border-bottom:1px solid var(--border-default);">
                <th style="padding:8px 0;text-align:left;">Question</th>
                <th style="padding:8px 6px;text-align:left;">Control</th>
                <th style="padding:8px 6px;text-align:left;">Options</th>
                <th style="padding:8px 0;text-align:center;">Required</th>
                ${canEdit ? `<th style="padding:8px 0;text-align:right;"></th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${sec.fields.map(f => `
                <tr style="border-bottom:1px solid var(--border-subtle);">
                  <td style="padding:9px 0;font-size:13px;">
                    ${escapeHtml(f.label)}
                    ${f.affectsRisk ? `<span style="color:var(--accent-orange);font-size:11px;margin-left:6px;">(*r)</span>` : ''}
                    ${f.complianceOnly ? `<span style="color:var(--text-muted);font-size:11px;margin-left:6px;">Compliance</span>` : ''}
                    ${f.builtIn === false ? `<span style="color:var(--accent-blue);font-size:11px;margin-left:6px;">Added</span>` : ''}
                  </td>
                  <td style="padding:9px 6px;font-size:12px;">${escapeHtml(typeLabels[f.type] || f.type)}</td>
                  <td style="padding:9px 6px;font-size:11px;color:var(--text-muted);">${f.options && f.options.length ? f.options.map(escapeHtml).join(', ') : '—'}</td>
                  <td style="padding:9px 0;text-align:center;font-size:12px;">${f.required ? '<span style="color:var(--accent-red);">Yes</span>' : '<span style="color:var(--text-muted);">No</span>'}</td>
                  ${canEdit ? `<td style="padding:9px 0;text-align:right;">
                    <button class="btn-secondary btn-xs" onclick="deleteMandateRiskField('${escapeHtml(f.key)}','${escapeHtml(f.label)}')">Delete</button>
                  </td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${canEdit ? mandateRiskFieldFormHTML(sec) : ''}
        </div>
      </div>
    `).join('')}

    ${canEdit && removed.length ? `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-header" style="padding:12px 16px;"><div class="card-title">Removed Questions (${removed.length})</div></div>
        <div class="card-body" style="padding:0 16px 14px;">
          <p style="font-size:12px;color:var(--text-muted);padding:8px 0;">These are part of the printed Fragebogen but are currently switched off. Nobody is asked them, and they are not required for submission.</p>
          ${removed.map(f => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--border-subtle);">
              <div style="flex:1;font-size:13px;">${escapeHtml(f.label)}<span style="color:var(--text-muted);font-size:11px;margin-left:6px;">${escapeHtml(f.page)}</span></div>
              <button class="btn-secondary btn-xs" onclick="restoreMandateRiskField('${escapeHtml(f.key)}')">Restore</button>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

// Compliance adds a question to a named section. Everything the questionnaire
// needs to render and validate the new question is collected here, so an added
// question behaves exactly like a printed one. The form sits inside the section
// it will add to, so there is never any doubt where the question lands.
function mandateRiskFieldFormHTML(sec) {
  const i = sec.idx;
  return `
    <div id="mrf-form-${i}" style="display:none;border-top:1px solid var(--border-default);margin-top:10px;padding-top:14px;">
      <div class="form-group">
        <label class="form-label">Question</label>
        <input type="text" class="form-input" id="mrf-label-${i}" placeholder="e.g. Herkunft der Barbestände">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Control</label>
          <select class="form-input" id="mrf-type-${i}" onchange="document.getElementById('mrf-options-row-${i}').style.display = this.value === 'select' ? '' : 'none';">
            <option value="text">Text</option>
            <option value="textarea">Long text</option>
            <option value="select">Dropdown</option>
            <option value="date">Date</option>
            <option value="number">Number</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Required</label>
          <select class="form-input" id="mrf-required-${i}">
            <option value="yes">Yes — must be answered before submission</option>
            <option value="no">No — optional</option>
          </select>
        </div>
      </div>
      <div class="form-group" id="mrf-options-row-${i}" style="display:none;">
        <label class="form-label">Dropdown options (comma separated)</label>
        <input type="text" class="form-input" id="mrf-options-${i}" placeholder="tief, mittel, hoch">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group">
          <label class="form-label">Feeds the risk rating</label>
          <select class="form-input" id="mrf-risk-${i}"><option value="no">No</option><option value="yes">Yes (*r)</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Answered by</label>
          <select class="form-input" id="mrf-who-${i}"><option value="rm">RM / client</option><option value="compliance">Compliance only</option></select>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button class="btn-secondary btn-sm" onclick="toggleAddMandateRiskField(${i})">Cancel</button>
        <button class="btn-primary btn-sm" onclick="submitAddMandateRiskField(${i},'${escapeHtml(sec.page)}')">Add Question</button>
      </div>
    </div>`;
}

function toggleAddMandateRiskField(i) {
  const form = document.getElementById(`mrf-form-${i}`);
  if (!form) return;
  form.style.display = form.style.display === 'none' ? '' : 'none';
  if (form.style.display === '') document.getElementById(`mrf-label-${i}`)?.focus();
}

async function submitAddMandateRiskField(i, page) {
  const label = document.getElementById(`mrf-label-${i}`).value.trim();
  if (!label) { showToast('error', 'Enter the question text.'); return; }
  const type = document.getElementById(`mrf-type-${i}`).value;
  const options = document.getElementById(`mrf-options-${i}`).value;
  if (type === 'select' && !options.trim()) { showToast('error', 'A dropdown needs at least one option.'); return; }
  try {
    await apiFetch('POST', '/mandate-risk-schema/fields', {
      label, page, type, options,
      required: document.getElementById(`mrf-required-${i}`).value === 'yes',
      affectsRisk: document.getElementById(`mrf-risk-${i}`).value === 'yes',
      complianceOnly: document.getElementById(`mrf-who-${i}`).value === 'compliance',
    });
    showToast('success', 'Question added to the mandate-risk questionnaire.');
    renderMandateRiskSchema();
  } catch (err) {
    showToast('error', err.message || 'Could not add the question.');
  }
}

async function deleteMandateRiskField(key, label) {
  if (!confirm(`Remove "${decodeEntities(label)}" from the mandate-risk questionnaire?\n\nIt stops being asked and stops being required for submission. Answers already given are kept.`)) return;
  try {
    await apiFetch('DELETE', `/mandate-risk-schema/fields/${encodeURIComponent(key)}`);
    showToast('success', 'Question removed.');
    renderMandateRiskSchema();
  } catch (err) {
    showToast('error', err.message || 'Could not remove the question.');
  }
}

async function restoreMandateRiskField(key) {
  try {
    await apiFetch('POST', `/mandate-risk-schema/fields/${encodeURIComponent(key)}/restore`, {});
    showToast('success', 'Question restored.');
    renderMandateRiskSchema();
  } catch (err) {
    showToast('error', err.message || 'Could not restore the question.');
  }
}

async function renderMandateRisk() {
  const content = document.getElementById('page-content');
  const ctx = State._activeMandateRisk;
  if (!ctx) {
    content.innerHTML = `<div class="page-header"><h1>Mandate Risk</h1><p>No mandate selected.</p></div>`;
    return;
  }
  content.innerHTML = `<div class="page-header"><h1>Mandate Risk</h1></div><div class="cb-loading">Loading…</div>`;

  let data;
  try { data = await apiFetch('GET', `/clients/${escapeHtml(ctx.clientId)}/mandate-risk`); }
  catch (err) {
    content.innerHTML = `<div class="page-header"><h1>Mandate Risk</h1></div><p style="color:var(--accent-red);padding:16px;">${escapeHtml(err.message)}</p>`;
    return;
  }

  const prefilled = new Set(data.prefilledKeys || []);
  const isComp = isCompliance(State.currentRole);
  const readOnly = data.status === 'approved';
  const pages = [];
  const byPage = new Map();
  data.fields.forEach((f) => {
    if (!byPage.has(f.page)) { byPage.set(f.page, { page: f.page, fields: [] }); pages.push(byPage.get(f.page)); }
    byPage.get(f.page).fields.push(f);
  });

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <button class="btn-secondary btn-sm" onclick="navigateTo('contract-prep')">← Back to Contract Tasks</button>
      <div>
        <h1 style="font-size:20px;font-weight:700;">Fragebogen zum Mandatsrisiko</h1>
        <div style="color:var(--text-secondary);font-size:13px;">${escapeHtml(data.clientName)} · ${escapeHtml(data.clientId)}</div>
      </div>
    </div>
    ${data.status === 'under_review' ? `
      <div class="kyc-verify-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <span style="flex:1;"><strong>Under Review by Compliance.</strong> ${isComp
          ? `Confirm or send back each answer, then approve the questionnaire if it is correct.`
          : `Compliance must review every answer before this questionnaire is complete.`}</span>
        ${isComp ? `<button type="button" class="btn-success btn-sm" onclick="approveAllMandateRisk('${escapeHtml(ctx.clientId)}')">Approve Mandate Risk</button>` : ''}
      </div>
    ` : data.status === 'approved' ? `
      <div class="kyc-verify-banner kyc-verify-banner-approved">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="8,12 11,15 16,9"/></svg>
        <span class="status-badge status-approved">Approved by Compliance</span>
      </div>
    ` : ''}
    <div class="info-box" style="margin-bottom:20px;">
      <p>Fields marked <strong>pre-filled</strong> were carried over from the KYC and the contract — check them, and complete the rest.
      Questions marked <strong>(*r)</strong> feed the mandate-risk calculation.
      The <strong>Compliance &amp; Geschäftsleitung</strong> section is open to you too — fill in what you have; it never blocks submitting, and Compliance confirms it on review.</p>
    </div>

    <form id="mandate-risk-form">
      ${pages.map(sec => `
        <div class="card" data-kyc-page="${escapeHtml(sec.page)}" style="margin-bottom:16px;">
          <div class="card-header" style="padding:12px 16px;"><div style="font-size:14px;font-weight:700;">${escapeHtml(sec.page)}</div></div>
          <div class="card-body">
            ${sec.fields.map(f => {
              const underReview = data.status === 'under_review';
              // Compliance may still complete its own sections while reviewing;
              // everything else is frozen while it is being judged.
              //
              // While the questionnaire is still being filled in, section 7
              // (Compliance & Geschäftsleitung) is open to the RM as well — it
              // is part of the same sheet they complete and hand over, and
              // flagging a question "Please Fill In" on a field nobody could
              // type into is what made this page unusable. Only the client
              // portal stays out of it.
              const isClientUser = State.currentRole === 'client';
              const locked = readOnly || underReview
                ? !(underReview && isComp && f.complianceOnly)
                : (f.complianceOnly && isClientUser);
              const value = data.answers?.[f.key] || '';
              const decision = (data.reviews || {})[f.key] || null;
              // Only an answered, non-Compliance question is something for a
              // reviewer to judge.
              const reviewable = underReview && isComp && !f.complianceOnly && Boolean(String(value ?? '').trim());
              return `
                <div style="margin-bottom:14px;">
                  ${kycEditableFieldHTML(
                    { key: f.key, label: `${escapeHtml(f.label)}${f.affectsRisk ? ' (*r)' : ''}`, type: f.type, options: f.options, required: f.required },
                    { page: sec.page, value, disabled: locked, marginBottom: '2px', submitted: underReview || readOnly }
                  )}
                  ${decision ? `<div style="font-size:11px;margin-top:2px;color:${decision.status === 'approved' ? 'var(--status-approved)' : 'var(--accent-gold)'};">${decision.status === 'approved' ? '✓ Confirmed by Compliance' : `⚑ Sent back: ${escapeHtml(decision.reason || '')}`}</div>` : ''}
                  ${reviewable && !decision ? `
                    <div style="display:flex;gap:6px;margin-top:4px;">
                      <button type="button" class="kyc-tick-btn" title="Confirm this answer" onclick="reviewMandateRiskField('${escapeHtml(ctx.clientId)}','${escapeHtml(f.key)}','approve')">✓</button>
                      <button type="button" class="kyc-flag-btn" title="Send this question back" onclick="reviewMandateRiskField('${escapeHtml(ctx.clientId)}','${escapeHtml(f.key)}','flag')">⚑</button>
                    </div>` : ''}
                  ${prefilled.has(f.key) && !underReview ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Pre-filled from KYC / contract — please confirm</div>` : ''}
                  ${f.complianceOnly && !isComp && !isClientUser ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Compliance &amp; Geschäftsleitung section — fill in what you have; Compliance confirms it on review</div>` : ''}
                  ${f.complianceOnly && isClientUser ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Completed by Compliance</div>` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>
      `).join('')}
      ${readOnly ? '' : data.status === 'under_review' ? `
        ${isComp ? `
          <!-- Reviewing means reading down the whole questionnaire. Putting the
               decision only in the banner at the top meant scrolling back up
               through every question to act on what you had just read. -->
          <div class="kyc-verify-banner" style="margin-bottom:32px;">
            <span style="flex:1;">
              <strong>Finished reviewing?</strong>
              ${(() => {
                const answered = data.fields.filter(f => !f.complianceOnly && String(data.answers?.[f.key] ?? '').trim());
                const decided = answered.filter(f => (data.reviews || {})[f.key]);
                return decided.length === answered.length && answered.length
                  ? ` All ${answered.length} answers confirmed.`
                  : ` ${decided.length} of ${answered.length} answers have a decision — approving accepts the rest as they stand.`;
              })()}
            </span>
            <button type="button" class="btn-success btn-sm" onclick="approveAllMandateRisk('${escapeHtml(ctx.clientId)}')">Approve Mandate Risk</button>
          </div>
        ` : `
          <div style="text-align:right;font-size:12px;color:var(--text-muted);margin-bottom:32px;">
            <span class="status-badge status-under-review">Under Review by Compliance</span>
          </div>
        `}
      ` : `
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-bottom:32px;">
          <button type="button" class="btn-secondary" onclick="saveMandateRisk(false)">Save</button>
          <button type="button" class="btn-primary" onclick="saveMandateRisk(true)">Submit for Review</button>
        </div>
      `}
    </form>
  `;
}

async function saveMandateRisk(submit) {
  const ctx = State._activeMandateRisk;
  if (!ctx) return;
  const answers = collectKycControlValues(document.getElementById('mandate-risk-form'));
  try {
    const res = await apiFetch('PUT', `/clients/${escapeHtml(ctx.clientId)}/mandate-risk`, { answers, submit });
    showToast('success', submit ? 'Submitted for Compliance review.' : 'Saved.');
    if (submit) navigateTo('contract-prep'); else renderMandateRisk();
    return res;
  } catch (err) {
    showToast('error', err.message || 'Could not save the questionnaire.');
  }
}

// DEPRECATED: approval happens in KYC & Mandate Risk Tasks now, where the
// questionnaire is reviewed question by question (see approveAllMandateRisk).
// Kept because the endpoint it calls is still the whole-form sign-off.
async function approveMandateRisk() {
  const ctx = State._activeMandateRisk;
  if (!ctx) return;
  try {
    await apiFetch('PUT', `/clients/${escapeHtml(ctx.clientId)}/mandate-risk`, { approve: true });
    showToast('success', 'Mandate-risk questionnaire approved by Compliance.');
    // Same landing as approving a KYC: back to the list it came from, with the
    // caches refreshed so the row and the export readiness both reflect it.
    await Promise.all([refreshClients(), refreshKycTasks()]);
    openTasksTab('risk');
  } catch (err) {
    showToast('error', err.message || 'Could not approve.');
  }
}

function openRelatedPartyKyc(clientId, partyId) {
  State._activePartyKyc = { clientId, partyId };
  navigateTo('party-kyc');
}

async function renderRelatedPartyKyc() {
  const content = document.getElementById('page-content');
  const ctx = State._activePartyKyc;
  if (!ctx) {
    content.innerHTML = `<div class="page-header"><h1>Related-Party KYC</h1><p>No party selected.</p></div>`;
    return;
  }
  content.innerHTML = `<div class="page-header"><h1>Related-Party KYC</h1></div><div class="cb-loading">Loading…</div>`;

  let state;
  try { state = await apiFetch('GET', `/clients/${escapeHtml(ctx.clientId)}/contract-preparation`); }
  catch (err) {
    content.innerHTML = `<div class="page-header"><h1>Related-Party KYC</h1></div><p style="color:var(--accent-red);padding:16px;">${escapeHtml(err.message)}</p>`;
    return;
  }
  const party = (state.relatedParties || []).find(p => p.partyId === ctx.partyId);
  if (!party) {
    content.innerHTML = `<div class="page-header"><h1>Related-Party KYC</h1><p>This party no longer exists.</p></div>`;
    return;
  }

  const client = resolveKycClient(ctx.clientId);
  const fields = kycSchemaFor(client);
  const pages = [];
  const byPage = new Map();
  fields.forEach((f) => {
    if (!byPage.has(f.page)) { byPage.set(f.page, { page: f.page, fields: [] }); pages.push(byPage.get(f.page)); }
    byPage.get(f.page).fields.push(f);
  });
  const readOnly = party.status === 'approved';

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <button class="btn-secondary btn-sm" onclick="navigateTo('contract-prep')">← Back to Contract Tasks</button>
      <div>
        <h1 style="font-size:20px;font-weight:700;">${escapeHtml(party.role)} KYC</h1>
        <div style="color:var(--text-secondary);font-size:13px;">
          ${escapeHtml(state.clientName)} · ${escapeHtml(state.clientId)}${party.sourceDocument ? ` · required by ${escapeHtml(decodeEntities(party.sourceDocument))}` : ''}
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-body">
        <div class="form-group" style="max-width:420px;margin-bottom:0;">
          <label for="party-name">${escapeHtml(party.role)} Name</label>
          <input type="text" id="party-name" value="${escapeHtml(party.name || '')}" ${readOnly ? 'disabled' : ''} placeholder="Full name of the ${escapeHtml(party.role.toLowerCase())}">
        </div>
      </div>
    </div>

    <form id="party-kyc-form">
      ${pages.map(sec => `
        <div class="card" data-kyc-page="${escapeHtml(sec.page)}" style="margin-bottom:16px;">
          <div class="card-header" style="padding:12px 16px;"><div style="font-size:14px;font-weight:700;">${escapeHtml(sec.page)}</div></div>
          <div class="card-body">
            ${sec.fields.map(f => kycEditableFieldHTML(f, {
              page: sec.page,
              value: party.kyc?.[f.key] || '',
              disabled: readOnly,
              marginBottom: '14px',
            })).join('')}
          </div>
        </div>
      `).join('')}
      ${readOnly ? '' : `
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-bottom:32px;">
          <button type="button" class="btn-secondary" onclick="saveRelatedParty(false)">Save</button>
          <button type="button" class="btn-primary" onclick="saveRelatedParty(true)">Submit for Review</button>
        </div>
      `}
    </form>
  `;
}

async function saveRelatedParty(submit) {
  const ctx = State._activePartyKyc;
  if (!ctx) return;
  const answers = collectKycControlValues(document.getElementById('party-kyc-form'));
  const name = document.getElementById('party-name')?.value || '';
  try {
    const res = await apiFetch('PUT', `/clients/${escapeHtml(ctx.clientId)}/related-parties/${ctx.partyId}`, { name, answers, submit });
    showToast('success', submit ? 'Submitted for Compliance review.' : 'Saved.');
    await refreshClients();
    if (submit) navigateTo('contract-prep');
    else renderRelatedPartyKyc();
    return res;
  } catch (err) {
    showToast('error', err.message || 'Could not save this KYC.');
  }
}

// Outstanding corrections for one client, so Contract Tasks can offer the
// drag-and-drop fix for each. Corrections stays the read-only overview.
function openCorrectionsFor(clientId) {
  return (State.documentCorrections || []).filter(c =>
    c.clientId === clientId && c.status !== 'corrected');
}

// One outstanding issue, rendered inside the row of the document it concerns:
// what is wrong, what to do about it, the download of exactly the part that
// needs fixing, and the field to put the fixed version back.
function correctionFixHTML(c) {
  // Only a PDF can hand over one page on its own. The contracts are Word
  // files, where "page 2" is whatever the reader's fonts and margins make it —
  // so offering "Download Page 2" there promised something the format cannot
  // do, and produced a pdf-lib parse error when taken up. The page reference
  // stays on the issue, because it still says where to look; the download and
  // the upload are simply the whole document.
  // The server decides this — only it knows what the stored file actually is.
  const pageSeparable = Boolean(c.pageSeparable);
  const what = pageSeparable ? (c.page || 'page') : 'document';
  return `
    <div class="doc-item" style="align-items:flex-start;border-color:rgba(249,115,22,0.4);background:rgba(249,115,22,0.03);">
      <div class="doc-info" style="flex:1;">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:3px;">
          ${c.page ? `${escapeHtml(c.page)} — ` : ''}${escapeHtml(c.issue || '')}
        </div>
        ${c.remedy ? `<div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:6px;">${escapeHtml(c.remedy)}</div>` : ''}
        ${c.pageFrom && !pageSeparable ? `<div style="font-size:11.5px;color:var(--text-muted);margin-bottom:6px;">A Word document has no separable pages — the whole document is downloaded and sent back.</div>` : ''}
        <div class="correction-dropzone" id="corrzone-${escapeHtml(c.id)}"
             ondragover="correctionDragOver(event,'${escapeHtml(c.id)}')"
             ondragleave="correctionDragLeave(event,'${escapeHtml(c.id)}')"
             ondrop="correctionDrop(event,'${escapeHtml(c.id)}')"
             onclick="promptUploadCorrectedPages('${escapeHtml(c.id)}')">
          Drag the corrected ${escapeHtml(what)} here, or click to browse
        </div>
      </div>
      <div class="doc-actions" style="flex-direction:column;align-items:flex-end;gap:6px;">
        <button class="btn-secondary btn-xs" onclick="downloadCorrectionPages('${escapeHtml(c.id)}')">${downloadIcon()} Download ${escapeHtml(what)}</button>
      </div>
    </div>`;
}

// A drop field on the document's own row. Every document on this page can be
// provided the same way — drag a file onto it or click to browse — instead of
// the upload living only behind a button.
function documentDropzoneHTML(clientId, docId, what) {
  const zoneId = `docdrop-${clientId}-${docId}`;
  return `
    <div class="correction-dropzone" id="${escapeHtml(zoneId)}" style="margin-bottom:8px;"
         ondragover="docDropzoneOver(event,'${escapeHtml(zoneId)}')"
         ondragleave="docDropzoneLeave(event,'${escapeHtml(zoneId)}')"
         ondrop="docDropzoneDrop(event,'${escapeHtml(zoneId)}','${escapeHtml(clientId)}','${escapeHtml(docId)}')"
         onclick="promptUploadRequiredDocument('${escapeHtml(clientId)}','${escapeHtml(docId)}')">
      Drag the ${escapeHtml(what)} here, or click to browse
    </div>`;
}

function contractDropzoneHTML(clientId, templateId, hasUpload) {
  const zoneId = `contractdrop-${clientId}`;
  return `
    <div class="correction-dropzone" id="${escapeHtml(zoneId)}" style="margin-bottom:8px;"
         ondragover="docDropzoneOver(event,'${escapeHtml(zoneId)}')"
         ondragleave="docDropzoneLeave(event,'${escapeHtml(zoneId)}')"
         ondrop="contractDropzoneDrop(event,'${escapeHtml(zoneId)}','${escapeHtml(clientId)}','${escapeHtml(templateId)}')"
         onclick="promptUploadSignedContract('${escapeHtml(clientId)}','${escapeHtml(templateId)}')">
      Drag the ${hasUpload ? 'new version of the signed contract' : 'completed, signed contract'} here, or click to browse
    </div>`;
}

// Dragging a file onto a collapsed row opens it, so the drop field underneath
// becomes reachable without putting the file down first. Only reacts to a real
// file drag — moving the pointer over a row should not open it.
function openDocRowOnDrag(event, details) {
  const types = event.dataTransfer?.types;
  if (!types || !Array.from(types).includes('Files')) return;
  event.preventDefault();
  if (!details.open) details.open = true;
}

function docDropzoneOver(event, zoneId) {
  event.preventDefault();
  document.getElementById(zoneId)?.classList.add('drag-over');
}
function docDropzoneLeave(event, zoneId) {
  event.preventDefault();
  document.getElementById(zoneId)?.classList.remove('drag-over');
}
function docDropzoneDrop(event, zoneId, clientId, docId) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById(zoneId)?.classList.remove('drag-over');
  const file = event.dataTransfer?.files?.[0];
  if (file) uploadRequiredDocumentFile(clientId, docId, file);
}
function contractDropzoneDrop(event, zoneId, clientId, templateId) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById(zoneId)?.classList.remove('drag-over');
  const file = event.dataTransfer?.files?.[0];
  if (file) uploadSignedContractFile(clientId, templateId, file);
}

// A document only earns the green tick once Compliance has approved it;
// until then an uploaded file is orange (pending) and an empty slot is grey.
function docState(d) {
  if (!d || !d.filePath) return 'missing';
  if (d.status === 'approved') return 'approved';
  // Compliance looked at it and asked for it again — that is not the same as
  // "waiting to be looked at", and the row must not imply it is.
  if (d.status === 'info-requested') return 'flagged';
  return 'uploaded';
}

function contractPrepGroup(title, inner) {
  return `
    <div style="margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin:2px 0 8px;">${escapeHtml(title)}</div>
      ${inner}
    </div>
  `;
}

// One document, as a single collapsible entry: the header shows its name and
// whether it has been provided (✓), and everything else — status, actions,
// any correction — lives inside so a mandate with many documents stays a
// short scannable list rather than a wall of controls.
// `state` is the document's real standing, shown next to its name rather than
// hidden inside the dropdown:
//   'approved'  ✓ green  — checked and accepted by Compliance
//   'uploaded'  ● orange — provided, still awaiting Compliance
//   'missing'   ○ grey   — nothing uploaded yet
//   null                 — not applicable (e.g. the blank template)
function contractPrepRow({ title, meta, actions, warn, state = null, open = false, extra = '', stateLabel = '' }) {
  const hasChevron = Boolean(actions || extra || warn);
  const MARKS = {
    approved: { icon: '✓', color: 'var(--status-approved)', label: 'Approved by Compliance' },
    ready:    { icon: '◆', color: 'var(--accent-blue)', label: 'Ready to download' },
    flagged:  { icon: '⚑', color: 'var(--accent-red)', label: 'Sent back by Compliance — upload a corrected version' },
    uploaded: { icon: '●', color: 'var(--status-info-requested)', label: 'Uploaded — awaiting Compliance' },
    missing:  { icon: '○', color: 'var(--text-muted)', label: 'Not uploaded yet' },
  };
  const m = state ? MARKS[state] : null;
  const mark = m
    ? `<span title="${escapeHtml(m.label)}" style="color:${m.color};font-weight:700;margin-right:6px;">${m.icon}</span>`
    : '';
  const inlineStatus = m
    ? `<span style="color:${m.color};font-size:11px;font-weight:600;margin-left:8px;">${escapeHtml(stateLabel || m.label)}</span>`
    : '';
  const body = `
    <div style="padding:10px 14px 12px 58px;">
      <div class="doc-meta" style="margin-bottom:${warn || actions || extra ? '8px' : '0'};">${meta}</div>
      ${warn ? `<div style="font-size:11.5px;color:var(--status-info-requested);margin-bottom:8px;">⚠&nbsp;${escapeHtml(warn)}</div>` : ''}
      ${extra}
      ${actions ? `<div class="doc-actions" style="justify-content:flex-start;flex-wrap:wrap;gap:6px;">${actions}</div>` : ''}
    </div>`;

  if (!hasChevron) {
    return `
      <div class="doc-item" style="align-items:center;">
        <div class="doc-icon" style="background:${docIconColor('Other')}22;color:${docIconColor('Other')}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        </div>
        <div class="doc-info">
          <div class="doc-name">${mark}${escapeHtml(title)}${inlineStatus}</div>
          <div class="doc-meta">${meta}</div>
        </div>
      </div>`;
  }

  return `
    <details class="doc-item doc-collapsible" ${open ? 'open' : ''}
             ondragover="openDocRowOnDrag(event, this)" ondragenter="openDocRowOnDrag(event, this)"
             style="display:block;padding:0;${warn ? 'border-color:rgba(249,115,22,0.4);background:rgba(249,115,22,0.03);' : ''}">
      <summary style="display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer;list-style:none;">
        <div class="doc-icon" style="background:${docIconColor('Other')}22;color:${docIconColor('Other')}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        </div>
        <div class="doc-info" style="flex:1;">
          <div class="doc-name">${mark}${escapeHtml(title)}${inlineStatus}</div>
        </div>
        <span class="doc-chevron" style="color:var(--text-muted);font-size:12px;">▾</span>
      </summary>
      ${body}
    </details>
  `;
}

// The physically-signed contract. This is the upload that runs the
// signature/checkbox check — it targets the client's contract document slot,
// so the blank/previous file is preserved in that document's version history.
function promptUploadSignedContract(clientId, templateId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.docx,.doc,.jpg,.jpeg,.png';
  input.onchange = () => { if (input.files[0]) uploadSignedContractFile(clientId, templateId, input.files[0]); };
  input.click();
}

async function uploadSignedContractFile(clientId, templateId, file) {
  const client = resolveKycClient(clientId);
  const templateDoc = client?.documents?.find(d => d.type === 'Template');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('type', 'Signed Contract');
  if (templateDoc) formData.append('docId', templateDoc.docId || templateDoc.id);
  if (templateId) formData.append('templateId', templateId);
  await postClientDocument(clientId, formData, 'Signed contract');
}


// Shared upload + result reporting for everything on this page that posts to
// the client-documents endpoint, so validation feedback reads the same way
// regardless of which document type was sent.
async function postClientDocument(clientId, formData, label) {
  try {
        const res = await fetch(`${API_BASE}/clients/${clientId}/documents/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || 'Upload failed');
    if (result.missingNote) {
      showToast('warning', `${label} uploaded, but flagged for correction: ${result.missingNote}`);
    } else {
      showToast('success', `${label} uploaded successfully.`);
    }
    await Promise.all([
      State.currentRole === 'client' ? refreshMyClientProfile() : refreshClients(),
      refreshCorrectionsBadge(),
    ]);
    renderContractPreparation();
  } catch (err) {
    showToast('error', `${label} upload failed: ${err.message}`);
  }
}

function promptUploadContractDraft(clientId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.docx,.doc,.jpg,.jpeg,.png';
  input.onchange = () => { if (input.files[0]) uploadContractDraft(clientId, input.files[0]); };
  input.click();
}

async function uploadContractDraft(clientId, file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
        const res = await fetch(`${API_BASE}/clients/${clientId}/contract-draft`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || 'Upload failed');
    if (result.complete) {
      showToast('success', 'Saved version uploaded — all required components present.');
    } else {
      showToast('warning', `Saved version uploaded, but incomplete: ${result.missingNote}`);
    }
    await refreshCorrectionsBadge();
    renderContractPreparation();
  } catch (err) {
    showToast('error', err.message || 'Failed to upload the saved version.');
  }
}

async function submitContractFinal(clientId) {
  try {
    await apiFetch('POST', `/clients/${clientId}/contract-draft/submit`, {});
    showToast('success', 'Contract submitted — the final version is ready to download.');
    renderContractPreparation();
  } catch (err) {
    showToast('error', err.message || 'Could not submit this contract.');
  }
}

function switchCorrectionsTab(name) {
  ['kyc','docs','risk'].forEach(n => {
    document.getElementById(`corrtab-btn-${n}`)?.classList.toggle('active', n === name);
    document.getElementById(`corrtab-${n}`)?.classList.toggle('active', n === name);
  });
}

// Fixes one flagged page of a Signed Contract in place — no full re-upload.
// A throwaway file input (never inserted into the DOM) keeps this a single
// call from the row's button, same pattern as triggerFileInputFor.
function promptFixDocumentPage(clientId, docId, pageNum) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.docx,.doc,.jpg,.jpeg,.png';
  input.onchange = () => {
    const file = input.files[0];
    if (file) fixDocumentPage(clientId, docId, pageNum, file);
  };
  input.click();
}

async function fixDocumentPage(clientId, docId, pageNum, file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
        const res = await fetch(`${API_BASE}/clients/${clientId}/documents/${docId}/pages/${pageNum}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || 'Page fix failed');
    await Promise.all([refreshCorrectionsBadge(), refreshClients()]);
    if (result.missingNote) {
      showToast('warning', `Page ${pageNum} updated, but still flagged: ${result.missingNote}`);
    } else {
      showToast('success', `Page ${pageNum} fixed and re-checked — no issues found.`);
    }
    if (State.currentPage === 'kyc-corrections') renderKycCorrections();
  } catch (err) {
    showToast('error', `Failed to fix page ${pageNum}: ${err.message}`);
  }
}

// RM may only move an item to 'resubmitted'; only Compliance may confirm 'corrected'.
async function updateKycCorrectionStatus(correctionId, status, reason) {
  if (status === 'resubmitted' && State.currentRole !== 'rm') return;
  if (status === 'corrected' && !isCompliance(State.currentRole)) return;
  try {
    await apiFetch('POST', `/corrections/kyc/${correctionId}/status`, { status, reason });
    showToast('success', `KYC correction updated to ${status}.`);
    refreshNotifications();
    await refreshCorrectionsBadge();
    // Confirm/Deny is reachable from the Corrections list AND from the KYC
    // Review page now — re-render whichever one is actually showing instead
    // of always jumping to the Corrections list.
    if (State.currentPage === 'kyc-corrections') await renderKycCorrections();
    else rerenderKycView();
  } catch (err) {
    showToast('error', err.message || 'Failed to update KYC correction.');
  }
}

// Deny is the only correction transition that carries a free-text reason —
// shown back to the RM alongside the reopened field so they know what to fix.
async function denyKycCorrection(correctionId) {
  if (!isCompliance(State.currentRole)) return;
  const reason = prompt('Reason for denying this correction (shown to the RM):');
  if (reason === null) return;
  await updateKycCorrectionStatus(correctionId, 'needs_correction', reason);
}

async function updateDocumentCorrectionStatus(correctionId, status) {
  if (status === 'resubmitted' && State.currentRole !== 'rm') return;
  if (status === 'corrected' && !isCompliance(State.currentRole)) return;
  try {
    await apiFetch('POST', `/corrections/documents/${correctionId}/status`, { status });
    showToast('success', `Document correction updated to ${status}.`);
    refreshNotifications();
    await renderKycCorrections();
  } catch (err) {
    showToast('error', err.message || 'Failed to update document correction.');
  }
}

/* ── KYC Correction detail — jumps into the real KYC form, not a separate view ── */
// Clicking a flagged item goes straight into the ONE real KYC form
// (renderKycFill) with that exact field scrolled to and focused — reusing
// the client's existing task if one exists (so submitting still marks it
// completed), or a synthetic clientId-only stand-in otherwise.
function openKycCorrectionDetail(correctionId) {
  const correction = State.kycCorrections.find(c => c.id === correctionId);
  if (!correction) return;
  const client = State.clients.find(c => c.id === correction.clientId);
  if (!client) return;
  const task = State.kycTasks.find(t => t.clientId === correction.clientId);
  State._activeKycTask = task || { id: null, clientId: client.id, clientName: client.name, clientEmail: client.email, sections: [] };
  State._activeCorrectionFieldKey = correction.fieldKey;
  navigateTo('kyc-fill');
}

// Finds a client record by id, checking the logged-in client's own profile first
// (their own record may not be in State.clients at all) before falling back to
// the staff-side client list.
function resolveKycClient(clientId) {
  if (State.myClientProfile && (State.myClientProfile.id === clientId || State.myClientProfile.clientId === clientId)) {
    return State.myClientProfile;
  }
  return State.clients.find(c => c.id === clientId || c.clientId === clientId);
}

// Compliance's "Review KYC" destination (reached from the KYC Tasks list) —
// the one place a currently-fine field can be flagged wrong. Kept off the
// Client Detail "KYC Details" tab entirely: that tab is a pure read-only
// snapshot of a field's value and status at a point in time, with no actions.
function renderKycReview() {
  const content = document.getElementById('page-content');
  const client = State.clients.find(c => c.id === State.selectedClientId);
  if (!client) {
    content.innerHTML = `<div class="page-header"><h1>KYC Review</h1><p>No client selected.</p></div>`;
    return;
  }
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <button class="btn-secondary btn-sm" onclick="navigateTo('kyc-tasks')">← Back to KYC Tasks</button>
      <div style="flex:1;">
        <h1 style="font-size:20px;font-weight:700;">${escapeHtml(client.name)}</h1>
        <div style="color:var(--text-secondary);font-size:13px;">Case ${escapeHtml(client.id)} · Reviewing submitted KYC</div>
      </div>
      <button class="btn-secondary btn-sm" onclick="downloadKycExcel('${escapeHtml(client.id)}')">${downloadIcon()} Export KYC (.xlsx)</button>
    </div>
    ${clientKycEditableFormHTML(client)}
  `;
}

// Shared KYC display — used by the staff-side Client Detail "KYC Details" tab
// (RM + Compliance), the KYC Review page (Compliance only) and the client's
// own portal (if they have one). Read-only:
// values only ever arrive via a completed KYC Task or an approved correction,
// never free-typed here. The one exception is a field with an OPEN correction
// (pending or needs_correction) — that renders empty, gold, and editable, and
// is only ever resolved by filling in every gold field on its page and
// resubmitting that page as a unit.
// firstTime=true renders every field as a plain (non-gold) editable input —
// used for a client's very first KYC submission, before anything has ever
// been flagged missing. Otherwise only fields with an open correction are
// editable (gold), matching the normal correction-resolution flow.
// allowReview=false renders the same record without any way to act on it —
// All Cases is for reading what happened, and deciding it there as well would
// mean two screens that could disagree about the same questionnaire.
function clientKycEditableFormHTML(client, firstTime = false, { allowReview = true } = {}) {
  if (!client.kyc) client.kyc = {};
  const fields = kycSchemaFor(client);
  const k = client.kyc;
  // Everything short of 'corrected' stays part of the active correction
  // workflow (item 2/3 of the correction lifecycle): open (pending/
  // needs_correction) is still editable and glowing, 'saved' is editable
  // with a soft highlight, 'resubmitted' is a neutral read-only "awaiting
  // review" state — none of them are a plain approved read-only field yet.
  const correctionByKey = new Map(
    (State.kycCorrections || [])
      .filter(c => c.clientId === client.id && c.autoGenerated && c.status !== 'corrected')
      .map(c => [c.fieldKey, c])
  );
  // Confirmed fields are excluded above because they need no action — but the
  // confirmation itself has to be visible, the way a confirmed mandate-risk
  // answer is. Without this a field Compliance had just ticked still read
  // "Under Review by Compliance", so the tick appeared to do nothing.
  const confirmedByKey = new Map(
    (State.kycCorrections || [])
      .filter(c => c.clientId === client.id && c.autoGenerated && c.status === 'corrected' && c.everFilled)
      .map(c => [c.fieldKey, c])
  );

  const pages = [];
  const pageIndex = new Map();
  fields.forEach((field) => {
    const { page } = field;
    if (!pageIndex.has(page)) { pageIndex.set(page, pages.length); pages.push({ page, fields: [] }); }
    pages[pageIndex.get(page)].fields.push(field);
  });

  const workflowStatus = clientKycWorkflowStatus(client);
  const allFieldsSaved = fields.every(({ key }) => String(k[key] ?? '').trim());
  // Draft edits can retain historical submitter provenance, so provenance
  // alone must never expose flag controls. Compliance may flag only a KYC
  // that is actively under review or has already been approved — and only
  // from the dedicated KYC Review page (reached via KYC Tasks), never from
  // the Client Detail "KYC Details" tab, which is a pure read-only snapshot
  // of what's filled in and its status at that moment, with no actions.
  const canFlag = isCompliance(State.currentRole)
    && !firstTime
    && State.currentPage === 'kyc-review'
    && (workflowStatus === 'under_review' || workflowStatus === 'approved');
  // Only the client's own portal actually edits/saves/submits values here —
  // for RM and Compliance this same component renders inside the staff
  // Client Detail "KYC Details" tab, which is a read-only snapshot of what's
  // filled in or not. Real editing for staff happens on the KYC Tasks page.
  const canEdit = State.currentRole === 'client';

  const actionableCount = (State.kycCorrections || []).filter(c =>
    c.clientId === client.id && c.autoGenerated
    && (c.status === 'pending' || c.status === 'needs_correction' || c.status === 'saved')
  ).length;

  const verifyBanner = actionableCount > 0 && !firstTime ? `
    <div class="kyc-verify-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <span>${actionableCount} field${actionableCount === 1 ? '' : 's'} need${actionableCount === 1 ? 's' : ''} completion or correction.
        ${allowReview ? `<a href="#" onclick="navigateTo('kyc-tasks');return false;" style="color:inherit;font-weight:600;">Resolve in Tasks →</a>` : ''}
      </span>
    </div>
  ` : workflowStatus === 'under_review' ? `
    <div class="kyc-verify-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <span style="flex:1;"><strong>Under Review by Compliance.</strong> ${isCompliance(State.currentRole)
        ? `Review every KYC field, then approve the questionnaire if it is correct.`
        : `Compliance must review and approve every field before this KYC is complete.`}</span>
      ${isCompliance(State.currentRole) && allowReview
        ? `<button type="button" class="btn-success btn-sm" data-client-id="${escapeHtml(client.id)}" onclick="approveKycFromReview(this.dataset.clientId)">Approve KYC</button>`
        : ''}
    </div>
  ` : workflowStatus === 'approved' ? `
    <div class="kyc-verify-banner kyc-verify-banner-approved">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="8,12 11,15 16,9"/></svg>
      <span class="status-badge status-approved">Approved by Compliance</span>
    </div>
  ` : (!client.kycSubmittedBy && !firstTime ? `
    <div class="kyc-verify-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <span>No KYC submitted yet.
        <a href="#" onclick="navigateTo('kyc-tasks');return false;" style="color:inherit;font-weight:600;">Complete via KYC Tasks →</a>
      </span>
    </div>
  ` : '');

  return `
    ${verifyBanner}
    ${pages.map(({ page, fields: pageFields }) => {
      // Only 'open'/'saved' fields need further RM action — a page with only
      // resubmitted/approved fields gets no Save/Resubmit button at all.
      const hasActionable = firstTime || pageFields.some(({ key }) => {
        const correction = correctionByKey.get(key);
        return correction && correction.status !== 'resubmitted';
      });
      return `
        <div class="card" data-kyc-page="${escapeHtml(page)}" style="margin-bottom:16px;">
          <div class="card-header">
            <div class="card-title">${escapeHtml(page)}</div>
            ${hasActionable && (firstTime || canEdit) ? `
              <div style="display:flex;gap:8px;">
                <button class="btn-secondary btn-sm" data-client-id="${escapeHtml(client.id)}" data-page="${escapeHtml(page)}" onclick="saveKycPage(this.dataset.clientId,this.dataset.page)">Save Section</button>
                <button class="btn-primary btn-sm" data-client-id="${escapeHtml(client.id)}" data-page="${escapeHtml(page)}" data-first-time="${firstTime ? 'true' : 'false'}" onclick="resubmitKycPage(this.dataset.clientId,this.dataset.page,this.dataset.firstTime==='true')" ${allFieldsSaved ? '' : 'disabled title="Save a non-empty value for every KYC field first"'}>${firstTime ? 'Submit Section' : 'Resubmit Section'}</button>
              </div>
            ` : ''}
          </div>
          <div class="card-body">
            <div class="cb-fields-grid" data-kyc-correction-page="${escapeHtml(page)}">
              ${pageFields.map((field) => {
                const { key, label } = field;
                const correction = correctionByKey.get(key);
                const val = k[key] || '';
                if (firstTime) {
                  return kycEditableFieldHTML(field, { page, value: val, marginBottom: '0' });
                }
                if (correction) {
                  const status = correction.status;
                  if (canEdit && status !== 'resubmitted') {
                    return kycEditableFieldHTML(field, {
                      page,
                      value: status === 'saved' ? val : '',
                      correctionStatus: status,
                      correctionReason: correction.rejectionReason || '',
                      marginBottom: '0',
                    });
                  }
                  // Staff (RM/Compliance) view: always read-only here, just the
                  // current fill status — actual editing happens on KYC Tasks.
                  const meta = KYC_CORRECTION_STATUS_META[status] || KYC_CORRECTION_STATUS_META.pending;
                  const displayVal = (status === 'saved' || status === 'resubmitted') ? val : '';
                  return `
                    <div class="form-group" data-kyc-key="${escapeHtml(key)}" data-kyc-label="${escapeHtml(label)}" data-kyc-value="${escapeHtml(val ?? '')}" data-page="${escapeHtml(page)}" style="margin-bottom:0;">
                      <label>${escapeHtml(label)} <span class="status-badge ${meta.badge}" style="margin-left:4px;">${escapeHtml(meta.label)}</span></label>
                      <div style="display:flex;align-items:center;gap:2px;">
                        <div class="kyc-field-readonly ${!String(displayVal).trim() ? 'empty' : ''}" style="flex:1;">${escapeHtml(String(displayVal).trim() || '—')}</div>
                        ${canFlag && status === 'resubmitted' && String(displayVal).trim() ? `
                          <button type="button" class="kyc-tick-btn" title="Confirm correct" onclick="updateKycCorrectionStatus('${escapeHtml(correction.id)}','corrected')">✓</button>
                          <button type="button" class="kyc-flag-btn" title="Deny — send back to RM" onclick="denyKycCorrection('${escapeHtml(correction.id)}')">⚑</button>
                        ` : ''}
                      </div>
                    </div>
                  `;
                }
                // No open correction for this field. Its badge follows the
                // whole-form workflow: a saved draft is not approved, and a
                // submitted value stays under review until explicit sign-off.
                const isEmpty = !String(val).trim();
                // A blank optional question in a submitted questionnaire is a
                // finished answer — "not provided" — not an outstanding task.
                // Only a mandatory blank is still owed, and submission already
                // makes that impossible.
                const isRequired = field.required !== false;
                const confirmed = confirmedByKey.get(key);
                const meta = isEmpty
                  ? (isRequired ? KYC_CORRECTION_STATUS_META.pending
                    : { label: 'Not provided', badge: 'status-neutral' })
                  : confirmed
                    ? KYC_CORRECTION_STATUS_META.corrected
                  : workflowStatus === 'approved'
                    ? KYC_CORRECTION_STATUS_META.corrected
                    : workflowStatus === 'under_review'
                      ? KYC_CORRECTION_STATUS_META.resubmitted
                      : KYC_CORRECTION_STATUS_META.saved;
                return `
                  <div class="form-group" data-kyc-key="${escapeHtml(key)}" data-kyc-label="${escapeHtml(label)}" data-kyc-value="${escapeHtml(val ?? '')}" data-page="${escapeHtml(page)}" style="margin-bottom:0;">
                    <label>${escapeHtml(label)} <span class="status-badge ${meta.badge}" style="margin-left:4px;">${escapeHtml(meta.label)}</span></label>
                    <div style="display:flex;align-items:center;gap:2px;">
                      <div class="kyc-field-readonly ${isEmpty ? 'empty' : ''}" style="flex:1;">${escapeHtml(String(val).trim() || '—')}</div>
                      ${canFlag && !isEmpty && !confirmed ? `
                        <button type="button" class="kyc-tick-btn" title="Confirm correct" data-client-id="${escapeHtml(client.id)}" data-field-key="${escapeHtml(key)}" data-field-label="${escapeHtml(label)}" onclick="confirmKycFieldPrompt(this.dataset.clientId,this.dataset.fieldKey,this.dataset.fieldLabel)">✓</button>
                        <button type="button" class="kyc-flag-btn" title="Flag as incorrect" data-client-id="${escapeHtml(client.id)}" data-field-key="${escapeHtml(key)}" data-field-label="${escapeHtml(label)}" onclick="flagKycFieldPrompt(this.dataset.clientId,this.dataset.fieldKey,this.dataset.fieldLabel)">⚑</button>
                      ` : ''}
                    </div>
                    ${confirmed ? `<div style="font-size:11px;margin-top:2px;color:var(--status-approved);">✓ Confirmed by Compliance</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('')}
    ${(k.pep || k.sanctions || k.adverse) ? `
      <div class="card">
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
            ${screeningBadge('PEP Status', k.pep)}
            ${screeningBadge('Sanctions', k.sanctions)}
            ${screeningBadge('Adverse Media', k.adverse)}
          </div>
        </div>
      </div>
    ` : ''}
  `;
}

// Re-renders whichever KYC view is currently showing (staff Client Detail tab
// or the client's own portal dashboard) after a resubmit/flag action.
// Save/Submit/Flag on a single field all rebuild the whole KYC tab from
// fresh server state (there's no per-field DOM patching in this app), which
// would otherwise reset the scroll position after every action — jarring
// when you're working your way down a long form. Preserve it explicitly so
// only the one field that actually changed looks different, not "the whole
// page jumped."
function rerenderKycView() {
  const scrollY = window.scrollY;
  if (State.currentPage === 'client-detail') { renderClientDetail(); switchTab('kyc'); }
  else if (State.currentPage === 'kyc-review') renderKycReview();
  else if (State.currentPage === 'kyc-fill') renderKycFill();
  else if (State.currentPage === 'dashboard' && State.currentRole === 'client') renderClientDashboard();
  window.scrollTo(0, scrollY);
}

function collectKycPageValues(page, root = document) {
  return collectKycControlValues(root, page);
}

// Draft save for one page's flagged fields — persists whatever's filled in
// so far without submitting anything to Compliance. Explicit blanks are sent
// too: clearing a previously-saved value must persist that blank and keep the
// control gold after the canonical data is reloaded.
async function saveKycPage(clientId, page) {
  const values = collectKycPageValues(page);
  if (!Object.keys(values).length) {
    showToast('warning', 'No editable KYC fields were found in this section.');
    return;
  }
  try {
    await apiFetch('POST', '/corrections/kyc/save-section', { clientId, values });
    showToast('success', 'Progress saved. Empty fields remain gold until they have a saved value.');
    if (State.currentRole === 'client') {
      const updated = await apiFetch('GET', '/clients/me').catch(() => null);
      if (updated) State.myClientProfile = { ...updated, id: updated.clientId };
      await refreshCorrectionsBadge();
    } else {
      await Promise.all([refreshCorrectionsBadge(), refreshClients()]);
    }
    rerenderKycView();
  } catch (err) {
    showToast('error', `Failed to save section: ${err.message}`);
  }
}

async function resubmitKycPage(clientId, page, firstTime) {
  const values = collectKycPageValues(page);
  if (Object.values(values).some(v => !v)) {
    showToast('warning', `Please fill in and save every gold field in this section before ${firstTime ? 'submitting' : 'resubmitting'}.`);
    return;
  }
  const client = resolveKycClient(clientId);
  const hasUnsavedValue = Object.entries(values).some(
    ([key, value]) => value !== String(client?.kyc?.[key] ?? '').trim()
  );
  if (hasUnsavedValue) {
    showToast('warning', 'Save this section before submitting it for Compliance review.');
    return;
  }
  const missingFields = kycSchemaFor(client).filter(
    ({ key }) => !String(client?.kyc?.[key] ?? '').trim()
  );
  if (missingFields.length) {
    showToast('warning', 'Save a non-empty value for every KYC field before submitting for Compliance review.');
    return;
  }
  try {
    await apiFetch('POST', '/corrections/kyc/resubmit-section', { clientId, values });
    showToast('success', firstTime ? 'Section submitted.' : 'Section resubmitted.');
    if (State.currentRole === 'client') {
      const updated = await apiFetch('GET', '/clients/me').catch(() => null);
      if (updated) State.myClientProfile = { ...updated, id: updated.clientId };
      await refreshCorrectionsBadge();
    } else {
      await Promise.all([refreshCorrectionsBadge(), refreshClients()]);
    }
    rerenderKycView();
  } catch (err) {
    showToast('error', `Failed to resubmit section: ${err.message}`);
  }
}

async function flagKycFieldPrompt(clientId, key, label) {
  if (!confirm(`Flag "${label}" as incorrect? The current value will be cleared and marked for correction.`)) return;
  try {
    await apiFetch('POST', '/corrections/kyc/flag', { clientId, fieldKey: key });
    await Promise.all([refreshCorrectionsBadge(), refreshClients()]);
    rerenderKycView();
  } catch (err) {
    showToast('error', `Failed to flag field: ${err.message}`);
  }
}

// The tick counterpart to the flag above — explicitly signs off on a field
// that was never flagged, giving it the same audit trail as one that went
// through a correction cycle.
async function confirmKycFieldPrompt(clientId, key, label) {
  try {
    await apiFetch('POST', '/corrections/kyc/confirm', { clientId, fieldKey: key });
    await Promise.all([refreshCorrectionsBadge(), refreshClients()]);
    showToast('success', `"${label}" confirmed correct.`);
    rerenderKycView();
  } catch (err) {
    showToast('error', `Failed to confirm field: ${err.message}`);
  }
}

/* ============================================================
   PAGE: CLIENT CONTRACT PACKAGE
   ============================================================ */
function renderClientContract() {
  const content = document.getElementById('page-content');

  const clientType = State.clientType || (State.myClientProfile?.type) || 'Standard';

  content.innerHTML = `
    <div class="page-header">
      <h1>Contract Package</h1>
      <p>Your personalised onboarding package · <strong>${clientType}</strong></p>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-body" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:20px 24px;">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">Full Onboarding Contract Package — ${clientType}</div>
          <div style="font-size:12px;color:var(--text-muted);">Includes: KYC Form · Power of Attorney (Vollmacht) · FIDLEG Categorisation · Investment Profile · Mandate Risk Profile · Form A/T/K/S</div>
        </div>
        <button class="btn-primary" style="white-space:nowrap;" onclick="showToast('info','Contract package downloaded.')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:middle;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Package
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding:24px;">
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:16px;">📌 How to sign and return your documents</div>
        <div style="display:flex;flex-direction:column;gap:0;">
          ${[
            { n:'1', title:'Read the full package', body:'Go through every page carefully before signing anything. If you have questions, contact your relationship manager.' },
            { n:'2', title:'Print the signature pages', body:'Print all pages marked with ✍. These are the pages that require your handwritten (wet) signature.' },
            { n:'3', title:'Sign with a pen', body:'Sign in the boxes provided using a ballpoint or fountain pen. Digital signatures are <strong>not accepted</strong> — a physical signature is required.' },
            { n:'4', title:'Scan at 300 DPI or higher', body:'Scan every signed page in colour at a minimum of 300 DPI. Blurry or low-resolution scans will be rejected.' },
            { n:'5', title:'Combine into one PDF', body:'Merge all scanned pages into a single PDF file. Do not send separate images or multiple files.' },
            { n:'6', title:'Upload for compliance review', body:'Use the Upload Signed Docs page to submit. Our team will review your submission within 2 business days.' },
          ].map(s => `
            <div style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid var(--border-subtle);">
              <div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--accent-purple-light);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${s.n}</div>
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:3px;">${escapeHtml(s.title)}</div>
                <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;">${s.body}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:20px;">
          <button class="btn-primary" onclick="navigateTo('client-upload')">
            Proceed to Upload Signed Documents →
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   PAGE: CLIENT UPLOAD SIGNED DOCS
   ============================================================ */
function renderClientUpload() {
  const content = document.getElementById('page-content');
  const client = getActiveClientForUpload();
  if (!client) {
    content.innerHTML = `<div class="card"><div class="card-body"><p class="text-muted">No active client context found for upload.</p></div></div>`;
    return;
  }
  const uploads = ensureClientSubmissionBucket(client.id);

  content.innerHTML = `
    <div class="page-header">
      <h1>Upload Signed Documents</h1>
      <p>Upload the scanned, signed version of your contract package for compliance review. Client: <strong>${escapeHtml(client.name)}</strong></p>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><div class="card-title">Upload Instructions</div></div>
      <div class="card-body">
        <div class="info-box">
          <p>Please review the full contract package carefully.<br>
          Print all pages that require a signature.<br>
          Sign where indicated.<br>
          Scan the signed pages clearly.<br>
          Upload the scanned and signed documents in <strong>PDF format</strong>.<br>
          Make sure all pages are complete and readable before submission.</p>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header">
        <div class="card-title">Upload Signed Documents</div>
        <div class="card-subtitle">PDF only · Physically signed · Max 50MB</div>
      </div>
      <div class="card-body">
        <div class="upload-zone" id="upload-zone" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropFile(event)" onclick="triggerFileInput()">
          <div style="font-size:40px;margin-bottom:12px;">📤</div>
          <div class="upload-zone-text">Drag & drop your signed PDF here or click to browse</div>
          <div class="upload-zone-sub">Upload the complete signed contract package as one PDF</div>
        </div>
        <input type="file" id="file-input" style="display:none;" onchange="handleFileSelect(event)" accept=".pdf" />
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header">
        <div class="card-title">Received Contract Package</div>
        <div class="card-subtitle">One complete package sent to client for wet-signature process</div>
      </div>
      <div class="card-body">
        <div class="doc-item">
          <div class="doc-icon" style="background:rgba(99,102,241,0.14);color:var(--accent-purple-light);">${fileIcon()}</div>
          <div class="doc-info">
            <div class="doc-name">Full Onboarding Contract Package</div>
            <div class="doc-meta">Status: Sent to Client · Format: PDF</div>
          </div>
          <div class="doc-actions">
            <span class="status-badge status-under-review">Received</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Submission Status</div>
        <div class="card-subtitle">Track the review progress of your submitted documents</div>
      </div>
      <div class="card-body" style="padding:0;">
        <table class="data-table">
          <thead><tr><th>Document</th><th>Submitted</th><th>Size</th><th>Status</th></tr></thead>
          <tbody>
            ${uploads.length ? uploads.map(u => `
              <tr>
                <td style="font-weight:500;">${escapeHtml(u.name)}</td>
                <td>${u.date}</td>
                <td>${u.size}</td>
                <td><span class="status-badge status-${escapeHtml(u.status)}">${statusLabel(u.status)}</span></td>
              </tr>
            `).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px;">No signed documents uploaded yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ============================================================
   PAGE: ANALYTICS
   ============================================================ */
function renderAnalytics() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <h1>Analytics & Reporting</h1>
      <p>Compliance metrics and onboarding trends</p>
    </div>

    <div class="stats-grid">
      ${statCard('#6366f1', '5', 'Total Cases YTD', '+2 this month', true, usersIcon())}
      ${statCard('#10b981', '12.5d', 'Avg. Onboarding Time', '-2d vs last month', true, auditIcon())}
      ${statCard('#f59e0b', '87%', 'First-time Approval Rate', '', false, checklistIcon())}
      ${statCard('#06b6d4', '94%', 'Doc Completeness Rate', '', false, fileIcon())}
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Cases by Status</div></div>
        <div class="card-body">
          ${chartBar('Approved', 1, 5, 'var(--accent-green)')}
          ${chartBar('Under Review', 1, 5, 'var(--accent-indigo)')}
          ${chartBar('Pending', 1, 5, 'var(--status-pending)')}
          ${chartBar('Rejected', 1, 5, 'var(--accent-red)')}
          ${chartBar('Draft', 1, 5, 'var(--status-draft)')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Cases by Client Type</div></div>
        <div class="card-body">
          ${chartBar('Corporate', 2, 5, 'var(--accent-indigo)')}
          ${chartBar('Individual', 1, 5, 'var(--accent-cyan)')}
          ${chartBar('Trust', 1, 5, 'var(--accent-purple-light)')}
          ${chartBar('Foundation', 1, 5, 'var(--accent-amber)')}
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Risk Distribution</div></div>
        <div class="card-body">
          ${chartBar('Low Risk', 1, 5, 'var(--accent-green)')}
          ${chartBar('Medium Risk', 1, 5, 'var(--status-pending)')}
          ${chartBar('High Risk', 3, 5, 'var(--accent-red)')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Document Status Summary</div></div>
        <div class="card-body">
          ${(() => {
            const allDocs = State.clients.flatMap(c => c.documents);
            const total = allDocs.length;
            const byStatus = {};
            allDocs.forEach(d => { byStatus[d.status] = (byStatus[d.status]||0)+1; });
            return Object.entries(byStatus).map(([s,v]) =>
              chartBar(statusLabel(s), v, total, docStatusColor(s))
            ).join('');
          })()}
        </div>
      </div>
    </div>
  `;
}

function chartBar(label, value, total, color) {
  const pct = Math.round((value / total) * 100);
  return `
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:13px;">${label}</span>
        <span style="font-size:13px;font-weight:600;color:${color};">${value} (${pct}%)</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width:${pct}%;background:${color};"></div>
      </div>
    </div>
  `;
}

function docStatusColor(s) {
  const m = { approved: 'var(--accent-green)', pending: 'var(--status-pending)', 'under-review': 'var(--accent-indigo)', 'info-requested': 'var(--accent-orange)', rejected: 'var(--accent-red)', draft: 'var(--status-draft)' };
  return m[s] || 'var(--accent-indigo)';
}

/* ============================================================
   PAGE: RISK RATINGS
   ============================================================ */
async function renderRiskRatings() {
  const content = document.getElementById('page-content');
  // Mandates used to only get loaded as a side effect of visiting the (now-removed)
  // Review Queue page — fetch them here directly so this page works standalone.
  if (!State.mandates.length) {
    try {
      const mandates = await apiFetch('GET', '/mandates');
      State.mandates = mandates.map(m => ({ ...m, id: m.mandateId }));
    } catch (_) { /* fall through with an empty list — questionnaire card just hides */ }
  }
  const activeMandateId = State.mandates[0]?.id;
  const currentAnswers = State.riskAnswers[activeMandateId] || {};
  const computed = activeMandateId ? computeRiskScore(currentAnswers) : null;
  if (activeMandateId && computed) {
    State.riskScores[activeMandateId] = computed;
  }

  content.innerHTML = `
    <div class="page-header">
      <h1>Risk Ratings</h1>
      <p>Client risk classification overview with mandate risk questionnaire</p>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Risk Classification Matrix</div></div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Client</th><th>Type</th><th>Country</th><th>Industry</th><th>PEP</th><th>Sanctions</th><th>Risk Score</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${State.clients.map(c => `
              <tr style="cursor:pointer;" onclick="openClientDetail('${c.id}')">
                <td><div style="display:flex;align-items:center;gap:8px;"><div class="client-avatar" style="width:28px;height:28px;font-size:11px;background:${clientGradient(c.type)}">${c.name[0]}</div> <span style="font-weight:500;">${escapeHtml(c.name)}</span></div></td>
                <td>${escapeHtml(c.type)}</td>
                <td>${escapeHtml(c.country)}</td>
                <td>${c.industry}</td>
                <td><span style="color:${c.kyc?.pep==='No'?'var(--accent-green)':'var(--accent-red)'};font-weight:600;">${c.kyc?.pep||'—'}</span></td>
                <td><span style="color:${c.kyc?.sanctions==='No'?'var(--accent-green)':'var(--accent-red)'};font-weight:600;">${c.kyc?.sanctions||'—'}</span></td>
                <td><span class="risk-${c.risk.toLowerCase()}" style="font-weight:700;font-size:14px;">${escapeHtml(c.risk)}</span></td>
                <td><button class="btn-secondary btn-xs" onclick="event.stopPropagation();openClientDetail('${c.id}')">Review</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${activeMandateId ? `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Mandate Risk Questionnaire</div>
        <div class="card-subtitle">Questionnaire responses are used to compute Low / Medium / High risk rating</div>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label>Mandate profile</label>
            <select onchange="updateRiskAnswer('${activeMandateId}','mandateProfile',this.value)">
              <option value="">Select</option>
              <option ${currentAnswers.mandateProfile==='transparent'?'selected':''} value="transparent">Transparent</option>
              <option ${currentAnswers.mandateProfile==='moderate'?'selected':''} value="moderate">Moderate complexity</option>
              <option ${currentAnswers.mandateProfile==='opaque'?'selected':''} value="opaque">Opaque / complex</option>
            </select>
          </div>
          <div class="form-group">
            <label>Source country risk</label>
            <select onchange="updateRiskAnswer('${activeMandateId}','sourceCountry',this.value)">
              <option value="">Select</option>
              <option ${currentAnswers.sourceCountry==='low'?'selected':''} value="low">Low-risk country</option>
              <option ${currentAnswers.sourceCountry==='medium'?'selected':''} value="medium">Cross-border moderate risk</option>
              <option ${currentAnswers.sourceCountry==='high'?'selected':''} value="high">High-risk jurisdiction</option>
            </select>
          </div>
          <div class="form-group">
            <label>Transaction volume (12m)</label>
            <select onchange="updateRiskAnswer('${activeMandateId}','txVolume',this.value)">
              <option value="">Select</option>
              <option ${currentAnswers.txVolume==='low'?'selected':''} value="low">Low</option>
              <option ${currentAnswers.txVolume==='medium'?'selected':''} value="medium">Medium</option>
              <option ${currentAnswers.txVolume==='high'?'selected':''} value="high">High</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Structure complexity</label>
            <select onchange="updateRiskAnswer('${activeMandateId}','structureComplexity',this.value)">
              <option value="">Select</option>
              <option ${currentAnswers.structureComplexity==='simple'?'selected':''} value="simple">Simple ownership</option>
              <option ${currentAnswers.structureComplexity==='moderate'?'selected':''} value="moderate">Moderate complexity</option>
              <option ${currentAnswers.structureComplexity==='complex'?'selected':''} value="complex">Trust / foundation / layered entities</option>
            </select>
          </div>
          <div class="form-group">
            <label>PEP exposure</label>
            <select onchange="updateRiskAnswer('${activeMandateId}','pep',this.value)">
              <option value="">Select</option>
              <option ${currentAnswers.pep==='no'?'selected':''} value="no">No</option>
              <option ${currentAnswers.pep==='yes'?'selected':''} value="yes">Yes</option>
            </select>
          </div>
          <div class="form-group">
            <label>Sanctions flag</label>
            <select onchange="updateRiskAnswer('${activeMandateId}','sanctions',this.value)">
              <option value="">Select</option>
              <option ${currentAnswers.sanctions==='no'?'selected':''} value="no">No</option>
              <option ${currentAnswers.sanctions==='yes'?'selected':''} value="yes">Yes</option>
            </select>
          </div>
        </div>
        ${computed ? `<div class="info-box"><p><strong>Computed Risk:</strong> ${computed.level} (score ${computed.score}) · ${escapeHtml(computed.reason)}</p></div>` : ''}
      </div>
    </div>
    ` : ''}

    <div class="card">
      <div class="card-header"><div class="card-title">Risk Criteria Reference</div></div>
      <div class="card-body">
        <div class="grid-3">
          ${riskCriteria('🟢', 'Low Risk', 'var(--accent-green)', ['Standard retail banking clients', 'Low-value transactions expected', 'Domestic customers', 'No PEP or sanctions flags', 'Simple corporate structures', 'Simplified Due Diligence (SDD) may apply'])}
          ${riskCriteria('🟡', 'Medium Risk', 'var(--status-pending)', ['SME / mid-market corporates', 'Some cross-border activity', 'Complex but transparent ownership', 'Standard KYC required', 'Annual review cycle', 'Monitoring via transaction alerts'])}
          ${riskCriteria('🔴', 'High Risk', 'var(--accent-red)', ['PEP, Family member or close associate', 'Sanctioned jurisdictions', 'Opaque ownership structures', 'High-value / cash transactions', 'Trusts, Foundations, NGOs', 'Enhanced Due Diligence (EDD) mandatory', 'Senior management approval required'])}
        </div>
      </div>
    </div>
  `;
}

function updateRiskAnswer(mandateId, field, value) {
  if (!State.riskAnswers[mandateId]) State.riskAnswers[mandateId] = {};
  State.riskAnswers[mandateId][field] = value;
  const score = computeRiskScore(State.riskAnswers[mandateId]);
  State.riskScores[mandateId] = score;
  renderRiskRatings();
}

function computeRiskScore(answers) {
  let score = 0;
  if (answers.mandateProfile === 'opaque') score += 3;
  if (answers.mandateProfile === 'moderate') score += 1;
  if (answers.sourceCountry === 'high') score += 3;
  if (answers.sourceCountry === 'medium') score += 1;
  if (answers.txVolume === 'high') score += 2;
  if (answers.txVolume === 'medium') score += 1;
  if (answers.structureComplexity === 'complex') score += 3;
  if (answers.structureComplexity === 'moderate') score += 1;
  if (answers.pep === 'yes') score += 3;
  if (answers.sanctions === 'yes') score += 4;

  let level = 'Low';
  if (score >= 10) level = 'High';
  else if (score >= 5) level = 'Medium';

  const reason = level === 'High'
    ? 'High due to complex structure, jurisdiction/PEP/sanctions exposure, or elevated transaction profile.'
    : level === 'Medium'
      ? 'Medium due to moderate cross-border activity or ownership complexity.'
      : 'Low due to transparent structure and limited exposure indicators.';

  return { score, level, reason };
}

function riskCriteria(emoji, title, color, items) {
  return `
    <div style="background:var(--bg-elevated);border-radius:var(--radius-lg);padding:20px;border:1px solid var(--border-subtle);">
      <div style="font-size:24px;margin-bottom:10px;">${emoji}</div>
      <div style="font-size:15px;font-weight:700;color:${color};margin-bottom:12px;">${title}</div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:8px;">
        ${items.map(i => `<li style="font-size:13px;color:var(--text-secondary);display:flex;gap:6px;"><span style="color:${color};flex-shrink:0;">•</span>${i}</li>`).join('')}
      </ul>
    </div>
  `;
}

/* ============================================================
   PAGE: SETTINGS
   ============================================================ */
function renderSettings() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <h1>Settings</h1>
      <p>Platform configuration and preferences</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">User Profile</div></div>
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
            <div class="user-avatar" style="width:60px;height:60px;font-size:22px;">B</div>
            <div>
              <div style="font-size:16px;font-weight:600;">Bank Administrator</div>
              <div style="font-size:13px;color:var(--text-secondary);">admin@complianceos.com</div>
            </div>
          </div>
          <div class="form-group"><label>Full Name</label><input type="text" value="Bank Administrator" /></div>
          <div class="form-group"><label>Email</label><input type="email" value="admin@complianceos.com" /></div>
          <div class="form-group"><label>Phone</label><input type="tel" value="+44 20 7000 0001" /></div>
          <button class="btn-primary" onclick="showToast('success','Profile updated.')">Save Changes</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Notification Preferences</div></div>
        <div class="card-body">
          ${['New case submitted', 'Document uploaded', 'Document expiry alert (30 days)', 'Case status changes', 'Information requested', 'Case approved / rejected', 'Weekly compliance summary'].map(n => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-subtle);">
              <span style="font-size:13px;">${n}</span>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" checked style="accent-color:var(--accent-purple);">
                <span style="font-size:12px;color:var(--text-muted);">Email</span>
              </label>
            </div>
          `).join('')}
          <div style="margin-top:16px;">
            <button class="btn-primary" onclick="showToast('success','Notification preferences saved.')">Save Preferences</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Document Requirements</div></div>
        <div class="card-body">
          <div class="info-box">
            <p>Configure the standard document checklist for each client type.</p>
          </div>
          <div class="form-group"><label>Default checklist for Individuals</label><select><option selected>Standard KYC</option><option>Enhanced DD</option></select></div>
          <div class="form-group"><label>Default checklist for Corporates</label><select><option selected>Standard Corporate KYC</option><option>Enhanced DD</option></select></div>
          <div class="form-group"><label>Default checklist for Trusts/Foundations</label><select><option selected>Enhanced DD</option><option>Standard KYC</option></select></div>
          <button class="btn-primary" onclick="showToast('success','Document requirements updated.')">Save</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Security</div></div>
        <div class="card-body">
          <div class="form-group"><label>Current Password</label><input type="password" placeholder="••••••••" /></div>
          <div class="form-group"><label>New Password</label><input type="password" placeholder="••••••••" /></div>
          <div class="form-group"><label>Confirm New Password</label><input type="password" placeholder="••••••••" /></div>
          <div style="margin-bottom:16px;">
            <div class="checkbox-group"><input type="checkbox" id="2fa" checked /><label for="2fa">Enable Two-Factor Authentication (2FA)</label></div>
          </div>
          <button class="btn-primary" onclick="showToast('success','Password updated successfully.')">Update Password</button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(type, message) {
  const container = document.getElementById('toast-container');
  const icons = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>`,
    error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--status-pending)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  // The message routinely carries names, filenames and server error text, none
  // of which is ours to trust. Only the fixed icon markup is set as HTML; the
  // message goes in as text, so a name like "<img onerror=...>" is shown, not run.
  toast.innerHTML = icons[type] || '';
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  toast.appendChild(text);
  toast.onclick = () => { toast.classList.add('exit'); setTimeout(() => toast.remove(), 300); };
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('exit'); setTimeout(() => toast.remove(), 300); }, 4000);
}

/* ============================================================
   HELPERS
   ============================================================ */
function statusLabel(s) {
  const map = {
    pending: 'Pending', 'under-review': 'Under Review', approved: 'Approved',
    rejected: 'Rejected', draft: 'Not Submitted', 'info-requested': 'Info Requested',
    'in-progress': 'In Progress',
  };
  return map[s] || s;
}

function auditColor(type) {
  const m = { created: '#6366f1', submitted: '#06b6d4', approved: '#10b981', rejected: '#ef4444', requested: '#f59e0b', uploaded: '#8b5cf6' };
  return m[type] || '#6366f1';
}
function auditEmoji(type) {
  const m = { created: '📋', submitted: '📤', approved: '✓', rejected: '✗', requested: '❓', uploaded: '📎' };
  return m[type] || '•';
}

function formatDate(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/* ============================================================
   MISSING HELPERS
   ============================================================ */
function updateNewClientForm() {
  const type = document.getElementById('new-client-type')?.value || 'individual';
  const checklist = document.getElementById('doc-checklist');
  if (!checklist) return;
  const extraCorporate = ['Certificate of Incorporation', 'UBO Declaration', 'Shareholder Register'];
  const extraTrust = ['Trust Deed', 'Settlor Declaration', 'Beneficiary Details'];
  const extraFoundation = ['Foundation Charter', 'Regulatory Registration', 'Beneficiary Purpose Statement'];
  const base = ['Power of Attorney (Vollmacht)', 'Client Categorisation (FIDLEG)', 'Investment Profile', 'Risk Profile Questionnaire', 'Mandate Risk Profile', 'KYC Form', 'ID Document (Passport or National ID)'];
  let docs = [...base];
  if (type === 'corporate') docs = [...docs, ...extraCorporate];
  if (type === 'trust') docs = [...docs, ...extraTrust];
  if (type === 'foundation') docs = [...docs, ...extraFoundation];
  checklist.innerHTML = docs.map(d => `
    <div class="checkbox-group">
      <input type="checkbox" id="doc-${d.replace(/[\s/()]/g,'_')}" checked />
      <label for="doc-${d.replace(/[\s/()]/g,'_')}">${d}</label>
    </div>
  `).join('');
}

async function loadStateFromBackend() {
  try {
    if (!hasAuthToken()) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);

    if (user.role === 'client') {
      const res = await fetch(`${API_BASE}/clients/me`, {
        credentials: 'include',
        signal: controller.signal,
      });
      if (res.ok) {
        State.myClientProfile = await res.json();
        State.myClientProfile.id = State.myClientProfile.clientId; // real docs have no plain `id`
        if (State.myClientProfile.type) {
          State.clientType = State.myClientProfile.type;
        }
      }
    } else {
      const res = await fetch(`${API_BASE}/clients`, {
        credentials: 'include',
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        // Real Client docs carry `clientId` (e.g. "CLT-0001"), not the mock data's
        // plain `id` — map it so every existing `c.id` reference keeps working.
        if (Array.isArray(data) && data.length > 0) State.clients = data.map(normalizeClientRecord);
      }
    }
  } catch (_) {
    // Backend unavailable — demo data already loaded in State
  }
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const params     = new URLSearchParams(window.location.search);
  const verifyTok  = params.get('verify');
  const resetTok   = params.get('reset');

  // An explicit verification/reset link always wins over a stale saved session —
  // otherwise clicking the link in a browser that's still logged in from an
  // earlier session (e.g. a demo login) silently resumes that old session and
  // the token in the URL is never processed.
  if (verifyTok) {
    renderAuthPanel();
    handleEmailVerification(verifyTok);
    await loadStateFromBackend();
    return;
  }
  if (resetTok) {
    AuthState.resetToken = resetTok;
    AuthState.panel      = 'reset-password';
    renderAuthPanel();
    await loadStateFromBackend();
    return;
  }

  // Restore session on page refresh (token-based or demo role)
  const savedRole   = localStorage.getItem('sessionRole');
  const sessionOn   = localStorage.getItem('sessionActive');
  if (sessionOn && savedRole && ROLES[savedRole]) {
    AuthState.selectedRole = savedRole;
    await enterApp(savedRole);
    return;
  }

  renderAuthPanel();
  await loadStateFromBackend();
});
