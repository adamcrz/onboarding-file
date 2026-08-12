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
      { id: 'kyc-corrections', label: 'Corrections', icon: checklistIcon() },
      { id: 'kyc-tasks', label: 'KYC Tasks', icon: formIcon() },
      { id: 'audit', label: 'Audit Trail', icon: auditIcon() },
      { section: 'Tools' },
      { id: 'contract-building', label: 'Contract Building', icon: fileIcon() },
      { id: 'kyc-form', label: 'KYC Questionnaire', icon: formIcon() },
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
      { id: 'kyc-corrections', label: 'Corrections', icon: checklistIcon() },
      { id: 'kyc-tasks', label: 'KYC Tasks', icon: formIcon() },
      { id: 'audit', label: 'Audit Trail', icon: auditIcon() },
      { section: 'Tools' },
      { id: 'contract-building', label: 'Contract Building', icon: fileIcon() },
      { id: 'kyc-form', label: 'KYC Questionnaire', icon: formIcon() },
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
      { id: 'kyc-corrections', label: 'Corrections', icon: checklistIcon() },
      { id: 'kyc-tasks', label: 'KYC Tasks', icon: formIcon() },
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
      { id: 'client-contract', label: 'Contract Package', icon: contractIcon() },
      { id: 'client-upload', label: 'Upload Signed Docs', icon: uploadIcon() },
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
    'forgot-password': forgotPasswordHTML,
    'reset-sent':      resetSentHTML,
    'reset-password':  resetPasswordFormHTML,
  };
  el.innerHTML = (map[AuthState.panel] || loginFormHTML)();
}

