import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const promptsDir = join(rootDir, "backend", "prompts");
const execFileAsync = promisify(execFile);

export async function loadMaterialGeneratorConfig(env = process.env) {
  const promptFiles = {
    base: await readFile(join(promptsDir, "material-base.md"), "utf8"),
    pdf: await readFile(join(promptsDir, "material-pdf-json.md"), "utf8"),
    whatsapp: await readFile(join(promptsDir, "material-whatsapp.md"), "utf8"),
    leaflet: await readFile(join(promptsDir, "material-leaflet.md"), "utf8"),
    leafletJson: await readFile(join(promptsDir, "material-leaflet-json.md"), "utf8"),
    personas: {
      opatrna: await readFile(join(promptsDir, "personas", "opatrna.md"), "utf8"),
      kalkulacka: await readFile(join(promptsDir, "personas", "kalkulacka.md"), "utf8"),
      zitrek: await readFile(join(promptsDir, "personas", "zitrek.md"), "utf8"),
      neduverivy: await readFile(join(promptsDir, "personas", "neduverivy.md"), "utf8"),
      inzenyr: await readFile(join(promptsDir, "personas", "inzenyr.md"), "utf8"),
      newcomer: await readFile(join(promptsDir, "personas", "newcomer.md"), "utf8"),
    },
  };

  return {
    eInfraToken: env.E_INFRA_API_TOKEN || "",
    eInfraEndpoint: "https://llm.ai.e-infra.cz/v1/chat/completions",
    eInfraModel: env.E_INFRA_MODEL || "mini",
    pdfBrowserPath: env.PDF_BROWSER_PATH || "",
    promptFiles,
  };
}

let materialConfig;

export function setMaterialGeneratorConfig(config) {
  materialConfig = config;
}

function getMaterialConfig() {
  if (!materialConfig) {
    throw new Error("Material generator config has not been loaded.");
  }

  return materialConfig;
}
function compactJson(value) {
  return JSON.stringify(value, null, 2);
}

function personaInstruction(persona) {
  if (getMaterialConfig().promptFiles.personas[persona.id]) {
    return getMaterialConfig().promptFiles.personas[persona.id].trim();
  }

  return `Custom persona "${persona.name || "Vlastní persona"}": ${persona.description || ""}. Infer likely motivation, objection, and best persuasion style. Do not invent demographic facts. Use only stated or clearly implied facts.`;
}

function makeMaterialPrompt(payload) {
  const format = payload.format || "pdf";
  const personaPrompts = (payload.selectedPersonas || []).map(personaInstruction);
  const formatPrompt = getMaterialConfig().promptFiles[format] || getMaterialConfig().promptFiles.pdf;

  return `${getMaterialConfig().promptFiles.base}

${formatPrompt}

Persona strategie:
${personaPrompts.length ? personaPrompts.map((item) => `- ${item}`).join("\n") : "- Nebyla vybrána konkrétní persona. Použij obecný sousedský tón."}

Data:
${compactJson(payload.context)}

Grafy a vizuální podklady:
${compactJson(payload.visuals)}

Lokální důkaz / podobné domy:
${compactJson(payload.localExamples)}
`;
}

