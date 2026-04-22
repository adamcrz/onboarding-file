const nodemailer = require('nodemailer');

const USE_REAL_EMAIL = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER);

let _transporter = null;

function getTransporter() {
  if (!USE_REAL_EMAIL) return null;
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return _transporter;
}

function brand(body) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#005073;padding:24px 32px;">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">ComplianceOS</h1>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">Compliance & Client Onboarding Portal</p>
      </div>
      <div style="padding:32px;">${body}</div>
      <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
        This email was sent by ComplianceOS. If you did not request this, you can safely ignore it.
      </div>
    </div>`;
}

async function sendVerificationEmail(to, name, token) {
  const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';
  const link = `${base}/onboarding-app/frontend/index.html?verify=${token}`;

  if (!USE_REAL_EMAIL) {
    console.log('\n────────────────────────────────────────────────────');
    console.log(`📧  VERIFY EMAIL for ${name} <${to}>`);
    console.log(`    Open this link to verify the account:`);
    console.log(`    ${link}`);
    console.log('────────────────────────────────────────────────────\n');
    return;
  }

  await getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || '"ComplianceOS" <noreply@complianceos.com>',
    to,
    subject: 'Verify your ComplianceOS account',
    html: brand(`
      <h2 style="color:#111827;margin:0 0 8px;">Welcome, ${name}!</h2>
      <p style="color:#4b5563;line-height:1.6;">Please verify your email address to activate your account.</p>
      <a href="${link}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#005073;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
        Verify Email Address
      </a>
      <p style="color:#6b7280;font-size:13px;">Or paste this link into your browser:</p>
      <p style="color:#005073;font-size:12px;word-break:break-all;">${link}</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">⏱ This link expires in <strong>24 hours</strong>.</p>
    `),
  });
}

async function sendPasswordResetEmail(to, name, token) {
  const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';
  const link = `${base}/onboarding-app/frontend/index.html?reset=${token}`;

  if (!USE_REAL_EMAIL) {
    console.log('\n────────────────────────────────────────────────────');
    console.log(`🔑  PASSWORD RESET for ${name} <${to}>`);
    console.log(`    Open this link to reset the password:`);
    console.log(`    ${link}`);
    console.log('────────────────────────────────────────────────────\n');
    return;
  }

  await getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || '"ComplianceOS" <noreply@complianceos.com>',
    to,
    subject: 'Reset your ComplianceOS password',
    html: brand(`
      <h2 style="color:#111827;margin:0 0 8px;">Password Reset Request</h2>
      <p style="color:#4b5563;line-height:1.6;">Hi ${name}, we received a request to reset your password.</p>
      <a href="${link}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#005073;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
        Reset Password
      </a>
      <p style="color:#6b7280;font-size:13px;">Or paste this link into your browser:</p>
      <p style="color:#005073;font-size:12px;word-break:break-all;">${link}</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">⏱ This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
    `),
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
