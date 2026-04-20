const fileService = require('../services/files.service');

// GET /api/files
const getAllFiles = async (req, res) => {
  try {
    const files = await fileService.getAllFiles();
    res.status(200).json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/files/:id
const getFileById = async (req, res) => {
  try {
    const file = await fileService.getFileById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.status(200).json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/files
const createFile = async (req, res) => {
  try {
    const { name, folderId, content } = req.body;
    if (!name) return res.status(400).json({ error: 'File name is required' });
    const file = await fileService.createFile({ name, folderId, content });
    res.status(201).json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/files/:id
const updateFile = async (req, res) => {
  try {
    const file = await fileService.updateFile(req.params.id, req.body);
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.status(200).json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/files/:id
const deleteFile = async (req, res) => {
  try {
    await fileService.deleteFile(req.params.id);
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllFiles, getFileById, createFile, updateFile, deleteFile };
