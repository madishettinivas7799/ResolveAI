import express from "express";
import { checkHindsightHealth } from "../services/hindsight.js";
import { checkGroqConfig } from "../services/groq.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
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
  } catch (error) {
    console.error("[Health] Check failed:", error);
    res.status(500).json({
      status: "error",
      error: error.message
    });
  }
});

export default router;
