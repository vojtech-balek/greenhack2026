import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// 1. Embedded Golden System Prompt
export const GOLDEN_SYSTEM_PROMPT = `You are the "Renovate Now" AI Expert Advisor, integrated into a Česká spořitelna digital application for the GreenHack 2026 challenge. Your purpose is to assist Czech apartment building owners, Homeowners' Associations (SVJ), and Housing Cooperatives (BD) in navigating the early phases of energy renovation.

[TEMPORAL ANCHOR]
- The current year is 2026. Treat the modern 2026 financial frameworks (such as the Nová zelená úsporám 2026 program) as actively available.

[YOUR IDENTITY & TONE]
- Speak in clear, plain, accessible English. Avoid hyper-technical jargon.
- Be empathetic, highly encouraging, and grounding.
- De-escalate decision paralysis and anxiety with concrete legal and financial facts.
- Align subtly with the public interest and business goals of Česká spořitelna (guiding the user towards a pre-approved commercial/subsidy financing frame).

[CORE CZECH HOUSING GROUNDING TRUTHS]
1. Financial Structure: Complete renovations require 0 CZK out-of-pocket upfront. The system blends Nová zelená úsporám (NZÚ) 2026 state subsidies and interest-free loan components with commercial funding from Česká spořitelna. Energy bill savings typically offset the monthly loan installments, making the shift net-neutral for the building's monthly repair fund (fond oprav).
2. Shared Debt Safety: Under Czech law, renovation loans are extended directly to the SVJ or BD as a corporate legal entity, backed by the collective repair fund. Individual apartments are NEVER used as physical bank collateral or direct mortgages. Personal properties are never at risk of foreclosure if a neighbor defaults.
3. Legal Quorums: Achieving the "First Consensus" (mandate to order project designs and fetch official bank quotes) does not require 100% unanimity. It generally requires a simple majority of present shares at an official assembly, unless custom building bylaws (Stanovy) demand a 2/3 or 3/4 qualified majority.
4. Property Value: Fully insulated Czech apartment blocks see an immediate 10% to 15% increase in capital property valuation and experience 40% faster rental liquidity.

[GUARDRAILS & ANSWERING RULES]
- If the user asks a question requiring real-world local data (e.g., local addresses, specific contractor details, current market pricing), rely on the provided Google Search results snippet.
- NEVER hallucinate numerical values, exact interest rates, or legislative articles. If you do not have the data in your context or search snippets, say: "I don't have the exact figure for that block or policy right now, but a Česká spořitelna specialist will verify this precisely for your building during your free consultation."
- Return concise answers, 1 paragraph, up to 3 sentences.
`;

/**
 * Loads environment variables manually from a .env file.
 */
export function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      content.split(/\r?\n/).forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const parts = trimmed.split("=");
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join("=").trim();
            process.env[key] = val;
          }
        }
      });
    }
  } catch (err) {
    // Ignore issues loading .env
  }
}

/**
 * Executes a search query via Serper API.
 */
async function callSerperSearch(query: string, apiKey: string): Promise<string> {
  if (!apiKey || apiKey === "YOUR_SERPER_API_KEY_HERE") {
    return "Search unavailable: SERPER_API_KEY is not configured.";
  }

  const url = "https://google.serper.dev/search";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const results = (await response.json()) as { organic?: { snippet?: string }[] };
    const snippets = (results.organic || [])
      .slice(0, 5)
      .map((item) => item.snippet || "")
      .filter(Boolean);

    if (snippets.length === 0) {
      return "No search results found.";
    }
    return snippets.join("\n");
  } catch (err: any) {
    return `Search failed: ${err.message}`;
  }
}

/**
 * Executes chat completions request against the configured LLM endpoint.
 */
async function callLocalLLM(
  messages: { role: string; content: string }[],
  url: string,
  apiKey: string,
  model: string,
  temperature = 0.3
): Promise<string> {
  const endpoint = `${url.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey && apiKey !== "YOUR_OPEN_WEBUI_API_KEY_HERE" && apiKey !== "lm-studio") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${errorText}`);
    }

    const results = (await response.json()) as { choices: { message: { content: string } }[] };
    return results.choices[0].message.content;
  } catch (err: any) {
    return `Error contacting local inference server: ${err.message}`;
  }
}

/**
 * Generates an optimized, Czech Republic-focused search query using the LLM.
 */
async function generateSearchQuery(userQuery: string, url: string, apiKey: string, model: string): Promise<string> {
  const messages = [
    {
      role: "system",
      content:
        "You are an expert search query generator. Your task is to transform a user's question " +
        "about Czech apartment building energy renovations, SVJ/BD regulations, and financing " +
        "into an optimized Google Search query. The search query MUST focus specifically on the " +
        "Czech Republic context and include relevant terms in Czech or English to retrieve the " +
        "most accurate up-to-date facts.\n" +
        "Return ONLY the search query string. Do not include quotes, markdown formatting, " +
        "explanation, or introductory text.",
    },
    {
      role: "user",
      content: "What if my neighbor is elderly and claims they won't live long enough?",
    },
    {
      role: "assistant",
      content: "Czech Republic SVJ renovation elderly owner concerns repair fund savings",
    },
    {
      role: "user",
      content: userQuery,
    },
  ];

  try {
    const query = await callLocalLLM(messages, url, apiKey, model, 0.1);
    const cleanedQuery = query.trim().replace(/^["'`]|["'`]$/g, "").replace(/\n/g, " ");
    if (cleanedQuery) {
      return cleanedQuery;
    }
  } catch (err) {
    // Ignore optimization errors and fallback
  }

  return `Czech Republic building renovation ${userQuery}`;
}

/**
 * Main search-grounded inference pipeline for the dashboard assistant.
 * Can be dropped in and used inside a larger project.
 */
export async function runAdvisorPipeline(userQuery: string, systemPrompt: string | null = null): Promise<string> {
  if (!systemPrompt) {
    systemPrompt = GOLDEN_SYSTEM_PROMPT;
  }

  const serperKey = process.env.SERPER_API_KEY || "";
  const llmUrl = process.env.LOCAL_LLM_URL || "https://llm.ai.e-infra.cz/v1";
  const llmKey = process.env.LOCAL_LLM_API_KEY || "";
  const llmModel = process.env.LOCAL_LLM_MODEL || "mini";
  const llmTemp = parseFloat(process.env.LOCAL_LLM_TEMPERATURE || "0.3");

  // 1. Optimize search query
  const optimizedQuery = await generateSearchQuery(userQuery, llmUrl, llmKey, llmModel);
  console.log(`[Pipeline Log] Generated grounded search query: '${optimizedQuery}'`);

  // 2. Fetch Serper snippets
  const searchSnippets = await callSerperSearch(optimizedQuery, serperKey);

  // 3. Construct prompt
  const formattedMessages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `[LIVE GOOGLE SEARCH SNIPPETS]:\n${searchSnippets}\n\nUser Question: ${userQuery}\nPlease formulate your helpful response:`,
    },
  ];

  // 4. Generate response
  return await callLocalLLM(formattedMessages, llmUrl, llmKey, llmModel, llmTemp);
}
