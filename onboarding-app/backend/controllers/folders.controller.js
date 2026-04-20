const folderService = require('../services/folders.service');

// GET /api/folders
const getAllFolders = async (req, res) => {
  try {
    const folders = await folderService.getAllFolders();
    res.status(200).json(folders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/folders/:id
const getFolderById = async (req, res) => {
  try {
    const folder = await folderService.getFolderById(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.status(200).json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/folders
const createFolder = async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });
    const folder = await folderService.createFolder({ name, parentId });
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/folders/:id
const updateFolder = async (req, res) => {
  try {
    const folder = await folderService.updateFolder(req.params.id, req.body);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.status(200).json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/folders/:id
const deleteFolder = async (req, res) => {
  try {
    await folderService.deleteFolder(req.params.id);
    res.status(200).json({ message: 'Folder deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllFolders, getFolderById, createFolder, updateFolder, deleteFolder };
