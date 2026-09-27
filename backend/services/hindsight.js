import { HindsightClient } from "@vectorize-io/hindsight-client";

// In-memory memory audit log for telemetry and statistics
const memoryAuditLog = {
  retains: [],
  recalls: []
};

let hindsightClientInstance = null;

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
      const res = await fetch(`${baseUrl}/v1/default/banks`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.banks && data.banks.length > 0) {
          resolvedBankId = data.banks[0].bank_id;
          console.log(`[Hindsight] Auto-selected authorized bank: ${resolvedBankId}`);
          return resolvedBankId;
        }
      }
    } catch (e) {
      console.warn("[Hindsight] Auto-bank discovery failed:", e.message);
    }
  }

  resolvedBankId = envBank || "resolveai";
  return resolvedBankId;
}

export function getHindsightConfig() {
  const apiKey = process.env.HINDSIGHT_API_KEY?.trim();
  const baseUrl = process.env.HINDSIGHT_BASE_URL?.trim() || "https://api.hindsight.vectorize.io";
  const bankId = resolvedBankId || process.env.HINDSIGHT_BANK_ID?.trim() || "resolveai";

  return {
    configured: Boolean(apiKey && apiKey.length > 5),
    baseUrl,
    bankId
  };
}

/**
 * Health check for Hindsight Cloud
 */
export async function checkHindsightHealth() {
  const config = getHindsightConfig();

  if (!config.configured) {
    return {
      configured: false,
      connected: false,
      bankId: config.bankId,
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
        bankId: config.bankId,
        message: "Hindsight client initialization failed"
      };
    }

    // Ping version endpoint
    const version = await client.getVersion();
    return {
      configured: true,
      connected: true,
      bankId: config.bankId,
      version: version.api_version || "connected",
      message: "Successfully connected to Hindsight Cloud"
    };
  } catch (error) {
    console.error("[Hindsight] Health check error:", error.message || error);
    return {
      configured: true,
      connected: false,
      bankId: config.bankId,
      error: error.message || "Failed to connect to Hindsight Cloud",
      message: "API key is set, but could not reach Hindsight endpoint."
    };
  }
}

/**
 * Retain an incident memory into Hindsight
 */
export async function retainIncidentMemory({ incident, customText = null }) {
  const config = getHindsightConfig();

  if (!config.configured) {
    const err = new Error("Hindsight is not configured. Please set HINDSIGHT_API_KEY in backend/.env.");
    err.code = "HINDSIGHT_NOT_CONFIGURED";
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
    const response = await client.retain(bankId, content, {
      timestamp: incident.timestamp ? new Date(incident.timestamp) : new Date(),
      context: `ResolveAI Incident Response for ${incident.service || "service"}`,
      metadata,
      tags
    });

    const record = {
      id: `mem-${Date.now()}`,
      bankId,
      incidentId: incident.id,
      title: incident.title,
      service: incident.service,
      content,
      rootCause: incident.rootCause,
      resolution: incident.resolution,
      retainedAt: new Date().toISOString(),
      hindsightResponse: response
    };

    memoryAuditLog.retains.unshift(record);
    if (memoryAuditLog.retains.length > 50) memoryAuditLog.retains.pop();

    return {
      success: true,
      bankId,
      itemsCount: response?.items_count ?? 1,
      memory: record
    };
  } catch (error) {
    console.error("[Hindsight] Retain error:", error.message || error);
    throw error;
  }
}

/**
 * Recall memories using a natural language query
 */
export async function recallIncidentMemories({ query, budget = "mid", maxTokens = 4096, tags = null }) {
  const config = getHindsightConfig();

  if (!config.configured) {
    return {
      configured: false,
      results: [],
      count: 0,
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

    const response = await client.recall(bankId, query, options);

    const results = (response?.results || []).map((item) => ({
      id: item.id,
      text: item.text,
      type: item.type || "memory",
      context: item.context,
      metadata: item.metadata || {},
      tags: item.tags || [],
      scores: item.scores || null
    }));

    memoryAuditLog.recalls.unshift({
      query,
      timestamp: new Date().toISOString(),
      matchCount: results.length
    });
    if (memoryAuditLog.recalls.length > 50) memoryAuditLog.recalls.pop();

    return {
      configured: true,
      success: true,
      bankId,
      query,
      results,
      count: results.length
    };
  } catch (error) {
    console.error("[Hindsight] Recall error:", error.message || error);
    return {
      configured: true,
      success: false,
      error: error.message || "Recall query failed",
      results: [],
      count: 0
    };
  }
}

/**
 * Get memory statistics
 */
export function getMemoryStats() {
  const config = getHindsightConfig();
  return {
    configured: config.configured,
    bankId: config.bankId,
    totalRetains: memoryAuditLog.retains.length,
    totalRecalls: memoryAuditLog.recalls.length,
    recentRetains: memoryAuditLog.retains.slice(0, 10),
    recentRecalls: memoryAuditLog.recalls.slice(0, 10)
  };
}
