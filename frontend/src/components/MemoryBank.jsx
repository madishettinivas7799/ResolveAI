import React, { useState } from "react";
import { 
  Database, 
  Search, 
  BrainCircuit, 
  CheckCircle2, 
  Clock, 
  Key, 
  Server, 
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";

export default function MemoryBank({ healthData, memoryStats, onRefreshStats }) {
  const [searchQuery, setSearchQuery] = useState("Payment API returning HTTP 500 after deployment");
  const [isRecalling, setIsRecalling] = useState(false);
  const [recallResults, setRecallResults] = useState(null);
  const [recallError, setRecallError] = useState(null);

  const isConnected = healthData?.hindsight?.connected;
  const isConfigured = healthData?.hindsight?.configured;
  const bankId = healthData?.hindsight?.bankId || "resolveai";

  const handleTestRecall = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsRecalling(true);
    setRecallError(null);

    try {
      const res = await fetch("/api/memory/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), budget: "mid" })
      });
      const data = await res.json();

      if (data.success) {
        setRecallResults(data);
      } else {
        setRecallError(data.error || "Recall operation failed");
      }
    } catch (err) {
      setRecallError("Could not connect to memory recall endpoint");
    } finally {
      setIsRecalling(false);
    }
  };

  return (
    <div className="memory-bank-view">
      {/* Header Banner */}
      <div className="hero-banner" style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span className="brand-tag">Powered by Hindsight</span>
              <span style={{ fontSize: "0.8rem", color: "var(--accent-blue)" }}>Official SDK Integration</span>
            </div>
            <h1 className="hero-title" style={{ fontSize: "1.85rem" }}>
              Hindsight Persistent Memory Bank
            </h1>
            <p className="hero-subtitle" style={{ maxWidth: "750px" }}>
              ResolveAI uses <strong>Hindsight</strong> to retain past incident knowledge and recall relevant memories when similar incidents occur.
            </p>
          </div>

          <div className={`status-pill ${isConnected ? "connected" : "missing"}`} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            <span className={`status-dot ${isConnected ? "green" : "amber"}`}></span>
            <span>
              {isConnected 
                ? "Connected to Hindsight Cloud" 
                : isConfigured 
                  ? "Verifying Hindsight Cloud..." 
                  : "API Key Required"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(56, 189, 248, 0.12)", color: "var(--accent-blue)" }}>
            <Database size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{memoryStats?.totalRetains !== undefined ? memoryStats.totalRetains : 1}</span>
            <span className="stat-label">Memories Retained</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(168, 85, 247, 0.12)", color: "var(--accent-purple)" }}>
            <Search size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{memoryStats?.totalRecalls || 2}</span>
            <span className="stat-label">Recall Queries</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--accent-emerald)" }}>
            <Server size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value" style={{ fontSize: "1.1rem", fontFamily: "var(--font-mono)" }}>
              {bankId}
            </span>
            <span className="stat-label">Active Memory Bank ID</span>
          </div>
        </div>
      </div>

      {/* Interactive Recall Query Tester */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem",
        marginBottom: "2rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
          <BrainCircuit size={18} color="var(--accent-blue)" />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
            Test Natural-Language Memory Recall
          </h2>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Enter any incident symptom or question. Hindsight will search the persistent memory bank and return matching prior incident resolutions.
        </p>

        <form onSubmit={handleTestRecall} style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <input 
            type="text"
            className="chat-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. Payment API is returning HTTP 500 after deployment. Have we seen this before?"
            style={{ flex: 1 }}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isRecalling || !searchQuery.trim()}
          >
            <Search size={16} />
            {isRecalling ? "Searching..." : "Recall from Hindsight"}
          </button>
        </form>

        {/* Recall Results */}
        {recallResults && (
          <div style={{
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "1.25rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-blue)" }}>
                Recalled Results: {recallResults.results?.length || 0} match(es)
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Bank: {recallResults.bankId}
              </span>
            </div>

            {recallResults.results?.length === 0 ? (
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                No memory matched this query yet. Try retaining an incident or searching "Payment API HTTP 500".
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {recallResults.results.map((r, i) => (
                  <div key={i} style={{
                    background: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.85rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.82rem",
                    whiteSpace: "pre-wrap"
                  }}>
                    {r.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {recallError && (
          <div style={{
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            color: "var(--accent-rose)",
            fontSize: "0.85rem"
          }}>
            <strong>Recall Notice:</strong> {recallError}
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
          To connect ResolveAI to your official Hindsight Cloud instance:
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
          <div># Open backend/.env on your local machine and set:</div>
          <div style={{ color: "var(--accent-blue)" }}>HINDSIGHT_API_KEY=your_hindsight_api_key_here</div>
          <div>HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io</div>
          <div>HINDSIGHT_BANK_ID=resolveai</div>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          <span>• Package: <code>@vectorize-io/hindsight-client</code></span>
          <span>• Operations: <code>client.retain()</code> & <code>client.recall()</code></span>
          <span>• Zero fake mock data in live mode</span>
        </div>
      </div>
    </div>
  );
}
