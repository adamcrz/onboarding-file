const Notification = require('../models/Notification');

// Fire-and-forget notification creation — used by controllers after a state
// change (approval, rejection, correction, etc.) so the bell/dropdown reflects
// it. Never throws: a notification failing to save must not fail the action
// that triggered it.
async function notify(text, type = 'info') {
  try {
    await Notification.create({ text, type });
  } catch (err) {
    console.warn('Failed to create notification:', err.message);
  }
}

module.exports = { notify };
