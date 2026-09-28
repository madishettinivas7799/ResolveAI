import { HindsightClient } from "@vectorize-io/hindsight-client";
import { withTimeout } from "../utils/asyncUtils.js";

// Local in-memory session audit log for application telemetry
// NOTE: These counters track current backend session operations and reset upon server restart.
// Permanent memories reside persistently in Hindsight Cloud.
const sessionTelemetry = {
  retains: [],
  recalls: []
};

let hindsightClientInstance = null;
let simulatedState = null; // null | "unavailable" | "timeout"

/**
 * Configure simulation mode for automated testing without modifying credentials
 */
export function setHindsightSimulation(mode) {
  simulatedState = mode;
}

export function getHindsightSimulation() {
  return simulatedState;
}

function getHindsightClient() {
  const apiKey = process.env.HINDSIGHT_API_KEY?.trim();
  const baseUrl = process.env.HINDSIGHT_BASE_URL?.trim() || "https://api.hindsight.vectorize.io";

  if (!apiKey) {
    return null;
  }

  if (!hindsightClientInstance) {
    hindsightClientInstance = new HindsightClient({
      baseUrl,
      apiKey
    });
  }

  return hindsightClientInstance;
}

let resolvedBankId = null;

export async function getEffectiveBankId() {
  if (resolvedBankId) return resolvedBankId;
  const envBank = process.env.HINDSIGHT_BANK_ID?.trim();
  
  // If explicitly configured and not default placeholder, use it
  if (envBank && envBank !== "resolveai") {
    resolvedBankId = envBank;
    return resolvedBankId;
  }

  // Auto-discover authorized bank from Hindsight Cloud
  const apiKey = process.env.HINDSIGHT_API_KEY?.trim();
  const baseUrl = process.env.HINDSIGHT_BASE_URL?.trim() || "https://api.hindsight.vectorize.io";
  if (apiKey) {
    try {
      const res = await withTimeout(
        fetch(`${baseUrl}/v1/default/banks`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        }),
        6000,
        "HINDSIGHT_TIMEOUT",
        "Bank discovery timed out"
      );
      if (res.ok) {
        const data = await res.json();
        if (data.banks && data.banks.length > 0) {
          resolvedBankId = data.banks[0].bank_id;
          console.log("[Hindsight] Connected to authorized cloud memory bank");
          return resolvedBankId;
        }
      }
    } catch (e) {
      console.warn("[Hindsight] Auto-bank discovery failed non-fatally:", e.message);
    }
  }

  resolvedBankId = envBank || "resolveai";
  return resolvedBankId;
}

export function getHindsightConfig() {
  if (simulatedState === "unavailable") {
    return {
      configured: false,
      baseUrl: "https://api.hindsight.vectorize.io",
      bank: "ResolveAI Production Memory"
    };
  }

  const apiKey = process.env.HINDSIGHT_API_KEY?.trim();
  const baseUrl = process.env.HINDSIGHT_BASE_URL?.trim() || "https://api.hindsight.vectorize.io";
  const bankId = resolvedBankId || process.env.HINDSIGHT_BANK_ID?.trim() || "resolveai";

  return {
    configured: Boolean(apiKey && apiKey.length > 5),
    baseUrl,
    bankId,
    bank: "ResolveAI Production Memory"
  };
}

/**
 * Health check for Hindsight Cloud
 */
