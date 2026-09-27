import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Sparkles, 
  BrainCircuit, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Terminal, 
  RotateCcw,
  Zap,
  Info
} from "lucide-react";

export default function Assistant({ healthData, onRetainCustomMemory }) {
  const [messages, setMessages] = useState([
    {
      id: "intro-msg",
      role: "assistant",
      content: `Hello! I'm **ResolveAI**, your AI Incident Response Agent.

I maintain persistent incident memory using **Hindsight**. When an outage or error occurs, I recall past incidents, root causes, and resolutions to help you recover faster.

Try asking about the **Payment API HTTP 500** issue or click one of the suggested inquiries below!`,
      recalledMemories: [],
      memoryRetrieved: false,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [useMemory, setUseMemory] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryText = inputQuery) => {
    const text = queryText.trim();
    if (!text || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMessageId,
        role: "user",
        content: text,
        timestamp: new Date().toLocaleTimeString()
      }
    ];

    setMessages(newMessages);
    setInputQuery("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          useMemory,
          history: newMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.response,
            recalledMemories: data.recalledMemories || [],
            memoryRetrieved: Boolean(data.memoryRetrieved),
            model: data.model,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ **Incident Assistant Error**: ${data.error || "Failed to process request"}`,
            recalledMemories: [],
            memoryRetrieved: false,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Connection Error**: Could not connect to ResolveAI backend. Make sure the server is running on port 5000.`,
          recalledMemories: [],
          memoryRetrieved: false,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQueries = [
    "Payment API is returning HTTP 500 errors after today's deployment. What should I check?",
    "Auth Service Redis sessions are timing out during traffic spikes.",
    "Notification worker is restarting with OOMKilled every 45 minutes."
  ];

  return (
    <div className="assistant-container">
      {/* Main Chat Panel */}
      <div className="chat-panel">
        <div className="chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div className="brand-icon-box" style={{ width: "32px", height: "32px" }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>AI Incident Response Assistant</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Hindsight Memory Grounded • Groq LLM
              </div>
            </div>
          </div>

          {/* Toggle With/Without Memory */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div 
              className="toggle-switch"
              onClick={() => setUseMemory(!useMemory)}
              title="Toggle whether Hindsight memory recall is enabled"
            >
              <div className={`switch-track ${useMemory ? "on" : ""}`}>
                <div className="switch-thumb"></div>
              </div>
              <span style={{ 
                color: useMemory ? "var(--accent-emerald)" : "var(--text-muted)", 
                fontSize: "0.8rem",
                fontWeight: 600
              }}>
                {useMemory ? "Memory Enabled" : "Memory Off (Generic)"}
              </span>
            </div>

            <button 
              className="btn btn-outline btn-sm" 
              onClick={() => setMessages(messages.slice(0, 1))}
              title="Clear conversation"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.role}`}>
              <div 
                className="message-avatar"
                style={{
                  background: msg.role === "user" ? "#2563eb" : "#1e293b",
                  color: msg.role === "user" ? "#fff" : "var(--accent-blue)"
                }}
              >
                {msg.role === "user" ? "YOU" : <BrainCircuit size={18} />}
              </div>

              <div style={{ maxWidth: "100%", width: "100%" }}>
                {/* Visible Recalled Memory Banner */}
                {msg.memoryRetrieved && msg.recalledMemories?.length > 0 && (
                  <div className="recalled-memory-banner">
                    <div className="memory-banner-header">
                      <History size={14} />
                      Relevant Memory Recalled From Hindsight ({msg.recalledMemories.length} match)
                    </div>
                    {msg.recalledMemories.map((mem, idx) => (
                      <div key={idx} className="memory-text-snippet">
                        {mem.text}
                      </div>
                    ))}
                  </div>
                )}

                <div className="message-content">
                  <div style={{ whiteSpace: "pre-line" }}>
                    {msg.content}
                  </div>
                </div>

                <div style={{ 
                  display: "flex", 
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  gap: "0.75rem",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  marginTop: "0.35rem",
                  padding: "0 0.25rem"
                }}>
                  <span>{msg.timestamp}</span>
                  {msg.model && (
                    <span>• Model: {msg.model.split("/").pop()}</span>
                  )}
                  {msg.role === "assistant" && msg.memoryRetrieved && (
                    <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>
                      • Grounded in Hindsight Memory
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message-bubble assistant">
              <div className="message-avatar" style={{ background: "#1e293b", color: "var(--accent-blue)" }}>
                <BrainCircuit size={18} />
              </div>
              <div className="message-content" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className="status-dot green" style={{ animation: "pulse 1.5s infinite" }}></span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Recalling Hindsight incident memory & analyzing with Groq...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-area">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="input-row"
          >
            <input 
              type="text"
              className="chat-input"
              placeholder="Describe incident or symptom (e.g. Payment API is returning HTTP 500 after deployment)..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading || !inputQuery.trim()}
            >
              <Send size={16} />
              Analyze
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar with Guidance & Quick Scenarios */}
      <div className="assistant-sidebar">
        <div className="sidebar-card">
          <div className="sidebar-title">
            <Zap size={16} color="var(--accent-blue)" />
            Quick Demo Inquiries
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.85rem" }}>
            Click to simulate on-call developer inquiries:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                className="btn btn-secondary btn-sm"
                style={{ textAlign: "left", fontSize: "0.76rem", lineHeight: 1.3, padding: "0.5rem 0.65rem" }}
                onClick={() => {
                  setInputQuery(q);
                  handleSend(q);
                }}
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-card">
          <div className="sidebar-title">
            <Layers size={16} color="var(--accent-purple)" />
            Memory Recall Mode
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            <p style={{ marginBottom: "0.5rem" }}>
              Currently:{" "}
              <strong style={{ color: useMemory ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
                {useMemory ? "Hindsight Active" : "Generic Mode (No Memory)"}
              </strong>
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Toggle the switch above to compare how ResolveAI answers with vs. without recalling past incidents!
            </p>
          </div>
        </div>

        <div className="sidebar-card" style={{ background: "rgba(30, 41, 59, 0.4)" }}>
          <div className="sidebar-title">
            <Info size={16} color="var(--accent-blue)" />
            Hindsight Architecture
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            ResolveAI invokes <code>HindsightClient.recall()</code> on your bank <code>{healthData?.hindsight?.bankId || "resolveai"}</code> using semantic retrieval to fetch relevant post-mortems and resolutions.
          </p>
        </div>
      </div>
    </div>
  );
}
