import React, { useState } from "react";
import { 
  Database, 
  Search, 
  BrainCircuit, 
  CheckCircle2, 
  Clock, 
  Key, 
  Server, 
  Layers, 
  Info,
  AlertTriangle,
  RotateCcw
} from "lucide-react";

export default function MemoryBank({ healthData, memoryStats, onRefreshStats }) {
  const [searchQuery, setSearchQuery] = useState("Payment API HTTP 500 after deployment");
  const [isRecalling, setIsRecalling] = useState(false);
  const [recallResults, setRecallResults] = useState(null);
  const [recallError, setRecallError] = useState(null);

  const isConnected = Boolean(healthData?.hindsight?.connected);
  const isConfigured = Boolean(healthData?.hindsight?.configured);
  const bankLabel = "ResolveAI Production Memory";

  const handleTestRecall = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setRecallError("Please enter a query to recall from Hindsight.");
      return;
    }

    setIsRecalling(true);
    setRecallError(null);
    setRecallResults(null);

    try {
      const res = await fetch("/api/memory/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, budget: "mid" })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setRecallResults({
          ...data,
          query
        });
      } else {
        setRecallError(data.error || "Hindsight recall unavailable.");
      }
    } catch (err) {
      setRecallError("Hindsight recall unavailable. Could not connect to memory service.");
    } finally {
      setIsRecalling(false);
      if (onRefreshStats) onRefreshStats();
    }
  };

  return (
    <div className="memory-bank-view">
      {/* Header Banner */}
      <div className="hero-banner" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span className="brand-tag">Powered by Hindsight</span>
              <span style={{ fontSize: "0.8rem", color: "var(--accent-blue)" }}>Official Semantic Memory Bank</span>
            </div>
            <h1 className="hero-title" style={{ fontSize: "1.85rem" }}>
              Hindsight Persistent Memory Bank
            </h1>
            <p className="hero-subtitle" style={{ maxWidth: "750px" }}>
              Persistent incident memory powered by Hindsight Cloud. Incident resolutions are retained across outages and recalled semantically during active triage.
            </p>
          </div>

          <div 
            className={`status-pill ${isConnected ? "connected" : "missing"}`} 
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          >
            <span className={`status-dot ${isConnected ? "green" : "red"}`}></span>
            <span>
              {isConnected 
                ? "Hindsight Cloud: Connected" 
                : "Hindsight Cloud: Disconnected"}
            </span>
          </div>
        </div>
      </div>

      {/* Persistence Notice (Requirement 9) */}
      <div style={{
        background: "rgba(56, 189, 248, 0.05)",
        border: "1px solid rgba(56, 189, 248, 0.2)",
        borderRadius: "var(--radius-md)",
        padding: "0.85rem 1.15rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontSize: "0.82rem",
        color: "var(--text-secondary)",
        lineHeight: 1.5
      }}>
        <Info size={18} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Hindsight Cloud provides persistent incident memory.</strong> Session counters shown below are local application telemetry and reset when the backend restarts.
        </span>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--accent-emerald)" }}>
            <Database size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value" style={{ fontSize: "1.15rem" }}>
              {isConnected ? "Persistent" : "Disconnected"}
            </span>
            <span className="stat-label">Hindsight Memory</span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              Persistent memory managed by Hindsight Cloud
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(56, 189, 248, 0.12)", color: "var(--accent-blue)" }}>
            <Layers size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {memoryStats?.sessionRetains ?? memoryStats?.totalRetains ?? 0}
            </span>
            <span className="stat-label">Session Retains</span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              Local session telemetry
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(168, 85, 247, 0.12)", color: "var(--accent-purple)" }}>
            <Search size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {memoryStats?.sessionRecalls ?? memoryStats?.totalRecalls ?? 0}
            </span>
            <span className="stat-label">Session Recalls</span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              Local session telemetry
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(56, 189, 248, 0.12)", color: "var(--accent-blue)" }}>
            <Server size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value" style={{ fontSize: "1rem", fontFamily: "var(--font-mono)" }}>
              {bankLabel}
            </span>
            <span className="stat-label">Hindsight Memory Bank</span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              {isConnected ? "Cloud storage active" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Recall Query Tester (Requirement 4, 5, 6, 12) */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem",
        marginBottom: "2rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <BrainCircuit size={18} color="var(--accent-blue)" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Live Hindsight Recall Test
            </h2>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Invokes <code>HindsightClient.recall()</code> against Hindsight Cloud
          </span>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Test real semantic memory recall. Hindsight performs natural-language vector matching against your persistent memory bank.
        </p>

        {/* Quick query buttons */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setSearchQuery("Payment API HTTP 500 after deployment")}
          >
            "Payment API HTTP 500 after deployment"
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setSearchQuery("Completely unrelated query: deep space interstellar astrobiology")}
          >
            "Unrelated query: deep space astrobiology"
          </button>
        </div>

        <form onSubmit={handleTestRecall} style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <input 
            type="text"
            className="chat-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. Payment API HTTP 500 after deployment..."
            style={{ flex: 1 }}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isRecalling || !searchQuery.trim()}
          >
            <Search size={16} />
            {isRecalling ? "Recalling..." : "Recall from Hindsight"}
          </button>
        </form>

        {/* Recall Failure (Requirement 6: Error State) */}
        {recallError && (
          <div style={{
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            color: "var(--accent-rose)",
            fontSize: "0.85rem",
            marginBottom: "1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              <AlertTriangle size={16} />
              Hindsight recall unavailable
            </div>
            <div>{recallError}</div>
          </div>
        )}

        {/* Successful Recall Results Display (Requirement 4 & 5) */}
        {recallResults && !recallError && (
          <div style={{
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "1.25rem"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "0.75rem", 
              borderBottom: "1px solid var(--border-color)", 
              paddingBottom: "0.6rem",
              flexWrap: "wrap",
              gap: "0.5rem"
            }}>
              <div>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-blue)" }}>
                  Hindsight Recall Results
                </span>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Query: <code style={{ color: "#38bdf8" }}>"{recallResults.query || searchQuery}"</code>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: recallResults.results?.length > 0 ? "var(--accent-emerald)" : "var(--text-muted)" }}>
                  Matches: {recallResults.results?.length || 0}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Hindsight Bank: <code>ResolveAI Production Memory</code>
                </div>
              </div>
            </div>

            {/* Zero Results State (Requirement 5) */}
            {recallResults.results?.length === 0 ? (
              <div style={{ padding: "0.85rem 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  <Info size={16} color="var(--accent-blue)" />
                  No relevant Hindsight memories found.
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                  Hindsight recall succeeded, but no stored memories matched this query within the semantic relevance threshold.
                </p>
              </div>
            ) : (
              /* Verified Real Results Display (Requirement 4) */
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
                  ✓ Persistent memories retrieved directly from Hindsight Cloud:
                </div>
                {recallResults.results.map((r, i) => (
                  <div key={i} style={{
                    background: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.85rem",
                    fontSize: "0.82rem"
                  }}>
                    <div style={{ fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", color: "#e2e8f0", lineHeight: 1.5 }}>
                      {r.text}
                    </div>
                    {(r.scores || r.metadata || r.type) && (
                      <div style={{ 
                        display: "flex", 
                        gap: "0.75rem", 
                        marginTop: "0.5rem", 
                        fontSize: "0.72rem", 
                        color: "var(--text-muted)", 
                        borderTop: "1px solid rgba(255,255,255,0.06)", 
                        paddingTop: "0.35rem", 
                        flexWrap: "wrap" 
                      }}>
                        {r.type && <span>Type: <code>{r.type}</code></span>}
                        {r.scores?.final !== undefined && (
                          <span>Relevance: <code>{Math.round(r.scores.final * 100)}%</code></span>
                        )}
                        {r.scores?.semantic !== undefined && r.scores?.final === undefined && (
                          <span>Semantic score: <code>{Math.round(r.scores.semantic * 100)}%</code></span>
                        )}
                        {r.id && <span>ID: <code>{r.id.slice(0, 8)}...</code></span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Setup Guide Card */}
      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Key size={18} color="var(--accent-amber)" />
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>
            Hindsight Cloud Configuration Guide
          </h3>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Hindsight Cloud provides persistent cognitive memory for ResolveAI. Incident post-mortems and resolutions are stored securely in your authorized cloud memory bank:
        </p>

        <div style={{
          background: "#080b11",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: "1rem",
          fontFamily: "var(--font-mono)",
          fontSize: "0.82rem",
          color: "#e2e8f0",
          marginBottom: "1rem"
        }}>
          <div># Managed securely via server environment variables:</div>
          <div>HINDSIGHT_API_KEY=hsk_********************************</div>
          <div>HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io</div>
          <div>HINDSIGHT_BANK_ID=(ResolveAI Production Memory)</div>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          <span>• Package: <code>@vectorize-io/hindsight-client</code></span>
          <span>• Operations: <code>client.retain()</code> & <code>client.recall()</code></span>
          <span>• Persistent memory stored in cloud; local session counters track live runtime telemetry.</span>
        </div>
      </div>
    </div>
  );
}