export async function checkHindsightHealth() {
  if (simulatedState === "unavailable") {
    return {
      configured: false,
      connected: false,
      bank: "ResolveAI Production Memory",
      message: "Hindsight Cloud is temporarily unavailable (simulated)"
    };
  }

  const config = getHindsightConfig();

  if (!config.configured) {
    return {
      configured: false,
      connected: false,
      bank: "ResolveAI Production Memory",
      message: "HINDSIGHT_API_KEY is not configured in backend/.env"
    };
  }

  try {
    const bankId = await getEffectiveBankId();
    const client = getHindsightClient();
    if (!client) {
      return {
        configured: false,
        connected: false,
        bank: "ResolveAI Production Memory",
        message: "Hindsight client initialization failed"
      };
    }

    // Ping version endpoint with timeout
    const version = await withTimeout(
      client.getVersion(),
      8000,
      "HINDSIGHT_TIMEOUT",
      "Hindsight health ping timed out"
    );
    return {
      configured: true,
      connected: true,
      bank: "ResolveAI Production Memory",
      version: version.api_version || "connected",
      message: "Successfully connected to Hindsight Cloud"
    };
  } catch (error) {
    console.error("[Hindsight] Health check error:", error.message || error);
    return {
      configured: true,
      connected: false,
      bank: "ResolveAI Production Memory",
      error: sanitizeErrorMessage(error.message) || "Failed to connect to Hindsight Cloud",
      message: "API key is set, but could not reach Hindsight endpoint."
    };
  }
}

/**
 * Retain an incident memory into Hindsight
 */
export async function retainIncidentMemory({ incident, customText = null }) {
  if (simulatedState === "unavailable") {
    const err = new Error("Hindsight Cloud memory service is temporarily unavailable.");
    err.code = "HINDSIGHT_UNAVAILABLE";
    err.status = 503;
    throw err;
  }
  if (simulatedState === "timeout") {
    const err = new Error("Hindsight retain operation timed out.");
    err.code = "HINDSIGHT_TIMEOUT";
    err.status = 504;
    throw err;
  }

  const config = getHindsightConfig();

  if (!config.configured) {
    const err = new Error("Hindsight is not configured. Please set HINDSIGHT_API_KEY in backend/.env.");
    err.code = "HINDSIGHT_NOT_CONFIGURED";
    err.status = 503;
    throw err;
  }

  const client = getHindsightClient();
  const bankId = await getEffectiveBankId();

  // Format high-signal cognitive memory representation
  const content = customText || [
    `Incident: ${incident.title || "Production Incident"}`,
    `Service: ${incident.service || "Unknown Service"}`,
    `Severity: ${incident.severity || "Medium"}`,
    `Symptoms: ${incident.symptoms || "Unspecified errors"}`,
    `Root cause: ${incident.rootCause || incident.root_cause || "Not identified"}`,
    `Resolution: ${incident.resolution || "Pending"}`,
    `Outcome: ${incident.outcome || "Service recovered"}`,
    `Environment/Deployment: ${incident.deployment || incident.environment || "Production"}`
  ].join("\n");

  const metadata = {
    incidentId: String(incident.id || Date.now()),
    service: String(incident.service || "general"),
    severity: String(incident.severity || "medium"),
    retainedAt: new Date().toISOString()
  };

  const tags = [
    "incident",
    (incident.service || "service").toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
    (incident.severity || "medium").toLowerCase()
  ];

  try {
    const response = await withTimeout(
      client.retain(bankId, content, {
        timestamp: incident.timestamp ? new Date(incident.timestamp) : new Date(),
        context: `ResolveAI Incident Response for ${incident.service || "service"}`,
        metadata,
        tags
      }),
      15000,
      "HINDSIGHT_TIMEOUT",
      "Hindsight retain operation timed out after 15 seconds"
    );

    const record = {
      id: `mem-${Date.now()}`,
      bank: "ResolveAI Production Memory",
      incidentId: incident.id,
      title: incident.title,
      service: incident.service,
      content,
      rootCause: incident.rootCause,
      resolution: incident.resolution,
      retainedAt: new Date().toISOString(),
      hindsightResponse: response
    };

    sessionTelemetry.retains.unshift(record);
    if (sessionTelemetry.retains.length > 50) sessionTelemetry.retains.pop();

    return {
      success: true,
      bank: "ResolveAI Production Memory",
      itemsCount: response?.items_count ?? 1,
      memory: record
    };
  } catch (error) {
    const cleanMsg = sanitizeErrorMessage(error.message);
    console.error("[Hindsight] Retain error:", cleanMsg);
    const err = new Error(cleanMsg || "Unable to retain incident in Hindsight");
    err.code = error.code || "HINDSIGHT_RETAIN_FAILED";
    err.status = error.code === "HINDSIGHT_TIMEOUT" ? 504 : 500;
    throw err;
  }
}

