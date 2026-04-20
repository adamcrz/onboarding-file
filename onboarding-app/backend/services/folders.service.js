// In-memory store — replace with DB calls (e.g. Mongoose / Prisma) later
let folders = [];
let nextId = 1;

const getAllFolders = async () => folders;

const getFolderById = async (id) => folders.find((f) => f.id === Number(id));

const createFolder = async ({ name, parentId = null }) => {
  const folder = { id: nextId++, name, parentId, createdAt: new Date().toISOString() };
  folders.push(folder);
  return folder;
};

const updateFolder = async (id, updates) => {
  const index = folders.findIndex((f) => f.id === Number(id));
  if (index === -1) return null;
  folders[index] = { ...folders[index], ...updates, id: folders[index].id };
  return folders[index];
};

const deleteFolder = async (id) => {
  folders = folders.filter((f) => f.id !== Number(id));
};

module.exports = { getAllFolders, getFolderById, createFolder, updateFolder, deleteFolder };
