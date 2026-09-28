import React, { useState } from "react";
import { X, Brain, CheckCircle2, AlertOctagon, Terminal, Calendar, ExternalLink } from "lucide-react";

export default function IncidentDetailModal({ incident, isOpen, onClose, onRetain }) {
  const [isRetaining, setIsRetaining] = useState(false);

  if (!isOpen || !incident) return null;

  const handleRetain = async () => {
    setIsRetaining(true);
    try {
      await onRetain(incident);
    } finally {
      setIsRetaining(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "680px" }}>
        <div className="modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span className={`severity-pill ${incident.severity.toLowerCase()}`}>
                {incident.severity}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {incident.id}
              </span>
            </div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "0.35rem" }}>
              {incident.title}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {/* Metadata row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
            background: "var(--bg-primary)",
            padding: "0.85rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            fontSize: "0.82rem"
          }}>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>Service</span>
              <strong style={{ color: "var(--text-primary)" }}>{incident.service}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>Status</span>
              <strong style={{ color: incident.status === "Resolved" ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
                {incident.status}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>Deployment</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {incident.deployment || "production"}
              </span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block" }}>Date</span>
              <span>{new Date(incident.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
              Symptoms
            </h3>
            <div style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              color: "#cbd5e1"
            }}>
              {incident.symptoms || "No symptoms logged"}
            </div>
          </div>

          {/* Root cause */}
          <div>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-amber)", marginBottom: "0.4rem" }}>
              Root Cause
            </h3>
            <div style={{
              background: "rgba(245, 158, 11, 0.06)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              color: "#fef3c7"
            }}>
              {incident.rootCause || "Under investigation"}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-emerald)", marginBottom: "0.4rem" }}>
              Resolution & Outcome
            </h3>
            <div style={{
              background: "rgba(16, 185, 129, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              color: "#d1fae5"
            }}>
              <div><strong>Fix:</strong> {incident.resolution || "Pending resolution"}</div>
              {incident.outcome && (
                <div style={{ marginTop: "0.35rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  <strong>Outcome:</strong> {incident.outcome}
                </div>
              )}
            </div>
          </div>

          {/* Hindsight Status Banner */}
          <div style={{
            background: incident.retainedToHindsight ? "rgba(16, 185, 129, 0.1)" : incident.retainFailed ? "rgba(244, 63, 94, 0.1)" : "var(--bg-primary)",
            border: "1px solid",
            borderColor: incident.retainedToHindsight ? "rgba(16, 185, 129, 0.3)" : incident.retainFailed ? "rgba(244, 63, 94, 0.3)" : "var(--border-color)",
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Brain size={18} color={incident.retainedToHindsight ? "var(--accent-emerald)" : incident.retainFailed ? "var(--accent-rose)" : "var(--text-muted)"} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                {incident.retainedToHindsight 
                  ? "Retained in Hindsight Memory Bank" 
                  : incident.retainFailed
                    ? `Retention failed: ${incident.retainError || "Hindsight unavailable"}`
                    : "Not yet retained in Hindsight"}
              </span>
            </div>

            {!incident.retainedToHindsight && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleRetain}
                disabled={isRetaining}
              >
                {isRetaining ? "Retaining..." : incident.retainFailed ? "Retry Retain" : "Retain into Memory"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
