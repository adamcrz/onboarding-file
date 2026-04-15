// controllers/folders.controller.js

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

// GET all mandates
exports.getFolders = (req, res) => {
  res.json(folders);
};

// GET by category (trust, foundation, etc.)
exports.getFoldersByType = (req, res) => {
  const { type } = req.params;

  const result = folders.filter(f => f.type === type);

  res.json(result);
};