const Notification = require('../models/Notification');

// What this user is allowed to see. Two rules, both matching how the rest of
// the app scopes: a notification addressed to particular roles only reaches
// those roles, and one raised against a single RM's mandate only reaches that
// Kundenberater (Compliance/admin keep full visibility, as they do everywhere
// else). Rows written before either field existed carry neither, so they stay
// visible to everyone rather than disappearing.
const visibleTo = (user) => {
  const role = user?.role;
  const audience = { $or: [{ roles: { $size: 0 } }, { roles: role }] };
  // Fails closed the same way the client list does: an RM account with no
  // rmCode sees only the unaddressed notifications, never another RM's.
  if (role !== 'rm') return audience;
  return {
    $and: [
      audience,
      { $or: [{ rmCode: { $exists: false } }, { rmCode: null }, { rmCode: user.rmCode || '__none__' }] },
    ],
  };
};

exports.listNotifications = async (req, res) => {
  try {
    const items = await Notification.find(visibleTo(req.user)).sort({ createdAt: -1 }).limit(50);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    // Scoped, so nobody can mark a notification they were never shown.
    const item = await Notification.findOneAndUpdate(
      { $and: [{ _id: req.params.id }, visibleTo(req.user)] },
      { read: true },
      { returnDocument: 'after' },
    );
    if (!item) return res.status(404).json({ error: 'Notification not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    // Only this user's own bell is cleared — previously this marked every
    // unread notification in the system, including other people's.
    await Notification.updateMany(
      { $and: [{ read: false }, visibleTo(req.user)] },
      { read: true },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
