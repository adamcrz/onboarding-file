// backend/controllers/files.controller.js

const nextcloudService = require("../services/nextcloud.service");

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

exports.getFilesByMandate = (req, res) => {
  const { mandateId } = req.params;
  const result = files.filter((f) => f.mandateId === mandateId);
  res.json(result);
};

exports.getFilesGrouped = (req, res) => {
  const { mandateId } = req.params;
  const mandateFiles = files.filter((f) => f.mandateId === mandateId);

  res.json({
    blank: mandateFiles.filter((f) => f.type === "blank"),
    signed: mandateFiles.filter((f) => f.type === "signed")
  });
};

exports.uploadFile = async (req, res) => {
  try {
    const { mandateId, name, type = "signed", content = "" } = req.body;

    if (!mandateId || !name) {
      return res.status(400).json({
        success: false,
        message: "mandateId and name are required"
      });
    }

    const fileName = name.replace(/\s+/g, "_");
    const folderType = type === "blank" ? "blank" : "signed";
    const path = `mandates/${mandateId}/${folderType}/${fileName}.txt`;

    await nextcloudService.createFolder(`mandates/${mandateId}`);
    await nextcloudService.createFolder(`mandates/${mandateId}/${folderType}`);

    const buffer = Buffer.from(content, "utf-8");
    await nextcloudService.uploadFile(path, buffer, "text/plain");

    const newFile = {
      id: `D-${Date.now()}`,
      mandateId,
      name,
      type,
      status: type === "signed" ? "received" : "sent",
      nextcloudPath: path
    };

    files.push(newFile);

    res.json({
      success: true,
      message: "File uploaded",
      file: newFile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to upload file",
      error: error.message
    });
  }
};