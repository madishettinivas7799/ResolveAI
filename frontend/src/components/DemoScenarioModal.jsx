import React, { useState } from "react";
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  BrainCircuit, 
  ArrowRight, 
  Database, 
  Send 
} from "lucide-react";

export default function DemoScenarioModal({ 
  isOpen, 
  onClose, 
  onExecuteDemo, 
  healthData 
}) {
  const [step, setStep] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [retainedData, setRetainedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleStep1Retain = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/incidents/seed-demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success || !data.incident?.retainedToHindsight) {
        setErrorMsg(data.error || data.retainError || "Failed to retain incident in Hindsight");
        return;
      }
      setRetainedData(data);
      setStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to retain incident in Hindsight");
    } finally {
      setIsRunning(false);
    }
  };

  const handleStep2Recall = () => {
    onClose();
    onExecuteDemo("Payment API is returning HTTP 500 after a deployment. What should I check?");
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "650px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Sparkles size={20} color="var(--accent-purple)" />
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
              Launch Canonical Demo Scenario
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
          This guided demo simulates an end-to-end incident lifecycle using Hindsight persistent memory:
        </p>

        {/* Step Indicator */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid",
            borderColor: step === 1 ? "var(--accent-blue)" : "var(--border-color)",
            background: step === 1 ? "rgba(56, 189, 248, 0.08)" : "var(--bg-primary)"
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: step === 1 ? "var(--accent-blue)" : "var(--text-muted)" }}>
              STEP 1: RETAIN
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: "0.2rem" }}>
              Store Previous Incident
            </div>
          </div>

          <div style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid",
            borderColor: step === 2 ? "var(--accent-emerald)" : "var(--border-color)",
            background: step === 2 ? "rgba(16, 185, 129, 0.08)" : "var(--bg-primary)"
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: step === 2 ? "var(--accent-emerald)" : "var(--text-muted)" }}>
              STEP 2: RECALL & RESOLVE
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: "0.2rem" }}>
              Query AI with Memory
            </div>
          </div>
        </div>

        {step === 1 ? (
          <div>
            <div style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "1rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              marginBottom: "1.25rem",
              lineHeight: 1.6
            }}>
              <div style={{ color: "var(--accent-blue)", fontWeight: 700 }}>
                TITLE: Payment API returning HTTP 500 after deployment
              </div>
              <div>SERVICE: Payment Service | SEVERITY: High</div>
              <div style={{ color: "var(--accent-amber)" }}>
                ROOT CAUSE: Incorrect PAYMENT_API_URL environment variable
              </div>
              <div style={{ color: "var(--accent-emerald)" }}>
                RESOLUTION: Restore the correct environment variable and restart the payment service.
              </div>
              <div>OUTCOME: Payment service recovered successfully.</div>
            </div>

            {errorMsg && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.8rem",
                marginBottom: "1rem"
              }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleStep1Retain}
                disabled={isRunning}
              >
                <Database size={16} />
                {isRunning ? "Retaining into Hindsight..." : "1. Retain Incident to Hindsight"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "var(--radius-md)",
              padding: "1rem",
              marginBottom: "1.25rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-emerald)", fontWeight: 700, marginBottom: "0.5rem" }}>
                <CheckCircle2 size={16} />
                Incident Knowledge Successfully Retained!
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Hindsight now holds this cognitive memory in bank <code>{healthData?.hindsight?.bankId || "resolveai"}</code>.
              </p>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Next, simulate a developer asking:
            </p>

            <div style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#38bdf8",
              marginBottom: "1.25rem"
            }}>
              "Payment API is returning HTTP 500 after a deployment. What should I check?"
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>
                Back
              </button>
              <button 
                className="btn btn-accent"
                onClick={handleStep2Recall}
              >
                <Sparkles size={16} />
                2. Ask AI Assistant (Trigger Recall)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
