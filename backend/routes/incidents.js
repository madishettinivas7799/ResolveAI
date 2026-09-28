import express from "express";
import {
  getAllIncidents,
  getIncidentById,
  findIncident,
  addIncident,
  updateIncident,
  markRetained,
  getIncidentStats
} from "../services/incidentStore.js";
import { retainIncidentMemory, getHindsightConfig } from "../services/hindsight.js";
import { isPlainObject, isValidId, validationError } from "../utils/validation.js";
import { asyncHandler } from "../utils/asyncUtils.js";

const router = express.Router();

// In-flight concurrency locks to prevent race conditions during simultaneous requests
const inFlightRetains = new Map();
let inFlightSeedDemo = null;

/**
 * GET /api/incidents
 * List all recorded incidents with summary metrics
 */
router.get("/", (req, res) => {
  const incidents = getAllIncidents();
  const stats = getIncidentStats();

  res.json({
    success: true,
    stats,
    count: incidents.length,
    incidents
  });
});

/**
 * GET /api/incidents/:id
 * Retrieve a specific incident
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;

  if (!id || typeof id !== "string" || !isValidId(id)) {
    return validationError(res, "Invalid incident ID");
  }

  const incident = getIncidentById(id.trim());
  if (!incident) {
    return res.status(404).json({
      success: false,
      error: "Incident not found",
      code: "INCIDENT_NOT_FOUND"
    });
  }

  res.json({ success: true, incident });
});

/**
 * POST /api/incidents
 * Create a new incident with input validation and optionally retain it directly to Hindsight
 */
router.post("/", asyncHandler(async (req, res) => {
  if (!isPlainObject(req.body)) {
    return validationError(res, "Request body must be a JSON object");
  }

  const { title, service, severity, status, symptoms, rootCause, resolution, outcome, deployment, environment, retainNow } = req.body;

  // Validate title
  if (title === undefined || title === null) {
    return validationError(res, "Incident title is required");
  }
  if (typeof title !== "string") {
    return validationError(res, "Incident title must be a string");
  }
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return validationError(res, "Incident title is required");
  }
  if (trimmedTitle.length > 200) {
    return validationError(res, "Incident title must not exceed 200 characters");
  }

  // Validate service
  if (service === undefined || service === null) {
    return validationError(res, "Service name is required");
  }
  if (typeof service !== "string") {
    return validationError(res, "Service name must be a string");
  }
  const trimmedService = service.trim();
  if (!trimmedService) {
    return validationError(res, "Service name is required");
  }
  if (trimmedService.length > 100) {
    return validationError(res, "Service name must not exceed 100 characters");
  }

  // Validate severity enum
  let normalizedSeverity = "High";
  if (severity !== undefined && severity !== null) {
    if (typeof severity !== "string") {
      return validationError(res, "Severity must be a string");
    }
    const allowedSeverities = ["critical", "high", "medium", "low"];
    const lowerSev = severity.trim().toLowerCase();
    if (!allowedSeverities.includes(lowerSev)) {
      return validationError(res, "Invalid severity level. Allowed values: Critical, High, Medium, Low");
    }
    normalizedSeverity = lowerSev.charAt(0).toUpperCase() + lowerSev.slice(1);
  }

  // Validate status enum
  let normalizedStatus = resolution ? "Resolved" : "Investigating";
  if (status !== undefined && status !== null) {
    if (typeof status !== "string") {
      return validationError(res, "Status must be a string");
    }
    const allowedStatuses = ["open", "investigating", "identified", "monitoring", "resolved"];
    const lowerStat = status.trim().toLowerCase();
    if (!allowedStatuses.includes(lowerStat)) {
      return validationError(res, "Invalid status. Allowed values: Open, Investigating, Identified, Monitoring, Resolved");
    }
    normalizedStatus = lowerStat.charAt(0).toUpperCase() + lowerStat.slice(1);
  }

  // Validate optional string fields & limits
  const optionalStringFields = [
    { name: "symptoms", val: symptoms, max: 2000 },
    { name: "rootCause", val: rootCause, max: 2000 },
    { name: "resolution", val: resolution, max: 2000 },
    { name: "outcome", val: outcome, max: 1000 },
    { name: "deployment", val: deployment, max: 100 },
    { name: "environment", val: environment, max: 50 }
  ];

  for (const field of optionalStringFields) {
    if (field.val !== undefined && field.val !== null) {
      if (typeof field.val !== "string") {
        return validationError(res, `Field '${field.name}' must be a string`);
      }
      if (field.val.length > field.max) {
        return validationError(res, `Field '${field.name}' must not exceed ${field.max} characters`);
      }
    }
  }

  // Validate retainNow
  if (retainNow !== undefined && retainNow !== null && typeof retainNow !== "boolean") {
    return validationError(res, "Field 'retainNow' must be a boolean");
  }

  const incident = addIncident({
    title: trimmedTitle,
    service: trimmedService,
    severity: normalizedSeverity,
    status: normalizedStatus,
    symptoms: symptoms ? symptoms.trim() : "",
    rootCause: rootCause ? rootCause.trim() : "",
    resolution: resolution ? resolution.trim() : "",
    outcome: outcome ? outcome.trim() : "",
    deployment: deployment ? deployment.trim() : "production",
    environment: environment ? environment.trim() : "production",
    retainedToHindsight: false
  });

  let retainResult = null;
  let retainError = null;
  const hindsightConfig = getHindsightConfig();

  if (retainNow) {
    if (hindsightConfig.configured) {
      try {
        retainResult = await retainIncidentMemory({ incident });
        const updated = markRetained(incident.id);
        if (updated) {
          incident.retainedToHindsight = true;
          incident.retainFailed = false;
          incident.retainError = null;
        }
      } catch (err) {
        console.warn("[Incidents] Auto-retain warning:", err.message || err);
        retainError = err.message || "Failed to retain incident in Hindsight";
        updateIncident(incident.id, {
          retainedToHindsight: false,
          retainFailed: true,
          retainError
        });
        incident.retainedToHindsight = false;
        incident.retainFailed = true;
        incident.retainError = retainError;
      }
    } else {
      retainError = "Hindsight is not configured";
      updateIncident(incident.id, {
        retainedToHindsight: false,
        retainFailed: true,
        retainError
      });
      incident.retainedToHindsight = false;
      incident.retainFailed = true;
      incident.retainError = retainError;
    }
  }

  res.status(201).json({
    success: true,
    incident,
    retained: Boolean(incident.retainedToHindsight),
    retainResult,
    retainError
  });
}));

