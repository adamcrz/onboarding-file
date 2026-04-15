const nextcloudService = require("../services/nextcloud.service");

async function getFiles(req, res, next) {
  try {
    const path = req.query.path || nextcloudService.getRootPath();
    const files = await nextcloudService.listDirectory(path);

    res.json({
      ok: true,
      path,
      items: files,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFiles,
};