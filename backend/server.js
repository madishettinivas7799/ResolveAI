import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../frontend/dist");

// Load environment variables from .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, ".env") });

import healthRouter from "./routes/health.js";
import incidentsRouter from "./routes/incidents.js";
import memoryRouter from "./routes/memory.js";
import assistantRouter from "./routes/assistant.js";

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

// Security and middleware
app.use(cors());

// Configure body parser with 500kb limit
app.use(express.json({ limit: "500kb" }));

// Handle JSON parse errors and payload size limits cleanly
app.use((err, req, res, next) => {
  if (err) {
    if (err.type === "entity.too.large" || err.status === 413) {
      return res.status(413).json({
        success: false,
        error: "Request body is too large",
        code: "REQUEST_TOO_LARGE"
      });
    }
    if (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400) && "body" in err) {
      return res.status(400).json({
        success: false,
        error: "Malformed JSON payload in request body",
        code: "INVALID_JSON"
      });
    }
  }
  next(err);
});

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

// 404 Handler for unmatched API routes
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.path}`,
    code: "NOT_FOUND"
  });
});

// Serve static frontend assets from ../frontend/dist
app.use(express.static(frontendDistPath));

// SPA fallback for all non-API GET requests: serve index.html
app.get("*", (req, res) => {
  const indexPath = path.join(frontendDistPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else if (req.path === "/") {
    res.json({
      name: "ResolveAI API",
      status: "online",
      documentation: "/api/health",
      note: "Frontend build not found at ../frontend/dist. Run 'npm run build' to build the frontend."
    });
  } else {
    res.status(404).json({
      success: false,
      error: `Endpoint not found: ${req.method} ${req.path}`,
      code: "NOT_FOUND"
    });
  }
});

// Fallback 404 Handler for unhandled non-GET requests
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.path}`,
    code: "NOT_FOUND"
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error("[ServerError]", err.message || err);
  const status = err.status || err.statusCode || 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";

  let safeMessage = err.message || "Internal server error";
  if (
    safeMessage.includes("apiKey") ||
    safeMessage.includes("gsk_") ||
    safeMessage.includes("hsk_") ||
    safeMessage.includes("Bearer")
  ) {
    safeMessage = "An error occurred while communicating with an upstream service.";
  }

  res.status(status).json({
    success: false,
    error: safeMessage,
    code
  });
});

// Start HTTP Server with port collision and lifecycle handlers
const server = app.listen(PORT, HOST, () => {
  console.log(`===============================================`);
  console.log(`  🚀 ResolveAI Server listening on ${HOST}:${PORT}`);
  console.log(`  🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  📁 Frontend Serving: ${fs.existsSync(path.join(frontendDistPath, "index.html")) ? frontendDistPath : "dist not found (API only)"}`);
  console.log(`  🧠 Hindsight Memory: ResolveAI Production Memory`);
  console.log(`  ⚡ Groq Model: ${process.env.GROQ_MODEL || "openai/gpt-oss-120b"}`);
  console.log(`===============================================`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[StartupError] Port ${PORT} is already in use by another process. Please free port ${PORT} or configure a different PORT.`);
    process.exit(1);
  } else {
    console.error("[StartupError] Failed to start HTTP server:", err.message || err);
    process.exit(1);
  }
});

// Graceful shutdown handling for SIGINT and SIGTERM
function handleGracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  server.close((err) => {
    if (err) {
      console.error("[Server] Error during server close:", err);
      process.exit(1);
    }
    console.log("[Server] Server closed gracefully. Process exiting.");
    process.exit(0);
  });

  setTimeout(() => {
    console.warn("[Server] Forceful shutdown initiated after timeout.");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("message", (msg) => {
  if (msg === "shutdown" || msg === "SIGTERM" || msg === "SIGINT") {
    handleGracefulShutdown(msg);
  }
});