async function callEInfra(prompt, temperature = 0.25) {
  if (!getMaterialConfig().eInfraToken) {
    throw new Error("Missing E_INFRA_API_TOKEN in environment or .env.");
  }

  const response = await fetch(getMaterialConfig().eInfraEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${getMaterialConfig().eInfraToken}`,
    },
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({
      model: getMaterialConfig().eInfraModel,
      temperature,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`LLM endpoint failed with ${response.status}: ${responseText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function generatePersuasionMaterial(payload) {
  return callEInfra(makeMaterialPrompt(payload), 0.25);
}

function extractJsonObject(text) {
  const trimmed = String(text || "").trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("LLM response did not contain JSON object.");
    }

    return JSON.parse(match[0]);
  }
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function normalizeOnePager(value, payload) {
  const calculation = payload.context?.calculation?.result || {};
  const stateLoanTermYears = calculation.stateLoanTermYears || 10;
  const nonFinancialBenefits = payload.context?.nonFinancialBenefits || [
    "stabilnější teplota v bytech",
    "méně průvanu, vlhkosti a hluku",
    "lepší vzhled domu a méně neplánovaných oprav",
  ];
  const fallbackNumbers = [
    {
      label: "Cena čekání za 5 let",
      value: formatCurrencyPlain(calculation.totalWaitPenalty),
      note: "orientační výpočet podle zvolených opatření",
    },
    {
      label: "Roční úspora energií",
      value: formatCurrencyPlain(calculation.estimatedYearlySavings),
      note: "orientační úspora v prvním roce",
    },
    {
      label: "Měsíční 0% splátka",
      value: formatCurrencyPlain(calculation.monthlyStateLoanPayment),
      note: `při státní půjčce na ${stateLoanTermYears} let`,
    },
  ];

  const sections = (Array.isArray(value.sections) && value.sections.length
    ? value.sections
    : [
        {
          title: "Co získáme",
          bullets: ["nižší provozní náklady", "předvídatelné financování", "lepší připravenost domu"],
        },
        {
          title: "Proč to není jen o penězích",
          bullets: nonFinancialBenefits.slice(0, 4),
        },
        {
          title: "Další krok",
          bullets: ["ověřit přesné financování", "připravit projektovou přípravu", "domluvit hlasování"],
        },
      ])
    .slice(0, 3)
    .map((section) => ({
      title: String(section.title || "").trim(),
      bullets: arrayOfStrings(section.bullets).slice(0, 4),
    }));
  const hasNonFinancialSection = sections.some((section) =>
    [section.title, ...section.bullets].join(" ").match(/komfort|teplot|vlhk|hluk|vzduch|vzhled|havári|opravy|zdrav|soused/i),
  );

  if (!hasNonFinancialSection) {
    sections[2] = {
      title: "Proč to není jen o penězích",
      bullets: nonFinancialBenefits.slice(0, 4).map(String),
    };
  }

  return {
    headline: String(value.headline || "Proč řešit renovaci právě teď").trim(),
    subheadline: String(value.subheadline || "Podklad pro diskuzi vlastníků na schůzi SVJ.").trim(),
    keyNumbers: (Array.isArray(value.keyNumbers) && value.keyNumbers.length ? value.keyNumbers : fallbackNumbers)
      .slice(0, 3)
      .map((item, index) => ({
        label: String(item.label || fallbackNumbers[index]?.label || "").trim(),
        value: String(item.value || fallbackNumbers[index]?.value || "").trim(),
        note: String(item.note || fallbackNumbers[index]?.note || "").trim(),
      })),
    sections,
    concerns: (Array.isArray(value.concerns) ? value.concerns : [])
      .slice(0, 4)
      .map((item) => ({
        concern: String(item.concern || "").trim(),
        response: String(item.response || "").trim(),
      }))
      .filter((item) => item.concern && item.response),
    callToAction: String(
      value.callToAction || "Navrhujeme schválit přípravu projektu a ověřit přesné financování pro náš dům.",
    ).trim(),
  };
}

function normalizeLeaflet(value, payload) {
  const calculation = payload.context?.calculation?.result || {};
  const nonFinancialBenefits = payload.context?.nonFinancialBenefits || [
    "Dům bude pohodlnější v zimě i v létě.",
    "Méně průvanu, vlhkosti a neplánovaných oprav.",
  ];
  const fallbackNumbers = [
    { label: "Cena čekání", value: formatCurrencyPlain(calculation.totalWaitPenalty) },
    { label: "Roční úspora", value: formatCurrencyPlain(calculation.estimatedYearlySavings) },
    { label: "0% splátka", value: `${formatCurrencyPlain(calculation.monthlyStateLoanPayment)} / měsíc` },
  ];
  const bigNumbers = (Array.isArray(value.bigNumbers) && value.bigNumbers.length ? value.bigNumbers : fallbackNumbers)
    .slice(0, 3)
    .map((item, index) => ({
      label: String(item.label || fallbackNumbers[index]?.label || "").trim(),
      value: String(item.value || fallbackNumbers[index]?.value || "").trim(),
    }));
  const body = arrayOfStrings(value.body).slice(0, 5);
  const hasNonFinancialBenefit = body.join(" ").match(/komfort|teplot|vlhk|hluk|vzduch|vzhled|havári|opravy|zdrav|pohodl/i);

  if (!hasNonFinancialBenefit) {
    body.push(nonFinancialBenefits[0]);
  }

  return {
    headline: String(value.headline || "Renovaci je výhodné řešit teď").trim(),
    subheadline: String(value.subheadline || "Krátký podklad pro vlastníky bytů v našem domě.").trim(),
    bigNumbers,
    body: body.length ? body : nonFinancialBenefits.slice(0, 3),
    callToAction: String(
      value.callToAction || "Nezávazně ověřme možnosti financování a připravme podklady pro rozhodnutí SVJ.",
    ).trim(),
  };
}

function formatCurrencyPlain(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(number);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderPenaltyChart(payload) {
  const items = payload.visuals?.penaltyBreakdown || [];
  const maxValue = Math.max(...items.map((item) => Number(item.value) || 0), 1);

  return items
    .map((item) => {
      const value = Number(item.value) || 0;
      const width = Math.max(8, (value / maxValue) * 100);
      return `<div class="bar-row">
        <span>${escapeHtml(item.label)}</span>
        <div class="bar"><i style="width:${width.toFixed(1)}%"></i></div>
        <strong>${formatCurrencyPlain(value)}</strong>
      </div>`;
    })
    .join("");
}

function renderOnePagerHtml(onePager, payload) {
  const address = payload.context?.address || {};
  const building = payload.context?.building || {};
  const goals = payload.context?.selectedGoals || [];
  const localCount = payload.localExamples?.summary?.localCount || 0;
  const goalsText = goals.map((goal) => goal.label).filter(Boolean).join(", ") || "vybraná opatření";
  const locationText = [address.municipalityName, address.streetName, address.cp ? `č.p. ${address.cp}` : ""]
    .filter(Boolean)
    .join(" · ");

  return `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f6f4ef; color: #171717; font-family: Arial, sans-serif; }
    .page { width: 210mm; height: 297mm; padding: 16mm; display: grid; grid-template-rows: auto auto 1fr auto; gap: 9mm; }
    .kicker { margin: 0 0 4mm; color: #2f5f55; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    h1 { max-width: 168mm; margin: 0; font-size: 31pt; line-height: .98; letter-spacing: -.03em; }
    .sub { max-width: 174mm; margin: 5mm 0 0; color: #5f5b57; font-size: 13pt; font-weight: 700; line-height: 1.18; }
    .meta { margin: 3mm 0 0; color: #7a756f; font-size: 8.5pt; }
    .numbers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
    .number { min-height: 29mm; padding: 4mm; background: #fff; border: 1px solid #e2ddd5; }
    .number span { display: block; color: #706d69; font-size: 8pt; font-weight: 700; }
    .number strong { display: block; margin-top: 3mm; color: #2f5f55; font-size: 17pt; line-height: 1; }
    .number small { display: block; margin-top: 3mm; color: #706d69; font-size: 7.5pt; line-height: 1.25; }
    .main { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; min-height: 0; }
    .panel { padding: 5mm; background: rgba(255,255,255,.72); border: 1px solid #e2ddd5; }
    h2 { margin: 0 0 4mm; font-size: 15pt; line-height: 1.05; }
    h3 { margin: 0 0 2.5mm; font-size: 10.5pt; color: #2f5f55; }
    ul { margin: 0; padding-left: 4.5mm; }
    li { margin: 0 0 1.8mm; font-size: 9.2pt; line-height: 1.28; }
    .section { margin-bottom: 4mm; }
    .bar-row { display: grid; grid-template-columns: 24mm 1fr 31mm; gap: 2.5mm; align-items: center; margin-bottom: 3mm; }
    .bar-row span { color: #706d69; font-size: 8pt; font-weight: 700; }
    .bar { height: 4mm; background: #eee9df; overflow: hidden; }
    .bar i { display: block; height: 100%; background: #2f5f55; }
    .bar-row strong { font-size: 8.6pt; text-align: right; }
    .concern { margin-bottom: 3mm; padding-bottom: 3mm; border-bottom: 1px solid #e2ddd5; }
    .concern strong { display: block; font-size: 9pt; }
    .concern p { margin: 1.5mm 0 0; color: #5f5b57; font-size: 8.5pt; line-height: 1.26; }
    .cta { padding: 5mm; background: #171717; color: #fff; }
    .cta p { margin: 0; font-size: 14pt; font-weight: 700; line-height: 1.18; }
    .foot { margin-top: 3mm; color: rgba(255,255,255,.62); font-size: 8pt; }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <p class="kicker">Podklad pro schůzi SVJ</p>
      <h1>${escapeHtml(onePager.headline)}</h1>
      <p class="sub">${escapeHtml(onePager.subheadline)}</p>
      <p class="meta">${escapeHtml(locationText)} · ${escapeHtml(goalsText)} · ${escapeHtml(building.flats || "")} bytů</p>
    </header>
    <section class="numbers">
      ${onePager.keyNumbers
        .map(
          (item) => `<article class="number"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(
            item.value,
          )}</strong><small>${escapeHtml(item.note)}</small></article>`,
        )
        .join("")}
    </section>
    <section class="main">
      <article class="panel">
        ${onePager.sections
          .map(
            (section) =>
              `<div class="section"><h2>${escapeHtml(section.title)}</h2>${renderList(section.bullets)}</div>`,
          )
          .join("")}
      </article>
      <article class="panel">
        <div class="section"><h2>Co stojí čekání</h2>${renderPenaltyChart(payload)}</div>
        <div class="section"><h2>Běžné obavy</h2>
          ${onePager.concerns
            .map(
              (item) =>
                `<div class="concern"><strong>${escapeHtml(item.concern)}</strong><p>${escapeHtml(
                  item.response,
                )}</p></div>`,
            )
            .join("")}
        </div>
      </article>
    </section>
    <footer class="cta">
      <p>${escapeHtml(onePager.callToAction)}</p>
      <div class="foot">${
        localCount > 0
          ? escapeHtml(`${localCount} podobných SVJ ve stejné obci už program využilo.`)
          : "Orientační výstup podle dostupných údajů o domě a vybraných opatřeních."
      }</div>
    </footer>
  </main>
</body>
</html>`;
}

function renderLeafletHtml(leaflet, payload) {
  const address = payload.context?.address || {};
  const goals = payload.context?.selectedGoals || [];
  const locationText = [address.municipalityName, address.streetName, address.cp ? `č.p. ${address.cp}` : ""]
    .filter(Boolean)
    .join(" · ");
  const goalsText = goals.map((goal) => goal.label).filter(Boolean).join(", ") || "renovace domu";

  return `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f6f4ef; color: #171717; font-family: Arial, sans-serif; }
    .page { width: 210mm; height: 297mm; padding: 17mm; display: grid; grid-template-rows: auto auto 1fr auto; gap: 11mm; }
    .kicker { margin: 0 0 5mm; color: #2f5f55; font-size: 11pt; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
    h1 { max-width: 178mm; margin: 0; font-size: 44pt; line-height: .92; letter-spacing: -.04em; }
    .sub { max-width: 174mm; margin: 7mm 0 0; color: #5f5b57; font-size: 17pt; font-weight: 700; line-height: 1.15; }
    .meta { margin: 4mm 0 0; color: #7a756f; font-size: 9pt; }
    .numbers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
    .number { min-height: 39mm; padding: 5mm; background: #fff; border: 1px solid #e2ddd5; }
    .number span { display: block; color: #706d69; font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: .02em; }
    .number strong { display: block; margin-top: 6mm; color: #2f5f55; font-size: 22pt; line-height: .95; }
    .body { display: grid; gap: 4mm; align-content: start; }
    .body p { margin: 0; padding: 5mm; background: rgba(255,255,255,.74); border: 1px solid #e2ddd5; font-size: 16pt; font-weight: 700; line-height: 1.18; }
    .cta { padding: 7mm; background: #171717; color: #fff; }
    .cta p { margin: 0; font-size: 22pt; font-weight: 800; line-height: 1.05; }
    .foot { margin-top: 4mm; color: rgba(255,255,255,.62); font-size: 9pt; }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <p class="kicker">Informace pro vlastníky bytů</p>
      <h1>${escapeHtml(leaflet.headline)}</h1>
      <p class="sub">${escapeHtml(leaflet.subheadline)}</p>
      <p class="meta">${escapeHtml(locationText)} · ${escapeHtml(goalsText)}</p>
    </header>
    <section class="numbers">
      ${leaflet.bigNumbers
        .map(
          (item) =>
            `<article class="number"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></article>`,
        )
        .join("")}
    </section>
    <section class="body">
      ${leaflet.body.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
    </section>
    <footer class="cta">
      <p>${escapeHtml(leaflet.callToAction)}</p>
      <div class="foot">Orientační podklad podle dostupných údajů o domě a vybraných opatřeních.</div>
    </footer>
  </main>
</body>
</html>`;
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findPdfBrowser() {
  const candidates = [
    getMaterialConfig().pdfBrowserPath,
    join(process.env.PROGRAMFILES || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error("No PDF browser found. Set PDF_BROWSER_PATH to msedge.exe or chrome.exe.");
}

async function htmlToPdf(html) {
  const workDir = await mkdtemp(join(tmpdir(), "renovuj-pdf-"));
  const htmlPath = join(workDir, "onepager.html");
  const pdfPath = join(workDir, "onepager.pdf");

  try {
    await writeFile(htmlPath, html, "utf8");
    const browser = await findPdfBrowser();
    await execFileAsync(
      browser,
      [
        "--headless",
        "--disable-gpu",
        "--disable-extensions",
        "--no-sandbox",
        `--print-to-pdf=${pdfPath}`,
        pathToFileURL(htmlPath).href,
      ],
      { timeout: 45000 },
    );

    return await readFile(pdfPath);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function generateHoaOnePagerPdf(payload) {
  const text = await callEInfra(makeMaterialPrompt({ ...payload, format: "pdf" }), 0.1);
  const onePager = normalizeOnePager(extractJsonObject(text), payload);
  const html = renderOnePagerHtml(onePager, payload);
  return htmlToPdf(html);
}

export async function generateHallLeafletPdf(payload) {
  const prompt = makeMaterialPrompt({ ...payload, format: "leafletJson" });
  const text = await callEInfra(prompt, 0.1);
  const leaflet = normalizeLeaflet(extractJsonObject(text), payload);
  const html = renderLeafletHtml(leaflet, payload);
  return htmlToPdf(html);
}


