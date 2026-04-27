const Client = require('../models/Client');

// GET /api/clients
const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find();
    res.status(200).json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clients/:id
const getClientById = async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clients
const createClient = async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/clients/:id
const updateClient = async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { clientId: req.params.id },
      req.body,
      { new: true, upsert: true }
    );
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  try {
    await Client.findOneAndDelete({ clientId: req.params.id });
    res.status(200).json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clients/me  (protected — returns the logged-in client's own profile)
const getMyClient = async (req, res) => {
  try {
    const client = await Client.findOne({ userId: req.user.id });
    if (!client) return res.status(404).json({ error: 'Client profile not found' });
    res.status(200).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllClients, getClientById, getMyClient, createClient, updateClient, deleteClient };
