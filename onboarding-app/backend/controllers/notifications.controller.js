const Notification = require('../models/Notification');

exports.listNotifications = async (_req, res) => {
  try {
    const items = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const item = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!item) return res.status(404).json({ error: 'Notification not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAllRead = async (_req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
