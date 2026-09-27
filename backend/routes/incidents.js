import express from "express";
import {
  getAllIncidents,
  getIncidentById,
  addIncident,
  updateIncident,
  markRetained,
  getIncidentStats
} from "../services/incidentStore.js";
import { retainIncidentMemory, getHindsightConfig } from "../services/hindsight.js";

const router = express.Router();

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
  const incident = getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: "Incident not found" });
  }

  res.json({ success: true, incident });
});

/**
 * POST /api/incidents
 * Create a new incident and optionally retain it directly to Hindsight
 */
router.post("/", async (req, res) => {
  try {
    const { title, service, severity, symptoms, rootCause, resolution, outcome, deployment, retainNow } = req.body;

    if (!title || !service) {
      return res.status(400).json({
        success: false,
        error: "Title and service are required fields"
      });
    }

    const incident = addIncident({
      title,
      service,
      severity: severity || "High",
      status: resolution ? "Resolved" : "Investigating",
      symptoms,
      rootCause,
      resolution,
      outcome,
      deployment,
      retainedToHindsight: false
    });

    let retainResult = null;
    const hindsightConfig = getHindsightConfig();

    if (retainNow && hindsightConfig.configured) {
      try {
        retainResult = await retainIncidentMemory({ incident });
        markRetained(incident.id);
        incident.retainedToHindsight = true;
      } catch (err) {
        console.warn("[Incidents] Auto-retain warning:", err.message);
        retainResult = { success: false, error: err.message };
      }
    }

    res.status(201).json({
      success: true,
      incident,
      retainResult
    });
  } catch (error) {
    console.error("[Incidents] Create error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/incidents/:id/retain
 * Retain an existing incident explicitly to Hindsight
 */
router.post("/:id/retain", async (req, res) => {
  try {
    const incident = getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: "Incident not found" });
    }

    const retainResult = await retainIncidentMemory({ incident });
    markRetained(incident.id);

    res.json({
      success: true,
      message: `Incident ${incident.id} retained to Hindsight`,
      incidentId: incident.id,
      retainResult
    });
  } catch (error) {
    console.error("[Incidents] Retain error:", error);
    res.status(error.code === "HINDSIGHT_NOT_CONFIGURED" ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/incidents/seed-demo
 * Ensure canonical demo incident exists and retain it to Hindsight if configured
 */
router.post("/seed-demo", async (req, res) => {
  try {
    const demoIncident = {
      title: "Payment API returning HTTP 500 after deployment",
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

    const incident = addIncident(demoIncident);
    let retainResult = null;
    const config = getHindsightConfig();

    if (config.configured) {
      try {
        retainResult = await retainIncidentMemory({ incident });
        markRetained(incident.id);
        incident.retainedToHindsight = true;
      } catch (err) {
        retainResult = { success: false, error: err.message };
      }
    }

    res.json({
      success: true,
      message: "Canonical demo incident seeded",
      incident,
      retainResult,
      hindsightConfigured: config.configured
    });
  } catch (error) {
    console.error("[Incidents] Seed demo error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
