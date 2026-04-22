const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Add this to server.js after your existing routes
const filesRoutes = require('./routes/files.routes');
const foldersRoutes = require('./routes/folders.routes');
const healthRoutes = require('./routes/health.routes');

app.use('/api/health', healthRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/folders', foldersRoutes);

require("dotenv").config();

const clientsRoutes = require("./routes/clients.routes");
const documentsRoutes = require("./routes/documents.routes");

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use("/api/clients", clientsRoutes);
app.use("/api/documents", documentsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});