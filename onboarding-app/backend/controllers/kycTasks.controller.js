const KycTask = require('../models/KycTask');
const Client  = require('../models/Client');

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
        const completedByRm = req.body.completedBy === 'rm';
        client.auditTrail.push({
          action: 'KYC questionnaire completed',
          user: completedByRm ? (task.rmName || 'RM') : task.clientName,
          time: new Date().toLocaleString(),
          type: 'submitted',
        });
        await client.save();
      }
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
