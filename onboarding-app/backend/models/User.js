const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['compliance', 'compliance_external', 'rm', 'client', 'admin'], default: 'client' },

  // Kundenberater short code (e.g. "ACR") — identifies which RM this account
  // is, used to scope that RM's visibility to only their own assigned
  // clients/tasks/corrections. Only meaningful for role:'rm' accounts.
  rmCode:   { type: String, uppercase: true, trim: true },

  isEmailVerified:          { type: Boolean, default: false },
  emailVerificationToken:   { type: String },
  emailVerificationExpires: { type: Date },

  passwordResetToken:   { type: String },
  passwordResetExpires: { type: Date },

  // When this account last completed a successful login — used to decide
  // whether a fresh sign-in is "after a while" and worth an informational
  // new-sign-in email (clients only; see auth.controller.js login()).
  lastLoginAt: { type: Date },

  // Periodic re-confirmation that the person signing in still controls the
  // mailbox the account belongs to. A password alone proves only that it has
  // not leaked; this re-proves the address every so often, without asking on
  // every sign-in. See LOGIN_REVERIFY_DAYS.
  lastReverifiedAt:     { type: Date },
  loginCodeHash:        { type: String },
  loginCodeExpires:     { type: Date },
  loginCodeAttempts:    { type: Number, default: 0 },
}, { timestamps: true });

// One account per email PER ROLE — the same email may hold, say, both an RM
// account and a Client account, but not two accounts in the same category.
userSchema.index({ email: 1, role: 1 }, { unique: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.createEmailVerificationToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken   = crypto.createHash('sha256').update(raw).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 h
  return raw;
};

userSchema.methods.createPasswordResetToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken   = crypto.createHash('sha256').update(raw).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 h
  return raw;
};

module.exports = mongoose.model('User', userSchema);
