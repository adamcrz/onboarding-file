const express = require('express');
const router  = express.Router();
const ContractDraft = require('../models/ContractDraft');
const { protect, staffOnly } = require('../middleware/auth.middleware');

// An RM sees their own drafts and nobody else's — the same rule the client
// list applies, and for the same reason: a half-written contract names a
// prospective client. Compliance sees all of them, as they do everywhere else.
// Fails closed: an RM account with no rmCode sees nothing rather than everything.
const scopeFor = (user) => (user.role === 'rm' ? { rmCode: user.rmCode || '__none__' } : {});

const canTouch = (draft, user) => {
  if (!draft) return false;
  if (user.role !== 'rm') return true;
  return Boolean(user.rmCode) && draft.rmCode === user.rmCode;
};

// The list, newest first. Deliberately without `state` — a listing of twenty
// drafts should not carry twenty complete contract forms.
router.get('/', protect, staffOnly, async (req, res) => {
  try {
    const drafts = await ContractDraft.find(scopeFor(req.user))
      .select('-state')
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json(drafts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:draftId', protect, staffOnly, async (req, res) => {
  try {
    const draft = await ContractDraft.findOne({ draftId: req.params.draftId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    if (!canTouch(draft, req.user)) return res.status(403).json({ error: 'Not your draft' });
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save, or update in place when the same draftId comes back. Saving repeatedly
// from one sitting should leave one draft, not a trail of them.
router.post('/', protect, staffOnly, async (req, res) => {
  try {
    const { draftId, name, templateId, templateName, state } = req.body || {};

    if (draftId) {
      const existing = await ContractDraft.findOne({ draftId });
      if (existing && !canTouch(existing, req.user)) {
        return res.status(403).json({ error: 'Not your draft' });
      }
    }

    const id = draftId || `CD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const draft = await ContractDraft.findOneAndUpdate(
      { draftId: id },
      {
        $set: {
          name: String(name || '').trim() || 'Untitled draft',
          templateId, templateName,
          state: state || {},
          ownerEmail: req.user.email,
          ownerName: req.user.name,
          // An RM's drafts are stamped with their own code regardless of what
          // the browser sends — the same rule the Contract Builder's RM picker
          // is subject to.
          rmCode: req.user.role === 'rm' ? (req.user.rmCode || '') : (req.body.rmCode || ''),
        },
        $setOnInsert: { draftId: id },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, draftId: draft.draftId, updatedAt: draft.updatedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:draftId', protect, staffOnly, async (req, res) => {
  try {
    const draft = await ContractDraft.findOne({ draftId: req.params.draftId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    if (!canTouch(draft, req.user)) return res.status(403).json({ error: 'Not your draft' });
    await draft.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
