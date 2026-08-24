const Mandate = require('../models/Mandate');
const Client  = require('../models/Client');
const { notifyRm } = require('../services/notify.service');

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
        // Progress is no longer set by hand here: it is derived from the
        // mandate's own documents (n documents, 1/n each) every time a client
        // is read, so a decision on the mandate cannot claim paperwork is
        // complete when it isn't. See services/mandateProgress.service.js.
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
    const owner = mandate.clientId ? await Client.findOne({ clientId: mandate.clientId }).select('rm') : null;
    await notifyRm(`Mandate "${mandate.mandateName}" ${verb} by compliance`,
      status === 'rejected' ? 'warning' : status === 'approved' ? 'success' : 'info',
      { rmCode: owner?.rm, clientId: mandate.clientId, page: 'clients' });

    res.json(mandate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

exports.approveMandate     = (req, res) => setMandateStatus(req, res, 'approved');
exports.rejectMandate      = (req, res) => setMandateStatus(req, res, 'rejected');
exports.requestMandateInfo = (req, res) => setMandateStatus(req, res, 'info-requested');
