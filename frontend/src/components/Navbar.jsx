import React from "react";
import { 
  ShieldAlert, 
  Cpu, 
  BrainCircuit, 
  Database, 
  ListOrdered, 
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  healthData, 
  onLaunchDemo 
}) {
  const hindsightConnected = healthData?.hindsight?.connected;
  const hindsightConfigured = healthData?.hindsight?.configured;
  const groqConfigured = healthData?.groq?.configured;

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => setActiveTab("dashboard")}>
        <div className="brand-icon-box">
          <BrainCircuit size={22} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="brand-title">ResolveAI</span>
            <span className="brand-tag">Hindsight Agent</span>
          </div>
        </div>
      </div>

      <div className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <Cpu size={16} />
          Dashboard
        </button>

        <button 
          className={`nav-tab ${activeTab === "assistant" ? "active" : ""}`}
          onClick={() => setActiveTab("assistant")}
        >
          <Sparkles size={16} />
          AI Assistant
        </button>

        <button 
          className={`nav-tab ${activeTab === "incidents" ? "active" : ""}`}
          onClick={() => setActiveTab("incidents")}
        >
          <ListOrdered size={16} />
          Incidents
        </button>

        <button 
          className={`nav-tab ${activeTab === "memory" ? "active" : ""}`}
          onClick={() => setActiveTab("memory")}
        >
          <Database size={16} />
          Memory Bank
        </button>
      </div>

      <div className="nav-actions">
        {/* Hindsight Status */}
        <div 
          className={`status-pill ${hindsightConnected ? "connected" : "missing"}`}
          title={healthData?.hindsight?.message || "Hindsight Cloud Memory Status"}
        >
          <span className={`status-dot ${hindsightConnected ? "green" : "red"}`}></span>
          <span>
            {hindsightConnected 
              ? "Hindsight Cloud: Connected" 
              : "Hindsight Cloud: Disconnected"}
          </span>
        </div>

        {/* Launch Demo Scenario Button */}
        <button 
          className="btn btn-accent btn-sm"
          onClick={onLaunchDemo}
          title="Launch the Payment API HTTP 500 Canonical Scenario"
        >
          <Sparkles size={14} />
          Launch Demo Scenario
        </button>
      </div>
    </nav>
  );
}
