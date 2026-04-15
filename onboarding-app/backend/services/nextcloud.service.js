// backend/services/nextcloud.service.js

const axios = require("axios");

const NEXTCLOUD_BASE_URL = process.env.NEXTCLOUD_BASE_URL;
const NEXTCLOUD_USERNAME = process.env.NEXTCLOUD_USERNAME;
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD;

// Usually:
// https://your-domain/remote.php/dav/files/USERNAME
function getWebDavBaseUrl() {
  if (!NEXTCLOUD_BASE_URL || !NEXTCLOUD_USERNAME) {
    throw new Error("Nextcloud environment variables are missing");
  }

  return `${NEXTCLOUD_BASE_URL.replace(/\/$/, "")}/remote.php/dav/files/${NEXTCLOUD_USERNAME}`;
}

function getAuth() {
  return {
    username: NEXTCLOUD_USERNAME,
    password: NEXTCLOUD_PASSWORD
  };
}

function buildPath(path = "") {
  const cleanPath = path.replace(/^\/+/, "");
  return `${getWebDavBaseUrl()}/${cleanPath}`;
}

// Create folder in Nextcloud
async function createFolder(path) {
  const url = buildPath(path);

  const response = await axios({
    method: "MKCOL",
    url,
    auth: getAuth(),
    validateStatus: () => true
  });

  if (![201, 405].includes(response.status)) {
    throw new Error(`Failed to create folder. Status: ${response.status}`);
  }

  return {
    success: true,
    message: response.status === 201 ? "Folder created" : "Folder already exists",
    path
  };
}

// List folder contents
async function listFolder(path = "") {
  const url = buildPath(path);

  const response = await axios({
    method: "PROPFIND",
    url,
    auth: getAuth(),
    headers: {
      Depth: "1"
    },
    data: `<?xml version="1.0"?>
      <d:propfind xmlns:d="DAV:">
        <d:prop>
          <d:displayname />
          <d:getcontentlength />
          <d:getcontenttype />
          <d:resourcetype />
          <d:getlastmodified />
        </d:prop>
      </d:propfind>`,
    validateStatus: () => true
  });

  if (response.status !== 207) {
    throw new Error(`Failed to list folder. Status: ${response.status}`);
  }

  return {
    success: true,
    path,
    raw: response.data
  };
}

// Upload file buffer
async function uploadFile(path, fileBuffer, contentType = "application/octet-stream") {
  const url = buildPath(path);

  const response = await axios({
    method: "PUT",
    url,
    auth: getAuth(),
    headers: {
      "Content-Type": contentType
    },
    data: fileBuffer,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true
  });

  if (![200, 201, 204].includes(response.status)) {
    throw new Error(`Failed to upload file. Status: ${response.status}`);
  }

  return {
    success: true,
    message: "File uploaded",
    path
  };
}

// Download file
async function downloadFile(path) {
  const url = buildPath(path);

  const response = await axios({
    method: "GET",
    url,
    auth: getAuth(),
    responseType: "arraybuffer",
    validateStatus: () => true
  });

  if (response.status !== 200) {
    throw new Error(`Failed to download file. Status: ${response.status}`);
  }

  return response.data;
}

// Delete file or folder
async function deletePath(path) {
  const url = buildPath(path);

  const response = await axios({
    method: "DELETE",
    url,
    auth: getAuth(),
    validateStatus: () => true
  });

  if (![204, 404].includes(response.status)) {
    throw new Error(`Failed to delete path. Status: ${response.status}`);
  }

  return {
    success: true,
    message: response.status === 204 ? "Deleted" : "Path not found",
    path
  };
}

module.exports = {
  createFolder,
  listFolder,
  uploadFile,
  downloadFile,
  deletePath
};