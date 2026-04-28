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

  notifications: [
    { id: 1, text: 'New KYC submission from Acme Corp requires review', time: '5 min ago', read: false, type: 'info' },
    { id: 2, text: 'Document expiry alert: Chen Wei passport expires in 14 days', time: '2 hrs ago', read: false, type: 'warning' },
    { id: 3, text: 'Client "Thornton Family Trust" approved by compliance', time: '1 day ago', read: true, type: 'success' },
  ],

  clients: [
    {
      id: 'C001', name: 'Acme Corporation', type: 'Corporate', risk: 'Medium',
      status: 'under-review', rm: 'Sarah Mitchell', created: '2026-03-12',
      progress: 65, country: 'United Kingdom', industry: 'Manufacturing',
      documents: [
        { id: 'D001', name: 'Power of Attorney (Vollmacht)', type: 'Bank Document', status: 'approved', uploadedBy: 'Compliance', templateAvailable: true, signedVersion: true, date: '2026-03-12', size: '2.1 MB', required: true },
        { id: 'D002', name: 'Client Categorisation (FIDLEG)', type: 'Template', status: 'approved', uploadedBy: 'Client', templateAvailable: true, signedVersion: true, date: '2026-03-13', size: '1.8 MB', required: true },
        { id: 'D003', name: 'KYC Form', type: 'Template', status: 'pending', uploadedBy: 'Client', templateAvailable: true, signedVersion: false, date: '2026-03-15', size: '0.9 MB', required: true },
        { id: 'D004', name: 'Form A/T/K/S — Ownership Structure', type: 'Template', status: 'pending', uploadedBy: '-', templateAvailable: true, signedVersion: false, date: '-', size: '-', required: true },
        { id: 'DAML', name: 'Investment Profile', type: 'Template', status: 'approved', uploadedBy: 'Client', templateAvailable: true, signedVersion: true, date: '2026-03-14', size: '1.2 MB', required: true },
        { id: 'D005', name: 'Advisory / Asset Management Agreement', type: 'Template', status: 'info-requested', uploadedBy: 'Client', templateAvailable: true, signedVersion: false, date: '2026-03-16', size: '0.4 MB', required: true, missingNote: 'Signature missing on page 3 — see Appendix B' },
        { id: 'D006', name: 'Mandate Risk Profile', type: 'Template', status: 'draft', uploadedBy: '-', templateAvailable: true, signedVersion: false, date: '-', size: '-', required: true },
        { id: 'D007i', name: 'Director Passport — John Smith', type: 'ID Document', status: 'approved', uploadedBy: 'Client', templateAvailable: false, signedVersion: false, date: '2026-03-14', size: '1.2 MB', required: true },
      ],
      auditTrail: [
        { action: 'Case created', user: 'Sarah Mitchell (RM)', time: '2026-03-12 09:14', type: 'created' },
        { action: 'KYC form submitted by client', user: 'John Smith (Client)', time: '2026-03-13 14:32', type: 'submitted' },
        { action: 'Documents uploaded (3 files)', user: 'Sarah Mitchell (RM)', time: '2026-03-14 11:05', type: 'uploaded' },
        { action: 'Additional information requested: UBO Declaration needs revision', user: 'Compliance Team', time: '2026-03-16 10:20', type: 'requested' },
        { action: 'Director passport approved', user: 'Compliance Officer', time: '2026-03-17 09:45', type: 'approved' },
      ],
      kyc: {
        legalName: 'Acme Corporation Ltd', tradingName: 'Acme Corp',
        registrationNumber: 'UK12345678', registrationDate: '2015-06-01',
        registrationCountry: 'United Kingdom', jurisdiction: 'England & Wales',
        businessType: 'Private Limited Company', industry: 'Manufacturing',
        annualTurnover: '£2M - £10M', netAssets: '£1M - £5M',
        employees: '50-200', website: 'www.acmecorp.co.uk',
        purpose: 'Trade finance and working capital management',
        address: '123 Business Park, London, EC1A 1BB, United Kingdom',
        directors: [{ name: 'John Smith', nationality: 'British', dob: '1975-04-12', passport: 'GB123456' }],
        ubos: [{ name: 'John Smith', ownership: '55%', nationality: 'British' }],
        pep: 'No', sanctions: 'No', adverse: 'No'
      }
    },
    {
      id: 'C002', name: 'Chen Wei', type: 'Individual', risk: 'Low',
      status: 'pending', rm: 'Michael Torres', created: '2026-03-28',
      progress: 30, country: 'Singapore', industry: 'Technology',
      documents: [
        { id: 'D007', name: 'Passport', type: 'ID Document', status: 'approved', uploadedBy: 'Client', date: '2026-03-28', size: '1.1 MB', required: true },
        { id: 'D008', name: 'Proof of Address', type: 'Address Doc', status: 'pending', uploadedBy: 'Client', date: '2026-03-29', size: '0.8 MB', required: true },
        { id: 'D009', name: 'Source of Wealth Declaration', type: 'AML Doc', status: 'draft', uploadedBy: '-', date: '-', size: '-', required: true },
      ],
      auditTrail: [
        { action: 'Case created', user: 'Michael Torres (RM)', time: '2026-03-28 10:00', type: 'created' },
        { action: 'Passport uploaded and verified', user: 'Chen Wei (Client)', time: '2026-03-28 14:15', type: 'approved' },
        { action: 'Proof of address submitted (under review)', user: 'Chen Wei (Client)', time: '2026-03-29 09:30', type: 'submitted' },
      ],
      kyc: {
        title: 'Mr', firstName: 'Chen', lastName: 'Wei',
        dob: '1985-09-23', nationality: 'Singaporean',
        residency: 'Singapore', taxResidency: 'Singapore',
        taxId: 'SG98765432', passportNumber: 'SG1234567', passportExpiry: '2027-03-15',
        address: '88 Marina Bay Road, Singapore, 018981',
        employmentStatus: 'Self-Employed / Director',
        occupation: 'Technology Entrepreneur',
        annualIncome: 'SGD 500K - 1M',
        sourceOfWealth: 'Business income and investments',
        pep: 'No', sanctions: 'No', adverse: 'No'
      }
    },
    {
      id: 'C003', name: 'Thornton Family Trust', type: 'Trust', risk: 'High',
      status: 'approved', rm: 'Emily Clarke', created: '2026-02-01',
      progress: 100, country: 'Cayman Islands', industry: 'Private Wealth',
      documents: [
        { id: 'D010', name: 'Trust Deed', type: 'Trust Doc', status: 'approved', uploadedBy: 'RM', date: '2026-02-01', size: '3.2 MB', required: true },
        { id: 'D011', name: 'Trustee Passport - Robert Thornton', type: 'ID Document', status: 'approved', uploadedBy: 'Client', date: '2026-02-03', size: '1.1 MB', required: true },
        { id: 'D012', name: 'Beneficiary Details', type: 'Trust Doc', status: 'approved', uploadedBy: 'RM', date: '2026-02-04', size: '0.7 MB', required: true },
        { id: 'D013', name: 'Source of Wealth - Enhanced DD', type: 'AML Doc', status: 'approved', uploadedBy: 'Compliance', date: '2026-02-10', size: '1.9 MB', required: true },
      ],
      auditTrail: [
        { action: 'Case created', user: 'Emily Clarke (RM)', time: '2026-02-01 09:00', type: 'created' },
        { action: 'Trust deed and documents submitted', user: 'Emily Clarke (RM)', time: '2026-02-04 11:20', type: 'submitted' },
        { action: 'Enhanced due diligence initiated (High Risk)', user: 'Compliance Team', time: '2026-02-05 10:00', type: 'requested' },
        { action: 'EDD completed and reviewed', user: 'Senior Compliance', time: '2026-02-10 15:30', type: 'approved' },
        { action: 'Case approved by Compliance Director', user: 'Compliance Director', time: '2026-02-14 09:00', type: 'approved' },
        { action: 'Account opened notification sent', user: 'System', time: '2026-02-14 09:05', type: 'created' },
      ],
      kyc: {}
    },
    {
      id: 'C004', name: 'Global Ventures Foundation', type: 'Foundation', risk: 'High',
      status: 'rejected', rm: 'James Okafor', created: '2026-01-15',
      progress: 80, country: 'Netherlands', industry: 'Charity / NGO',
      documents: [
        { id: 'D014', name: 'Foundation Charter', type: 'Corporate Doc', status: 'rejected', uploadedBy: 'RM', date: '2026-01-15', size: '2.4 MB', required: true },
        { id: 'D015', name: 'Regulatory Registration', type: 'Corporate Doc', status: 'approved', uploadedBy: 'RM', date: '2026-01-15', size: '1.0 MB', required: true },
        { id: 'D016', name: 'Beneficiary Purpose Statement', type: 'Other', status: 'rejected', uploadedBy: 'Client', date: '2026-01-18', size: '0.5 MB', required: true },
      ],
      auditTrail: [
        { action: 'Case created', user: 'James Okafor (RM)', time: '2026-01-15 10:00', type: 'created' },
        { action: 'Documents submitted for review', user: 'James Okafor (RM)', time: '2026-01-18 14:00', type: 'submitted' },
        { action: 'Sanctions screening — adverse media found', user: 'Compliance System', time: '2026-01-20 09:30', type: 'requested' },
        { action: 'Case escalated to Senior Compliance', user: 'Compliance Officer', time: '2026-01-21 11:00', type: 'submitted' },
        { action: 'Case rejected: Adverse media and sanctions concerns', user: 'Compliance Director', time: '2026-01-25 16:00', type: 'rejected' },
      ],
      kyc: {}
    },
    {
      id: 'C005', name: 'Meridian Holdings LLC', type: 'Corporate', risk: 'Low',
      status: 'draft', rm: 'Sarah Mitchell', created: '2026-04-10',
      progress: 10, country: 'United States', industry: 'Real Estate',
      documents: [],
      auditTrail: [
        { action: 'Case created — awaiting client KYC form', user: 'Sarah Mitchell (RM)', time: '2026-04-10 13:45', type: 'created' },
      ],
      kyc: {}
    },
  ],

  mandates: [
    {
      id: 'mandate-found-a', clientId: 'C004', category: 'Foundations', mandateName: 'Mandate A',
      country: 'Netherlands', rm: 'J. Smith', risk: 'High', docsApproved: 3, docsTotal: 7, status: 'pending',
      pendingDocs: [
        { id: 'pd-found-a-1', name: 'Source of Funds Narrative', issue: 'Incomplete - narrative not provided', page: 'p. {FOUND_PAGE_01}', priority: 'High', owner: 'J. Smith', dueDate: '{DUE_DATE}', status: 'pending' },
        { id: 'pd-found-a-2', name: 'Trust Identification Document', issue: 'Missing - no document uploaded', page: 'p. {FOUND_PAGE_02}', priority: 'Medium', owner: 'J. Smith', dueDate: '{DUE_DATE}', status: 'pending' },
      ]
    },
    {
      id: 'mandate-found-b', clientId: 'C004', category: 'Foundations', mandateName: 'Mandate B',
      country: 'Switzerland', rm: 'M. Keller', risk: 'Medium', docsApproved: 5, docsTotal: 7, status: 'pending',
      pendingDocs: [
        { id: 'pd-found-b-1', name: 'Beneficiary Control Chart', issue: 'Missing - chart not attached', page: 'p. {FOUND_PAGE_03}', priority: 'Medium', owner: 'M. Keller', dueDate: '{DUE_DATE}', status: 'pending' },
      ]
    },
    {
      id: 'mandate-trust-a', clientId: 'C003', category: 'Trusts', mandateName: 'Mandate A',
      country: 'Cayman Islands', rm: 'A. Green', risk: 'High', docsApproved: 2, docsTotal: 8, status: 'pending',
      pendingDocs: [
        { id: 'pd-trust-a-1', name: 'Settlor Wealth Origin', issue: 'Not documented - needs full narrative', page: 'p. {TRUST_PAGE_01}', priority: 'High', owner: 'A. Green', dueDate: '{DUE_DATE}', status: 'pending' },
        { id: 'pd-trust-a-2', name: 'Protector KYC Passport', issue: 'Copy missing - upload required', page: 'p. {TRUST_PAGE_02}', priority: 'High', owner: 'A. Green', dueDate: '{DUE_DATE}', status: 'pending' },
      ]
    },
    {
      id: 'mandate-trust-b', clientId: 'C003', category: 'Trusts', mandateName: 'Mandate B',
      country: 'Jersey', rm: 'L. Brown', risk: 'Medium', docsApproved: 4, docsTotal: 7, status: 'pending',
      pendingDocs: [
        { id: 'pd-trust-b-1', name: 'Trust Deed Annex', issue: 'Not uploaded - annex page missing', page: 'p. {TRUST_PAGE_03}', priority: 'Medium', owner: 'L. Brown', dueDate: '{DUE_DATE}', status: 'pending' },
      ]
    },
    {
      id: 'mandate-pc-a', clientId: 'C002', category: 'Private Clients', mandateName: 'Personal Mandate',
      country: 'Singapore', rm: 'Michael Torres', risk: 'Low', docsApproved: 6, docsTotal: 8, status: 'pending',
      pendingDocs: [
        { id: 'pd-pc-a-1', name: 'Tax Domicile Evidence', issue: 'Not attached - supporting proof required', page: 'p. {PC_PAGE_01}', priority: 'Medium', owner: 'Michael Torres', dueDate: '{DUE_DATE}', status: 'pending' },
      ]
    },
    {
      id: 'mandate-pc-b', clientId: 'C002', category: 'Private Clients', mandateName: 'Family Mandate',
      country: 'Spain', rm: 'Sarah Mitchell', risk: 'Medium', docsApproved: 3, docsTotal: 8, status: 'pending',
      pendingDocs: [
        { id: 'pd-pc-b-1', name: 'Wealth Origin Detail', issue: 'Requires clarification - explanation insufficient', page: 'p. {PC_PAGE_02}', priority: 'High', owner: 'Sarah Mitchell', dueDate: '{DUE_DATE}', status: 'pending' },
      ]
    },
    {
      id: 'mandate-co-a', clientId: 'C001', category: 'Companies', mandateName: 'Treasury Mandate',
      country: 'United Kingdom', rm: 'Sarah Mitchell', risk: 'Medium', docsApproved: 4, docsTotal: 9, status: 'pending',
      pendingDocs: [
        { id: 'pd-co-a-1', name: 'Certificate of Incorporation', issue: 'Latest version missing - outdated copy on file', page: 'p. {CO_PAGE_01}', priority: 'Medium', owner: 'Sarah Mitchell', dueDate: '{DUE_DATE}', status: 'pending' },
        { id: 'pd-co-a-2', name: 'UBO Declaration', issue: 'Incomplete - section 3 not filled', page: 'p. {CO_PAGE_02}', priority: 'High', owner: 'Sarah Mitchell', dueDate: '{DUE_DATE}', status: 'pending' },
        { id: 'pd-co-a-3', name: 'Sanctions Screening Attachment', issue: 'Missing - attachment not uploaded', page: 'p. {CO_PAGE_03}', priority: 'Medium', owner: 'Sarah Mitchell', dueDate: '{DUE_DATE}', status: 'pending' },
      ]
    },
    {
      id: 'mandate-co-b', clientId: 'C005', category: 'Companies', mandateName: 'Mandate',
      country: 'United States', rm: 'Daniel Roth', risk: 'Low', docsApproved: 6, docsTotal: 8, status: 'pending',
      pendingDocs: [
        { id: 'pd-co-b-1', name: 'Commercial Register Extract', issue: 'Outdated - please upload current version', page: 'p. {CO_PAGE_04}', priority: 'Low', owner: 'Daniel Roth', dueDate: '{DUE_DATE}', status: 'pending' },
      ]
    },
  ],

  kycCorrections: [
    { id: 'kyc-c-1', mandateId: 'mandate-co-a', clientId: 'C001', issue: 'Passport copy unclear - re-submit high resolution scan', page: 'p. {KYC_PAGE_01}', status: 'pending' },
    { id: 'kyc-c-2', mandateId: 'mandate-co-a', clientId: 'C001', issue: 'Tax domicile evidence missing - attach certificate of residence', page: 'p. {KYC_PAGE_02}', status: 'pending' },
    { id: 'kyc-c-3', mandateId: 'mandate-co-a', clientId: 'C001', issue: 'Source of wealth explanation incomplete - provide full narrative', page: 'p. {KYC_PAGE_03}', status: 'pending' },
    { id: 'kyc-c-4', mandateId: 'mandate-pc-a', clientId: 'C002', issue: 'Second nationality field left blank - confirm or mark N/A', page: 'p. {KYC_PAGE_04}', status: 'resubmitted' },
    { id: 'kyc-c-5', mandateId: 'mandate-pc-b', clientId: 'C002', issue: 'Spouse details missing - required for joint mandate', page: 'p. {KYC_PAGE_05}', status: 'corrected' },
  ],

  clientSubmissions: {
    C001: [{ id: 'sub-1', name: 'Signed Contract Package', date: '2026-04-12', status: 'pending', size: '3.4 MB' }],
  },

  riskAnswers: {},
  riskScores: {}
};

