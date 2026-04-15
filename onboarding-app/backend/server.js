// Backend entry point 
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const healthRoutes = require("./routes/health.routes");
const filesRoutes = require("./routes/files.routes");
const foldersRoutes = require("./routes/folders.routes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log("healthRoutes =", healthRoutes);
console.log("filesRoutes =", filesRoutes);
console.log("foldersRoutes =", foldersRoutes);

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/folders", foldersRoutes);

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Onboarding backend is running",
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    ok: false,
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});