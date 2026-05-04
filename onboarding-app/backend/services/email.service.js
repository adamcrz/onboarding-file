const nodemailer = require('nodemailer');

const USE_REAL_SMTP = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

// Real SMTP transporter (Gmail, Outlook, SendGrid, etc.)
let _smtpTransporter = null;
function getSmtpTransporter() {
  if (_smtpTransporter) return _smtpTransporter;
  _smtpTransporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return _smtpTransporter;
}

// Ethereal test transporter — created once, reused for all dev emails.
// Ethereal is a fake SMTP that captures emails and shows them at a preview URL.
let _etherealTransporter = null;
let _etherealUser = null;
async function getEtherealTransporter() {
  if (_etherealTransporter) return _etherealTransporter;
  const testAccount = await nodemailer.createTestAccount();
  _etherealUser = testAccount.user;
  _etherealTransporter = nodemailer.createTransport({
    host:   'smtp.ethereal.email',
    port:   587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log('\n📬  Ethereal test account ready — all dev emails are captured here.');
  console.log(`    Account: ${testAccount.user}\n`);
  return _etherealTransporter;
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

// Sends mail via real SMTP or Ethereal and returns the preview URL (Ethereal only).
async function sendMail(mailOptions) {
  if (USE_REAL_SMTP) {
    await getSmtpTransporter().sendMail(mailOptions);
    return null;
  }
  // Dev mode: use Ethereal
  const transporter = await getEtherealTransporter();
  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`\n📧  Email to ${mailOptions.to} — preview: ${previewUrl}\n`);
  return previewUrl;
}

async function sendVerificationEmail(to, name, token) {
  const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';
  const link = `${base}/frontend/index.html?verify=${token}`;

  const previewUrl = await sendMail({
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

  return { previewUrl, verifyLink: link };
}

async function sendPasswordResetEmail(to, name, token) {
  const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';
  const link = `${base}/frontend/index.html?reset=${token}`;

  const previewUrl = await sendMail({
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

  return { previewUrl, resetLink: link };
}

async function sendClientInviteEmail(to, name, otp, contractName) {
  const base       = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';
  const portalLink = `${base}/frontend/index.html`;

  const previewUrl = await sendMail({
    from:    process.env.EMAIL_FROM || '"Tramondo Investment Partners" <noreply@tramondo.ch>',
    to,
    subject: 'Your Tramondo Client Portal Access',
    html: brand(`
      <h2 style="color:#111827;margin:0 0 8px;">Welcome, ${name}!</h2>
      <p style="color:#4b5563;line-height:1.6;">
        Your contract package has been prepared and your client portal account is ready.
        Please use the credentials below to sign in and review your documents.
      </p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:12px;color:#0c4a6e;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Your Login Credentials</p>
        <p style="margin:0 0 6px;color:#374151;font-size:14px;"><strong>Email:</strong> ${to}</p>
        <p style="margin:0;color:#374151;font-size:14px;"><strong>One-Time Password:</strong>
          <span style="font-family:monospace;font-size:20px;font-weight:700;color:#005073;letter-spacing:3px;margin-left:8px;">${otp}</span>
        </p>
      </div>
      <a href="${portalLink}" style="display:inline-block;margin:20px 0 8px;padding:13px 30px;background:#005073;color:#fff;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;">
        Open Client Portal →
      </a>
      <p style="color:#6b7280;font-size:13px;">Contract: <strong>${contractName}</strong></p>
      <p style="color:#9ca3af;font-size:12px;margin-top:20px;">Please change your password after your first login. If you did not expect this email, contact your relationship manager.</p>
    `),
  });

  return { previewUrl };
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendClientInviteEmail };
