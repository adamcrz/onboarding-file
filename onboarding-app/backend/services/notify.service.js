const Notification = require('../models/Notification');

// Fire-and-forget notification creation — used by controllers after a state
// change (approval, rejection, correction, etc.) so the bell/dropdown reflects
// it. Never throws: a notification failing to save must not fail the action
// that triggered it.
//
// `to` says who should see it and what it is about:
//   roles    -> ['compliance', 'admin'] etc.; omit for everyone
//   rmCode   -> the Kundenberater whose mandate this is; only they (plus
//               Compliance/admin) see it, matching how client lists are scoped
//   clientId -> the mandate it concerns
//   page     -> where the bell should send the reader
async function notify(text, type = 'info', to = {}) {
  try {
    await Notification.create({
      text,
      type,
      roles: to.roles || [],
      rmCode: to.rmCode || undefined,
      clientId: to.clientId || undefined,
      page: to.page || undefined,
    });
  } catch (err) {
    console.warn('Failed to create notification:', err.message);
  }
}

// Convenience wrappers for the two audiences almost every event has, so the
// call sites read as who-is-being-told rather than as a role array.
const COMPLIANCE = ['compliance', 'compliance_external', 'admin'];

const notifyCompliance = (text, type, to = {}) =>
  notify(text, type, { ...to, roles: COMPLIANCE });

// Addressed to the RM who owns the mandate. Compliance still sees it — they
// see every mandate — but no other RM does.
const notifyRm = (text, type, to = {}) =>
  notify(text, type, { ...to, roles: ['rm', ...COMPLIANCE] });

module.exports = { notify, notifyCompliance, notifyRm, COMPLIANCE_ROLES: COMPLIANCE };
