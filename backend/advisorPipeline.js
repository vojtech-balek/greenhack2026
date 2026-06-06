/**
 * Renovate Now AI Expert Advisor - Search-Grounded Inference Pipeline (Node.js version).
 * Designed as a self-contained, lightweight, zero-dependency drop-in module
 * for website backends (Express, Next.js API routes, etc.).
 */

const https = require('https');

// 1. Embedded Golden System Prompt
const GOLDEN_SYSTEM_PROMPT = `You are the "Renovate Now" AI Expert Advisor, integrated into a Česká spořitelna digital application for the GreenHack 2026 challenge. Your purpose is to assist Czech apartment building owners, Homeowners' Associations (SVJ), and Housing Cooperatives (BD) in navigating the early phases of energy renovation.

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
`;

/**
 * Loads environment variables manually from a .env file.
 */
function loadEnv() {
  const envPath = require('path').resolve(process.cwd(), '.env');
  try {
    if (require('fs').existsSync(envPath)) {
      const content = require('fs').readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
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
 * HTTP helper using Node.js native 'https' module for zero-dependency API calls.
 */
function request(url, options, postData) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 30000
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP Error ${res.statusCode}: ${res.statusMessage || ''} - ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Executes a search query via Serper API.
 */
async function callSerperSearch(query, apiKey) {
  if (!apiKey || apiKey === 'YOUR_SERPER_API_KEY_HERE') {
    return 'Search unavailable: SERPER_API_KEY is not configured.';
  }

  const url = 'https://google.serper.dev/search';
  const postData = JSON.stringify({ q: query });
  const options = {
    method: 'POST',
    timeout: 10000,
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    }
  };

  try {
    const responseText = await request(url, options, postData);
    const results = JSON.parse(responseText);
    const snippets = (results.organic || [])
      .slice(0, 5)
      .map(item => item.snippet || '')
      .filter(Boolean);

    if (snippets.length === 0) {
      return 'No search results found.';
    }
    return snippets.join('\n');
  } catch (err) {
    return `Search failed: ${err.message}`;
  }
}

/**
 * Executes chat completions request against the configured LLM endpoint.
 */
async function callLocalLLM(messages, url, apiKey, model, temperature = 0.3) {
  const endpoint = `${url.replace(/\/$/, '')}/chat/completions`;
  const postData = JSON.stringify({
    model: model,
    messages: messages,
    temperature: temperature
  });

  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiKey && apiKey !== 'YOUR_OPEN_WEBUI_API_KEY_HERE' && apiKey !== 'lm-studio') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const options = {
    method: 'POST',
    timeout: 30000,
    headers: headers
  };

  try {
    const responseText = await request(endpoint, options, postData);
    const results = JSON.parse(responseText);
    return results.choices[0].message.content;
  } catch (err) {
    return `Error contacting local inference server: ${err.message}`;
  }
}

/**
 * Generates an optimized, Czech Republic-focused search query using the LLM.
 */
async function generateSearchQuery(userQuery, url, apiKey, model) {
  const messages = [
    {
      role: 'system',
      content:
        'You are an expert search query generator. Your task is to transform a user\'s question ' +
        'about Czech apartment building energy renovations, SVJ/BD regulations, and financing ' +
        'into an optimized Google Search query. The search query MUST focus specifically on the ' +
        'Czech Republic context and include relevant terms in Czech or English to retrieve the ' +
        'most accurate up-to-date facts.\n' +
        'Return ONLY the search query string. Do not include quotes, markdown formatting, ' +
        'explanation, or introductory text.'
    },
    {
      role: 'user',
      content: 'What if my neighbor is elderly and claims they won\'t live long enough?'
    },
    {
      role: 'assistant',
      content: 'Czech Republic SVJ renovation elderly owner concerns repair fund savings'
    },
    {
      role: 'user',
      content: userQuery
    }
  ];

  try {
    const query = await callLocalLLM(messages, url, apiKey, model, 0.1);
    const cleanedQuery = query.trim().replace(/^["'`]|["'`]$/g, '').replace(/\n/g, ' ');
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
async function runAdvisorPipeline(userQuery, systemPrompt = null) {
  if (!systemPrompt) {
    systemPrompt = GOLDEN_SYSTEM_PROMPT;
  }

  const serperKey = process.env.SERPER_API_KEY || '';
  const llmUrl = process.env.LOCAL_LLM_URL || 'https://llm.ai.e-infra.cz/v1';
  const llmKey = process.env.LOCAL_LLM_API_KEY || '';
  const llmModel = process.env.LOCAL_LLM_MODEL || 'mini';
  const llmTemp = parseFloat(process.env.LOCAL_LLM_TEMPERATURE || '0.3');

  // 1. Optimize search query
  const optimizedQuery = await generateSearchQuery(userQuery, llmUrl, llmKey, llmModel);
  console.log(`[Pipeline Log] Generated grounded search query: '${optimizedQuery}'`);

  // 2. Fetch Serper snippets
  const searchSnippets = await callSerperSearch(optimizedQuery, serperKey);

  // 3. Construct prompt
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `[LIVE GOOGLE SEARCH SNIPPETS]:\n${searchSnippets}\n\nUser Question: ${userQuery}\nPlease formulate your helpful response:`
    }
  ];

  // 4. Generate response
  return await callLocalLLM(formattedMessages, llmUrl, llmKey, llmModel, llmTemp);
}

// Module exports
module.exports = {
  loadEnv,
  runAdvisorPipeline,
  GOLDEN_SYSTEM_PROMPT
};

// Simple CLI test harness if run directly
if (require.main === module) {
  (async () => {
    loadEnv();
    console.log('--- Renovate Now Node.js Advisor CLI ---');
    const question = 'What if my neighbor is elderly and claims they won\'t live long enough to see the financial return?';
    console.log(`Asking: "${question}"`);
    
    try {
      const start = Date.now();
      const response = await runAdvisorPipeline(question);
      const latency = ((Date.now() - start) / 1000).toFixed(2);
      
      console.log(`\n[AI Advisor Response] (In ${latency}s):\n${response}`);
    } catch (err) {
      console.error('Advisor pipeline execution failed:', err);
    }
  })();
}
