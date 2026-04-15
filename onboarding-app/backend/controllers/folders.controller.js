// backend/controllers/folders.controller.js

const nextcloudService = require("../services/nextcloud.service");

let folders = [
  {
    id: "M-001",
    name: "Acme Corporation",
    type: "company",
    risk: "Medium"
  },
  {
    id: "M-002",
    name: "Chen Wei",
    type: "private_person",
    risk: "Low"
  },
  {
    id: "M-003",
    name: "Thornton Trust",
    type: "trust",
    risk: "High"
  },
  {
    id: "M-004",
    name: "Global Foundation",
    type: "foundation",
    risk: "High"
  }
];

exports.getFolders = (req, res) => {
  res.json(folders);
};

exports.getFoldersByType = (req, res) => {
  const { type } = req.params;
  const result = folders.filter((f) => f.type === type);
  res.json(result);
};

exports.createMandateFolder = async (req, res) => {
  try {
    const { id, name, type } = req.body;

    if (!id || !name || !type) {
      return res.status(400).json({
        success: false,
        message: "id, name and type are required"
      });
    }

    const folderPath = `mandates/${type}/${id}-${name.replace(/\s+/g, "_")}`;

    await nextcloudService.createFolder("mandates");
    await nextcloudService.createFolder(`mandates/${type}`);
    const result = await nextcloudService.createFolder(folderPath);

    const newFolder = {
      id,
      name,
      type,
      risk: "Pending",
      path: folderPath
    };

    folders.push(newFolder);

    res.json({
      success: true,
      message: "Mandate folder created",
      local: newFolder,
      nextcloud: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create mandate folder",
      error: error.message
    });
  }
};