/**
 * POST /api/incidents/:id/retain
 * Retain an existing incident explicitly to Hindsight.
 * Only marks incident retained AFTER Hindsight retain operation actually succeeds.
 * Includes concurrency protection against duplicate simultaneous clicks.
 */
router.post("/:id/retain", asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Incident ID validation
  if (!id || typeof id !== "string" || !isValidId(id)) {
    return validationError(res, "Invalid incident ID");
  }

  const incident = getIncidentById(id.trim());
  if (!incident) {
    return res.status(404).json({
      success: false,
      retained: false,
      error: "Incident not found",
      code: "INCIDENT_NOT_FOUND"
    });
  }

  // 2. Duplicate retention check (idempotent)
  if (incident.retainedToHindsight) {
    return res.json({
      success: true,
      incident,
      retained: true,
      alreadyRetained: true,
      message: "Incident is already retained in Hindsight"
    });
  }

  // 3. Concurrency guard: if retain is already in-flight for this incident, await existing promise
  if (inFlightRetains.has(incident.id)) {
    try {
      const result = await inFlightRetains.get(incident.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      return res.status(500).json({
        success: false,
        retained: false,
        error: err.message || "Retention failed",
        code: "HINDSIGHT_RETAIN_FAILED"
      });
    }
  }

  // 4. Hindsight configuration check
  const config = getHindsightConfig();
  if (!config.configured) {
    updateIncident(incident.id, {
      retainedToHindsight: false,
      retainFailed: true,
      retainError: "Hindsight is not configured"
    });
    return res.status(503).json({
      success: false,
      retained: false,
      error: "Hindsight is not configured. Please set HINDSIGHT_API_KEY in backend/.env.",
      code: "HINDSIGHT_NOT_CONFIGURED"
    });
  }

  // 5. Execute retain with concurrency protection
  const retainOperation = (async () => {
    try {
      const retainResult = await retainIncidentMemory({ incident });
      const updatedIncident = markRetained(incident.id);

      return {
        status: 200,
        data: {
          success: true,
          incident: updatedIncident || incident,
          retained: true,
          message: "Incident retained in Hindsight successfully",
          retainResult
        }
      };
    } catch (error) {
      console.error(`[Incidents] Retain error for ${incident.id}:`, error.message || error);
      updateIncident(incident.id, {
        retainedToHindsight: false,
        retainFailed: true,
        retainError: error.message || "Failed to retain incident in Hindsight"
      });

      const statusCode = error.code === "HINDSIGHT_NOT_CONFIGURED" ? 503 : (error.status || 500);
      return {
        status: statusCode,
        data: {
          success: false,
          retained: false,
          error: error.message || "Unable to retain incident in Hindsight",
          code: error.code || "HINDSIGHT_RETAIN_FAILED"
        }
      };
    }
  })();

  inFlightRetains.set(incident.id, retainOperation);
  try {
    const result = await retainOperation;
    return res.status(result.status).json(result.data);
  } finally {
    inFlightRetains.delete(incident.id);
  }
}));

