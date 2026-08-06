const Mandate = require('../models/Mandate');
const Client  = require('../models/Client');
const { notify } = require('../services/notify.service');

function mandateToClientStatus(status) {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'info-requested') return 'info-requested';
  return 'under-review';
}

exports.listMandates = async (_req, res) => {
  try {
    const mandates = await Mandate.find().sort({ createdAt: 1 });
    res.json(mandates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function setMandateStatus(req, res, status) {
  try {
    const mandate = await Mandate.findOne({ mandateId: req.params.id });
    if (!mandate) return res.status(404).json({ error: 'Mandate not found' });

    mandate.status = status;
    await mandate.save();

    if (mandate.clientId) {
      const client = await Client.findOne({ clientId: mandate.clientId });
      if (client) {
        client.status = mandateToClientStatus(status);
        if (status === 'approved') client.progress = 100;
        if (status === 'rejected') client.progress = Math.min(client.progress, 80);
        client.auditTrail.push({
          action: `Mandate ${mandate.mandateName} ${status.replace('-', ' ')} by compliance`,
          user: 'Compliance',
          time: new Date().toLocaleString(),
          type: status === 'rejected' ? 'rejected' : status === 'approved' ? 'approved' : 'requested',
        });
        await client.save();
      }
    }

    const verb = status === 'rejected' ? 'rejected' : status === 'approved' ? 'approved' : 'flagged for more info';
    await notify(`Mandate "${mandate.mandateName}" ${verb} by compliance`, status === 'rejected' ? 'warning' : status === 'approved' ? 'success' : 'info');

    res.json(mandate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

exports.approveMandate     = (req, res) => setMandateStatus(req, res, 'approved');
exports.rejectMandate      = (req, res) => setMandateStatus(req, res, 'rejected');
exports.requestMandateInfo = (req, res) => setMandateStatus(req, res, 'info-requested');
