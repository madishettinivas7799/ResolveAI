// In-memory Incident Storage with realistic synthetic incidents for ResolveAI

let incidents = [
  {
    id: "INC-1001",
    title: "Payment API returning HTTP 500 after deployment",
    service: "Payment Service",
    severity: "High",
    status: "Resolved",
    symptoms: "Payment requests fail with HTTP 500; Checkout is completely unavailable; Began immediately post-deployment of v2.14.0",
    rootCause: "Incorrect PAYMENT_API_URL environment variable in production config map",
    resolution: "Restored correct PAYMENT_API_URL in production secrets and restarted payment-api deployment pods",
    outcome: "Payment API recovered within 3 minutes; checkout error rate returned to 0%",
    deployment: "v2.14.0 (#8fa2b41)",
    environment: "production",
    retainedToHindsight: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 18).toISOString()
  },
  {
    id: "INC-1002",
    title: "Auth Service Redis session cache connection pool exhaustion",
    service: "Auth Service",
    severity: "Critical",
    status: "Resolved",
    symptoms: "User login latency spiked to >12s; Session validation requests timing out with ECONNRESET",
    rootCause: "Redis client maxConnections was set to 50 instead of 500 following cluster autoscaling event",
    resolution: "Updated REDIS_MAX_POOL_SIZE to 500 and enabled connection keep-alive timeout of 30s",
    outcome: "Redis connection spikes stabilized; auth latency dropped back to 18ms",
    deployment: "v1.9.2 (#4b11e9)",
    environment: "production",
    retainedToHindsight: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 35).toISOString()
  },
  {
    id: "INC-1003",
    title: "Notification worker memory leak during batch email campaigns",
    service: "Notification Service",
    severity: "Medium",
    status: "Resolved",
    symptoms: "Worker pods restarting due to OOMKilled every 45 minutes during 100k+ subscriber newsletter sends",
    rootCause: "Unbounded template compilation cache in memory without LRU eviction policy",
    resolution: "Added LRU cache max size 250 items and switched to streaming template rendering",
    outcome: "Memory consumption plateaued at 240MB; 0 OOM restarts observed",
    deployment: "v3.0.4 (#c399a0)",
    environment: "production",
    retainedToHindsight: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12 + 1000 * 60 * 50).toISOString()
  }
];

export function getAllIncidents() {
  return [...incidents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getIncidentById(id) {
  return incidents.find((inc) => inc.id === id) || null;
}

export function addIncident(data) {
  const newIncident = {
    id: `INC-${1000 + incidents.length + 1}`,
    title: data.title || "Untitled Incident",
    service: data.service || "General",
    severity: data.severity || "Medium",
    status: data.status || "Open",
    symptoms: data.symptoms || "",
    rootCause: data.rootCause || "",
    resolution: data.resolution || "",
    outcome: data.outcome || "",
    deployment: data.deployment || "production",
    environment: data.environment || "production",
    retainedToHindsight: Boolean(data.retainedToHindsight),
    createdAt: new Date().toISOString(),
    resolvedAt: data.status === "Resolved" ? new Date().toISOString() : null
  };

  incidents.unshift(newIncident);
  return newIncident;
}

export function updateIncident(id, updates) {
  const index = incidents.findIndex((inc) => inc.id === id);
  if (index === -1) return null;

  incidents[index] = {
    ...incidents[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (updates.status === "Resolved" && !incidents[index].resolvedAt) {
    incidents[index].resolvedAt = new Date().toISOString();
  }

  return incidents[index];
}

export function markRetained(id) {
  return updateIncident(id, { retainedToHindsight: true });
}

export function getIncidentStats() {
  const total = incidents.length;
  const resolved = incidents.filter((i) => i.status === "Resolved").length;
  const retained = incidents.filter((i) => i.retainedToHindsight).length;

  return {
    total,
    resolved,
    open: total - resolved,
    retained
  };
}
