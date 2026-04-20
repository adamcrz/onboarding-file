// In-memory store — replace with DB calls (e.g. Mongoose / Prisma) later
let files = [];
let nextId = 1;

const getAllFiles = async () => files;

const getFileById = async (id) => files.find((f) => f.id === Number(id));

const createFile = async ({ name, folderId = null, content = '' }) => {
  const file = { id: nextId++, name, folderId, content, createdAt: new Date().toISOString() };
  files.push(file);
  return file;
};

const updateFile = async (id, updates) => {
  const index = files.findIndex((f) => f.id === Number(id));
  if (index === -1) return null;
  files[index] = { ...files[index], ...updates, id: files[index].id };
  return files[index];
};

const deleteFile = async (id) => {
  files = files.filter((f) => f.id !== Number(id));
};

module.exports = { getAllFiles, getFileById, createFile, updateFile, deleteFile };
