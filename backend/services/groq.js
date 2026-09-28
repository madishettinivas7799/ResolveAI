import Groq from "groq-sdk";
import { withTimeout } from "../utils/asyncUtils.js";

let groqInstance = null;
let simulatedState = null; // null | "failure" | "timeout"

/**
 * Configure Groq simulation mode for automated reliability testing
 */
export function setGroqSimulation(mode) {
  simulatedState = mode;
}

export function getGroqSimulation() {
  return simulatedState;
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  if (!groqInstance) {
    groqInstance = new Groq({ apiKey });
  }
  return groqInstance;
}

export function checkGroqConfig() {
  if (simulatedState === "failure") {
    return {
      configured: false,
      model: "simulated-offline"
    };
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";

  return {
    configured: Boolean(apiKey && apiKey.length > 5),
    model
  };
}

/**
 * Generate AI Response using Groq LLM with grounded memory injection and reliability timeout
 */
export async function generateIncidentResponse({
  userQuery,
  recalledMemories = [],
  useMemory = true,
  memoryStatus = "disabled",
  conversationHistory = []
}) {
  const { configured, model } = checkGroqConfig();

  const isGrounded = memoryStatus === "grounded" && recalledMemories && recalledMemories.length > 0;

  if (simulatedState === "failure") {
    console.warn("[Groq] Simulating provider failure for reliability test.");
    return generateFallbackResponse({
      userQuery,
      recalledMemories,
      memoryStatus,
      isGrounded,
      apiError: "Groq LLM service temporarily unavailable (simulated)"
    });
  }

  if (simulatedState === "timeout") {
    console.warn("[Groq] Simulating provider timeout for reliability test.");
    return generateFallbackResponse({
      userQuery,
      recalledMemories,
      memoryStatus,
      isGrounded,
      apiError: "Groq AI generation timed out (simulated)"
    });
  }

  // If Groq is not configured, provide a structured fallback response
  if (!configured) {
    return generateFallbackResponse({
      userQuery,
      recalledMemories,
      memoryStatus,
      isGrounded
    });
  }

  const groq = getGroqClient();

  const systemPrompt = `You are ResolveAI, an expert AI Incident Response Engineer for software teams.
You assist on-call engineers by analyzing active incidents, evaluating historical incident evidence from Hindsight Cloud, and formulating safe, verified remediation steps.

CRITICAL GROUNDING & REASONING PRINCIPLES:
1. SEPARATION OF CONCEPTS:
   - HISTORICAL EVIDENCE: Past incidents retrieved from Hindsight. They describe what happened previously in another incident. They are historical EVIDENCE, NOT proof of the current issue.
   - CURRENT INCIDENT: The issue described in the current user inquiry. Analyze its symptoms independently.
   - HYPOTHESIS: Plausible root-cause explanations suggested by combining current symptoms with historical evidence.
   - VERIFICATION & ACTION: Safe diagnostics and tests to confirm the hypothesis BEFORE making disruptive changes.

2. AVOID OVERCONFIDENCE & ASSUMPTIONS:
   - NEVER state that the current incident definitely has the same root cause as a past incident.
   - Treat recalled Hindsight incidents as historical evidence, not guaranteed truth.
   - Use nuanced, objective phrasing:
     * "Previous incident evidence suggests..."
     * "A similar historical incident involved..."
     * "This is a hypothesis that should be verified..."
     * "Check current logs, configuration, metrics, and deployment state before applying the previous fix."
   - Do NOT invent fake root causes, arbitrary confidence percentages, fake logs, or fake incident IDs.

3. RESPONSE STRUCTURE WHEN HISTORICAL EVIDENCE EXISTS:
   Structure your answer clearly using markdown:
   ### 🔍 Historical Evidence
   Summarize the relevant prior incident found in Hindsight (service, symptoms, what resolved it).
   
   ### 📋 Current Assessment
   Explain what the current user query and reported symptoms indicate.
   
   ### 🔬 Recommended Verification
   List the concrete checks an engineer should perform first to test whether the historical cause applies here.
   
   ### 🛠️ Suggested Actions
   Provide practical remediation steps to execute once verification confirms the hypothesis.
   
   ### 🧠 Memory Grounding Note
   "Grounded in historical incident memory from Hindsight."

4. RESPONSE STRUCTURE WHEN NO HISTORICAL MEMORIES MATCH (or memory is empty):
   - Explicitly state: "No relevant historical incidents were found in Hindsight."
   - Provide sound first-principles troubleshooting steps:
     ### 📋 Current Assessment
     ### 🔬 Recommended Verification
     ### 🛠️ Suggested Actions

5. RESPONSE STRUCTURE WHEN HINDSIGHT IS UNAVAILABLE:
   - Explicitly state: "Hindsight memory could not be retrieved, so the following recommendations are based on the current incident description rather than historical incident evidence."
   - Provide sound first-principles troubleshooting steps.

6. RESPONSE STRUCTURE WHEN MEMORY IS DISABLED:
   - Answer directly based on the current incident inquiry and technical best practices.
   - Do not claim Hindsight grounding.`;

  let memoryContextText = "";
  if (isGrounded) {
    const topMemories = recalledMemories.slice(0, 3);
    memoryContextText = `
=== RELEVANT HISTORICAL INCIDENT EVIDENCE (RECALLED VIA HINDSIGHT CLOUD) ===
${topMemories
  .map(
    (m, idx) => `
[Historical Evidence #${idx + 1}]
${(m.text || "").substring(0, 1000)}
${m.context ? `Context: ${m.context}` : ""}
${m.metadata?.service ? `Service: ${m.metadata.service}` : ""}
`
  )
  .join("\n")}
=== END HISTORICAL EVIDENCE ===
(Instruction: Frame the above as historical evidence to verify, NOT guaranteed proof for the current incident.)
`;
  } else if (memoryStatus === "no_matches") {
    memoryContextText = `
=== HINDSIGHT RECALL STATUS: ZERO MATCHES ===
Hindsight Cloud completed a semantic recall across the incident memory bank, but NO relevant past incidents were found matching this inquiry.
Do NOT claim to have previous incident evidence. Explicitly state that no relevant historical incidents were found in Hindsight.
=== END HINDSIGHT STATUS ===
`;
  } else if (memoryStatus === "unavailable") {
    memoryContextText = `
=== HINDSIGHT RECALL STATUS: UNAVAILABLE ===
Hindsight Cloud memory could not be retrieved due to service disconnection or failure.
Explicitly state that Hindsight memory was unavailable and troubleshoot based on current inquiry only.
=== END HINDSIGHT STATUS ===
`;
  } else {
    memoryContextText = `
=== MEMORY MODE: DISABLED ===
Memory recall is toggled off. Answer using general software reliability principles without claiming Hindsight memory grounding.
=== END MEMORY MODE ===
`;
  }

  const userPrompt = `
${memoryContextText}

CURRENT INCIDENT INQUIRY / SYMPTOM:
"${userQuery}"

Provide a structured, grounded incident response following your system instructions.
`;

  try {
    const sanitizedHistory = (conversationHistory || [])
      .slice(-4)
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content.substring(0, 800) : String(m.content)
      }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...sanitizedHistory,
      { role: "user", content: userPrompt }
    ];

    const completion = await withTimeout(
      groq.chat.completions.create({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 1024
      }),
      25000,
      "GROQ_TIMEOUT",
      "Groq AI generation timed out after 25 seconds"
    );

    const aiMessage = completion.choices[0]?.message?.content || "No response generated.";

    return {
      success: true,
      model,
      response: aiMessage,
      memoryUsed: isGrounded,
      memoryCount: isGrounded ? recalledMemories.length : 0,
      groqConfigured: true
    };
  } catch (error) {
    const cleanError = sanitizeErrorMessage(error.message);
    console.error("[Groq] Chat completion error:", cleanError);
    return generateFallbackResponse({
      userQuery,
      recalledMemories,
      memoryStatus,
      isGrounded,
      apiError: cleanError
    });
  }
}

