import express from "express";
import { recallIncidentMemories, getHindsightConfig } from "../services/hindsight.js";
import { generateIncidentResponse, checkGroqConfig } from "../services/groq.js";

const router = express.Router();

/**
 * POST /api/assistant
 * Main AI Incident Response Agent orchestration endpoint
 * 1. Takes user incident description/query
 * 2. Recalls relevant previous incident memories from Hindsight
 * 3. Injects retrieved memories into Groq LLM prompt
 * 4. Returns structured response with explicit memory attribution
 */
router.post("/", async (req, res) => {
  try {
    const { query, useMemory = true, history = [] } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: "Incident query or message is required"
      });
    }

    const trimmedQuery = query.trim();
    const hindsightConfig = getHindsightConfig();
    const groqConfig = checkGroqConfig();

    let recalledMemories = [];
    let recallDetails = null;

    // 1. Recall from Hindsight if memory is enabled and configured
    if (useMemory && hindsightConfig.configured) {
      try {
        const recallRes = await recallIncidentMemories({
          query: trimmedQuery,
          budget: "mid",
          maxTokens: 3000
        });

        if (recallRes.success && Array.isArray(recallRes.results)) {
          recalledMemories = recallRes.results;
          recallDetails = {
            count: recallRes.count,
            bankId: recallRes.bankId
          };
        }
      } catch (err) {
        console.warn("[Assistant] Hindsight recall failed non-fatally:", err.message);
      }
    }

    // 2. Synthesize AI Incident Response via Groq
    const aiResult = await generateIncidentResponse({
      userQuery: trimmedQuery,
      recalledMemories,
      useMemory,
      conversationHistory: history
    });

    const memoryRetrieved = Boolean(recalledMemories && recalledMemories.length > 0);

    res.json({
      success: true,
      query: trimmedQuery,
      response: aiResult.response,
      model: aiResult.model,
      useMemory,
      memoryRetrieved,
      memoryCount: recalledMemories.length,
      recalledMemories,
      recallDetails,
      hindsight: {
        configured: hindsightConfig.configured,
        bankId: hindsightConfig.bankId
      },
      groq: {
        configured: groqConfig.configured,
        model: groqConfig.model
      }
    });
  } catch (error) {
    console.error("[Assistant] Orchestration error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process incident inquiry"
    });
  }
});

export default router;
