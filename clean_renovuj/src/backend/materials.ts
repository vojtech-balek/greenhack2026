import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir, platform } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import process from "node:process";

const execFileAsync = promisify(execFile);

import { existsSync, readFileSync } from "node:fs";

// Helper to find prompts directory in either src/backend or backend folder
function getPromptsDirSync(): string {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "src", "backend", "prompts"),
    join(cwd, "backend", "prompts"),
    join(cwd, "dist", "backend", "prompts"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to default
  return join(cwd, "src", "backend", "prompts");
}

export interface PromptFiles {
  base: string;
  pdf: string;
  whatsapp: string;
  leaflet: string;
  leafletJson: string;
  personas: Record<string, string>;
}

export interface MaterialGeneratorConfig {
  eInfraToken: string;
  eInfraEndpoint: string;
  eInfraModel: string;
  pdfBrowserPath: string;
  promptFiles: PromptFiles;
}

export function loadMaterialGeneratorConfigSync(env: Record<string, string | undefined> = process.env): MaterialGeneratorConfig {
  const promptsDir = getPromptsDirSync();

  const promptFiles: PromptFiles = {
    base: readFileSync(join(promptsDir, "material-base.md"), "utf8"),
    pdf: readFileSync(join(promptsDir, "material-pdf-json.md"), "utf8"),
    whatsapp: readFileSync(join(promptsDir, "material-whatsapp.md"), "utf8"),
    leaflet: readFileSync(join(promptsDir, "material-leaflet.md"), "utf8"),
    leafletJson: readFileSync(join(promptsDir, "material-leaflet-json.md"), "utf8"),
    personas: {
      opatrna: readFileSync(join(promptsDir, "personas", "opatrna.md"), "utf8"),
      kalkulacka: readFileSync(join(promptsDir, "personas", "kalkulacka.md"), "utf8"),
      zitrek: readFileSync(join(promptsDir, "personas", "zitrek.md"), "utf8"),
      neduverivy: readFileSync(join(promptsDir, "personas", "neduverivy.md"), "utf8"),
      inzenyr: readFileSync(join(promptsDir, "personas", "inzenyr.md"), "utf8"),
      newcomer: readFileSync(join(promptsDir, "personas", "newcomer.md"), "utf8"),
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

let materialConfig: MaterialGeneratorConfig | undefined;

export function setMaterialGeneratorConfig(config: MaterialGeneratorConfig) {
  materialConfig = config;
}

function getMaterialConfig(): MaterialGeneratorConfig {
  if (!materialConfig) {
    materialConfig = loadMaterialGeneratorConfigSync();
  }
  return materialConfig;
}

function compactJson(value: any): string {
  return JSON.stringify(value, null, 2);
}

function personaInstruction(persona: { id: string; name?: string; description?: string }): string {
  const config = getMaterialConfig();
  if (config.promptFiles.personas[persona.id]) {
    return config.promptFiles.personas[persona.id].trim();
  }

  return `Custom persona "${persona.name || "Vlastní persona"}": ${
    persona.description || ""
  }. Infer likely motivation, objection, and best persuasion style. Do not invent demographic facts. Use only stated or clearly implied facts.`;
}

function makeMaterialPrompt(payload: any): string {
  const config = getMaterialConfig();
  const format = payload.format || "pdf";
  const personaPrompts = (payload.selectedPersonas || []).map(personaInstruction);
  const formatPrompt = config.promptFiles[format as keyof PromptFiles] || config.promptFiles.pdf;

  return `${config.promptFiles.base}

${formatPrompt}

Persona strategie:
${
  personaPrompts.length
    ? personaPrompts.map((item: string) => `- ${item}`).join("\n")
    : "- Nebyla vybrána konkrétní persona. Použij obecný sousedský tón."
}

Data:
${compactJson(payload.context)}

Grafy a vizuální podklady:
${compactJson(payload.visuals)}

Lokální důkaz / podobné domy:
${compactJson(payload.localExamples)}
`;
}

async function callEInfra(prompt: string, temperature = 0.25): Promise<string> {
  const config = getMaterialConfig();
  if (!config.eInfraToken) {
    throw new Error("Missing E_INFRA_API_TOKEN in environment or .env.");
  }

  const response = await fetch(config.eInfraEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.eInfraToken}`,
    },
    body: JSON.stringify({
      model: config.eInfraModel,
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

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content || "";
}

export async function generatePersuasionMaterial(payload: any): Promise<string> {
  return callEInfra(makeMaterialPrompt(payload), 0.25);
}

function extractJsonObject(text: string): any {
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

function arrayOfStrings(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function normalizeOnePager(value: any, payload: any): any {
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

  const sections = (
    Array.isArray(value.sections) && value.sections.length
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
        ]
  )
    .slice(0, 3)
    .map((section: any) => ({
      title: String(section.title || "").trim(),
      bullets: arrayOfStrings(section.bullets).slice(0, 4),
    }));

  const hasNonFinancialSection = sections.some((section: any) =>
    [section.title, ...section.bullets]
      .join(" ")
      .match(/komfort|teplot|vlhk|hluk|vzduch|vzhled|havári|opravy|zdrav|soused/i)
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
      .map((item: any, index: number) => ({
        label: String(item.label || fallbackNumbers[index]?.label || "").trim(),
        value: String(item.value || fallbackNumbers[index]?.value || "").trim(),
        note: String(item.note || fallbackNumbers[index]?.note || "").trim(),
      })),
    sections,
    concerns: (Array.isArray(value.concerns) ? value.concerns : [])
      .slice(0, 4)
      .map((item: any) => ({
        concern: String(item.concern || "").trim(),
        response: String(item.response || "").trim(),
      }))
      .filter((item: any) => item.concern && item.response),
    callToAction: String(
      value.callToAction || "Navrhujeme schválit přípravu projektu a ověřit přesné financování pro náš dům."
    ).trim(),
  };
}

function normalizeLeaflet(value: any, payload: any): any {
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
    .map((item: any, index: number) => ({
      label: String(item.label || fallbackNumbers[index]?.label || "").trim(),
      value: String(item.value || fallbackNumbers[index]?.value || "").trim(),
    }));
  const body = arrayOfStrings(value.body).slice(0, 5);
  const hasNonFinancialBenefit = body
    .join(" ")
    .match(/komfort|teplot|vlhk|hluk|vzduch|vzhled|havári|opravy|zdrav|pohodl/i);

  if (!hasNonFinancialBenefit) {
    body.push(nonFinancialBenefits[0]);
  }

  return {
    headline: String(value.headline || "Renovaci je výhodné řešit teď").trim(),
    subheadline: String(value.subheadline || "Krátký podklad pro vlastníky bytů v našem domě.").trim(),
    bigNumbers,
    body: body.length ? body : nonFinancialBenefits.slice(0, 3),
    callToAction: String(
      value.callToAction || "Nezávazně ověřme možnosti financování a připravme podklady pro rozhodnutí SVJ."
    ).trim(),
  };
}

function formatCurrencyPlain(value: any): string {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  })
    .format(number)
    .replace(/\u00A0/g, " ");
}

function escapeHtml(value: any): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderList(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderPenaltyChart(payload: any): string {
  const items = payload.visuals?.penaltyBreakdown || [];
  const maxValue = Math.max(...items.map((item: any) => Number(item.value) || 0), 1);

  return items
    .map((item: any) => {
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

function renderOnePagerHtml(onePager: any, payload: any): string {
  const building = payload.context?.building || {};
  const goals = payload.context?.selectedGoals || [];
  const localCount = payload.localExamples?.summary?.localCount || 0;
  const goalsText = goals
    .map((goal: any) => goal.label)
    .filter(Boolean)
    .join(", ") || "vybraná opatření";

  const address = payload.context?.address || {};
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
          (item: any) =>
            `<article class="number"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(
              item.value
            )}</strong><small>${escapeHtml(item.note)}</small></article>`
        )
        .join("")}
    </section>
    <section class="main">
      <article class="panel">
        ${onePager.sections
          .map(
            (section: any) =>
              `<div class="section"><h2>${escapeHtml(section.title)}</h2>${renderList(section.bullets)}</div>`
          )
          .join("")}
      </article>
      <article class="panel">
        <div class="section"><h2>Co stojí čekání</h2>${renderPenaltyChart(payload)}</div>
        <div class="section"><h2>Běžné obavy</h2>
          ${onePager.concerns
            .map(
              (item: any) =>
                `<div class="concern"><strong>${escapeHtml(item.concern)}</strong><p>${escapeHtml(
                  item.response
                )}</p></div>`
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

function renderLeafletHtml(leaflet: any, payload: any): string {
  const address = payload.context?.address || {};
  const goals = payload.context?.selectedGoals || [];
  const locationText = [address.municipalityName, address.streetName, address.cp ? `č.p. ${address.cp}` : ""]
    .filter(Boolean)
    .join(" · ");
  const goalsText = goals
    .map((goal: any) => goal.label)
    .filter(Boolean)
    .join(", ") || "renovace domu";

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
          (item: any) =>
            `<article class="number"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></article>`
        )
        .join("")}
    </section>
    <section class="body">
      ${leaflet.body.map((item: string) => `<p>${escapeHtml(item)}</p>`).join("")}
    </section>
    <footer class="cta">
      <p>${escapeHtml(leaflet.callToAction)}</p>
      <div class="foot">Orientační podklad podle dostupných údajů o domě a vybraných opatřeních.</div>
    </footer>
  </main>
</body>
</html>`;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findPdfBrowser(): Promise<string> {
  const config = getMaterialConfig();
  const candidates = [
    config.pdfBrowserPath,
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

async function htmlToPdfWithBrowser(html: string): Promise<Buffer> {
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
        new URL(`file://${htmlPath}`).href,
      ],
      { timeout: 45000 }
    );

    return await readFile(pdfPath);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function htmlToPdfWithPuppeteer(html: string): Promise<Buffer> {
  let browser: any;
  try {
    let puppeteer: any;
    try {
      puppeteer = (await import("puppeteer")).default;
    } catch (importError: any) {
      console.error("Puppeteer import failed:", importError.message);
      throw new Error(
        "PDF generation requires Puppeteer on Linux. " +
          "Ensure 'npm install' or 'bun install' was run and the puppeteer package is installed. " +
          "Or set PDF_BROWSER_PATH on Windows to use Edge/Chrome."
      );
    }
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    return await page.pdf({ format: "A4", margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function htmlToPdf(html: string): Promise<Buffer> {
  if (platform() === "linux") {
    return htmlToPdfWithPuppeteer(html);
  }
  return htmlToPdfWithBrowser(html);
}

export async function generateHoaOnePagerPdf(payload: any): Promise<Buffer> {
  const text = await callEInfra(makeMaterialPrompt({ ...payload, format: "pdf" }), 0.1);
  const onePager = normalizeOnePager(extractJsonObject(text), payload);
  const html = renderOnePagerHtml(onePager, payload);
  return htmlToPdf(html);
}

export async function generateHallLeafletPdf(payload: any): Promise<Buffer> {
  const prompt = makeMaterialPrompt({ ...payload, format: "leafletJson" });
  const text = await callEInfra(prompt, 0.1);
  const leaflet = normalizeLeaflet(extractJsonObject(text), payload);
  const html = renderLeafletHtml(leaflet, payload);
  return htmlToPdf(html);
}