/* ============================================================
   ROLE DEFINITIONS
   ============================================================ */
const ROLES = {
  compliance: {
    label: 'Compliance Officer',
    description: 'Compliance Dept.',
    initial: 'C',
    badge: 'Compliance',
    nav: [
      { section: 'Review Queue' },
      { id: 'dashboard', label: 'Dashboard', icon: homeIcon() },
      { id: 'review-queue', label: 'Review Queue', icon: checklistIcon(), badge: '8' },
      { id: 'clients', label: 'All Cases', icon: usersIcon() },
      { section: 'Tools' },
      { id: 'contract-building', label: 'Contract Building', icon: fileIcon() },
      { id: 'documents', label: 'Document Templates', icon: fileIcon() },
      { id: 'audit', label: 'Audit Trail', icon: auditIcon() },
      { id: 'risk', label: 'Risk Ratings', icon: shieldIcon() },
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
      { id: 'kyc-corrections', label: 'KYC Corrections', icon: checklistIcon(), badge: '3' },
      { id: 'clients', label: 'My Clients', icon: usersIcon(), badge: '2' },
    ]
  },
  client: {
    label: 'John Smith',
    description: 'Client',
    initial: 'J',
    badge: 'Client',
    nav: [
      { section: 'My Application' },
      { id: 'dashboard', label: 'Application Status', icon: homeIcon() },
      { id: 'client-contract', label: 'Contract Package', icon: fileIcon() },
      { id: 'client-upload', label: 'Upload Signed Docs', icon: uploadIcon() },
      { section: 'Support' },
      { id: 'audit', label: 'Activity', icon: auditIcon() },
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

/* ============================================================
   AUTH PANEL — state machine for the login card
   ============================================================ */
const AuthState = { panel: 'login', pendingEmail: '', resetToken: '' };

function setAuthPanel(panel) {
  AuthState.panel = panel;
  renderAuthPanel();
}

function renderAuthPanel() {
  const el = document.getElementById('auth-panel');
  if (!el) return;
  const map = {
    'login':           loginFormHTML,
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
    <div class="auth-tabs">
      <button class="auth-tab active"  onclick="setAuthPanel('login')">Sign In</button>
      <button class="auth-tab"         onclick="setAuthPanel('register')">Create Account</button>
    </div>

    <h1 class="login-title">Welcome back</h1>
    <p class="login-subtitle">Sign in to your compliance portal</p>

    <div class="form-group">
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

    <div class="auth-divider"><span>or quick demo access</span></div>

    <div class="role-selector">
      <p class="role-label">Select a role then click Sign In above</p>
      <div class="role-grid" style="grid-template-columns:1fr 1fr 1fr;">
        <button class="role-btn active" data-role="compliance" onclick="selectRole(this,'compliance')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          Compliance
        </button>
        <button class="role-btn" data-role="rm" onclick="selectRole(this,'rm')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          Rel. Manager
        </button>
        <button class="role-btn" data-role="client" onclick="selectRole(this,'client')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
          Client
        </button>
      </div>
    </div>

    <p class="login-footer">SHA cryptography &nbsp;·&nbsp; Protected by 256-bit TLS encryption</p>
  `;
}

function registerFormHTML() {
  return `
    <div class="auth-tabs">
      <button class="auth-tab"         onclick="setAuthPanel('login')">Sign In</button>
      <button class="auth-tab active"  onclick="setAuthPanel('register')">Create Account</button>
    </div>

    <h1 class="login-title">Create account</h1>
    <p class="login-subtitle">Join your compliance portal</p>

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
    <div class="form-group">
      <label for="reg-role">Role</label>
      <select id="reg-role">
        <option value="client">Client</option>
        <option value="rm">Relationship Manager</option>
        <option value="compliance">Compliance Officer</option>
      </select>
    </div>

    <button class="btn-primary btn-full" id="register-btn" onclick="register()">
      Create Account
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>

    <p class="login-footer">SHA cryptography &nbsp;·&nbsp; Protected by 256-bit TLS encryption</p>
  `;
}

function verifyPendingHTML() {
  return `
    <div style="text-align:center;padding:20px 0 8px;">
      <div style="font-size:52px;margin-bottom:14px;">📧</div>
      <h1 class="login-title" style="font-size:20px;">Check your email</h1>
      <p class="login-subtitle">We sent a verification link to</p>
      <p style="font-weight:700;color:var(--accent-purple);font-size:14px;margin:6px 0 20px;">${AuthState.pendingEmail}</p>
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
            onclick="setAuthPanel('login')">← Back to sign in</button>
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
  return `
    <div style="text-align:center;padding:20px 0 8px;">
      <div style="font-size:52px;margin-bottom:14px;">✉️</div>
      <h1 class="login-title" style="font-size:20px;">Reset link sent</h1>
      <p class="login-subtitle">
        If that email is registered you'll receive a reset link shortly.<br>
        Check your spam folder too.
      </p>
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
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('main-screen').classList.add('active');
  State.currentRole = role;
  setupRoleUI(role);
  await loadStateFromBackend();
  navigateTo('dashboard');
}

async function login() {
  const email    = (document.getElementById('login-email')?.value || '').trim();
  const password = document.getElementById('login-password')?.value || '';
  const demoRole = State.currentRole;
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
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();

    if (res.status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
      AuthState.pendingEmail = data.email || email;
      setAuthPanel('verify-pending');
      return;
    }

    if (!res.ok) {
      showToast('error', data.error || 'Login failed.');
      resetLoginBtn();
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    enterApp(data.user.role);

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
  document.getElementById('main-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');
  setAuthPanel('login');
}

async function register() {
  const name     = (document.getElementById('reg-name')?.value || '').trim();
  const email    = (document.getElementById('reg-email')?.value || '').trim();
  const password = document.getElementById('reg-password')?.value || '';
  const confirm  = document.getElementById('reg-confirm')?.value  || '';
  const role     = document.getElementById('reg-role')?.value     || 'client';
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

    AuthState.pendingEmail = data.email || email;
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
    showToast(res.ok ? 'success' : 'error', data.message || data.error);
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
    await fetch('http://localhost:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
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
  document.getElementById('user-avatar-sidebar').textContent = cfg.initial;
  document.getElementById('user-name-sidebar').textContent = cfg.label;
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
        </button>
      `;
    }
  });

  // Notifications panel
  renderNotificationDropdown();
}

function updateNotifBadge() {
  const unread = State.notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  if (unread > 0) { badge.textContent = unread; badge.style.display = 'flex'; }
  else badge.style.display = 'none';
}

function renderNotificationDropdown() {
  const el = document.getElementById('notif-dropdown');
  el.innerHTML = `
    <div style="padding:16px;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:14px;font-weight:600;">Notifications</span>
      <button onclick="markAllRead()" style="background:none;border:none;font-size:12px;color:var(--accent-purple-light);cursor:pointer;">Mark all read</button>
    </div>
    ${State.notifications.map(n => `
      <div style="padding:14px 16px;border-bottom:1px solid var(--border-subtle);${!n.read ? 'background:rgba(99,102,241,0.04)' : ''};cursor:pointer;" onclick="markRead(${n.id})">
        <div style="font-size:13px;color:var(--text-primary);">${n.text}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${n.time}</div>
      </div>
    `).join('')}
  `;
  updateNotifBadge();
}

function markAllRead() { State.notifications.forEach(n => n.read = true); renderNotificationDropdown(); }
function markRead(id) { const n = State.notifications.find(n => n.id === id); if(n) n.read = true; renderNotificationDropdown(); }

function toggleNotifications() {
  document.getElementById('notif-dropdown').classList.toggle('open');
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

function getMandateById(mandateId) {
  return State.mandates.find(m => m.id === mandateId);
}

function getClientByMandateId(mandateId) {
  const mandate = getMandateById(mandateId);
  if (!mandate) return null;
  return State.clients.find(c => c.id === mandate.clientId) || null;
}

function addClientAudit(clientId, action, type, user) {
  const client = State.clients.find(c => c.id === clientId);
  if (!client) return;
  client.auditTrail.push({
    action,
    user: user || (State.currentRole === 'compliance' ? 'Compliance Officer' : State.currentRole === 'rm' ? 'Relationship Manager' : 'Client'),
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

function mandateToClientStatus(status) {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'info-requested') return 'info-requested';
  return 'under-review';
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
    clients: State.currentRole === 'compliance' ? 'All Cases' : 'My Clients',
    'contract-building': 'Contract Building',
    documents: 'Documents',
    audit: 'Audit Trail',
    analytics: 'Analytics',
    settings: 'Settings',
    'review-queue': 'Review Queue',
    'new-client': 'New Client Onboarding',
    'kyc-form': 'KYC Questionnaire',
    'kyc-corrections': 'KYC Corrections',
    'client-contract': 'Contract Package',
    'client-upload': 'Upload Signed Documents',
    risk: 'Risk Ratings',
    'client-detail': 'Client Details',
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
    case 'review-queue': renderReviewQueue(); break;
    case 'new-client': renderNewClient(); break;
    case 'kyc-form': renderKycForm(); break;
    case 'kyc-corrections': renderKycCorrections(); break;
    case 'client-contract': renderClientContract(); break;
    case 'client-upload': renderClientUpload(); break;
    case 'risk': renderRiskRatings(); break;
    case 'client-detail': renderClientDetail(); break;
  }
}

/* ============================================================
   PAGE: DASHBOARD
   ============================================================ */
function renderDashboard() {
  const role = State.currentRole;
  const content = document.getElementById('page-content');

  if (role === 'client') { renderClientDashboard(); return; }
  if (role === 'compliance') { renderComplianceDashboard(); return; }
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
      <p>Review queue, document templates, and Assetmax data export</p>
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
          <div class="card-title">Review Queue (${pending.length} cases)</div>
          <button class="btn-primary btn-sm" onclick="navigateTo('review-queue')">Open Queue</button>
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
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Assetmax Export</div>
            <div class="card-subtitle">Export validated KYC data to Excel for Assetmax upload</div>
          </div>
        </div>
        <div class="card-body">
          <div class="info-box success">
            <p>Only completed and approved KYC datasets can be exported. All exports are logged in the audit trail.</p>
          </div>
          ${readyForExport.map(c => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-subtle);">
              <div>
                <div style="font-size:13px;font-weight:500;">${c.name}</div>
                <div style="font-size:11.5px;color:var(--text-secondary);">Approved ${c.created} · ${c.type}</div>
              </div>
              <button class="btn-secondary btn-sm" onclick="exportToAssetmax('${c.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export .xlsx
              </button>
            </div>
          `).join('')}
          ${readyForExport.length === 0 ? `<p style="font-size:13px;color:var(--text-muted);">No approved cases ready for export yet.</p>` : ''}
        </div>
      </div>
    </div>
  `;
}

function exportToAssetmax(clientId) {
  const c = State.clients.find(c => c.id === clientId);
  if (!c) return;
  c.auditTrail.push({ action: 'KYC data exported to Assetmax (.xlsx)', user: 'Compliance Officer', time: new Date().toLocaleString(), type: 'submitted' });
  showToast('success', `${c.name} — KYC data exported to Excel for Assetmax upload.`);
}

/* --- RM Dashboard --- */
function renderRMDashboard() {
  const content = document.getElementById('page-content');
  const myClients = State.clients.filter(c => c.rm === 'Sarah Mitchell');

  content.innerHTML = `
    <div class="page-header">
      <h1>Hello, Sarah</h1>
      <p>Relationship Manager Dashboard</p>
    </div>
    <div class="stats-grid">
      ${statCard('#6366f1', myClients.length, 'My Clients', '', false, usersIcon())}
      ${statCard('#f59e0b', myClients.filter(c=>c.status==='under-review'||c.status==='pending').length, 'In Progress', '', false, checklistIcon())}
      ${statCard('#10b981', myClients.filter(c=>c.status==='approved').length, 'Approved', '', true, checkIcon())}
      ${statCard('#8b5cf6', myClients.reduce((s,c)=>s+c.documents.length,0), 'Documents Managed', '', false, fileIcon())}
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">My Clients</div>
        <button class="btn-primary btn-sm" onclick="navigateTo('new-client')">+ New Client</button>
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

/* --- Client Dashboard --- */
function renderClientDashboard() {
  const content = document.getElementById('page-content');
  const client = State.myClientProfile || State.clients[0];

  const ref      = client.clientId || client.id || '—';
  const status   = client.status   || 'pending';
  const progress = client.progress || 0;
  const docs     = client.documents    || [];
  const audit    = client.auditTrail   || [];

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
function renderClients() {
  const content = document.getElementById('page-content');
  const showAll = State.currentRole !== 'rm';
  let clients = showAll ? State.clients : State.clients.filter(c => c.rm === 'Sarah Mitchell');

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
        </div>
        ${State.currentRole === 'rm' ? '<button class="btn-primary btn-sm" onclick="navigateTo(\'new-client\')">+ New Client</button>' : ''}
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
          ${State.currentRole === 'compliance' && (c.status === 'under-review' || c.status === 'pending') ? `
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
  const showAll = State.currentRole !== 'rm';
  let clients = showAll ? State.clients : State.clients.filter(c => c.rm === 'Sarah Mitchell');
  if (search) clients = clients.filter(c => c.name.toLowerCase().includes(search) || c.country.toLowerCase().includes(search));
  if (status) clients = clients.filter(c => c.status === status);
  if (type) clients = clients.filter(c => c.type === type);
  if (risk) clients = clients.filter(c => c.risk === risk);
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
        ${State.currentRole === 'compliance' && (client.status === 'under-review' || client.status === 'pending') ? `
          <button class="btn-success btn-sm" onclick="approveClientFromDetail('${client.id}')">✓ Approve</button>
          <button class="btn-danger btn-sm" onclick="rejectClientFromDetail('${client.id}')">✗ Reject</button>
          <button class="btn-warning btn-sm" onclick="requestInfo('${client.id}')">Request Info</button>
        ` : ''}
        ${State.currentRole === 'rm' ? `<button class="btn-secondary btn-sm" onclick="navigateTo('new-client')">Edit Case</button>` : ''}
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
  const canReview = State.currentRole === 'compliance';
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
              ${d.date !== '-' ? `<button class="btn-icon" title="View" onclick="viewDoc('${d.id}')">${eyeIcon()}</button>` : ''}
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
        ${canUpload ? `<button class="btn-primary btn-sm" onclick="triggerFileInput()">+ Upload Signed Doc</button>` : ''}
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

function approveDoc(clientId, docId) {
  const c = State.clients.find(c => c.id === clientId);
  const d = c && c.documents.find(d => d.id === docId);
  if (!d) return;
  d.status = 'approved';
  c.auditTrail.push({ action: `Document approved: ${d.name}`, user: 'Compliance Officer', time: new Date().toLocaleString(), type: 'approved' });
  showToast('success', `${d.name} approved.`);
  renderClientDetail();
  switchTab('docs');
}

function requestDocInfo(clientId, docId) {
  const c = State.clients.find(c => c.id === clientId);
  const d = c && c.documents.find(d => d.id === docId);
  if (!d) return;
  d.status = 'info-requested';
  showToast('info', `Information requested for ${d.name}.`);
  renderClientDetail();
  switchTab('docs');
}

function viewDoc(docId) {
  openDocModal(docId);
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

function simulateUpload(file) {
  const client = getActiveClientForUpload();
  if (!client) {
    showToast('warning', 'No active client selected for upload.');
    return;
  }
  State.selectedClientId = client.id;
  const newDoc = {
    id: 'D' + Date.now(), name: file.name, type: 'Uploaded Document',
    status: 'pending', uploadedBy: State.currentRole === 'client' ? 'Client' : 'RM',
    date: new Date().toISOString().slice(0,10), size: (file.size/1024/1024).toFixed(1)+' MB', required: false,
    signedVersion: true, templateAvailable: false
  };
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
  showToast('success', `${file.name} uploaded successfully.`);
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
          ${d.date !== '-' ? `<button class="btn-icon" title="View" onclick="viewDoc('${d.id}')">${eyeIcon()}</button>` : ''}
          ${d.date !== '-' ? `<button class="btn-icon" title="Download">${downloadIcon()}</button>` : ''}
          ${role === 'compliance' && d.status === 'pending' ? `<button class="btn-success btn-xs" onclick="approveDoc('${d.clientId}','${d.id}')">Approve</button>` : ''}
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
  const allEvents = State.clients.flatMap(c =>
    c.auditTrail.map(a => ({ ...a, clientName: c.name, clientId: c.id }))
  ).sort((a, b) => new Date(b.time) - new Date(a.time));

  content.innerHTML = `
    <div class="page-header">
      <h1>Audit Trail</h1>
      <p>Complete activity log across all cases</p>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="filter-bar">
          <div class="search-input-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="search-input" placeholder="Search events..." />
          </div>
        </div>
      </div>
      <div class="card-body">
        ${allEvents.map(a => `
          <div class="audit-item">
            <div class="audit-dot" style="background:${auditColor(a.type)}22;color:${auditColor(a.type)};">
              ${auditEmoji(a.type)}
            </div>
            <div class="audit-content">
              <div class="audit-description">${a.action}
                <button style="background:none;border:none;color:var(--accent-purple-light);cursor:pointer;font-size:12px;margin-left:8px;" onclick="openClientDetail('${a.clientId}')">→ ${a.clientName}</button>
              </div>
              <div class="audit-meta">${a.user} · ${a.time}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
/* ============================================================
   PAGE: CONTRACT BUILDING
   ============================================================ */
function renderContractBuilding() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <h1>Contract Building</h1>
      <p>Configure and generate client contracts (Backend integration pending)</p>
    </div>
    <div class="card">
      <div class="card-body" style="text-align: center; padding: 80px 20px; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">🏗️</div>
        <h3 style="color: var(--text-primary); margin-bottom: 8px;">Coming Soon</h3>
        <p>This module will connect to the backend to dynamically build and manage contracts.</p>
      </div>
    </div>
  `;
}
/* ============================================================
   PAGE: REVIEW QUEUE (Compliance only)
   ============================================================ */
function renderReviewQueue() {
  const content = document.getElementById('page-content');
  const categoryOrder = ['Foundations', 'Trusts', 'Private Clients', 'Companies'];
  const iconMap = { Foundations: '🏛️', Trusts: '⚖️', 'Private Clients': '👤', Companies: '🏢' };
  const categories = categoryOrder.map(name => ({
    name,
    icon: iconMap[name],
    mandates: State.mandates.filter(m => m.category === name),
  }));

  const totalPending = categories.reduce((s,c) => s + c.mandates.reduce((ms,m) => ms + m.pendingDocs.length, 0), 0);

  content.innerHTML = `
    <div class="page-header">
      <h1>Review Queue</h1>
      <p>${totalPending} pending document item(s) across all categories</p>
    </div>

    ${categories.map(cat => `
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid var(--border-default);">
          <span style="font-size:20px;">${cat.icon}</span>
          <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);">${cat.name}</h2>
          <span style="margin-left:auto;font-size:12px;color:var(--text-muted);">${cat.mandates.length} mandate(s)</span>
        </div>

        ${cat.mandates.map(m => {
          const progress = Math.round((m.docsApproved / m.docsTotal) * 100);
          return `
          <div class="card" style="margin-bottom:14px;">
            <div class="card-header">
              <div style="display:flex;align-items:center;gap:12px;">
                <div class="client-avatar" style="background:var(--gradient-brand);">${(getClientByMandateId(m.id)?.name || '?')[0]}</div>
                <div>
                  <div class="card-title">${getClientByMandateId(m.id)?.name || m.id} <span style="font-weight:400;color:var(--text-secondary);">· ${m.mandateName}</span></div>
                  <div class="card-subtitle">${m.country} &nbsp;·&nbsp; RM: ${m.rm} &nbsp;·&nbsp; Risk: <span class="risk-${m.risk.toLowerCase()}">${m.risk}</span></div>
                </div>
              </div>
              <div class="actions-row">
                <button class="btn-secondary btn-sm" onclick="openMandateClientDetail('${m.id}')">Full Review</button>
                <button class="btn-success btn-sm" onclick="approveMandate('${m.id}')">✓ Approve</button>
                <button class="btn-danger btn-sm" onclick="rejectMandate('${m.id}')">✗ Reject</button>
                <button class="btn-warning btn-sm" onclick="requestMandateInfo('${m.id}')">Request Info</button>
              </div>
            </div>
            <div class="card-body" style="padding-top:14px;">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
                <div class="progress-bar-wrap" style="flex:1;height:8px;"><div class="progress-bar" style="width:${progress}%;background:${progressColor(progress)};"></div></div>
                <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;">${m.docsApproved}/${m.docsTotal} docs approved</span>
              </div>
              ${m.pendingDocs.length > 0 ? `
                <div style="font-size:12px;font-weight:700;color:var(--accent-orange);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">⚠ Pending Items (${m.pendingDocs.length})</div>
                ${m.pendingDocs.map(pd => `
                  <div style="padding:12px 14px;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-md);margin-bottom:8px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;">
                    
                    <div>
                      <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">${pd.name}</div>
                      <div style="display:flex;gap:12px;flex-wrap:wrap;">
                        <span style="font-size:11.5px;color:var(--text-muted);">Owner: ${pd.owner}</span>
                        <span style="font-size:11.5px;color:var(--text-muted);">Due: ${pd.dueDate || '{DUE_DATE}'}</span>
                      </div>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:8px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.25);padding:12px 16px;border-radius:var(--radius-sm);min-width: 320px;">
                      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
                        <span style="font-size:13px;font-weight:700;color:var(--accent-red);line-height:1.3;">⚠ ${pd.issue}</span>
                        <div style="display:flex;gap:6px;flex-shrink:0;">
                          <span class="status-badge" style="background:rgba(249,115,22,0.12);color:var(--accent-orange);">● Pending</span>
                          <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${pd.priority==='High'?'rgba(239,68,68,0.1)':pd.priority==='Medium'?'rgba(245,158,11,0.1)':'rgba(107,114,128,0.1)'};color:${pd.priority==='High'?'var(--accent-red)':pd.priority==='Medium'?'var(--status-pending)':'var(--text-muted)'};">${pd.priority}</span>
                        </div>
                      </div>
                      <span style="font-size:12px;font-weight:600;color:var(--accent-red);">📄 Location: ${pd.page}</span>
                    </div>

                  </div>
                `).join('')}
              ` : `<div style="font-size:13px;color:var(--accent-green);">✓ No pending items</div>`}
            </div>
          </div>
        `}).join('')}
      </div>
    `).join('')}
  `;
}

function openMandateClientDetail(mandateId) {
  const client = getClientByMandateId(mandateId);
  if (!client) {
    showToast('error', 'No client linked to this mandate.');
    return;
  }
  openClientDetail(client.id);
}

function setMandateReviewStatus(mandateId, status, toastMessage) {
  const mandate = getMandateById(mandateId);
  const client = getClientByMandateId(mandateId);
  if (!mandate || !client) return;

  mandate.status = status;
  client.status = mandateToClientStatus(status);
  if (status === 'approved') client.progress = 100;
  if (status === 'rejected') client.progress = Math.min(client.progress, 80);

  addClientAudit(client.id, `Mandate ${mandate.mandateName} ${status.replace('-', ' ')} by compliance`, status === 'rejected' ? 'rejected' : status === 'approved' ? 'approved' : 'requested');
  if (toastMessage) showToast(status === 'rejected' ? 'warning' : status === 'approved' ? 'success' : 'info', toastMessage);
  renderReviewQueue();
}

function approveMandate(mandateId) {
  setMandateReviewStatus(mandateId, 'approved', 'Mandate approved.');
}

function rejectMandate(mandateId) {
  setMandateReviewStatus(mandateId, 'rejected', 'Mandate rejected.');
}

function requestMandateInfo(mandateId) {
  setMandateReviewStatus(mandateId, 'info-requested', 'Additional information requested from Relationship Manager.');
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
   PAGE: KYC FORM (Client View)
   ============================================================ */
function renderKycForm() {
  const content = document.getElementById('page-content');

  content.innerHTML = `
    <div class="page-header">
      <h1>KYC Self-Declaration Form</h1>
      <p>Complete all sections carefully. All fields marked * are mandatory. This form is collected in accordance with AML/KYC regulations.</p>
    </div>

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
          <button class="btn-primary" onclick="submitKyc()">Submit KYC Form →</button>
        </div>
      </div>
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
   PAGE: KYC CORRECTIONS (RM view - simplified)
   ============================================================ */
function renderKycCorrections() {
  const content = document.getElementById('page-content');
  const corrections = State.kycCorrections.map(item => ({
    ...item,
    clientName: State.clients.find(c => c.id === item.clientId)?.name || 'Unknown',
    mandateLabel: item.mandateId.toUpperCase(),
  }));

  content.innerHTML = `
    <div class="page-header">
      <h1>KYC Corrections</h1>
      <p>Items flagged by Compliance that require client follow-up. You are responsible for coordinating corrections.</p>
    </div>

    <div class="info-box" style="margin-bottom:20px;">
      <p>This view shows only the mandate ID and KYC items that must be corrected. Contact the client directly to resolve each issue and update the status once corrected.</p>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">KYC Correction Items</div>
        <div class="card-subtitle">${corrections.filter(c=>c.status==='pending').length} pending · ${corrections.filter(c=>c.status==='corrected').length} corrected</div>
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
            ${corrections.map(c => `
              <tr style="${c.status==='pending'?'background:rgba(249,115,22,0.04);':''}">
                <td style="font-weight:600;color:var(--accent-purple-light);">${c.mandateId}</td>
                <td>${c.clientName}</td>
                <td style="color:${c.status==='pending'?'var(--text-primary)':'var(--text-secondary)'};">${c.issue}</td>
                <td><span style="color:var(--accent-orange);font-size:12px;">${c.page}</span></td>
                <td>
                  <span class="status-badge ${c.status==='pending'?'status-pending':c.status==='corrected'?'status-approved':'status-under-review'}">
                    ${c.status==='pending'?'Pending':c.status==='corrected'?'Corrected':'Resubmitted'}
                  </span>
                </td>
                <td>
                  ${c.status==='pending' ? `<button class="btn-secondary btn-xs" onclick="updateKycCorrectionStatus('${c.id}','resubmitted')">Mark Resubmitted</button>` : ''}
                  ${c.status==='resubmitted' ? `<button class="btn-success btn-xs" onclick="updateKycCorrectionStatus('${c.id}','corrected')">Mark Corrected</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function updateKycCorrectionStatus(correctionId, status) {
  const correction = State.kycCorrections.find(c => c.id === correctionId);
  if (!correction) return;
  correction.status = status;
  addClientAudit(correction.clientId, `KYC correction "${correction.issue}" marked ${status}`, status === 'corrected' ? 'approved' : 'submitted', 'Relationship Manager');
  showToast('success', `KYC correction updated to ${status}.`);
  renderKycCorrections();
}

/* ============================================================
   PAGE: CLIENT CONTRACT PACKAGE
   ============================================================ */
function renderClientContract() {
  const content = document.getElementById('page-content');

  content.innerHTML = `
    <div class="page-header">
      <h1>Contract Package</h1>
      <p>Your onboarding contract package${State.clientType ? ` · <strong>${State.clientType}</strong>` : ''}</p>
    </div>

    <div class="info-box" style="margin-bottom:20px;">
      <p>📋 Your complete contract package is ready to review. Please read the full document carefully before signing.</p>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Received Contract Package</div>
          <div class="card-subtitle">One combined document — all forms and agreements for ${State.clientType} onboarding</div>
        </div>
        <button class="btn-primary btn-sm" onclick="showToast('info','Contract package downloaded.')">⬇ Download Full Package</button>
      </div>
      <div class="card-body">
        <div class="doc-item" style="background:rgba(110,193,228,0.05);border-color:rgba(110,193,228,0.2);">
          <div class="doc-icon" style="background:rgba(110,193,228,0.15);color:var(--accent-cyan);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          </div>
          <div class="doc-info">
            <div class="doc-name">Full Onboarding Contract Package — ${State.clientType}</div>
            <div class="doc-meta">Includes: KYC Form · Power of Attorney (Vollmacht) · FIDLEG Categorisation · Investment Profile · Mandate Risk Profile · Form A/T/K/S</div>
          </div>
          <div class="doc-actions">
            <span class="status-badge status-under-review">Received</span>
            <button class="btn-primary btn-xs" onclick="showToast('info','Package downloaded.')">Download</button>
          </div>
        </div>

        <div class="card" style="margin-top:16px;background:rgba(249,115,22,0.04);border-color:rgba(249,115,22,0.2);">
          <div class="card-body">
            <div style="font-size:13px;font-weight:700;color:var(--accent-orange);margin-bottom:12px;">📌 Signing Instructions</div>
            <ol style="padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;color:var(--text-primary);">
              <li>Review the full contract package carefully — read every page.</li>
              <li>Print all pages that require a signature (marked with ✍).</li>
              <li>Sign where indicated using a pen (wet signature required).</li>
              <li>Scan the signed pages clearly at minimum 300 DPI.</li>
              <li>Save as a single PDF and upload in the next step.</li>
              <li>Ensure all pages are complete and readable before submission.</li>
            </ol>
            <div style="margin-top:16px;">
              <button class="btn-primary" onclick="navigateTo('client-upload')">Proceed to Upload Signed Documents →</button>
            </div>
          </div>
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
function renderRiskRatings() {
  const content = document.getElementById('page-content');
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
                <td><span style="color:${c.kyc.pep==='No'?'var(--accent-green)':'var(--accent-red)'};font-weight:600;">${c.kyc.pep||'—'}</span></td>
                <td><span style="color:${c.kyc.sanctions==='No'?'var(--accent-green)':'var(--accent-red)'};font-weight:600;">${c.kyc.sanctions||'—'}</span></td>
                <td><span class="risk-${c.risk.toLowerCase()}" style="font-weight:700;font-size:14px;">${c.risk}</span></td>
                <td><button class="btn-secondary btn-xs" onclick="event.stopPropagation();openClientDetail('${c.id}')">Review</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

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
   DOCUMENT VIEWER MODAL
   ============================================================ */
function openDocModal(docId) {
  const allDocs = State.clients.flatMap(c => c.documents.map(d => ({ ...d, clientName: c.name })));
  const doc = allDocs.find(d => d.id === docId);
  if (!doc) return;

  document.getElementById('doc-modal-title').textContent = doc.name;
  document.getElementById('doc-modal-body').innerHTML = `
    <div style="text-align:center;padding:40px;">
      <div style="font-size:80px;margin-bottom:20px;">📄</div>
      <div style="font-size:18px;font-weight:600;margin-bottom:8px;">${doc.name}</div>
      <div style="color:var(--text-secondary);font-size:14px;margin-bottom:16px;">${doc.type} · ${doc.size} · Uploaded on ${doc.date}</div>
      <span class="status-badge status-${doc.status}">${statusLabel(doc.status)}</span>
      <div style="margin-top:24px;padding:20px;background:var(--bg-elevated);border-radius:var(--radius-md);color:var(--text-muted);font-size:13px;">
        Document preview would be rendered here in the production version.<br/>Supports PDF, JPEG, PNG, and TIFF formats.
      </div>
    </div>
  `;
  document.getElementById('doc-modal-footer').innerHTML = `
    <button class="btn-secondary" onclick="closeDocModal()">Close</button>
    <button class="btn-primary" onclick="downloadDoc('${docId}')">${downloadIcon()} Download</button>
  `;
  document.getElementById('doc-modal').classList.add('open');
}

function closeDocModal(e) {
  if (!e || e.target === document.getElementById('doc-modal')) {
    document.getElementById('doc-modal').classList.remove('open');
  }
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
    rejected: 'Rejected', draft: 'Not Submitted', 'info-requested': 'Info Requested'
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
        if (Array.isArray(data) && data.length > 0) State.clients = data;
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

  if (verifyTok) {
    renderAuthPanel(); // show login card shell first so toasts have a backdrop
    handleEmailVerification(verifyTok);
  } else if (resetTok) {
    AuthState.resetToken = resetTok;
    AuthState.panel      = 'reset-password';
    renderAuthPanel();
  } else {
    renderAuthPanel();
  }

  await loadStateFromBackend();
});