/**
 * Recall memories using a natural language query
 */
export async function recallIncidentMemories({ query, budget = "mid", maxTokens = 4096, tags = null }) {
  if (simulatedState === "unavailable") {
    return {
      configured: true,
      success: false,
      error: "Hindsight memory service is currently unavailable.",
      code: "HINDSIGHT_UNAVAILABLE",
      results: [],
      count: 0
    };
  }
  if (simulatedState === "timeout") {
    return {
      configured: true,
      success: false,
      error: "Hindsight recall operation timed out.",
      code: "HINDSIGHT_TIMEOUT",
      results: [],
      count: 0
    };
  }

  const config = getHindsightConfig();

  if (!config.configured) {
    return {
      configured: false,
      success: false,
      results: [],
      count: 0,
      code: "HINDSIGHT_NOT_CONFIGURED",
      message: "Hindsight is not configured. Please set HINDSIGHT_API_KEY in backend/.env."
    };
  }

  const client = getHindsightClient();
  const bankId = await getEffectiveBankId();

  try {
    const options = {
      budget,
      maxTokens
    };
    if (tags && Array.isArray(tags) && tags.length > 0) {
      options.tags = tags;
    }

    const response = await withTimeout(
      client.recall(bankId, query, options),
      15000,
      "HINDSIGHT_TIMEOUT",
      "Hindsight recall operation timed out after 15 seconds"
    );

    const results = (response?.results || []).map((item) => ({
      id: item.id,
      text: item.text,
      type: item.type || "memory",
      context: item.context,
      metadata: item.metadata || {},
      tags: item.tags || [],
      scores: item.scores || null
    }));

    sessionTelemetry.recalls.unshift({
      query,
      timestamp: new Date().toISOString(),
      matchCount: results.length
    });
    if (sessionTelemetry.recalls.length > 50) sessionTelemetry.recalls.pop();

    return {
      configured: true,
      success: true,
      bank: "ResolveAI Production Memory",
      query,
      results,
      count: results.length
    };
  } catch (error) {
    const cleanMsg = sanitizeErrorMessage(error.message);
    console.error("[Hindsight] Recall error:", cleanMsg);
    return {
      configured: true,
      success: false,
      error: cleanMsg || "Recall query failed",
      code: error.code || "HINDSIGHT_RECALL_FAILED",
      results: [],
      count: 0
    };
  }
}

/**
 * Get memory statistics
 * NOTE: sessionRetains and sessionRecalls reflect local Node.js session telemetry.
 * Hindsight Cloud itself manages persistent cognitive memory.
 */
export function getMemoryStats() {
  const config = getHindsightConfig();
  return {
    configured: config.configured,
    bank: "ResolveAI Production Memory",
    sessionRetains: sessionTelemetry.retains.length,
    sessionRecalls: sessionTelemetry.recalls.length,
    totalRetains: sessionTelemetry.retains.length,
    totalRecalls: sessionTelemetry.recalls.length,
    recentRetains: sessionTelemetry.retains.slice(0, 10),
    recentRecalls: sessionTelemetry.recalls.slice(0, 10),
    storageType: "persistent-cloud",
    persistenceNotice: "Hindsight Cloud provides persistent incident memory. Session counters shown here are local application telemetry and reset when the backend restarts."
  };
}

/**
 * Internal helper to sanitize any provider error message
 */
function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== "string") return "Upstream memory provider error";
  return msg
    .replace(/hsk_[a-zA-Z0-9_-]+/g, "hsk_***")
    .replace(/gsk_[a-zA-Z0-9_-]+/g, "gsk_***")
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer ***");
}
