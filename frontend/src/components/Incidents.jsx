import React, { useState } from "react";
import { 
  Plus, 
  Brain, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Calendar, 
  Cpu, 
  Tag, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from "lucide-react";

export default function Incidents({ 
  incidents = [], 
  onRetainIncident, 
  onAddNewIncident, 
  onInspectIncident,
  healthData 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [isRetainingId, setIsRetainingId] = useState(null);

  const filtered = incidents.filter((inc) => {
    const matchesSearch = 
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.rootCause && inc.rootCause.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSeverity = filterSeverity === "all" || inc.severity.toLowerCase() === filterSeverity.toLowerCase();

    return matchesSearch && matchesSeverity;
  });

  const handleRetain = async (incident) => {
    setIsRetainingId(incident.id);
    try {
      await onRetainIncident(incident);
    } finally {
      setIsRetainingId(null);
    }
  };

  return (
    <div className="incidents-view">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Production Incidents
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Audit log of production outages and verified post-mortems retained to Hindsight.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onAddNewIncident}>
          <Plus size={16} />
          Report Incident
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        marginBottom: "1.25rem",
        flexWrap: "wrap"
      }}>
        <div style={{ position: "relative", minWidth: "280px", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "11px", color: "var(--text-muted)" }} />
          <input 
            type="text"
            className="chat-input"
            style={{ paddingLeft: "2.3rem", width: "100%" }}
            placeholder="Search by title, service, or root cause..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {["all", "critical", "high", "medium"].map((sev) => (
            <button
              key={sev}
              className={`btn btn-sm ${filterSeverity === sev ? "btn-secondary" : "btn-outline"}`}
              style={{ textTransform: "capitalize" }}
              onClick={() => setFilterSeverity(sev)}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Incident Details</th>
              <th>Service & Env</th>
              <th>Severity</th>
              <th>Root Cause & Resolution</th>
              <th>Hindsight Memory</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  No incidents found matching your query.
                </td>
              </tr>
            ) : (
              filtered.map((inc) => (
                <tr key={inc.id}>
                  <td style={{ maxWidth: "280px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inc.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>{inc.id}</span>
                      {" • "}
                      <span>{new Date(inc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{inc.service}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {inc.deployment || "v1.0"}
                    </div>
                  </td>

                  <td>
                    <span className={`severity-pill ${inc.severity.toLowerCase()}`}>
                      {inc.severity}
                    </span>
                  </td>

                  <td style={{ maxWidth: "340px" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                      <strong style={{ color: "#e2e8f0" }}>Cause:</strong> {inc.rootCause || "Under investigation"}
                    </div>
                    {inc.resolution && (
                      <div style={{ fontSize: "0.78rem", color: "var(--accent-emerald)" }}>
                        <strong>Fix:</strong> {inc.resolution}
                      </div>
                    )}
                  </td>

                  <td>
                    {inc.retainedToHindsight ? (
                      <span className="retained-badge">
                        <CheckCircle2 size={12} /> Stored in Memory
                      </span>
                    ) : (
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={isRetainingId === inc.id}
                        onClick={() => handleRetain(inc)}
                        title="Store this incident in Hindsight persistent memory"
                      >
                        <Brain size={14} />
                        {isRetainingId === inc.id ? "Retaining..." : "Retain"}
                      </button>
                    )}
                  </td>

                  <td>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onInspectIncident(inc)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
