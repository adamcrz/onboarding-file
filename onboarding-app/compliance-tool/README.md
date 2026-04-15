# ComplianceOS — Compliance & Client Onboarding Portal

A fully interactive front-end prototype for a multi-party KYC/AML compliance and client onboarding management platform.

---

## Quick Start

This is a **pure front-end app** — no dependencies, no build step, no Node.js required.

### Option 1: VS Code Live Server (Recommended)
1. Open VS Code and open the `compliance-tool` folder
2. Install the **Live Server** extension by Ritwick Dey (search `ritwickdey.liveserver` in Extensions)
3. Right-click `index.html` in the Explorer panel → **"Open with Live Server"**
4. Your browser opens at `http://127.0.0.1:5500`

> **Tip:** Any time you save a file, Live Server auto-reloads the browser — great for development.

### Option 2: Python (no install needed on most systems)
```bash
# From the compliance-tool directory:
python -m http.server 8080
# Then open: http://localhost:8080
```

### Option 3: Just open the file
Double-click `index.html` — it will open directly in your browser. Note: drag-and-drop file upload won't work over `file://` in some browsers.

---

## Project Structure

```
compliance-tool/
├── index.html    # App shell — login screen, sidebar, modals, toast container
├── style.css     # Full design system — tokens, layout, components, utilities
├── app.js        # All state, routing, page renderers, and interactivity
└── README.md     # This file
```

No framework, no bundler, no package.json. Everything runs in the browser as-is.

---

## Demo Roles

On the login screen, select a role before clicking **Sign In** to experience each perspective:

| Role | User | What They See |
|------|------|---------------|
| **Bank Admin** | Bank Administrator | Full dashboard, all clients, analytics, settings |
| **Compliance Officer** | Compliance Team | Review queue, approve/reject cases, risk ratings, audit logs |
| **Relationship Manager** | Sarah Mitchell | My clients only, new onboarding wizard, document management |
| **Client** | John Smith (Acme Corp) | Application status, KYC form, document uploads |

---

## Features

### 🔐 Login & Role Switching
- Dark glassmorphism login card with animated background
- One-click role switching for demo purposes
- Persistent role badge in the top bar throughout the session

### 📊 Role-Adaptive Dashboards
- **Bank:** KPI stat cards (total clients, under review, approved, rejected, pending docs, expiring docs), recent activity feed, per-client progress bars, document status summary
- **Compliance:** Action-required alerts, review queue preview, key metrics
- **RM:** My clients progress, quick access to start new onboarding
- **Client:** 5-step application tracker, progress bar, document checklist, recent activity

### 👥 Client / Case Management
- Searchable, filterable table (by status, type, risk level, name/country)
- Click any row to open the full client detail view
- Compliance role gets inline Approve / Reject buttons

### 🗂️ Client Detail — 4 Tabs
| Tab | Contents |
|-----|----------|
| **Overview** | Case info, risk level, RM, completion % with progress ring |
| **KYC Details** | Full structured KYC data — legal name, registration, directors, UBOs, screening results for Corporate; personal info, passport, tax, income for Individual |
| **Documents** | Per-document status, uploader, date, size; approve/request-info for compliance; drag & drop upload for RM/client |
| **Audit Trail** | Full chronological event log with icons, actors, and timestamps |

### 📋 KYC Application Form (Client view)
Seven structured sections:
1. Personal Information
2. Identity Documents
3. Residential Address
4. Tax Information (TIN, FATCA, US Person)
5. Employment & Financial Profile (income bracket, source of wealth)
6. PEP & Sanctions Declarations
7. Declaration & Consent

### 📄 Document Repository
- Global view of all documents across all clients
- Filter by status, search by document or client name
- Compliance can approve or request-info from this view

### 🔍 Review Queue (Compliance only)
- Cards for each pending case with document summary breakdown
- One-click Approve / Reject / Request Info per case

### 📈 Analytics
- Horizontal bar charts: cases by status, by client type, risk distribution, document status breakdown

### ⚖️ Risk Ratings
- Full client risk classification table
- Reference card for Low / Medium / High risk criteria and corresponding DD requirements

### ⚙️ Settings
- User profile editor
- Per-event notification preferences
- Document checklist configuration per client type
- Password change + 2FA toggle

---

## Design System

| Token | Value |
|-------|-------|
| Background | `#0a0b0f` (primary), `#111318` (secondary), `#161a22` (cards) |
| Brand | `#6366f1` → `#7c3aed` gradient |
| Text | `#f0f2f8` primary, `#8892a4` secondary |
| Font | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |

### Status Colours
| Status | Colour |
|--------|--------|
| Pending | Amber `#f59e0b` |
| Under Review | Indigo `#6366f1` |
| Approved | Green `#10b981` |
| Rejected | Red `#ef4444` |
| Info Requested | Orange `#f97316` |
| Draft / Not Submitted | Grey `#6b7280` |

---

## Extending the App

### Adding a new client
Edit the `State.clients` array in `app.js`. Each client object has:
```js
{
  id, name, type, risk, status, rm, created,
  progress, country, industry,
  documents: [...],
  auditTrail: [...],
  kyc: { ... }
}
```

### Adding a new page
1. Add a nav item to the relevant role in the `ROLES` config object
2. Add a `case 'your-page':` in the `navigateTo()` switch
3. Write a `renderYourPage()` function

### Connecting to a backend
All data lives in the `State` object. Replace the array literals with `fetch()` calls to your API endpoints. The render functions are already separated from data access, so the swap is straightforward.

---

## Browser Support

Works in all modern browsers (Chrome, Firefox, Edge, Safari). No polyfills needed.
