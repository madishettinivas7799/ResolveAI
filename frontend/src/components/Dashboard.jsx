import React from "react";
import { 
  AlertOctagon, 
  CheckCircle2, 
  Brain, 
  Search, 
  ArrowRight, 
  Zap, 
  Clock, 
  ShieldCheck, 
  Terminal, 
  History,
  Sparkles,
  ExternalLink
} from "lucide-react";

export default function Dashboard({ 
  incidents = [], 
  stats = {}, 
  memoryStats = {}, 
  healthData = {}, 
  onLaunchDemo, 
  setActiveTab,
  onOpenIncident 
}) {
  const recentIncidents = incidents.slice(0, 4);

  return (
    <div className="dashboard-view">
      {/* Hero Section */}
      <div className="hero-banner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="hero-title">ResolveAI</h1>
            <p className="hero-subtitle">
              AI Incident Response Agent for software teams.
              <br />
              <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
                Remember incidents. Resolve problems faster.
              </span>
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button className="btn btn-accent" onClick={onLaunchDemo}>
              <Sparkles size={16} />
              Launch Demo Scenario
            </button>
            <button className="btn btn-primary" onClick={() => setActiveTab("assistant")}>
              <Zap size={16} />
              Open Assistant
            </button>
          </div>
        </div>

        {/* Hindsight Status Banner */}
        {!healthData?.hindsight?.connected ? (
          <div style={{
            marginTop: "1.25rem",
            padding: "0.85rem 1.15rem",
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <Clock size={18} color="var(--accent-rose)" />
              <span style={{ fontSize: "0.875rem", color: "#fecdd3" }}>
                <strong>Hindsight Cloud: Disconnected.</strong> Check your <code>HINDSIGHT_API_KEY</code> in <code>backend/.env</code> to connect.
              </span>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab("memory")}
            >
              View Memory Bank
            </button>
          </div>
        ) : (
          <div style={{
            marginTop: "1.25rem",
            padding: "0.65rem 1.15rem",
            background: "rgba(16, 185, 129, 0.06)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <CheckCircle2 size={16} color="var(--accent-emerald)" />
              <span style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>
                <strong style={{ color: "var(--accent-emerald)" }}>Hindsight Cloud: Connected</strong> (Bank: <code>ResolveAI Production Memory</code>). Persistent memory layer active.
              </span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Session counters below track current app session telemetry.
            </span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(244, 63, 94, 0.12)", color: "var(--accent-rose)" }}>
            <AlertOctagon size={26} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total || incidents.length || 0}</span>
            <span className="stat-label">Total Incidents</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--accent-emerald)" }}>
            <CheckCircle2 size={26} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.resolved || 0}</span>
            <span className="stat-label">Resolved Incidents</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(56, 189, 248, 0.12)", color: "var(--accent-blue)" }}>
            <Brain size={26} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {memoryStats?.sessionRetains ?? memoryStats?.totalRetains ?? 0}
            </span>
            <span className="stat-label">Session Retains</span>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              Local session telemetry
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(168, 85, 247, 0.12)", color: "var(--accent-purple)" }}>
            <Search size={26} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {memoryStats?.sessionRecalls ?? memoryStats?.totalRecalls ?? 0}
            </span>
            <span className="stat-label">Session Recalls</span>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              Local session telemetry
            </span>
          </div>
        </div>
      </div>

      {/* Visual Flow Diagram */}
      <div className="flow-diagram-container">
        <div className="flow-title">
          <Brain size={18} color="var(--accent-blue)" />
          How ResolveAI Resolves Recurring Production Incidents
        </div>
        <div className="flow-steps">
          <div className="flow-step">
            <div className="flow-step-icon">
              <AlertOctagon size={18} />
            </div>
            <div className="flow-step-title">1. Incident</div>
            <div className="flow-step-sub">Outage / HTTP 500</div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="flow-step-icon">
              <Zap size={18} />
            </div>
            <div className="flow-step-title">2. ResolveAI</div>
            <div className="flow-step-sub">Parses symptoms</div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step highlight">
            <div className="flow-step-icon" style={{ color: "var(--accent-emerald)" }}>
              <Brain size={18} />
            </div>
            <div className="flow-step-title">3. Hindsight Memory</div>
            <div className="flow-step-sub">Semantic recall query</div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step highlight">
            <div className="flow-step-icon" style={{ color: "var(--accent-blue)" }}>
              <History size={18} />
            </div>
            <div className="flow-step-title">4. Past Incidents</div>
            <div className="flow-step-sub">Prior root cause & fix</div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="flow-step-icon">
              <Sparkles size={18} />
            </div>
            <div className="flow-step-title">5. AI Response</div>
            <div className="flow-step-sub">Evidence-backed plan</div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="flow-step-icon" style={{ color: "var(--accent-emerald)" }}>
              <ShieldCheck size={18} />
            </div>
            <div className="flow-step-title">6. Resolution</div>
            <div className="flow-step-sub">Targeted recovery</div>
          </div>
        </div>
      </div>

      {/* Comparison: With Memory vs Without Memory */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.25rem" }}>
          Incident Resolution Comparison
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Demonstrating the difference between a stateless AI agent and ResolveAI with Hindsight persistent memory.
        </p>
      </div>

      <div className="comparison-container">
        <div className="comparison-box without-memory">
          <div className="comparison-header">
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>WITHOUT MEMORY</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Generic AI / Stateless Agent</p>
            </div>
            <span className="comparison-badge red">Stateless</span>
          </div>
          <ul className="comparison-list">
            <li className="comparison-item">
              <span style={{ color: "var(--accent-rose)" }}>✕</span>
              <span><strong>No context:</strong> Analyzes each recurring incident as if seeing it for the very first time.</span>
            </li>
            <li className="comparison-item">
              <span style={{ color: "var(--accent-rose)" }}>✕</span>
              <span><strong>Generic guidance:</strong> Recommends boilerplate checklists (check disk space, ping endpoints, inspect CPU).</span>
            </li>
            <li className="comparison-item">
              <span style={{ color: "var(--accent-rose)" }}>✕</span>
              <span><strong>Slow resolution:</strong> Developers repeat lengthy manual triage cycles and rediscover known bugs.</span>
            </li>
            <li className="comparison-item">
              <span style={{ color: "var(--accent-rose)" }}>✕</span>
              <span><strong>Tribal knowledge lost:</strong> Previous post-mortem fixes remain buried in stale Slack threads or docs.</span>
            </li>
          </ul>
        </div>

        <div className="comparison-box with-memory">
          <div className="comparison-header">
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>WITH HINDSIGHT MEMORY</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--accent-emerald)" }}>ResolveAI Cognitive Response</p>
            </div>
            <span className="comparison-badge green">Hindsight Enabled</span>
          </div>
          <ul className="comparison-list">
            <li className="comparison-item">
              <span style={{ color: "var(--accent-emerald)" }}>✓</span>
              <span><strong>Instant correlation:</strong> Recognizes that Payment API 500 errors happened during deployment v2.14.0.</span>
            </li>
            <li className="comparison-item">
              <span style={{ color: "var(--accent-emerald)" }}>✓</span>
              <span><strong>Pinpointed hypothesis:</strong> Immediately directs on-call engineers to verify <code>PAYMENT_API_URL</code> environment variable.</span>
            </li>
            <li className="comparison-item">
              <span style={{ color: "var(--accent-emerald)" }}>✓</span>
              <span><strong>Actionable fix:</strong> Proposes exact restoration and pod restart command verified in the previous outage.</span>
            </li>
            <li className="comparison-item">
              <span style={{ color: "var(--accent-emerald)" }}>✓</span>
              <span><strong>Continuous learning:</strong> Retains each new post-incident outcome into Hindsight for perpetual team memory.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Recent Incidents Section */}
      <div style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Recent Incidents</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Production events tracked in ResolveAI
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setActiveTab("incidents")}>
            View All ({incidents.length})
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Incident ID & Title</th>
                <th>Service</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Hindsight Memory</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentIncidents.map((inc) => (
                <tr key={inc.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inc.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {inc.id} • {inc.deployment || "production"}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                      {inc.service}
                    </span>
                  </td>
                  <td>
                    <span className={`severity-pill ${inc.severity.toLowerCase()}`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      color: inc.status === "Resolved" ? "var(--accent-emerald)" : "var(--accent-amber)",
                      fontWeight: 600,
                      fontSize: "0.82rem"
                    }}>
                      ● {inc.status}
                    </span>
                  </td>
                  <td>
                    {inc.retainedToHindsight ? (
                      <span className="retained-badge">
                        <CheckCircle2 size={12} /> Stored in Memory
                      </span>
                    ) : inc.retainFailed ? (
                      <span className="retained-badge error" style={{ background: "rgba(244, 63, 94, 0.12)", color: "var(--accent-rose)", border: "1px solid rgba(244, 63, 94, 0.3)" }}>
                        Retention failed
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Not retained
                      </span>
                    )}
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenIncident(inc)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
