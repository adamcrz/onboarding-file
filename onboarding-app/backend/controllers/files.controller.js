// controllers/files.controller.js

let files = [
  {
    id: "D-001",
    mandateId: "M-001",
    name: "KYC Form",
    type: "blank",
    status: "sent",
    page: null
  },
  {
    id: "D-002",
    mandateId: "M-001",
    name: "Signed KYC Form",
    type: "signed",
    status: "pending",
    page: "p.3"
  },
  {
    id: "D-003",
    mandateId: "M-002",
    name: "Contract",
    type: "blank",
    status: "sent"
  }
];

// GET documents for a mandate
exports.getFilesByMandate = (req, res) => {
  const { mandateId } = req.params;

  const result = files.filter(f => f.mandateId === mandateId);

  res.json(result);
};

// GET separated (blank vs signed)
exports.getFilesGrouped = (req, res) => {
  const { mandateId } = req.params;

  const mandateFiles = files.filter(f => f.mandateId === mandateId);

  const grouped = {
    blank: mandateFiles.filter(f => f.type === "blank"),
    signed: mandateFiles.filter(f => f.type === "signed")
  };

  res.json(grouped);
};

// upload signed doc
exports.uploadFile = (req, res) => {
  const { mandateId, name } = req.body;

  const newFile = {
    id: `D-${Date.now()}`,
    mandateId,
    name,
    type: "signed",
    status: "received"
  };

  files.push(newFile);

  res.json({
    message: "File uploaded",
    file: newFile
  });
};