import express from "express";
import { recallIncidentMemories, getHindsightConfig } from "../services/hindsight.js";
import { generateIncidentResponse, checkGroqConfig } from "../services/groq.js";
import { isPlainObject, validationError } from "../utils/validation.js";
import { asyncHandler } from "../utils/asyncUtils.js";

const router = express.Router();

/**
 * POST /api/assistant
 * Main AI Incident Response Agent orchestration endpoint
 * 1. Safely validates user input (query, memory options, history)
 * 2. Recalls relevant previous incident memories from Hindsight (only when input is valid)
 * 3. Injects retrieved memories into Groq LLM prompt with timeout protection
 * 4. Returns structured response with explicit memory attribution
 */
router.post("/", asyncHandler(async (req, res) => {
  if (!isPlainObject(req.body)) {
    return validationError(res, "Request body must be a JSON object");
  }

  const { useMemory = true, history = [] } = req.body;
  const rawQuery = req.body.query !== undefined ? req.body.query : req.body.message;

  // Validate query presence and type
  if (rawQuery === undefined || rawQuery === null) {
    return validationError(res, "Assistant query is required");
  }

  if (typeof rawQuery !== "string") {
    return validationError(res, "Assistant query must be a string");
  }

  const trimmedQuery = rawQuery.trim();
  if (!trimmedQuery) {
    return validationError(res, "Assistant query is required");
  }

  if (trimmedQuery.length > 2000) {
    return validationError(res, "Assistant query must not exceed 2000 characters");
  }

  // Validate optional useMemory
  if (req.body.useMemory !== undefined && typeof req.body.useMemory !== "boolean") {
    return validationError(res, "Field 'useMemory' must be a boolean");
  }

  // Validate optional history
  if (req.body.history !== undefined) {
    if (!Array.isArray(req.body.history)) {
      return validationError(res, "Field 'history' must be an array");
    }
    if (req.body.history.length > 50) {
      return validationError(res, "Conversation history must not exceed 50 messages");
    }
  }

  const hindsightConfig = getHindsightConfig();
  const groqConfig = checkGroqConfig();

  let recalledMemories = [];
  let recallDetails = null;
  let memoryStatus = "disabled"; // "grounded" | "no_matches" | "disabled" | "unavailable"
  let memoryStatusMessage = "";

  // 1. Recall from Hindsight if memory is enabled
  if (!useMemory) {
    memoryStatus = "disabled";
    memoryStatusMessage = "Memory disabled";
  } else if (!hindsightConfig.configured) {
    memoryStatus = "unavailable";
    memoryStatusMessage = "Hindsight is not configured";
  } else {
    try {
      const recallRes = await recallIncidentMemories({
        query: trimmedQuery,
        budget: "mid",
        maxTokens: 3000
      });

      if (recallRes.success && Array.isArray(recallRes.results) && recallRes.results.length > 0) {
        recalledMemories = recallRes.results;
        recallDetails = {
          count: recallRes.count,
          bank: "ResolveAI Production Memory"
        };
        memoryStatus = "grounded";
        memoryStatusMessage = `Hindsight Memory — ${recalledMemories.length} relevant incident(s)`;
      } else if (recallRes.success) {
        memoryStatus = "no_matches";
        memoryStatusMessage = "No relevant historical incidents were found in Hindsight.";
      } else {
        memoryStatus = "unavailable";
        memoryStatusMessage = recallRes.error || "Hindsight memory unavailable.";
      }
    } catch (err) {
      console.warn("[Assistant] Hindsight recall failed non-fatally:", err.message || err);
      memoryStatus = "unavailable";
      memoryStatusMessage = err.message || "Hindsight memory unavailable.";
    }
  }

  // 2. Synthesize AI Incident Response via Groq with timeout protection
  const aiResult = await generateIncidentResponse({
    userQuery: trimmedQuery,
    recalledMemories,
    useMemory,
    memoryStatus,
    conversationHistory: history
  });

  const memoryRetrieved = memoryStatus === "grounded" && recalledMemories.length > 0;

  res.json({
    success: true,
    query: trimmedQuery,
    response: aiResult.response,
    model: aiResult.model,
    useMemory,
    memoryStatus,
    memoryStatusMessage,
    memoryRetrieved,
    memoryCount: recalledMemories.length,
    recalledMemories,
    recallDetails,
    hindsight: {
      configured: hindsightConfig.configured,
      bank: "ResolveAI Production Memory"
    },
    groq: {
      configured: groqConfig.configured,
      model: groqConfig.model
    }
  });
}));

export default router;
