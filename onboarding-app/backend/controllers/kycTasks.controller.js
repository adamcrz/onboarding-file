const KycTask = require('../models/KycTask');
const Client  = require('../models/Client');
const { mapTaskAnswersToKyc } = require('../config/kycRequiredFields');
const { syncKycCorrectionsForClient, submitKycFields } = require('../services/kycGapCheck.service');

// The authenticated role, collapsed to the three that matter for KYC
// submission/verification semantics — never trust a client-supplied
// "completedBy" for this, the JWT identity is authoritative.
const submitterRoleFor = (user) => (user.role === 'rm' ? 'rm' : user.role === 'client' ? 'client' : 'compliance');

exports.createKycTask = async (req, res) => {
  const { clientName, clientEmail, clientId, sections } = req.body;
  if (!clientName || !clientEmail) {
    return res.status(400).json({ error: 'clientName and clientEmail are required' });
  }
  // An RM creating a task can only assign it to themselves — only compliance
  // can hand a task to an arbitrary RM.
  const rmName = req.user.role === 'rm' ? req.user.rmCode : req.body.rmName;

  try {
    const task = await KycTask.create({
      rmName, clientName, clientEmail: clientEmail.toLowerCase(), clientId, sections,
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listKycTasks = async (req, res) => {
  try {
    const filter = req.user.role === 'rm' ? { rmName: req.user.rmCode || '__none__' } : {};
    const tasks = await KycTask.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.completeKycTask = async (req, res) => {
  try {
    const task = await KycTask.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'KYC task not found' });
    if (req.user.role === 'rm' && task.rmName !== req.user.rmCode) {
      return res.status(403).json({ error: 'Not authorised to complete this task' });
    }
    if (task.status === 'completed') {
      return res.status(400).json({ error: 'This KYC task has already been completed' });
    }

    task.status = 'completed';
    task.completedAt = new Date();
    if (req.body.answers) task.answers = req.body.answers;
    await task.save();

    if (task.clientId) {
      const client = await Client.findOne({ clientId: task.clientId });
      if (client) {
        const submittedBy = submitterRoleFor(req.user);
        // Fold the task's answers into the ONE shared KYC record (never a
        // separate copy), then let the gap-check + submission flow move any
        // now-filled fields out of 'pending'/'needs_correction'.
        const mapped = mapTaskAnswersToKyc(task.answers || {}, client.type);
        client.kyc = { ...(client.kyc || {}), ...mapped };
        client.kycSubmittedBy = submittedBy;
        client.kycAwaitingVerification = submittedBy !== 'compliance';
        client.auditTrail.push({
          action: 'KYC questionnaire completed',
          user: submittedBy === 'rm' ? (task.rmName || 'RM') : submittedBy === 'compliance' ? 'Compliance' : task.clientName,
          time: new Date().toLocaleString(),
          type: 'submitted',
        });
        await client.save();
        await syncKycCorrectionsForClient(client);
        await submitKycFields(client, Object.keys(mapped), submittedBy);
      }
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
