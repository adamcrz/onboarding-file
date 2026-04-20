const Document = require('../models/Document');

// GET /api/documents
const getAllDocuments = async (req, res) => {
  try {
    const docs = await Document.find();
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/documents/:id
const getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findOne({ docId: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/documents
const createDocument = async (req, res) => {
  try {
    const doc = new Document(req.body);
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/documents/:id
const updateDocument = async (req, res) => {
  try {
    const doc = await Document.findOneAndUpdate(
      { docId: req.params.id },
      req.body,
      { new: true, upsert: true }
    );
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/documents/:id
const deleteDocument = async (req, res) => {
  try {
    await Document.findOneAndDelete({ docId: req.params.id });
    res.status(200).json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllDocuments, getDocumentById, createDocument, updateDocument, deleteDocument };
