import express from "express";
import { checkHindsightHealth, setHindsightSimulation, getHindsightSimulation } from "../services/hindsight.js";
import { checkGroqConfig, setGroqSimulation, getGroqSimulation } from "../services/groq.js";
import { asyncHandler } from "../utils/asyncUtils.js";

const router = express.Router();

/**
 * GET /api/health
 * Fast, non-blocking health check reporting service, Hindsight, and Groq statuses
 * Never exposes credentials, tokens, or environment variable values.
 */
router.get("/", asyncHandler(async (req, res) => {
  const hindsightHealth = await checkHindsightHealth();
  const groqConfig = checkGroqConfig();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "ResolveAI Incident Response Agent API",
    hindsight: {
      configured: hindsightHealth.configured,
      connected: hindsightHealth.connected,
      bankId: hindsightHealth.bankId,
      version: hindsightHealth.version || null,
      message: hindsightHealth.message
    },
    groq: {
      configured: groqConfig.configured,
      model: groqConfig.model
    }
  });
}));

/**
 * POST /api/health/simulate
 * Internal utility to simulate upstream provider failures safely for automated testing
 * without modifying environment variables or restarting the backend.
 */
router.post("/simulate", (req, res) => {
  const { provider, mode } = req.body || {};

  if (provider === "hindsight") {
    setHindsightSimulation(mode || null);
  } else if (provider === "groq") {
    setGroqSimulation(mode || null);
  } else if (provider === "all" && !mode) {
    setHindsightSimulation(null);
    setGroqSimulation(null);
  }

  res.json({
    success: true,
    simulation: {
      hindsight: getHindsightSimulation(),
      groq: getGroqSimulation()
    }
  });
});

export default router;
