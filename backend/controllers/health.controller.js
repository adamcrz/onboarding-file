const nextcloudService = require("./services/nextcloud.service");

async function getHealth(req, res, next) {
  try {
    const result = await nextcloudService.checkConnection();
    res.json({
      ok: true,
      message: "Nextcloud connection successful",
      itemCount: result.itemCount,
      rootPath: nextcloudService.getRootPath(),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealth,
};