/**
 * Intelligent fallback generator when Groq encounters an error, timeout, or is unconfigured
 */
function generateFallbackResponse({
  userQuery,
  recalledMemories,
  memoryStatus,
  isGrounded,
  apiError = null
}) {
  if (isGrounded && recalledMemories.length > 0) {
    const primaryMemory = recalledMemories[0];

    return {
      success: true,
      model: "resolveai-grounded-heuristic (fallback)",
      memoryUsed: true,
      memoryCount: recalledMemories.length,
      groqConfigured: false,
      apiError,
      response: `### 🔍 Historical Evidence
Hindsight Cloud retrieved **${recalledMemories.length} relevant historical incident(s)** matching this inquiry:

> ${primaryMemory.text}

*Note: This historical incident serves as evidence of past behavior, not definitive proof of the current cause.*

### 📋 Current Assessment
The current inquiry reports symptoms matching historical patterns: "${userQuery}".

### 🔬 Recommended Verification
1. **Verify Environment & Configuration**: Check whether active deployment configurations or environment variables match expected values.
2. **Review Deployment & Service Logs**: Inspect recent deployment diffs and service logs for initialization errors.

### 🛠️ Suggested Actions
1. If configuration mismatch is verified, restore the correct environment configuration.
2. Restart the affected service deployment and monitor error rates.

### 🧠 Memory Grounding Note
Grounded in historical incident memory from Hindsight.`
    };
  }

  if (memoryStatus === "no_matches") {
    return {
      success: true,
      model: "resolveai-generic-heuristic (fallback)",
      memoryUsed: false,
      memoryCount: 0,
      groqConfigured: false,
      apiError,
      response: `### 📋 Current Assessment
"${userQuery}"

*No relevant historical incidents were found in Hindsight.*

### 🔬 Recommended Verification
1. **Inspect Application Logs**: Check for unhandled exceptions or error stack traces.
2. **Review Recent Changes**: Compare git commits and deployment pipelines for recent updates.
3. **Verify Upstream Dependencies**: Confirm database and external service connectivity.

### 🛠️ Suggested Actions
1. Isolate the failing component and enable verbose logging if necessary.
2. If recent release introduced regressions, consider initiating a safe rollback.`
    };
  }

  if (memoryStatus === "unavailable") {
    return {
      success: true,
      model: "resolveai-generic-heuristic (fallback)",
      memoryUsed: false,
      memoryCount: 0,
      groqConfigured: false,
      apiError,
      response: `*Hindsight memory could not be retrieved, so the following recommendations are based on the current incident description rather than historical incident evidence.*

### 📋 Current Assessment
"${userQuery}"

### 🔬 Recommended Verification
1. **Inspect Application Logs**: Check for unhandled exceptions or error stack traces.
2. **Review Recent Changes**: Compare git commits and deployment pipelines for recent updates.
3. **Verify Dependencies**: Confirm database and downstream services are healthy.

### 🛠️ Suggested Actions
1. Review active alerts and monitoring dashboards.
2. Apply first-principles troubleshooting to identify failing subsystems.`
    };
  }

  return {
    success: true,
    model: "resolveai-generic-heuristic (fallback)",
    memoryUsed: false,
    memoryCount: 0,
    groqConfigured: false,
    apiError,
    response: `### 📋 Current Assessment
"${userQuery}"

### 🔬 Recommended Verification
1. **Check Application Logs**: Inspect container and pod logs for runtime errors.
2. **Review Metrics**: Check APM error rates, latency spikes, and CPU/memory utilization.
3. **Verify Configuration**: Ensure secrets and endpoints are reachable.

### 🛠️ Suggested Actions
1. Address underlying service errors based on log outputs.
2. Roll back recent deployments if critical user workflows are impacted.`
  };
}

/**
 * Sanitize error message to prevent accidental key leakage
 */
function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== "string") return "Upstream LLM provider error";
  return msg
    .replace(/gsk_[a-zA-Z0-9_-]+/g, "gsk_***")
    .replace(/hsk_[a-zA-Z0-9_-]+/g, "hsk_***")
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer ***");
}