/* --- HTML generators -------------------------------------------------- */

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
    <p class="login-subtitle">Logging in as <strong>${meta.name}</strong></p>

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

    <div style="text-align:center;margin-top:16px;">
      <button class="auth-link-btn" onclick="setAuthPanel('register')">New to the portal? Create account</button>
    </div>

    <p class="login-footer" style="margin-top:20px;">SHA cryptography &nbsp;·&nbsp; Protected by 256-bit TLS encryption</p>
  `;
}

function registerFormHTML() {
  const role = AuthState.selectedRole;
  const meta = ROLE_META[role];
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
    <p class="login-subtitle">${meta ? `Creating a new ${meta.name} account` : 'Join your compliance portal'}</p>

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
  setupRoleUI(role);
  await loadStateFromBackend();
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
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: demoRole }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();

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

    const backendRole = data.user.role;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    enterApp(backendRole);

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

function resetLoginBtn() {
  const btn = document.getElementById('login-btn');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = 'Sign In <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
}

function logout() {
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
    const res  = await fetch('http://localhost:5000/api/auth/register', {
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
    const res  = await fetch('http://localhost:5000/api/auth/resend-verification', {
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
    const res  = await fetch('http://localhost:5000/api/auth/forgot-password', {
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
    const res  = await fetch(`http://localhost:5000/api/auth/reset-password/${AuthState.resetToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) { showToast('error', data.error || 'Reset failed.'); if (btn) { btn.disabled = false; btn.textContent = 'Set New Password'; } return; }

    localStorage.setItem('token', data.token);
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
    const res  = await fetch(`http://localhost:5000/api/auth/verify-email/${token}`);
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
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
function setupRoleUI(role) {
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
          <span>${item.label}</span>
          ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
          ${item.id === 'kyc-tasks' ? `<span class="nav-badge" id="navbadge-kyc-tasks" style="display:none;"></span>` : ''}
          ${item.id === 'kyc-corrections' ? `<span class="nav-badge" id="navbadge-kyc-corrections" style="display:none;"></span>` : ''}
          ${item.id === 'clients' && role === 'rm' ? `<span class="nav-badge" id="navbadge-clients" style="display:none;"></span>` : ''}
        </button>
      `;
    }
  });

  // Notifications panel
  refreshNotifications();
  if (role !== 'client') refreshKycTasks();
  // Populates State.kycCorrections too — the client portal needs it to know
  // which of its own KYC fields are gold-flagged, even without a nav badge.
  refreshCorrectionsBadge();
  if (role === 'rm') updateMyClientsBadge();
}

function updateKycTasksBadge() {
  const pendingCount = State.kycTasks.filter(t => t.status === 'pending').length;
  const badge = document.getElementById('navbadge-kyc-tasks');
  if (!badge) return;
  if (pendingCount > 0) { badge.textContent = pendingCount; badge.style.display = 'flex'; }
  else badge.style.display = 'none';
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
    const openCount = [...kyc, ...docs].filter(c => c.status !== 'corrected').length;
    const badge = document.getElementById('navbadge-kyc-corrections');
    if (!badge) return;
    if (openCount > 0) { badge.textContent = openCount; badge.style.display = 'flex'; }
    else badge.style.display = 'none';
  } catch (_) { /* leave badge hidden */ }
}

function updateMyClientsBadge() {
  const badge = document.getElementById('navbadge-clients');
  if (!badge) return;
  const count = State.clients.length;
  if (count > 0) { badge.textContent = count; badge.style.display = 'flex'; }
  else badge.style.display = 'none';
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
async function refreshNotifications() {
  try {
    const items = await apiFetch('GET', '/notifications');
    State.notifications = items.map(n => ({ ...n, id: n._id, time: new Date(n.createdAt).toLocaleString() }));
  } catch (_) { /* keep whatever was cached */ }
  renderNotificationDropdown();
}

function renderNotificationDropdown() {
  const el = document.getElementById('notif-dropdown');
  el.innerHTML = `
    <div style="padding:16px;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:14px;font-weight:600;">Notifications</span>
      <button onclick="markAllRead()" style="background:none;border:none;font-size:12px;color:var(--accent-purple-light);cursor:pointer;">Mark all read</button>
    </div>
    ${State.notifications.map(n => `
      <div style="padding:14px 16px;border-bottom:1px solid var(--border-subtle);${!n.read ? 'background:rgba(99,102,241,0.04)' : ''};cursor:pointer;" onclick="markRead('${n.id}')">
        <div style="font-size:13px;color:var(--text-primary);">${n.text}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${n.time}</div>
      </div>
    `).join('')}
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

function toggleNotifications() {
  document.getElementById('notif-dropdown').classList.toggle('open');
  refreshNotifications();
}
document.addEventListener('click', e => {
  if (!e.target.closest('#notif-btn') && !e.target.closest('#notif-dropdown')) {
    document.getElementById('notif-dropdown').classList.remove('open');
  }
});

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
    'kyc-form': 'KYC Questionnaire',
    'kyc-tasks': 'KYC Tasks',
    'kyc-corrections': 'KYC Corrections',
    'client-contract': 'Contract Package',
    'client-upload': 'Upload Signed Documents',
    risk: 'Risk Ratings',
    'client-detail': 'Client Details',
    'kyc-fill': 'KYC Questionnaire',
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
function hasAuthToken() { return !!localStorage.getItem('token'); }

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
                <div class="client-name">${c.name}</div>
                <div class="client-type">${c.type} · ${c.country}</div>
              </div>
              <div class="client-meta">
                <span class="status-badge status-${c.status}">${statusLabel(c.status)}</span>
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
                <span style="font-size:13px;font-weight:500;">${c.name}</span>
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

function statCard(color, value, label, change, positive, icon) {
  return `
    <div class="stat-card">
      <div class="stat-header">
        <div class="stat-icon" style="background:${color}22;color:${color}">${icon}</div>
        ${change ? `<span class="stat-change ${positive ? 'positive' : 'negative'}">${change}</span>` : ''}
      </div>
      <div class="stat-value" style="color:${color}">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

/* --- Compliance Dashboard --- */
function renderComplianceDashboard() {
  const content = document.getElementById('page-content');
  const pending = State.clients.filter(c => c.status === 'under-review' || c.status === 'pending');
  const readyForExport = State.clients.filter(c => c.status === 'approved');

  content.innerHTML = `
    <div class="page-header">
      <h1>Compliance Dashboard</h1>
      <p>Pending cases and Assetmax data export</p>
    </div>
    <div class="stats-grid">
      ${statCard('#f59e0b', pending.length, 'Awaiting Review', '', false, checklistIcon())}
      ${statCard('#10b981', '1', 'Approved This Month', '', true, checkIcon())}
      ${statCard('#ef4444', '1', 'Rejected', '', false, xIcon())}
      ${statCard('#06b6d4', readyForExport.length, 'Ready for Assetmax Export', '', false, `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`)}
    </div>
    <div class="info-box warning">
      <p><strong>⚠ Action Required:</strong> ${pending.length} case(s) are awaiting compliance review. Please review and action them to avoid delays.</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Pending Cases (${pending.length})</div>
          <button class="btn-secondary btn-sm" onclick="navigateTo('clients')">View All Cases</button>
        </div>
        <div>
          ${pending.map(c => `
            <div class="client-row" onclick="openClientDetail('${c.id}')">
              <div class="client-avatar" style="background:${clientGradient(c.type)}">${c.name[0]}</div>
              <div class="client-info">
                <div class="client-name">${c.name}</div>
                <div class="client-type">${c.type} · Risk: <span class="risk-${c.risk.toLowerCase()}">${c.risk}</span> · RM: ${c.rm}</div>
              </div>
              <div class="client-meta">
                <span class="status-badge status-${c.status}">${statusLabel(c.status)}</span>
                <div class="client-date">${c.created}</div>
              </div>
            </div>
          `).join('')}
          ${pending.length === 0 ? `<p style="padding:16px;font-size:13px;color:var(--text-muted);">No pending cases.</p>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Assetmax Export</div>
            <div class="card-subtitle">Contract documents and KYC/Mandate Risk data export</div>
          </div>
        </div>
        <div class="card-body">
          <div class="info-box success">
            <p>Only approved cases are available for export. All exports are logged in the audit trail.</p>
          </div>
          ${readyForExport.length === 0 ? `<p style="font-size:13px;color:var(--text-muted);">No approved cases ready for export yet.</p>` : ''}
          ${readyForExport.map(c => `
            <div style="padding:14px 0;border-bottom:1px solid var(--border-subtle);">
              <div style="font-size:13px;font-weight:600;margin-bottom:10px;">${c.name}
                <span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:6px;">${c.type} · Approved ${c.created}</span>
              </div>

              <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Contract Documents</div>
              <div style="background:var(--bg-secondary);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:10px;">
                ${c.documents.filter(d => d.signedVersion || d.status === 'approved').map(d => `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border-subtle);">
                    <div style="display:flex;align-items:center;gap:7px;font-size:12px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                      ${d.name}
                    </div>
                    <button class="btn-secondary btn-xs" onclick="showToast('info','Downloading ${d.name}…')">↓</button>
                  </div>
                `).join('')}
                <div style="margin-top:8px;">
                  <button class="btn-primary btn-sm" style="width:100%;" onclick="showToast('success','Contract package for ${c.name} downloaded.')">
                    Download Full Contract Package
                  </button>
                </div>
              </div>

              <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Data Export</div>
              <div style="background:var(--bg-secondary);border-radius:var(--radius-md);padding:10px 12px;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border-subtle);">
                  <div style="display:flex;align-items:center;gap:7px;font-size:12px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                    KYC Data
                  </div>
                  <button class="btn-secondary btn-sm" onclick="exportKycData('${c.id}')">
                    Export .xlsx
                  </button>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;">
                  <div style="display:flex;align-items:center;gap:7px;font-size:12px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                    Mandate Risk Profile
                  </div>
                  <button class="btn-secondary btn-sm" onclick="exportToAssetmax('${c.id}')">
                    Export .xlsx
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function exportKycData(clientId) {
  const c = State.clients.find(c => c.id === clientId);
  if (!c) return;
  const filename = c.name.replace(/\s+/g, '_');
  c.auditTrail.push({ action: 'KYC data exported (.xlsx)', user: 'Compliance Officer', time: new Date().toLocaleString(), type: 'submitted' });
  showToast('success', `KYC_Data_${filename}.xlsx downloaded.`);
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
      const tasks = await apiFetch('GET', '/kyc-tasks');
      State.kycTasks = tasks.map(t => ({ ...t, id: t._id }));
    } catch (err) {
      content.innerHTML = `<div class="page-header"><h1>KYC Tasks</h1></div><p style="color:var(--accent-red);padding:16px;">Failed to load KYC tasks: ${err.message}</p>`;
      return;
    }
  }
  updateKycTasksBadge();

  const pending   = State.kycTasks.filter(t => t.status === 'pending');
  const completed = State.kycTasks.filter(t => t.status === 'completed');

  const taskRow = (t, isPending) => `
    <div class="client-row" style="cursor:default;">
      <div class="client-avatar" style="background:${clientGradient('Individual')}">${(t.clientName||'?')[0]}</div>
      <div class="client-info">
        <div class="client-name">${t.clientName}</div>
        <div class="client-type">${t.clientEmail} · Kundenberater: ${t.rmName || '—'} · Assigned ${new Date(t.createdAt).toLocaleString()}</div>
      </div>
      <div class="client-meta" style="display:flex;align-items:center;gap:10px;">
        ${isPending
          ? `<button class="btn-primary btn-sm" onclick="openKycTask('${t.id}')">Fill KYC Form</button>`
          : `<span class="status-badge status-approved">Completed ${t.completedAt ? new Date(t.completedAt).toLocaleDateString() : ''}</span>`}
      </div>
    </div>
  `;

  content.innerHTML = `
    <div class="page-header">
      <h1>KYC Tasks</h1>
      <p>Questionnaires created from Contract Building — the Kundenberater, Compliance, and the client (if they have a portal account) can all complete the same one.</p>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><div class="card-title">To Complete (${pending.length})</div></div>
      <div>
        ${pending.map(t => taskRow(t, true)).join('') || `<p style="padding:16px;font-size:13px;color:var(--text-muted);">Nothing outstanding.</p>`}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Completed</div></div>
      <div>
        ${completed.map(t => taskRow(t, false)).join('') || `<p style="padding:16px;font-size:13px;color:var(--text-muted);">No completed questionnaires yet.</p>`}
      </div>
    </div>
  `;
}

function openKycTask(taskId) {
  const task = State.kycTasks.find(t => t.id === taskId);
  if (!task) return;
  State._activeKycTask = task;
  navigateTo('kyc-fill');
}

function renderKycFill() {
  const task = State._activeKycTask;
  const content = document.getElementById('page-content');
  if (!task) {
    content.innerHTML = `<div class="page-header"><h1>KYC Form</h1><p>No active KYC task found.</p></div>`;
    return;
  }

  const isRM = State.currentRole === 'rm';
  const fillerLabel = isRM ? `Filling on behalf of: <strong>${task.clientName}</strong>` : `Please complete all required fields below.`;

  content.innerHTML = `
    <div class="page-header">
      <h1>KYC Questionnaire</h1>
      <p>${fillerLabel}</p>
    </div>

    <div class="info-box" style="margin-bottom:20px;">
      <p>Your information is processed strictly for compliance purposes and kept confidential.</p>
    </div>

    <form id="kyc-fill-form">
      ${task.sections.map(sec => `
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header" style="padding:12px 16px;">
            <div style="font-size:14px;font-weight:700;">${sec.title}</div>
          </div>
          <div class="card-body">
            ${sec.fields.map(f => `
              <div class="form-group" style="margin-bottom:14px;">
                <label style="font-size:12px;font-weight:600;">${f.label}${f.required?' <span style="color:var(--accent-red);">*</span>':''}</label>
                ${f.type === 'select'
                  ? `<select name="${f.id}" ${f.required?'required':''} style="width:100%;padding:7px 10px;font-size:13px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-primary);color:var(--text-primary);">
                      <option value="">— select —</option>
                      ${(f.options||[]).map(o=>`<option value="${o}">${o}</option>`).join('')}
                    </select>`
                  : f.type === 'textarea'
                  ? `<textarea name="${f.id}" rows="3" ${f.required?'required':''} placeholder="${f.label}" style="width:100%;padding:7px 10px;font-size:13px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-primary);color:var(--text-primary);resize:vertical;"></textarea>`
                  : f.type === 'yesno'
                  ? `<div style="display:flex;gap:16px;margin-top:4px;">
                      <label style="font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" name="${f.id}" value="yes" ${f.required?'required':''}> Yes</label>
                      <label style="font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" name="${f.id}" value="no"> No</label>
                    </div>`
                  : `<input type="${f.type}" name="${f.id}" ${f.required?'required':''} placeholder="${f.label}" style="width:100%;padding:7px 10px;font-size:13px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-primary);color:var(--text-primary);">`
                }
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:8px;margin-bottom:32px;">
        <button type="button" class="btn-secondary" onclick="navigateTo('dashboard')">Cancel</button>
        <button type="submit" class="btn-primary">Submit KYC Form</button>
      </div>
    </form>
  `;

  document.getElementById('kyc-fill-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const answers = Object.fromEntries(new FormData(e.target).entries());
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }
    try {
      await apiFetch('POST', `/kyc-tasks/${task.id}/complete`, { answers, completedBy: State.currentRole });
      State._activeKycTask = null;
      showToast('success', `KYC form for ${task.clientName} submitted successfully.`);
      setTimeout(() => navigateTo('dashboard'), 1200);
    } catch (err) {
      showToast('error', err.message || 'Failed to submit KYC form.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit KYC Form'; }
    }
  });
}

/* --- RM Dashboard --- */
function renderRMDashboard() {
  const content = document.getElementById('page-content');
  const myClients = State.clients.filter(c => c.rm === currentRmName());
  const myKycTasks = State.kycTasks.filter(t => t.status === 'pending');
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
              <div style="font-size:13px;font-weight:600;">${t.clientName}</div>
              <div style="font-size:11.5px;color:var(--text-muted);">${t.clientEmail} · Assigned ${t.createdAt}</div>
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
              <div class="client-name">${c.name}</div>
              <div class="client-type">${c.type} · ${c.country}</div>
              <div style="margin-top:6px;">
                <div class="progress-bar-wrap" style="width:120px;">
                  <div class="progress-bar" style="width:${c.progress}%;background:${progressColor(c.progress)};"></div>
                </div>
              </div>
            </div>
            <div class="client-meta">
              <span class="status-badge status-${c.status}">${statusLabel(c.status)}</span>
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

  const pendingKycTask = State.kycTasks.find(t => t.status === 'pending' && t.clientEmail === (client.email || '').toLowerCase());

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
      <p>Track your onboarding progress for <strong>${client.name}</strong> · Category: <strong>${State.clientType}</strong></p>
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
            <div class="step-item ${s.status}">
              <div class="step-dot">${s.status === 'done' ? '✓' : i+1}</div>
              <div class="step-label">${s.label}</div>
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

    ${REQUIRED_KYC_FIELDS[client.type] ? `
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
                  <span style="font-size:13px;">${d.name}</span>
                  <span class="status-badge status-${d.status}">${statusLabel(d.status)}</span>
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
  try {
    const clients = await apiFetch('GET', '/clients');
    if (Array.isArray(clients) && clients.length > 0) {
      State.clients = clients.map(normalizeClientRecord);
    }
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
            <div style="font-weight:500;">${c.name}</div>
            <div class="td-secondary">${c.country}</div>
          </div>
        </div>
      </td>
      <td>${c.type}</td>
      <td><span class="risk-${c.risk.toLowerCase()}" style="font-weight:600;">${c.risk}</span></td>
      <td><span class="status-badge status-${c.status}">${statusLabel(c.status)}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="progress-bar-wrap" style="width:80px;"><div class="progress-bar" style="width:${c.progress}%;background:${progressColor(c.progress)};"></div></div>
          <span style="font-size:12px;color:var(--text-muted);">${c.progress}%</span>
        </div>
      </td>
      <td class="td-secondary">${c.rm}</td>
      <td class="td-secondary">${c.created}</td>
      <td onclick="event.stopPropagation()">
        <div class="actions-row">
          <button class="btn-secondary btn-xs" onclick="openClientDetail('${c.id}')">View</button>
          ${isCompliance(State.currentRole) && (c.status === 'under-review' || c.status === 'pending') ? `
            <button class="btn-success btn-xs" onclick="event.stopPropagation();approveClient('${c.id}')">Approve</button>
            <button class="btn-danger btn-xs" onclick="event.stopPropagation();rejectClient('${c.id}')">Reject</button>
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

function approveClient(id) {
  const c = State.clients.find(c => c.id === id);
  if (!c) return;
  c.status = 'approved'; c.progress = 100;
  c.auditTrail.push({ action: 'Case approved by compliance officer', user: 'Compliance Officer', time: new Date().toLocaleString(), type: 'approved' });
  showToast('success', `${c.name} has been approved.`);
  renderClients();
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

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <button class="btn-secondary btn-sm" onclick="navigateTo('clients')">← Back</button>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="client-avatar" style="width:48px;height:48px;font-size:18px;background:${clientGradient(client.type)}">${client.name[0]}</div>
          <div>
            <h1 style="font-size:20px;font-weight:700;">${client.name}</h1>
            <div style="color:var(--text-secondary);font-size:13px;">${client.type} · ${client.country} · Case ${client.id}</div>
          </div>
          <span class="status-badge status-${client.status}" style="font-size:13px;padding:6px 14px;">${statusLabel(client.status)}</span>
          <span style="font-weight:600;font-size:13px;" class="risk-${client.risk.toLowerCase()}">Risk: ${client.risk}</span>
        </div>
      </div>
      <div class="actions-row">
        ${isCompliance(State.currentRole) && (client.status === 'under-review' || client.status === 'pending') ? `
          <button class="btn-success btn-sm" onclick="approveClientFromDetail('${client.id}')">✓ Approve</button>
          <button class="btn-danger btn-sm" onclick="rejectClientFromDetail('${client.id}')">✗ Reject</button>
          <button class="btn-warning btn-sm" onclick="requestInfo('${client.id}')">Request Info</button>
        ` : ''}
        ${State.currentRole === 'rm' ? `<button class="btn-secondary btn-sm" onclick="switchTab('kyc')">Edit KYC</button>` : ''}
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('overview')">Overview</button>
      <button class="tab-btn" onclick="switchTab('kyc')">KYC Details</button>
      <button class="tab-btn" onclick="switchTab('docs')">Documents (${client.documents.length})</button>
      <button class="tab-btn" onclick="switchTab('audit-trail')">Audit Trail</button>
    </div>

    <div id="tab-overview" class="tab-content active">
      ${renderClientOverviewTab(client)}
    </div>
    <div id="tab-kyc" class="tab-content">
      ${renderClientKycTab(client)}
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
    const tabs = ['overview','kyc','docs','audit-trail'];
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
          ${infoRow('Risk Level', `<span class="risk-${client.risk.toLowerCase()}" style="font-weight:700;">${client.risk}</span>`)}
          ${infoRow('Relationship Manager', client.rm)}
          ${infoRow('Date Created', client.created)}
          ${infoRow('Status', `<span class="status-badge status-${client.status}">${statusLabel(client.status)}</span>`)}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Onboarding Progress</div></div>
        <div class="card-body">
          <div style="text-align:center;margin-bottom:20px;">
            <div style="font-size:48px;font-weight:800;color:${client.progress===100 ? 'var(--accent-green)' : 'var(--accent-purple-light)'};">${client.progress}%</div>
            <div style="color:var(--text-muted);">Overall Completion</div>
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

function renderClientKycTab(client) {
  // RM and Compliance both see the single shared KYC record — read-only
  // except for fields with an open correction, which show gold/empty/editable
  // per clientKycEditableFormHTML. Values only ever arrive via a completed
  // KYC Task or a resubmitted/approved correction, never a free-text edit here.
  if ((State.currentRole === 'rm' || isCompliance(State.currentRole)) && REQUIRED_KYC_FIELDS[client.type]) {
    return clientKycEditableFormHTML(client);
  }

  if (!client.kyc || !Object.keys(client.kyc).length) {
    return `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg><p>No KYC data available for this client.</p></div>`;
  }

  if (client.type === 'Individual') {
    const k = client.kyc;
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">Individual KYC Information</div></div>
        <div class="card-body">
          <div class="grid-2">
            ${infoRow('Full Name', `${k.title} ${k.firstName} ${k.lastName}`)}
            ${infoRow('Date of Birth', k.dob)}
            ${infoRow('Nationality', k.nationality)}
            ${infoRow('Residency', k.residency)}
            ${infoRow('Tax Residency', k.taxResidency)}
            ${infoRow('Tax ID / SSN', k.taxId)}
            ${infoRow('Passport Number', k.passportNumber)}
            ${infoRow('Passport Expiry', k.passportExpiry)}
            ${infoRow('Address', k.address)}
            ${infoRow('Employment', k.employmentStatus)}
            ${infoRow('Occupation', k.occupation)}
            ${infoRow('Annual Income', k.annualIncome)}
            ${infoRow('Source of Wealth', k.sourceOfWealth)}
          </div>
          <hr class="divider" />
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
            ${screeningBadge('PEP Status', k.pep)}
            ${screeningBadge('Sanctions', k.sanctions)}
            ${screeningBadge('Adverse Media', k.adverse)}
          </div>
        </div>
      </div>
    `;
  }

  if (client.type === 'Corporate') {
    const k = client.kyc;
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">Corporate KYC Information</div></div>
        <div class="card-body">
          <div class="kyc-section-title">Company Details</div>
          <div class="grid-2">
            ${infoRow('Legal Name', k.legalName)}
            ${infoRow('Trading Name', k.tradingName)}
            ${infoRow('Registration No.', k.registrationNumber)}
            ${infoRow('Registration Date', k.registrationDate)}
            ${infoRow('Country', k.registrationCountry)}
            ${infoRow('Jurisdiction', k.jurisdiction)}
            ${infoRow('Business Type', k.businessType)}
            ${infoRow('Industry', k.industry)}
            ${infoRow('Annual Turnover', k.annualTurnover)}
            ${infoRow('Net Assets', k.netAssets)}
            ${infoRow('Employees', k.employees)}
            ${infoRow('Website', k.website)}
            ${infoRow('Registered Address', k.address)}
            ${infoRow('Purpose of Account', k.purpose)}
          </div>
          <hr class="divider" />
          <div class="kyc-section-title">Directors</div>
          ${(k.directors||[]).map(d => `
            <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:14px;margin-bottom:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
              ${infoRow('Name', d.name)} ${infoRow('Nationality', d.nationality)} ${infoRow('Passport', d.passport)}
            </div>
          `).join('')}
          <hr class="divider" />
          <div class="kyc-section-title">Ultimate Beneficial Owners (UBOs)</div>
          ${(k.ubos||[]).map(u => `
            <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:14px;margin-bottom:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
              ${infoRow('Name', u.name)} ${infoRow('Ownership', u.ownership)} ${infoRow('Nationality', u.nationality)}
            </div>
          `).join('')}
          <hr class="divider" />
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
            ${screeningBadge('PEP Status', k.pep)}
            ${screeningBadge('Sanctions', k.sanctions)}
            ${screeningBadge('Adverse Media', k.adverse)}
          </div>
        </div>
      </div>
    `;
  }

  return `<div class="card"><div class="card-body"><p class="text-muted">KYC details not available.</p></div></div>`;
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
  const canUpload = State.currentRole === 'rm' || State.currentRole === 'client';
  const canReview = isCompliance(State.currentRole);
  const isClient = State.currentRole === 'client';
  const blankDocs = client.documents.filter(d => d.templateAvailable || d.signedVersion === false || d.uploadedBy === 'Compliance');
  const signedDocs = client.documents.filter(d => d.signedVersion || d.uploadedBy === 'Client' || d.uploadedBy === 'RM');

  const section = (title, docs) => `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div class="card-title">${title}</div>
      </div>
      <div class="card-body" style="padding-top:4px;">
        ${docs.length === 0 ? `<div style="font-size:13px;color:var(--text-muted);">No documents in this section.</div>` : docs.map(d => `
          <div class="doc-item" style="${d.missingNote ? 'border-color:rgba(249,115,22,0.4);background:rgba(249,115,22,0.03);' : ''}">
            <div class="doc-icon" style="background:${docIconColor(d.type)}22;color:${docIconColor(d.type)}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
            </div>
            <div class="doc-info">
              <div class="doc-name">${d.name}</div>
              <div class="doc-meta">
                ${d.type}
                ${d.templateAvailable ? `&nbsp;·&nbsp;<span style="color:var(--accent-indigo);font-weight:500;">Template available</span>` : ''}
                ${d.signedVersion ? `&nbsp;·&nbsp;<span style="color:var(--accent-green);font-weight:500;">✓ Signed version received</span>` : ''}
                ${d.date !== '-' ? ` · Uploaded ${d.date}` : ''} ${d.size !== '-' ? `· ${d.size}` : ''}
              </div>
              ${d.missingNote ? `<div style="font-size:11.5px;color:var(--status-info-requested);margin-top:5px;">⚠&nbsp;${d.missingNote}</div>` : ''}
            </div>
            <div class="doc-actions">
              <span class="status-badge status-${d.status}">${statusLabel(d.status)}</span>
              ${d.templateAvailable && canUpload ? `<button class="btn-secondary btn-xs" onclick="downloadTemplate('${d.id}')">${downloadIcon()} Template</button>` : ''}
              ${d.signedVersion || d.date !== '-' ? `<button class="btn-icon" title="Download" onclick="downloadDoc('${d.id}')">${downloadIcon()}</button>` : ''}
              ${canReview && d.status === 'pending' ? `
                <button class="btn-success btn-xs" onclick="approveDoc('${client.id}','${d.id}')">Approve</button>
                <button class="btn-danger btn-xs" onclick="requestDocInfo('${client.id}','${d.id}')">Request Info</button>
              ` : ''}
              ${canUpload && (d.status === 'draft' || d.status === 'info-requested') ? `
                <button class="btn-primary btn-xs" onclick="triggerFileInput()">Upload Signed</button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Document Package</div>
          <div class="card-subtitle">Documents are separated into Blank Documents and Signed Documents for review clarity</div>
        </div>
      </div>
      ${isClient ? `
        <div style="padding:0 22px 16px;">
          <div class="info-box">
            <p>📋 <strong>How it works:</strong> (1) Download the blank template &rarr; (2) Print &amp; sign by hand &rarr; (3) Scan to PDF &rarr; (4) Upload here. Electronic signatures are <strong>not</strong> accepted.</p>
          </div>
        </div>
      ` : ''}
      <div class="card-body" style="padding-top:4px;">
        ${section('Blank Documents', blankDocs)}
        ${section('Signed Documents', signedDocs)}
      </div>
    </div>

    ${canUpload ? `
      <div class="card">
        <div class="card-header"><div class="card-title">Upload Signed Document</div></div>
        <div class="card-body">
          <div class="form-group" style="margin-bottom:14px;max-width:360px;">
            <label for="upload-doc-type">Document Type</label>
            <select id="upload-doc-type" onchange="cbToggleContractTemplateSelect()">
              <option value="Uploaded Document">Other Signed Document</option>
              <option value="ID Document">ID Document (Passport / Ausweis)</option>
              <option value="Signed Contract">Signed Contract Package</option>
            </select>
          </div>
          <div class="form-group" id="upload-contract-template-wrap" style="margin-bottom:14px;max-width:360px;display:none;">
            <label for="upload-contract-template">Contract Template Used</label>
            <select id="upload-contract-template">
              ${Object.entries(CONTRACT_VALIDATION_MAPS).map(([id, m]) => `<option value="${id}">${m.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="upload-id-expiry-wrap" style="margin-bottom:14px;max-width:360px;display:none;">
            <label for="upload-id-expiry">Document Expiry Date <span style="color:var(--accent-red)">*</span></label>
            <input type="date" id="upload-id-expiry">
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">A passport or ID that's already expired will be flagged for correction automatically.</div>
          </div>
          <div class="upload-zone" id="upload-zone" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropFile(event)" onclick="triggerFileInput()">
            <div style="font-size:36px;margin-bottom:12px;">🗂️</div>
            <div class="upload-zone-text">Drag &amp; drop signed PDF here or click to browse</div>
            <div class="upload-zone-sub">Upload the scanned, physically-signed version · PDF only · max 20MB</div>
          </div>
          <input type="file" id="file-input" style="display:none;" onchange="handleFileSelect(event)" multiple accept=".pdf,.jpg,.jpeg,.png" />
        </div>
      </div>
    ` : ''}
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

function approveClientFromDetail(id) {
  approveClient(id);
  openClientDetail(id);
}

function rejectClientFromDetail(id) {
  rejectClient(id);
  openClientDetail(id);
}

function requestInfo(id) {
  const c = State.clients.find(c => c.id === id);
  if (!c) return;
  c.auditTrail.push({ action: 'Additional information requested by compliance', user: 'Compliance Officer', time: new Date().toLocaleString(), type: 'requested' });
  showToast('info', `Information request sent to ${c.rm}.`);
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
async function kycExportAll() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/kyc/export/natural-person`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

async function requestDocInfo(clientId, docId) {
  const c = State.clients.find(c => c.id === clientId);
  const d = c && c.documents.find(d => d.id === docId);
  if (!d) return;
  try {
    await apiFetch('POST', `/clients/${clientId}/documents/${docId}/request-info`);
    d.status = 'info-requested';
    showToast('info', `Information requested for ${d.name}.`);
    refreshNotifications();
    renderClientDetail();
    switchTab('docs');
  } catch (err) {
    showToast('error', err.message || 'Failed to request info.');
  }
}

function downloadDoc(docId) { showToast('info', 'Document download started.'); }

function showUploadModal(docId) {
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

// Automatic check for ID/passport uploads: a genuine signed scan should have a
// stamp/signature (with a date beside it) in the bottom-right corner. We sample
// that region's actual pixels and look for a meaningful amount of non-background
// ink — if there isn't any, the document gets auto-flagged into Document
// Corrections instead of relying on someone remembering to check by eye.
// Only works for image uploads (jpg/png) — client-side PDF rendering isn't
// available, so PDFs are conservatively treated as "unable to verify".
function detectSignatureStamp(file) {
  return new Promise((resolve) => {
    if (!/^image\//.test(file.type)) { resolve(false); return; }
    const reader = new FileReader();
    reader.onerror = () => resolve(false);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(false);
      img.onload = () => {
        try {
          const w = img.naturalWidth, h = img.naturalHeight;
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          // Bottom-right corner: last 28% of width, last 22% of height
          const rx = Math.floor(w * 0.72), ry = Math.floor(h * 0.78);
          const rw = w - rx, rh = h - ry;
          if (rw <= 0 || rh <= 0) { resolve(false); return; }
          const data = ctx.getImageData(rx, ry, rw, rh).data;
          let inkPixels = 0;
          const totalPixels = rw * rh;
          for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
            if (brightness < 190) inkPixels++; // darker than plain paper background
          }
          resolve((inkPixels / totalPixels) > 0.015); // >1.5% ink in the corner = stamp/signature present
        } catch (_) { resolve(false); } // e.g. tainted canvas
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function cbToggleContractTemplateSelect() {
  const docType = document.getElementById('upload-doc-type')?.value;
  const wrap = document.getElementById('upload-contract-template-wrap');
  if (wrap) wrap.style.display = docType === 'Signed Contract' ? 'block' : 'none';
  const expiryWrap = document.getElementById('upload-id-expiry-wrap');
  if (expiryWrap) expiryWrap.style.display = docType === 'ID Document' ? 'block' : 'none';
}

function contractCheckFailureReason(result, templateId) {
  if (result.reason === 'page not found in upload') return 'expected page not found in the uploaded PDF — please re-upload the complete package.';
  const region = CONTRACT_VALIDATION_MAPS[templateId]?.regions.find(r => r.id === result.id);
  if (region?.rule === 'at-most-one') return 'more than one option is ticked — only one should be selected.';
  return 'no option appears to be ticked.';
}

async function flagDocumentCorrection(clientId, docName, issue) {
  try {
    await apiFetch('POST', '/corrections/documents', { clientId, docName, issue });
  } catch (err) {
    console.warn('Failed to record document correction:', err.message);
  }
}

/* ============================================================
   SIGNED CONTRACT VALIDATION — checks a client's uploaded, physically-signed
   contract scan for required initials/checkboxes/signatures, the same way
   detectSignatureStamp() checks ID documents: real pixel-ink analysis, not a
   stub. Box coordinates were extracted once (via PyMuPDF, offline) from an
   actual generated+rendered contract for each template, as fractions of page
   width/height so they hold regardless of render DPI. This only covers the
   pages/sections that were mapped — extend CONTRACT_VALIDATION_MAPS with the
   same coordinate-extraction approach to cover more templates/regions.
   ============================================================ */
const CONTRACT_VALIDATION_MAPS = {
  'en-disc-all-in': {
    label: 'Discretionary All-In (EN)',
    regions: [
      { id: 'investment_strategy', label: 'Investment Strategy selection', page: 18, rule: 'at-least-one', boxes: [
        {x0:0.1237,y0:0.1541,x1:0.1311,y1:0.1593}, {x0:0.1237,y0:0.1709,x1:0.1311,y1:0.1761},
      ]},
      { id: 'risk_capacity', label: 'Risk Capacity assessment', page: 14, rule: 'at-most-one', boxes: [
        {x0:0.1479,y0:0.1597,x1:0.1539,y1:0.1661}, {x0:0.1493,y0:0.1829,x1:0.1553,y1:0.1893},
        {x0:0.1495,y0:0.2058,x1:0.1555,y1:0.2122}, {x0:0.1497,y0:0.2291,x1:0.1557,y1:0.2355},
        {x0:0.1497,y0:0.2523,x1:0.1558,y1:0.2587},
      ]},
      { id: 'risk_tolerance', label: 'Risk Tolerance assessment', page: 14, rule: 'at-most-one', boxes: [
        {x0:0.5435,y0:0.1597,x1:0.5495,y1:0.1661}, {x0:0.5449,y0:0.1829,x1:0.5509,y1:0.1893},
        {x0:0.5451,y0:0.2058,x1:0.5511,y1:0.2122}, {x0:0.5453,y0:0.2291,x1:0.5513,y1:0.2355},
        {x0:0.5453,y0:0.2523,x1:0.5514,y1:0.2587},
      ]},
      { id: 'suitable_mandate', label: 'Suitable Mandate selection', page: 14, rule: 'at-most-one', boxes: [
        {x0:0.1673,y0:0.3287,x1:0.1733,y1:0.3351}, {x0:0.1672,y0:0.3659,x1:0.1731,y1:0.3723},
        {x0:0.1672,y0:0.4209,x1:0.1731,y1:0.4273}, {x0:0.1672,y0:0.4707,x1:0.1731,y1:0.4771},
        {x0:0.1672,y0:0.5375,x1:0.1731,y1:0.5439},
      ]},
    ],
  },
  'en-advisory': {
    label: 'Advisory Contract (EN)',
    regions: [
      { id: 'initials_p4', label: 'Client initials (p.4 — third-party compensation waiver)', page: 4, rule: 'ink-present', boxes: [
        {x0:0.7382,y0:0.1683,x1:0.9282,y1:0.1922},
      ]},
    ],
  },
};

// Renders one PDF page to a canvas and returns its 2D context + dimensions.
async function renderPdfPageToCanvas(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { ctx, width: canvas.width, height: canvas.height };
}

// Same ink-density heuristic as detectSignatureStamp, applied to an arbitrary
// normalized region of an already-rendered page.
function regionHasInk(ctx, width, height, box, threshold) {
  const x0 = Math.max(0, Math.floor(box.x0 * width));
  const y0 = Math.max(0, Math.floor(box.y0 * height));
  const x1 = Math.min(width, Math.ceil(box.x1 * width));
  const y1 = Math.min(height, Math.ceil(box.y1 * height));
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return false;
  let data;
  try { data = ctx.getImageData(x0, y0, w, h).data; } catch (_) { return false; }
  let ink = 0;
  const total = w * h;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
    if (brightness < 190) ink++;
  }
  return (ink / total) > (threshold ?? 0.15); // boxes are shrunk to each checkbox's interior (border excluded), so an empty box reads near-0% and a real tick reads near-100%
}

// Validates an uploaded signed contract PDF against the template's mapped
// regions. Returns { supported, results: [{id, label, ok}] }.
async function validateSignedContractPdf(file, templateId) {
  const map = CONTRACT_VALIDATION_MAPS[templateId];
  if (!map) return { supported: false, results: [] };
  if (file.type !== 'application/pdf' || !window.pdfjsLib) return { supported: false, results: [] };

  const buf = await file.arrayBuffer();
  const pdfDoc = await window.pdfjsLib.getDocument({ data: buf }).promise;

  const pageCache = {};
  const getPage = async (n) => {
    if (n > pdfDoc.numPages) return null;
    if (!pageCache[n]) pageCache[n] = await renderPdfPageToCanvas(pdfDoc, n);
    return pageCache[n];
  };

  const results = [];
  for (const region of map.regions) {
    const rendered = await getPage(region.page);
    if (!rendered) { results.push({ id: region.id, label: region.label, ok: false, reason: 'page not found in upload' }); continue; }
    const ticked = region.boxes.map(b => regionHasInk(rendered.ctx, rendered.width, rendered.height, b));
    const tickedCount = ticked.filter(Boolean).length;
    let ok;
    if (region.rule === 'at-least-one') ok = tickedCount >= 1;
    else if (region.rule === 'at-most-one') ok = tickedCount <= 1;
    else ok = tickedCount >= 1; // 'ink-present' — single box, same test
    results.push({ id: region.id, label: region.label, ok, tickedCount });
  }
  return { supported: true, results };
}

async function simulateUpload(file) {
  const client = getActiveClientForUpload();
  if (!client) {
    showToast('warning', 'No active client selected for upload.');
    return;
  }
  State.selectedClientId = client.id;
  const docType = document.getElementById('upload-doc-type')?.value || 'Uploaded Document';
  const newDoc = {
    id: 'D' + Date.now(), name: file.name, type: docType,
    status: 'pending', uploadedBy: State.currentRole === 'client' ? 'Client' : 'RM',
    date: new Date().toISOString().slice(0,10), size: (file.size/1024/1024).toFixed(1)+' MB', required: false,
    signedVersion: true, templateAvailable: false
  };

  if (docType === 'ID Document') {
    const expiryStr = document.getElementById('upload-id-expiry')?.value || '';
    newDoc.expiryDate = expiryStr;
    const issues = [];

    const hasStamp = await detectSignatureStamp(file);
    if (!hasStamp) issues.push('Automatic check found no signature/stamp with date in the bottom-right corner — please re-upload a clearer scan.');

    if (!expiryStr) {
      issues.push('No expiry date was entered for this ID/passport.');
    } else if (new Date(expiryStr) < new Date(new Date().toDateString())) {
      issues.push(`This document expired on ${expiryStr} — an expired passport or ID cannot be accepted.`);
    }

    if (issues.length) {
      newDoc.missingNote = issues.join(' ');
      await flagDocumentCorrection(client.id, newDoc.name, newDoc.missingNote);
      showToast('warning', `${file.name} uploaded, but flagged for correction: ${issues.join(' ')}`);
    }
  }

  if (docType === 'Signed Contract') {
    const templateId = document.getElementById('upload-contract-template')?.value;
    const { supported, results } = await validateSignedContractPdf(file, templateId);
    if (!supported) {
      newDoc.missingNote = 'Automatic verification isn\'t available for this template/file type yet — please review manually.';
      await flagDocumentCorrection(client.id, newDoc.name, newDoc.missingNote);
      showToast('warning', `${file.name} uploaded — automatic verification not available for this template, flagged for manual review.`);
    } else {
      const failed = results.filter(r => !r.ok);
      if (failed.length) {
        newDoc.missingNote = 'Automatic check found issues: ' + failed.map(r => r.label).join('; ') + '.';
        for (const r of failed) {
          await flagDocumentCorrection(client.id, newDoc.name, `${r.label}: ${contractCheckFailureReason(r, templateId)}`);
        }
        showToast('warning', `${file.name} uploaded, but ${failed.length} check(s) failed — flagged for correction.`);
      }
    }
  }

  client.documents.push(newDoc);
  const submissions = ensureClientSubmissionBucket(client.id);
  submissions.unshift({
    id: `sub-${Date.now()}`,
    name: file.name,
    date: new Date().toISOString().slice(0,10),
    status: 'pending',
    size: newDoc.size
  });
  client.progress = Math.min(client.progress + 10, 95);
  addClientAudit(client.id, `Document uploaded: ${file.name}`, 'uploaded');
  if (!newDoc.missingNote) showToast('success', `${file.name} uploaded successfully.`);
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
          <span style="font-weight:500;">${d.name}</span>
        </div>
      </td>
      <td><button style="background:none;border:none;color:var(--accent-purple-light);cursor:pointer;font-size:13px;" onclick="openClientDetail('${d.clientId}')">${d.clientName}</button></td>
      <td class="td-secondary">${d.type}</td>
      <td><span class="status-badge status-${d.status}">${statusLabel(d.status)}</span></td>
      <td class="td-secondary">${d.uploadedBy}</td>
      <td class="td-secondary">${d.date}</td>
      <td class="td-secondary">${d.size}</td>
      <td>
        <div class="actions-row">
          ${d.date !== '-' ? `<button class="btn-icon" title="Download">${downloadIcon()}</button>` : ''}
          ${isCompliance(role) && d.status === 'pending' ? `<button class="btn-success btn-xs" onclick="approveDoc('${d.clientId}','${d.id}')">Approve</button>` : ''}
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
                <div style="font-size:13px;color:var(--text-primary);line-height:1.4;">${a.action}${!isClient && a.clientName ? `<span style="color:var(--accent-purple-light);margin-left:6px;font-size:12px;">→ ${a.clientName}</span>` : ''}</div>
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
   KYC QUESTIONNAIRE — template builder state
   ============================================================ */
const KYC_TEMPLATE = {
  sections: [
    {
      id: 'sec_personal', title: '1. Personal Information',
      fields: [
        { id: 'f_title',       label: 'Title',                      type: 'select',   required: false, options: ['Mr','Mrs','Ms','Dr','Prof'] },
        { id: 'f_firstname',   label: 'First Name(s)',               type: 'text',     required: true  },
        { id: 'f_lastname',    label: 'Last Name',                   type: 'text',     required: true  },
        { id: 'f_dob',         label: 'Date of Birth',               type: 'date',     required: true  },
        { id: 'f_nationality', label: 'Nationality',                  type: 'text',     required: true  },
        { id: 'f_country',     label: 'Country of Residence',         type: 'text',     required: true  },
        { id: 'f_pob',         label: 'Place of Birth',               type: 'text',     required: false },
      ]
    },
    {
      id: 'sec_identity', title: '2. Identity Documents',
      fields: [
        { id: 'f_passport',        label: 'Passport Number',   type: 'text', required: true  },
        { id: 'f_passport_expiry', label: 'Passport Expiry',   type: 'date', required: true  },
        { id: 'f_passport_country',label: 'Issuing Country',   type: 'text', required: false },
      ]
    },
    {
      id: 'sec_address', title: '3. Residential Address',
      fields: [
        { id: 'f_addr1',   label: 'Address Line 1', type: 'text', required: true  },
        { id: 'f_addr2',   label: 'Address Line 2', type: 'text', required: false },
        { id: 'f_city',    label: 'City',            type: 'text', required: true  },
        { id: 'f_zip',     label: 'Postal Code',     type: 'text', required: true  },
        { id: 'f_ctry',    label: 'Country',         type: 'text', required: true  },
      ]
    },
    {
      id: 'sec_tax', title: '4. Tax Information',
      fields: [
        { id: 'f_tax_country', label: 'Tax Residency Country',         type: 'text', required: true },
        { id: 'f_tin',         label: 'Tax Identification Number (TIN)', type: 'text', required: true },
      ]
    },
    {
      id: 'sec_employment', title: '5. Employment & Financial Profile',
      fields: [
        { id: 'f_emp_status',  label: 'Employment Status',    type: 'select',   required: true, options: ['Employed','Self-Employed / Director','Retired','Student','Other'] },
        { id: 'f_occupation',  label: 'Occupation / Job Title', type: 'text',   required: false },
        { id: 'f_employer',    label: 'Employer / Company',    type: 'text',   required: false },
        { id: 'f_income',      label: 'Annual Income Range',   type: 'select',   required: true, options: ['< CHF 100K','CHF 100K – 500K','CHF 500K – 1M','> CHF 1M'] },
      ]
    },
    {
      id: 'sec_wealth', title: '6. Source of Wealth & Assets',
      fields: [
        { id: 'f_sow',        label: 'Source of Wealth (description)', type: 'textarea', required: true  },
        { id: 'f_net_assets', label: 'Estimated Net Assets',            type: 'select',   required: true, options: ['< CHF 500K','CHF 500K – 2M','CHF 2M – 10M','> CHF 10M'] },
      ]
    },
    {
      id: 'sec_pep', title: '7. PEP & Regulatory Declarations',
      fields: [
        { id: 'f_pep',       label: 'Politically Exposed Person (PEP)?', type: 'yesno', required: true },
        { id: 'f_sanctions', label: 'Subject to any sanctions?',          type: 'yesno', required: true },
        { id: 'f_adverse',   label: 'Adverse media or legal proceedings?',type: 'yesno', required: true },
      ]
    },
  ],
  _nextId: 100,
};

function kycNextId() { return 'k' + (KYC_TEMPLATE._nextId++); }

function kycAddSection() {
  const title = prompt('Section title:');
  if (!title || !title.trim()) return;
  KYC_TEMPLATE.sections.push({ id: kycNextId(), title: title.trim(), fields: [] });
  renderKycForm();
}

function kycRemoveSection(id) {
  if (!confirm('Remove this section and all its fields?')) return;
  KYC_TEMPLATE.sections = KYC_TEMPLATE.sections.filter(s => s.id !== id);
  renderKycForm();
}

function kycUpdateSectionTitle(id, val) {
  const s = KYC_TEMPLATE.sections.find(s => s.id === id);
  if (s && val.trim()) s.title = val.trim();
}

function kycShowAddField(secId) {
  document.getElementById('kaf-' + secId).style.display = 'block';
  document.getElementById('kaf-toggle-' + secId).style.display = 'none';
}

function kycHideAddField(secId) {
  document.getElementById('kaf-' + secId).style.display = 'none';
  document.getElementById('kaf-toggle-' + secId).style.display = 'inline-flex';
}

function kycToggleOpts(secId) {
  const t = document.getElementById('kaf-type-' + secId)?.value;
  const wrap = document.getElementById('kaf-opts-' + secId);
  if (wrap) wrap.style.display = t === 'select' ? 'block' : 'none';
}

function kycAddField(secId) {
  const label = document.getElementById('kaf-label-' + secId)?.value?.trim();
  const type  = document.getElementById('kaf-type-' + secId)?.value;
  const req   = document.getElementById('kaf-req-' + secId)?.checked;
  const opts  = document.getElementById('kaf-opts-text-' + secId)?.value?.trim();
  if (!label) { alert('Please enter a field label.'); return; }
  const s = KYC_TEMPLATE.sections.find(s => s.id === secId);
  if (!s) return;
  const field = { id: kycNextId(), label, type: type || 'text', required: !!req };
  if (type === 'select' && opts) field.options = opts.split(',').map(o => o.trim()).filter(Boolean);
  s.fields.push(field);
  renderKycForm();
}

function kycRemoveField(secId, fieldId) {
  const s = KYC_TEMPLATE.sections.find(s => s.id === secId);
  if (s) s.fields = s.fields.filter(f => f.id !== fieldId);
  renderKycForm();
}

function kycSaveTemplate() {
  showToast('success', 'KYC template saved successfully.');
}

function kycViewTemplatePreview() {
  const overlay = document.createElement('div');
  overlay.id = 'kyc-preview-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:24px;';
  const TYPE_LABELS = { text:'Text input', email:'Email', date:'Date picker', number:'Number', select:'Dropdown', textarea:'Long text', yesno:'Yes / No' };
  overlay.innerHTML = `
    <div style="background:var(--bg-primary);border-radius:var(--radius-lg);max-width:680px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid var(--border-default);position:sticky;top:0;background:var(--bg-primary);z-index:1;">
        <div>
          <div style="font-size:16px;font-weight:700;">KYC Form Preview</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">As seen by the client or RM filling it in</div>
        </div>
        <button onclick="document.getElementById('kyc-preview-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted);">✕</button>
      </div>
      <div style="padding:24px;">
        ${KYC_TEMPLATE.sections.map(sec => `
          <div style="margin-bottom:28px;">
            <div style="font-size:14px;font-weight:700;color:var(--accent-purple);margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid rgba(139,92,246,0.2);">${sec.title}</div>
            ${sec.fields.length === 0
              ? `<p style="font-size:12px;color:var(--text-muted);font-style:italic;">No fields in this section.</p>`
              : sec.fields.map(f => `
                  <div style="margin-bottom:14px;">
                    <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">${f.label}${f.required?' <span style="color:var(--accent-red);">*</span>':''}</label>
                    ${f.type === 'select'
                      ? `<select disabled style="width:100%;padding:7px 10px;font-size:13px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-secondary);color:var(--text-muted);">${(f.options||[]).map(o=>`<option>${o}</option>`).join('')}<option value="">— select —</option></select>`
                      : f.type === 'textarea'
                      ? `<textarea disabled rows="3" style="width:100%;padding:7px 10px;font-size:13px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-secondary);color:var(--text-muted);resize:none;" placeholder="${f.label}"></textarea>`
                      : f.type === 'yesno'
                      ? `<div style="display:flex;gap:12px;"><label style="font-size:13px;display:flex;align-items:center;gap:5px;"><input type="radio" disabled> Yes</label><label style="font-size:13px;display:flex;align-items:center;gap:5px;"><input type="radio" disabled> No</label></div>`
                      : `<input disabled type="${f.type}" style="width:100%;padding:7px 10px;font-size:13px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-secondary);color:var(--text-muted);" placeholder="${f.label}">`
                    }
                  </div>
                `).join('')
            }
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function kycDownloadTemplate() {
  showToast('info', 'KYC template PDF generation started — download will begin shortly.');
  setTimeout(() => showToast('success', 'KYC_Questionnaire_Template.pdf downloaded.'), 1800);
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
};

// Required-document checklist the RM can ask the client to upload, shown on the
// client's own portal under Required Documents. Backed by the DocumentRequirement
// catalog in the database (loaded via loadDocumentRequirements below) — this
// hardcoded object is only the fallback used if that fetch fails. Varies by
// the client's legal form; RMs can also add their own custom entries on top.
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
  CB.createClientAccount = true; CB.requiredDocuments = [];
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

  const filtered = CB.templates.filter(t => t.lang === CB.lang);
  el.innerHTML = `
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
                <div class="cb-template-name">${t.name}</div>
                <div class="cb-template-type">${t.type}</div>
              </button>
              <div style="display:flex;gap:6px;margin-top:4px;">
                <a class="cb-dl-btn" style="flex:1;" href="http://localhost:5000/api/contracts/download/${t.id}"
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
            ${KUNDENBERATER.map(rm => `<option value="${rm.name}" ${CB.kundenberater===rm.name?'selected':''}>${rm.name}</option>`).join('')}
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
            ${CLIENT_LEGAL_FORMS.map(f => `<option value="${f.value}" ${CB.clientType===f.value?'selected':''}>${f.label}</option>`).join('')}
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
               onchange="CB.createClientAccount=this.checked">
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

function cbFieldHTML(f) {
  if (f.type === 'checkbox') {
    return `
      <label class="cb-checkbox-label">
        <input type="checkbox" id="cb_${f.key}" name="${f.key}">
        <span>${f.label}</span>
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
      <label for="cb_${f.key}">${f.label}${required?' <span style="color:var(--accent-red)">*</span>':''}</label>
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
  const options = DOCUMENT_CHECKLIST_OPTIONS[CB.clientType] || [];
  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${options.map(label => `
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;">
          <input type="checkbox" ${CB.requiredDocuments.includes(label)?'checked':''} onchange="cbToggleRequiredDoc('${label.replace(/'/g,"\\'")}', this.checked)">
          ${label}
        </label>
      `).join('')}
      ${CB.requiredDocuments.filter(d => !options.includes(d)).map(label => `
        <label style="display:flex;align-items:center;gap:10px;font-size:13px;">
          <input type="checkbox" checked onchange="cbToggleRequiredDoc('${label.replace(/'/g,"\\'")}', this.checked)">
          ${label} <span style="font-size:11px;color:var(--text-muted);">(custom)</span>
        </label>
      `).join('')}
    </div>
  `;
}

function cbRefreshRequiredDocsChecklist() {
  const el = document.getElementById('cb-required-docs-checklist');
  if (el) el.innerHTML = cbRequiredDocsChecklistHTML();
}

function cbToggleRequiredDoc(label, checked) {
  const options = DOCUMENT_CHECKLIST_OPTIONS[CB.clientType] || [];
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
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/contracts/appendix/download/${CB.clientType}/${CB.lang}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
  const missingRequired = CB.fields
    .filter(f => f.required && f.type !== 'checkbox')
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
  const clientEmail = fieldValues['client_email'];

  if (!clientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    showToast('warning', 'Please enter a valid client email address.');
    return null;
  }

  return { fieldValues, clientName, clientEmail };
}

// Creates the client's KYC task. Persisted on the backend so it's visible across
// sessions, like Contract Reviews. No delegation choice anymore — the Kundenberater
// (RM), the client, and Compliance can all see and complete the same task.
async function cbCreateKycTask(rmName, clientName, clientEmail, clientId) {
  try {
    await apiFetch('POST', '/kyc-tasks', {
      rmName, clientName, clientEmail, clientId,
      sections: KYC_TEMPLATE.sections,
    });
  } catch (err) {
    showToast('error', `Failed to create KYC task: ${err.message}`);
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
    await cbCreateKycTask(CB.kundenberater, clientName, clientEmail);
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
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/contracts/generate/${CB.selectedId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
   PAGE: KYC FORM — TEMPLATE BUILDER
   ============================================================ */
function renderKycForm() {
  const content = document.getElementById('page-content');
  const TYPE_LABELS = { text:'Text', email:'Email', date:'Date', number:'Number', select:'Dropdown', textarea:'Long Text', yesno:'Yes / No' };

  content.innerHTML = `
    <div class="page-header">
      <h1>KYC Questionnaire Template</h1>
      <p>Configure the sections and fields that appear in the KYC form sent to clients.</p>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:12px;flex-wrap:wrap;">
      <div style="font-size:13px;color:var(--text-muted);">${KYC_TEMPLATE.sections.length} section${KYC_TEMPLATE.sections.length!==1?'s':''} · ${KYC_TEMPLATE.sections.reduce((a,s)=>a+s.fields.length,0)} fields total</div>
      <div style="display:flex;gap:8px;">
        <button class="btn-secondary btn-sm" onclick="kycViewTemplatePreview()">View Template</button>
        <button class="btn-secondary btn-sm" onclick="kycDownloadTemplate()">Download</button>
        ${isCompliance(State.currentRole) ? `<button class="btn-secondary btn-sm" onclick="kycExportAll()">Export Completed KYCs</button>` : ''}
        <button class="btn-secondary btn-sm" onclick="kycAddSection()">+ Add Section</button>
        <button class="btn-primary btn-sm" onclick="kycSaveTemplate()">Save Template</button>
      </div>
    </div>

    ${KYC_TEMPLATE.sections.map(sec => `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-header" style="padding:12px 16px;">
          <input type="text" value="${sec.title.replace(/"/g,'&quot;')}"
                 onblur="kycUpdateSectionTitle('${sec.id}', this.value)"
                 style="font-size:14px;font-weight:600;border:none;background:transparent;color:var(--text-primary);width:100%;max-width:420px;outline:none;padding:2px 4px;border-radius:4px;"
                 onfocus="this.style.background='var(--bg-secondary)'" onblur2="this.style.background='transparent'">
          <button class="btn-secondary btn-xs" onclick="kycRemoveSection('${sec.id}')" style="color:var(--accent-red);border-color:var(--accent-red);">Remove Section</button>
        </div>
        <div class="card-body" style="padding:0 16px 14px;">
          ${sec.fields.length === 0
            ? `<p style="font-size:12px;color:var(--text-muted);padding:10px 0;">No fields yet — add one below.</p>`
            : `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
                <thead>
                  <tr style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);border-bottom:1px solid var(--border-default);">
                    <th style="padding:8px 0;text-align:left;">Field Label</th>
                    <th style="padding:8px 6px;text-align:left;">Type</th>
                    <th style="padding:8px 6px;text-align:center;">Required</th>
                    <th style="padding:8px 0;text-align:right;"></th>
                  </tr>
                </thead>
                <tbody>
                  ${sec.fields.map(f => `
                    <tr style="border-bottom:1px solid var(--border-subtle);">
                      <td style="padding:9px 0;font-size:13px;">${f.label}${f.options?`<span style="font-size:10px;color:var(--text-muted);margin-left:6px;">(${f.options.join(', ')})</span>`:''}</td>
                      <td style="padding:9px 6px;"><span style="font-size:11px;padding:2px 7px;border-radius:10px;background:var(--bg-secondary);color:var(--text-secondary);">${TYPE_LABELS[f.type]||f.type}</span></td>
                      <td style="padding:9px 6px;text-align:center;font-size:12px;">${f.required?'<span style="color:var(--accent-red);">✓</span>':'<span style="color:var(--text-muted);">—</span>'}</td>
                      <td style="padding:9px 0;text-align:right;">
                        <button class="btn-secondary btn-xs" onclick="kycRemoveField('${sec.id}','${f.id}')" style="color:var(--text-muted);">✕</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>`
          }

          <!-- Inline Add Field form -->
          <div id="kaf-${sec.id}" style="display:none;background:var(--bg-secondary);border-radius:var(--radius-md);padding:12px;margin-top:6px;">
            <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-bottom:8px;align-items:end;">
              <div class="form-group" style="margin:0;">
                <label style="font-size:11px;">Field Label</label>
                <input type="text" id="kaf-label-${sec.id}" placeholder="e.g. Passport Number" style="width:100%;padding:6px 10px;font-size:13px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-primary);color:var(--text-primary);">
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-size:11px;">Type</label>
                <select id="kaf-type-${sec.id}" onchange="kycToggleOpts('${sec.id}')" style="padding:6px 10px;font-size:13px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-primary);color:var(--text-primary);">
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="date">Date</option>
                  <option value="number">Number</option>
                  <option value="select">Dropdown</option>
                  <option value="textarea">Long Text</option>
                  <option value="yesno">Yes / No</option>
                </select>
              </div>
              <div class="form-group" style="margin:0;">
                <label style="font-size:11px;">&nbsp;</label>
                <label style="display:flex;align-items:center;gap:5px;font-size:12px;padding:6px 0;cursor:pointer;white-space:nowrap;">
                  <input type="checkbox" id="kaf-req-${sec.id}"> Required
                </label>
              </div>
            </div>
            <div id="kaf-opts-${sec.id}" style="display:none;margin-bottom:8px;">
              <label style="font-size:11px;color:var(--text-muted);">Options (comma-separated)</label>
              <input type="text" id="kaf-opts-text-${sec.id}" placeholder="Option A, Option B, Option C" style="width:100%;padding:6px 10px;font-size:13px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-primary);color:var(--text-primary);">
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn-primary btn-sm" onclick="kycAddField('${sec.id}')">Add Field</button>
              <button class="btn-secondary btn-sm" onclick="kycHideAddField('${sec.id}')">Cancel</button>
            </div>
          </div>

          <button id="kaf-toggle-${sec.id}" class="btn-secondary btn-sm" onclick="kycShowAddField('${sec.id}')" style="margin-top:8px;">+ Add Field</button>
        </div>
      </div>
    `).join('')}

    <div style="margin-top:8px;">
      <button class="btn-secondary" onclick="kycAddSection()">+ Add Section</button>
    </div>
  `;
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
    ['firstName','First Name','Page 1 — Personal Details'], ['lastName','Last Name','Page 1 — Personal Details'],
    ['dob','Date of Birth','Page 1 — Personal Details'], ['nationality','Nationality','Page 1 — Personal Details'],
    ['residency','Residency','Page 1 — Personal Details'],
    ['taxResidency','Tax Residency','Page 2 — Tax & Identification'], ['taxId','Tax ID / SSN','Page 2 — Tax & Identification'],
    ['passportNumber','Passport Number','Page 2 — Tax & Identification'], ['passportExpiry','Passport Expiry','Page 2 — Tax & Identification'],
    ['address','Address','Page 2 — Tax & Identification'],
    ['employmentStatus','Employment Status','Page 3 — Financial Profile'], ['occupation','Occupation','Page 3 — Financial Profile'],
    ['annualIncome','Annual Income','Page 3 — Financial Profile'], ['sourceOfWealth','Source of Wealth','Page 3 — Financial Profile'],
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

async function renderKycCorrections() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="page-header"><h1>Corrections</h1></div><div class="cb-loading">Loading corrections…</div>`;
  if (hasAuthToken()) {
    try {
      const [kyc, docs] = await Promise.all([
        apiFetch('GET', '/corrections/kyc'),
        apiFetch('GET', '/corrections/documents'),
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

function renderKycCorrectionsList() {
  const content = document.getElementById('page-content');
  const scopeToOwn = c => State.currentRole !== 'rm' || State.clients.find(cl => cl.id === c.clientId)?.rm === currentRmName();

  const kycItems = State.kycCorrections.filter(scopeToOwn).map(item => ({
    ...item,
    clientName: State.clients.find(c => c.id === item.clientId)?.name || 'Unknown',
  }));
  const docItems = State.documentCorrections.filter(scopeToOwn).map(item => ({
    ...item,
    clientName: State.clients.find(c => c.id === item.clientId)?.name || 'Unknown',
  }));

  const kycStatusMeta = {
    pending:          { label: 'Pending',          badge: 'status-pending' },
    needs_correction: { label: 'Needs Correction',  badge: 'status-needs-correction' },
    resubmitted:      { label: 'Resubmitted',       badge: 'status-under-review' },
    corrected:        { label: 'Corrected',         badge: 'status-approved' },
  };

  content.innerHTML = `
    <div class="page-header">
      <h1>Corrections</h1>
      <p>KYC and document items flagged for follow-up${State.currentRole==='rm' ? ' on your clients' : ''}. Click an item to go straight to that field, fill it in, and resubmit its section.</p>
    </div>

    <div class="tabs">
      <button class="tab-btn active" id="corrtab-btn-kyc" onclick="switchCorrectionsTab('kyc')">KYC Corrections (${kycItems.filter(c=>c.status!=='corrected').length})</button>
      <button class="tab-btn" id="corrtab-btn-docs" onclick="switchCorrectionsTab('docs')">Document Corrections (${docItems.filter(c=>c.status==='pending').length})</button>
    </div>

    <div id="corrtab-kyc" class="tab-content active">
      <div class="card">
        <div class="card-header">
          <div class="card-title">KYC Correction Items</div>
          <div class="card-subtitle">${kycItems.filter(c=>c.status!=='corrected').length} open · ${kycItems.filter(c=>c.status==='corrected').length} corrected</div>
        </div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mandate ID</th>
                <th>Client</th>
                <th>KYC Issue</th>
                <th>Page Ref.</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${kycItems.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No KYC corrections.</td></tr>` : kycItems.map(c => `
                <tr style="${c.status!=='corrected'?'background:rgba(249,115,22,0.04);':''}cursor:pointer;" onclick="openKycCorrectionDetail('${c.id}')">
                  <td style="font-weight:600;color:var(--accent-purple-light);">${c.mandateId}</td>
                  <td>${c.clientName}</td>
                  <td style="color:${c.status!=='corrected'?'var(--text-primary)':'var(--text-secondary)'};">${c.issue}</td>
                  <td><span style="color:var(--accent-orange);font-size:12px;">${c.page}</span></td>
                  <td>
                    <span class="status-badge ${kycStatusMeta[c.status]?.badge || 'status-pending'}">
                      ${kycStatusMeta[c.status]?.label || c.status}
                    </span>
                  </td>
                  <td onclick="event.stopPropagation()">
                    ${c.status==='resubmitted' && isCompliance(State.currentRole) ? `
                      <button class="btn-success btn-xs" onclick="updateKycCorrectionStatus('${c.id}','corrected')">Mark Corrected</button>
                      <button class="btn-secondary btn-xs" onclick="updateKycCorrectionStatus('${c.id}','needs_correction')">Reject</button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="corrtab-docs" class="tab-content">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Document Correction Items</div>
          <div class="card-subtitle">${docItems.filter(c=>c.status==='pending').length} pending · ${docItems.filter(c=>c.status==='corrected').length} corrected</div>
        </div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Document</th>
                <th>Issue</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${docItems.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">No document corrections.</td></tr>` : docItems.map(c => `
                <tr style="${c.status==='pending'?'background:rgba(249,115,22,0.04);':''}">
                  <td>${c.clientName}</td>
                  <td style="font-weight:600;">${c.docName}</td>
                  <td style="color:${c.status==='pending'?'var(--text-primary)':'var(--text-secondary)'};">${c.issue}</td>
                  <td>
                    <span class="status-badge ${c.status==='pending'?'status-pending':c.status==='corrected'?'status-approved':'status-under-review'}">
                      ${c.status==='pending'?'Pending':c.status==='corrected'?'Corrected':'Resubmitted'}
                    </span>
                  </td>
                  <td>
                    ${c.status==='pending' && State.currentRole==='rm' ? `<button class="btn-secondary btn-xs" onclick="updateDocumentCorrectionStatus('${c.id}','resubmitted')">Mark Resubmitted</button>` : ''}
                    ${c.status==='resubmitted' && isCompliance(State.currentRole) ? `<button class="btn-success btn-xs" onclick="updateDocumentCorrectionStatus('${c.id}','corrected')">Mark Corrected</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function switchCorrectionsTab(name) {
  ['kyc','docs'].forEach(n => {
    document.getElementById(`corrtab-btn-${n}`)?.classList.toggle('active', n === name);
    document.getElementById(`corrtab-${n}`)?.classList.toggle('active', n === name);
  });
}

// RM may only move an item to 'resubmitted'; only Compliance may confirm 'corrected'.
async function updateKycCorrectionStatus(correctionId, status) {
  if (status === 'resubmitted' && State.currentRole !== 'rm') return;
  if (status === 'corrected' && !isCompliance(State.currentRole)) return;
  try {
    await apiFetch('POST', `/corrections/kyc/${correctionId}/status`, { status });
    showToast('success', `KYC correction updated to ${status}.`);
    refreshNotifications();
    await renderKycCorrections();
  } catch (err) {
    showToast('error', err.message || 'Failed to update KYC correction.');
  }
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

/* ── KYC Correction detail — per-client editable KYC fields, missing ones glow orange ── */
// Jumps straight to the specific field a correction is about, rather than a
// separate detail page — the KYC Details tab already shows it gold/editable.
function openKycCorrectionDetail(correctionId) {
  const correction = State.kycCorrections.find(c => c.id === correctionId);
  if (!correction) return;
  const client = State.clients.find(c => c.id === correction.clientId);
  if (!client) return;
  openClientDetail(client.id);
  switchTab('kyc');
  const el = document.getElementById(`clientkyc_${correction.fieldKey}`);
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
}

// Finds a client record by id, checking the logged-in client's own profile first
// (their own record may not be in State.clients at all) before falling back to
// the staff-side client list.
function resolveKycClient(clientId) {
  if (State.myClientProfile && (State.myClientProfile.id === clientId || State.myClientProfile.clientId === clientId)) {
    return State.myClientProfile;
  }
  return State.clients.find(c => c.id === clientId);
}

// Shared KYC display — used by the staff-side Client Detail "KYC Details" tab
// (RM + Compliance) and the client's own portal (if they have one). Read-only:
// values only ever arrive via a completed KYC Task or an approved correction,
// never free-typed here. The one exception is a field with an OPEN correction
// (pending or needs_correction) — that renders empty, gold, and editable, and
// is only ever resolved by filling in every gold field on its page and
// resubmitting that page as a unit.
function clientKycEditableFormHTML(client) {
  if (!client.kyc) client.kyc = {};
  const fields = REQUIRED_KYC_FIELDS[client.type] || [];
  const k = client.kyc;
  const openByKey = new Map(
    (State.kycCorrections || [])
      .filter(c => c.clientId === client.id && c.autoGenerated && (c.status === 'pending' || c.status === 'needs_correction'))
      .map(c => [c.fieldKey, c])
  );

  const pages = [];
  const pageIndex = new Map();
  fields.forEach(([key, label, page]) => {
    if (!pageIndex.has(page)) { pageIndex.set(page, pages.length); pages.push({ page, fields: [] }); }
    pages[pageIndex.get(page)].fields.push([key, label]);
  });

  const canFlag = isCompliance(State.currentRole);
  const canResubmit = State.currentRole === 'rm' || isCompliance(State.currentRole) || State.currentRole === 'client';

  const verifyBanner = client.kycAwaitingVerification ? `
    <div class="kyc-verify-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <span>${isCompliance(State.currentRole)
        ? `This KYC was submitted by ${client.kycSubmittedBy === 'rm' ? 'the RM' : 'the client'} and is awaiting your verification.`
        : `Submitted — awaiting Compliance verification.`}</span>
    </div>
  ` : '';

  return `
    ${verifyBanner}
    ${pages.map(({ page, fields: pageFields }) => {
      const hasOpen = pageFields.some(([key]) => openByKey.has(key));
      return `
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header">
            <div class="card-title">${page}</div>
            ${hasOpen && canResubmit ? `<button class="btn-primary btn-sm" onclick="resubmitKycPage('${client.id}','${page.replace(/'/g,"\\'")}')">Resubmit Section</button>` : ''}
          </div>
          <div class="card-body">
            <div class="cb-fields-grid">
              ${pageFields.map(([key, label]) => {
                const correction = openByKey.get(key);
                const val = k[key] || '';
                if (correction) {
                  return `
                    <div class="form-group" style="margin-bottom:0;">
                      <label for="clientkyc_${key}">${label} <span style="color:var(--accent-gold);font-weight:600;">— needs correction</span></label>
                      <input type="text" id="clientkyc_${key}" data-page="${page.replace(/"/g,'&quot;')}" value="" placeholder="Enter ${label}…" class="kyc-field-missing">
                    </div>
                  `;
                }
                return `
                  <div class="form-group" style="margin-bottom:0;">
                    <label>${label}</label>
                    <div style="display:flex;align-items:center;gap:2px;">
                      <div class="kyc-field-readonly ${!String(val).trim() ? 'empty' : ''}" style="flex:1;">${String(val).trim() || '—'}</div>
                      ${canFlag && String(val).trim() ? `<button type="button" class="kyc-flag-btn" title="Flag as incorrect" onclick="flagKycFieldPrompt('${client.id}','${key}','${label.replace(/'/g,"\\'")}')">⚑</button>` : ''}
                    </div>
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
function rerenderKycView() {
  if (State.currentPage === 'client-detail') { renderClientDetail(); switchTab('kyc'); }
  else if (State.currentPage === 'dashboard' && State.currentRole === 'client') renderClientDashboard();
}

async function resubmitKycPage(clientId, page) {
  const inputs = Array.from(document.querySelectorAll('input.kyc-field-missing')).filter(el => el.dataset.page === page);
  const values = {};
  inputs.forEach(el => {
    const key = el.id.replace('clientkyc_', '');
    values[key] = el.value.trim();
  });
  if (Object.values(values).some(v => !v)) {
    showToast('warning', `Please fill in every highlighted field in this section before resubmitting.`);
    return;
  }
  try {
    await apiFetch('POST', '/corrections/kyc/resubmit-section', { clientId, values });
    showToast('success', 'Section resubmitted.');
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
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:3px;">${s.title}</div>
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
      <p>Upload the scanned, signed version of your contract package for compliance review. Client: <strong>${client.name}</strong></p>
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
                <td style="font-weight:500;">${u.name}</td>
                <td>${u.date}</td>
                <td>${u.size}</td>
                <td><span class="status-badge status-${u.status}">${statusLabel(u.status)}</span></td>
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
                <td><div style="display:flex;align-items:center;gap:8px;"><div class="client-avatar" style="width:28px;height:28px;font-size:11px;background:${clientGradient(c.type)}">${c.name[0]}</div> <span style="font-weight:500;">${c.name}</span></div></td>
                <td>${c.type}</td>
                <td>${c.country}</td>
                <td>${c.industry}</td>
                <td><span style="color:${c.kyc?.pep==='No'?'var(--accent-green)':'var(--accent-red)'};font-weight:600;">${c.kyc?.pep||'—'}</span></td>
                <td><span style="color:${c.kyc?.sanctions==='No'?'var(--accent-green)':'var(--accent-red)'};font-weight:600;">${c.kyc?.sanctions||'—'}</span></td>
                <td><span class="risk-${c.risk.toLowerCase()}" style="font-weight:700;font-size:14px;">${c.risk}</span></td>
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
        ${computed ? `<div class="info-box"><p><strong>Computed Risk:</strong> ${computed.level} (score ${computed.score}) · ${computed.reason}</p></div>` : ''}
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
  toast.innerHTML = `${icons[type]||''}<span class="toast-text">${message}</span>`;
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
    const token = localStorage.getItem('token');
    if (!token) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);

    if (user.role === 'client') {
      const res = await fetch('http://localhost:5000/api/clients/me', {
        headers: { 'Authorization': `Bearer ${token}` },
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
      const res = await fetch('http://localhost:5000/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` },
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
  const token       = localStorage.getItem('token');
  if ((token || sessionOn) && savedRole && ROLES[savedRole]) {
    AuthState.selectedRole = savedRole;
    await enterApp(savedRole);
    return;
  }

  renderAuthPanel();
  await loadStateFromBackend();
});
