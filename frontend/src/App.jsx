import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Assistant from "./components/Assistant.jsx";
import Incidents from "./components/Incidents.jsx";
import MemoryBank from "./components/MemoryBank.jsx";
import DemoScenarioModal from "./components/DemoScenarioModal.jsx";
import NewIncidentModal from "./components/NewIncidentModal.jsx";
import IncidentDetailModal from "./components/IncidentDetailModal.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({ total: 0, resolved: 0, open: 0, retained: 0 });
  const [healthData, setHealthData] = useState(null);
  const [memoryStats, setMemoryStats] = useState(null);

  // Modals
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isNewIncidentModalOpen, setIsNewIncidentModalOpen] = useState(false);
  const [inspectIncident, setInspectIncident] = useState(null);
  const [assistantInitialQuery, setAssistantInitialQuery] = useState("");

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealthData(data);
    } catch (err) {
      console.warn("Could not fetch health:", err);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch("/api/incidents");
      const data = await res.json();
      if (data.success) {
        setIncidents(data.incidents || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.warn("Could not fetch incidents:", err);
    }
  };

  const fetchMemoryStats = async () => {
    try {
      const res = await fetch("/api/memory/stats");
      const data = await res.json();
      if (data.success) {
        setMemoryStats(data);
      }
    } catch (err) {
      console.warn("Could not fetch memory stats:", err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchIncidents();
    fetchMemoryStats();

    // Poll health & stats every 15 seconds
    const interval = setInterval(() => {
      fetchHealth();
      fetchIncidents();
      fetchMemoryStats();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleRetainIncident = async (incident) => {
    try {
      const res = await fetch(`/api/incidents/${incident.id}/retain`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchIncidents();
        await fetchMemoryStats();
        if (inspectIncident?.id === incident.id) {
          setInspectIncident((prev) => ({
            ...prev,
            retainedToHindsight: true,
            retainFailed: false,
            retainError: null
          }));
        }
        return { success: true, alreadyRetained: data.alreadyRetained };
      } else {
        await fetchIncidents();
        if (inspectIncident?.id === incident.id) {
          setInspectIncident((prev) => ({
            ...prev,
            retainedToHindsight: false,
            retainFailed: true,
            retainError: data.error || "Retention failed"
          }));
        }
        alert(data.error || "Failed to retain incident in Hindsight");
        return { success: false, error: data.error };
      }
    } catch (err) {
      await fetchIncidents();
      alert("Error retaining incident: " + err.message);
      return { success: false, error: err.message };
    }
  };

  const handleCreateIncident = async (formData) => {
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchIncidents();
        await fetchMemoryStats();
        if (formData.retainNow && data.incident && !data.incident.retainedToHindsight) {
          alert("Incident was created, but Hindsight retention failed: " + (data.retainError || "Hindsight service unavailable."));
        }
        return { success: true, incident: data.incident };
      } else {
        return { success: false, error: data.error || "Failed to create incident" };
      }
    } catch (err) {
      console.error("Create incident error:", err);
      return { success: false, error: "Network error: " + err.message };
    }
  };

  const handleExecuteDemoScenario = (demoQuery) => {
    setAssistantInitialQuery(demoQuery || "");
    setActiveTab("assistant");
    fetchIncidents();
    fetchMemoryStats();
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        healthData={healthData}
        onLaunchDemo={() => setIsDemoModalOpen(true)}
      />

      {/* Main Views */}
      <main className="main-content">
        {activeTab === "dashboard" && (
          <Dashboard 
            incidents={incidents}
            stats={stats}
            memoryStats={memoryStats}
            healthData={healthData}
            onLaunchDemo={() => setIsDemoModalOpen(true)}
            setActiveTab={setActiveTab}
            onOpenIncident={(inc) => setInspectIncident(inc)}
          />
        )}

        {activeTab === "assistant" && (
          <Assistant 
            healthData={healthData}
            onRetainCustomMemory={fetchMemoryStats}
            initialQuery={assistantInitialQuery}
            onClearInitialQuery={() => setAssistantInitialQuery("")}
          />
        )}

        {activeTab === "incidents" && (
          <Incidents 
            incidents={incidents}
            onRetainIncident={handleRetainIncident}
            onAddNewIncident={() => setIsNewIncidentModalOpen(true)}
            onInspectIncident={(inc) => setInspectIncident(inc)}
            healthData={healthData}
          />
        )}

        {activeTab === "memory" && (
          <MemoryBank 
            healthData={healthData}
            memoryStats={memoryStats}
            onRefreshStats={fetchMemoryStats}
          />
        )}
      </main>

      {/* Modals */}
      <DemoScenarioModal 
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onExecuteDemo={handleExecuteDemoScenario}
        healthData={healthData}
      />

      <NewIncidentModal 
        isOpen={isNewIncidentModalOpen}
        onClose={() => setIsNewIncidentModalOpen(false)}
        onSave={handleCreateIncident}
      />

      <IncidentDetailModal 
        incident={inspectIncident}
        isOpen={Boolean(inspectIncident)}
        onClose={() => setInspectIncident(null)}
        onRetain={handleRetainIncident}
      />
    </div>
  );
}
