const express = require("express");
const cors = require("cors");

const healthController = require("./controllers/health.controller");

const folderRoutes = require("./routes/folders.routes");
const fileRoutes = require("./routes/files.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", healthController.getHealth);

// 👇 ADD THESE
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});