/**
 * POST /api/incidents/seed-demo
 * Ensure canonical demo incident exists idempotently and retain it to Hindsight if configured.
 * Does NOT create duplicate demo incidents or duplicate Hindsight memories.
 * Includes concurrency lock against simultaneous requests.
 */
router.post("/seed-demo", asyncHandler(async (req, res) => {
  // Validate request body if provided
  if (req.body && Object.keys(req.body).length > 0 && !isPlainObject(req.body)) {
    return validationError(res, "Request body must be a JSON object");
  }

  // Concurrency guard: await in-flight seed operation if one is already running
  if (inFlightSeedDemo) {
    try {
      const result = await inFlightSeedDemo;
      return res.status(result.status).json(result.data);
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message || "Seed failed" });
    }
  }

  const seedOperation = (async () => {
    const demoTitle = "Payment API returning HTTP 500 after deployment";
    
    // Check if canonical demo incident already exists
    let incident = findIncident(
      (inc) => inc.id === "INC-1001" || inc.title.toLowerCase().includes("payment api returning http 500")
    );

    let createdNew = false;
    if (!incident) {
      const demoIncidentData = {
        title: demoTitle,
        service: "Payment Service",
        severity: "High",
        status: "Resolved",
        symptoms: "Payment requests fail with HTTP 500; Checkout is unavailable; Error started immediately after deployment",
        rootCause: "Incorrect PAYMENT_API_URL environment variable",
        resolution: "Restore the correct environment variable and restart the payment service.",
        outcome: "Payment service recovered successfully.",
        deployment: "v2.14.0 (#8fa2b41)",
        environment: "production"
      };
      incident = addIncident(demoIncidentData);
      createdNew = true;
    }

    const config = getHindsightConfig();
    let retainResult = null;
    let retainError = null;

    // Idempotent Hindsight retention: only retain if not already stored
    if (incident.retainedToHindsight) {
      return {
        status: 200,
        data: {
          success: true,
          message: "Canonical demo incident already exists and is retained in Hindsight",
          incident,
          retained: true,
          alreadyRetained: true,
          createdNew: false,
          hindsightConfigured: config.configured
        }
      };
    }

    if (config.configured) {
      try {
        retainResult = await retainIncidentMemory({ incident });
        markRetained(incident.id);
        incident.retainedToHindsight = true;
        incident.retainFailed = false;
        incident.retainError = null;
      } catch (err) {
        console.warn("[Incidents] Seed demo retain error:", err.message || err);
        retainError = err.message || "Failed to retain demo incident";
        incident.retainedToHindsight = false;
        incident.retainFailed = true;
        incident.retainError = retainError;
        updateIncident(incident.id, {
          retainedToHindsight: false,
          retainFailed: true,
          retainError
        });
      }
    } else {
      retainError = "Hindsight is not configured";
      incident.retainedToHindsight = false;
      incident.retainFailed = true;
      incident.retainError = retainError;
      updateIncident(incident.id, {
        retainedToHindsight: false,
        retainFailed: true,
        retainError
      });
    }

    return {
      status: 200,
      data: {
        success: true,
        message: createdNew ? "Canonical demo incident created" : "Canonical demo incident verified",
        incident,
        retained: Boolean(incident.retainedToHindsight),
        alreadyRetained: false,
        createdNew,
        retainResult,
        retainError,
        hindsightConfigured: config.configured
      }
    };
  })();

  inFlightSeedDemo = seedOperation;
  try {
    const result = await seedOperation;
    return res.status(result.status).json(result.data);
  } finally {
    inFlightSeedDemo = null;
  }
}));

export default router;
