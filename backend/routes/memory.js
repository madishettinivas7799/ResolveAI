import express from "express";
import {
  retainIncidentMemory,
  recallIncidentMemories,
  getMemoryStats
} from "../services/hindsight.js";
import { isPlainObject, isValidNumber, validationError } from "../utils/validation.js";
import { asyncHandler } from "../utils/asyncUtils.js";

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
 * Retain an incident or raw memory in Hindsight with validation and timeout protection
 */
router.post("/retain", asyncHandler(async (req, res) => {
  if (!isPlainObject(req.body)) {
    return validationError(res, "Request body must be a JSON object");
  }

  const { incident, content, context, metadata } = req.body;

  if (!incident && !content) {
    return validationError(res, "Either 'incident' object or 'content' string must be provided");
  }

  // Validate content if provided
  if (content !== undefined && content !== null) {
    if (typeof content !== "string") {
      return validationError(res, "Memory content must be a string");
    }
    if (!content.trim()) {
      return validationError(res, "Memory content cannot be empty or whitespace-only");
    }
    if (content.length > 10000) {
      return validationError(res, "Memory content must not exceed 10000 characters");
    }
  }

  // Validate incident if provided
  if (incident !== undefined && incident !== null) {
    if (!isPlainObject(incident)) {
      return validationError(res, "Incident must be a valid object");
    }
    if (incident.title !== undefined && typeof incident.title !== "string") {
      return validationError(res, "Incident title must be a string");
    }
    if (incident.service !== undefined && typeof incident.service !== "string") {
      return validationError(res, "Incident service must be a string");
    }
  }

  // Validate metadata if provided
  if (metadata !== undefined && metadata !== null) {
    if (!isPlainObject(metadata)) {
      return validationError(res, "Metadata must be a plain object");
    }
  }

  // Validate context if provided
  if (context !== undefined && context !== null) {
    if (typeof context !== "string") {
      return validationError(res, "Context must be a string");
    }
    if (context.length > 1000) {
      return validationError(res, "Context must not exceed 1000 characters");
    }
  }

  const payload = incident
    ? { incident }
    : {
        incident: {
          title: "Direct Memory Entry",
          service: metadata?.service || "General",
          severity: metadata?.severity || "Medium"
        },
        customText: content.trim()
      };

  try {
    const result = await retainIncidentMemory(payload);
    res.json({
      success: true,
      message: "Memory successfully retained in Hindsight",
      result
    });
  } catch (error) {
    const statusCode = error.code === "HINDSIGHT_NOT_CONFIGURED" || error.code === "HINDSIGHT_UNAVAILABLE" 
      ? 503 
      : error.code === "HINDSIGHT_TIMEOUT" 
        ? 504 
        : (error.status || 500);

    return res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to retain memory in Hindsight",
      code: error.code || "HINDSIGHT_RETAIN_FAILED"
    });
  }
}));

/**
 * POST /api/memory/recall
 * Recall relevant memories from Hindsight using a natural language query with validation
 */
router.post("/recall", asyncHandler(async (req, res) => {
  if (!isPlainObject(req.body)) {
    return validationError(res, "Request body must be a JSON object");
  }

  const { query, budget, maxTokens, tags } = req.body;

  // Validate query
  if (query === undefined || query === null) {
    return validationError(res, "Query string is required");
  }
  if (typeof query !== "string") {
    return validationError(res, "Query must be a string");
  }
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return validationError(res, "Query string is required");
  }
  if (trimmedQuery.length > 1000) {
    return validationError(res, "Query must not exceed 1000 characters");
  }

  // Validate optional budget
  let normalizedBudget = "mid";
  if (budget !== undefined && budget !== null) {
    if (typeof budget !== "string") {
      return validationError(res, "Budget must be a string");
    }
    const allowedBudgets = ["low", "mid", "high"];
    const lowerBudget = budget.trim().toLowerCase();
    if (!allowedBudgets.includes(lowerBudget)) {
      return validationError(res, "Invalid budget value. Allowed: low, mid, high");
    }
    normalizedBudget = lowerBudget;
  }

  // Validate optional maxTokens
  let validatedMaxTokens = 4096;
  if (maxTokens !== undefined && maxTokens !== null) {
    if (!isValidNumber(maxTokens, { min: 1, max: 32000, integer: true })) {
      return validationError(res, "Invalid maxTokens value. Must be a positive integer between 1 and 32000");
    }
    validatedMaxTokens = maxTokens;
  }

  // Validate optional tags
  if (tags !== undefined && tags !== null) {
    if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) {
      return validationError(res, "Tags must be an array of strings");
    }
  }

  const result = await recallIncidentMemories({
    query: trimmedQuery,
    budget: normalizedBudget,
    maxTokens: validatedMaxTokens,
    tags
  });

  if (!result.configured) {
    return res.status(503).json({
      success: false,
      error: "Hindsight Cloud is not configured. Please set HINDSIGHT_API_KEY in backend/.env.",
      code: "HINDSIGHT_NOT_CONFIGURED",
      results: []
    });
  }

  if (!result.success) {
    const statusCode = result.code === "HINDSIGHT_TIMEOUT" ? 504 : result.code === "HINDSIGHT_UNAVAILABLE" ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      error: result.error || "Hindsight recall unavailable.",
      code: result.code || "HINDSIGHT_RECALL_FAILED",
      results: []
    });
  }

  res.json({
    success: true,
    ...result
  });
}));

export default router;
