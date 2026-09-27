import React, { useState } from "react";
import { X, Plus, Brain, AlertCircle } from "lucide-react";

export default function NewIncidentModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    service: "Payment Service",
    severity: "High",
    symptoms: "",
    rootCause: "",
    resolution: "",
    outcome: "",
    deployment: "v2.15.0 (#a1b2c3)",
    retainNow: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.service) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={20} color="var(--accent-blue)" />
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Record Production Incident</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Incident Title *
            </label>
            <input 
              type="text" 
              className="chat-input"
              style={{ width: "100%" }}
              placeholder="e.g. Checkout gateway HTTP 500 error spikes"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                Affected Service *
              </label>
              <input 
                type="text" 
                className="chat-input"
                style={{ width: "100%" }}
                placeholder="e.g. Payment Service"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                Severity
              </label>
              <select 
                className="chat-input"
                style={{ width: "100%", background: "var(--bg-primary)" }}
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Symptoms & Behavior
            </label>
            <textarea 
              className="chat-input"
              rows={2}
              style={{ width: "100%", resize: "vertical" }}
              placeholder="Describe error codes, metrics spikes, user reports..."
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Identified Root Cause
            </label>
            <textarea 
              className="chat-input"
              rows={2}
              style={{ width: "100%", resize: "vertical" }}
              placeholder="Underlying technical cause (e.g. environment variable misconfiguration)..."
              value={formData.rootCause}
              onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Resolution & Fix
            </label>
            <textarea 
              className="chat-input"
              rows={2}
              style={{ width: "100%", resize: "vertical" }}
              placeholder="Action taken to restore service (e.g. rolled back config, restarted pods)..."
              value={formData.resolution}
              onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
            />
          </div>

          <div style={{
            background: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
            <input 
              type="checkbox" 
              id="retainCheckbox"
              checked={formData.retainNow}
              onChange={(e) => setFormData({ ...formData, retainNow: e.target.checked })}
              style={{ width: "16px", height: "16px", accentColor: "var(--accent-blue)" }}
            />
            <label htmlFor="retainCheckbox" style={{ fontSize: "0.82rem", color: "var(--text-primary)", cursor: "pointer" }}>
              <strong>Retain into Hindsight Cloud</strong>: Save this incident into persistent agent memory for future similarity recall.
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Incident"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
