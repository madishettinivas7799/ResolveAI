import Groq from "groq-sdk";

let groqInstance = null;

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  if (!groqInstance) {
    groqInstance = new Groq({ apiKey });
  }
  return groqInstance;
}

export function checkGroqConfig() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  return {
    configured: Boolean(apiKey && apiKey.length > 5),
    model
  };
}

/**
 * Generate AI Response using Groq LLM with memory injection
 */
export async function generateIncidentResponse({
  userQuery,
  recalledMemories = [],
  useMemory = true,
  conversationHistory = []
}) {
  const { configured, model } = checkGroqConfig();

  const memoriesAvailable = useMemory && recalledMemories && recalledMemories.length > 0;

  // If Groq is not configured, provide a rich structured fallback response
  if (!configured) {
    return generateFallbackResponse({
      userQuery,
      recalledMemories,
      memoriesAvailable
    });
  }

  const groq = getGroqClient();

  const systemPrompt = `You are ResolveAI, an expert AI Incident Response Engineer for software teams.
You analyze active production outages, correlate current symptoms with historical incident memory from Hindsight, and provide rapid, high-confidence remediation steps.

Guidelines:
1. Always maintain a calm, highly technical, and actionable tone suitable for on-call SREs and developers.
2. If RELEVANT HISTORICAL MEMORY is provided:
   - Acknowledge that a similar incident was resolved in the past.
   - Present the past root cause and fix as strong historical evidence (not guaranteed certainty, but top priority hypothesis).
   - Formulate a prioritized action plan starting with validating the previous root cause.
   - Structure your response cleanly using markdown with:
     ### 🔍 Historical Correlation (Hindsight Memory)
     ### ⚡ Immediate Priority Action
     ### 🛠️ Step-by-Step Remediation Plan
     ### 🛡️ Post-Incident Prevention
3. If NO RELEVANT MEMORY is provided:
   - Provide standard, sound first-principles troubleshooting steps (e.g. check container logs, inspect ingress/network, review git commit diffs, check APM metrics).
   - Note that no previous identical incident is stored in memory.`;

  let memoryContextText = "";
  if (memoriesAvailable) {
    memoryContextText = `
=== RELEVANT HISTORICAL INCIDENT MEMORIES (RECALLED VIA HINDSIGHT) ===
${recalledMemories
  .map(
    (m, idx) => `
[Memory #${idx + 1}]
${m.text || JSON.stringify(m)}
${m.scores ? `Relevance Score: ${Math.round((m.scores.final || m.scores.semantic || 0.85) * 100)}%` : ""}
`
  )
  .join("\n")}
=== END HISTORICAL MEMORY ===
`;
  } else {
    memoryContextText = `
[Note: Memory mode is currently ${useMemory ? "active but no previous incidents matched query" : "disabled for this query (generic mode)"}].
`;
  }

  const userPrompt = `
${memoryContextText}

CURRENT INCIDENT INQUIRY / SYMPTOM:
"${userQuery}"

Provide a structured, actionable incident response.
`;

  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-4),
      { role: "user", content: userPrompt }
    ];

    const completion = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1024
    });

    const aiMessage = completion.choices[0]?.message?.content || "No response generated.";

    return {
      success: true,
      model,
      response: aiMessage,
      memoryUsed: memoriesAvailable,
      memoryCount: memoriesAvailable ? recalledMemories.length : 0,
      groqConfigured: true
    };
  } catch (error) {
    console.error("[Groq] Chat completion error:", error.message || error);
    // Return graceful structured fallback if Groq call failed
    const fallback = generateFallbackResponse({
      userQuery,
      recalledMemories,
      memoriesAvailable,
      apiError: error.message
    });
    return fallback;
  }
}

/**
 * Intelligent fallback generator when Groq API key is not yet added
 */
function generateFallbackResponse({ userQuery, recalledMemories, memoriesAvailable, apiError = null }) {
  if (memoriesAvailable) {
    const primaryMemory = recalledMemories[0];
    const memoryLines = (primaryMemory.text || "").split("\n");
    const rootCauseLine = memoryLines.find((l) => l.toLowerCase().includes("root cause")) || "Root cause: Previous environment variable misconfiguration";
    const resolutionLine = memoryLines.find((l) => l.toLowerCase().includes("resolution")) || "Resolution: Restore correct configuration and restart service";

    return {
      success: true,
      model: "resolveai-memory-heuristic (configure GROQ_API_KEY for dynamic LLM)",
      memoryUsed: true,
      memoryCount: recalledMemories.length,
      groqConfigured: false,
      apiError,
      response: `### 🔍 Historical Correlation (Hindsight Memory)
ResolveAI recalled **${recalledMemories.length} relevant historical incident(s)** from Hindsight matching your inquiry:

> **Previous Incident Match**:
> ${primaryMemory.text}

---

### ⚡ Immediate Priority Action
Based on previous incident memory:
1. **${rootCauseLine}**
2. **${resolutionLine}**

### 🛠️ Step-by-Step Remediation Plan
1. **Validate Environment Variables**: Check your active pod or service deployment configuration against the known good specification.
2. **Inspect Container Startup**: Review recent container logs right after deployment to verify if connection strings failed to bind.
3. **Rollback or Patch Config**: If variables were overridden in the latest pipeline run, re-apply the verified environment config and perform a rolling restart.

*(Note: Groq LLM API is unconfigured; synthesized from recalled Hindsight memory data).*`
    };
  }

  return {
    success: true,
    model: "resolveai-generic-heuristic (configure GROQ_API_KEY for dynamic LLM)",
    memoryUsed: false,
    memoryCount: 0,
    groqConfigured: false,
    apiError,
    response: `### 🔍 Generic Troubleshooting Plan (No Historical Memory Match)
No matching prior incidents were found in Hindsight memory for this query.

### 🛠️ Recommended Investigation Steps:
1. **Check Application Logs**: Run \`kubectl logs\` or check Datadog/CloudWatch for HTTP 500 stack traces.
2. **Review Deployment Diff**: Compare the latest commit diff against the previous stable deployment.
3. **Verify Upstream Dependencies**: Ensure databases, auth providers, and downstream services are responding.
4. **Consider Safe Rollback**: If impact is critical, roll back to the last stable release while debugging.`
  };
}
