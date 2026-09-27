import express from "express";
import {
  retainIncidentMemory,
  recallIncidentMemories,
  getMemoryStats,
  getHindsightConfig
} from "../services/hindsight.js";

const router = express.Router();

/**
 * GET /api/memory/stats
 * Telemetry and audit stats of Hindsight memories
 */
router.get("/stats", (req, res) => {
  const stats = getMemoryStats();
  res.json({
    success: true,
    ...stats
  });
});

/**
 * POST /api/memory/retain
 * Retain an incident or raw memory in Hindsight
 */
router.post("/retain", async (req, res) => {
  try {
    const { incident, content, context, metadata } = req.body;

    if (!incident && !content) {
      return res.status(400).json({
        success: false,
        error: "Either 'incident' object or 'content' string must be provided"
      });
    }

    const payload = incident
      ? { incident }
      : {
          incident: {
            title: "Direct Memory Entry",
            service: metadata?.service || "General",
            severity: metadata?.severity || "Medium"
          },
          customText: content
        };

    const result = await retainIncidentMemory(payload);

    res.json({
      success: true,
      message: "Memory successfully retained in Hindsight",
      result
    });
  } catch (error) {
    console.error("[Memory] Retain route error:", error);
    res.status(error.code === "HINDSIGHT_NOT_CONFIGURED" ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/memory/recall
 * Recall relevant memories from Hindsight using a natural language query
 */
router.post("/recall", async (req, res) => {
  try {
    const { query, budget, maxTokens, tags } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: "Query string is required"
      });
    }

    const result = await recallIncidentMemories({
      query: query.trim(),
      budget: budget || "mid",
      maxTokens: maxTokens || 4096,
      tags
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("[Memory] Recall route error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      results: []
    });
  }
});

export default router;
