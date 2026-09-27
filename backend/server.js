import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

import healthRouter from "./routes/health.js";
import incidentsRouter from "./routes/incidents.js";
import memoryRouter from "./routes/memory.js";
import assistantRouter from "./routes/assistant.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Request logger for debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith("/api/health")) {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount API routes
app.use("/api/health", healthRouter);
app.use("/api/incidents", incidentsRouter);
app.use("/api/memory", memoryRouter);
app.use("/api/assistant", assistantRouter);

// Root greeting
app.get("/", (req, res) => {
  res.json({
    name: "ResolveAI API",
    status: "online",
    documentation: "/api/health"
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.path}`
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error("[ServerError]", err.stack || err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  🚀 ResolveAI Backend listening on port ${PORT}`);
  console.log(`  🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  🧠 Hindsight Bank: ${process.env.HINDSIGHT_BANK_ID || "resolveai"}`);
  console.log(`  ⚡ Groq Model: ${process.env.GROQ_MODEL || "llama-3.3-70b-versatile"}`);
  console.log(`===============================================`);
});
