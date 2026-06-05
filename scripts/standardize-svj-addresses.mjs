import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const inputPath = join(rootDir, "backend", "data", "reconstructions", "sfzp_aktivni_IS.csv");
const outputPath = join(rootDir, "backend", "data", "reconstructions", "sfzp_hoa_geocoded.json");
const llmCachePath = join(rootDir, "backend", "data", "reconstructions", "llm-address-cache.json");
const geocodeCachePath = join(rootDir, "backend", "data", "reconstructions", "geocode-cache.json");
const endpoint = "https://llm.ai.e-infra.cz/v1/chat/completions";
const model = process.env.E_INFRA_MODEL || "mini";
const args = new Set(process.argv.slice(2));
const shouldGeocode = args.has("--geocode");
const shouldRefresh = args.has("--refresh");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const batchArg = process.argv.find((arg) => arg.startsWith("--batch="));
const delayArg = process.argv.find((arg) => arg.startsWith("--delay="));
const retriesArg = process.argv.find((arg) => arg.startsWith("--retries="));
const timeoutArg = process.argv.find((arg) => arg.startsWith("--timeout="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : Infinity;
const batchSize = batchArg ? Number.parseInt(batchArg.split("=")[1], 10) : 20;
const delayMs = delayArg ? Number.parseInt(delayArg.split("=")[1], 10) : 1200;
const maxRetries = retriesArg ? Number.parseInt(retriesArg.split("=")[1], 10) : 5;
const requestTimeoutMs = timeoutArg ? Number.parseInt(timeoutArg.split("=")[1], 10) : 90000;

async function loadDotEnv() {
  try {
    const content = await readFile(join(rootDir, ".env"), "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      process.env[key] ??= value;
    }
  } catch {
    // .env is optional.
  }
}

function cleanPart(value) {
  return String(value || "").replace(/^[,;\s]+|[,;\s]+$/g, "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs-CZ")
    .trim();
}

function parseDelimitedLine(line, delimiter = ",") {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === delimiter && !quoted) {
      values.push(current.trim().replace(/^\uFEFF/u, ""));
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim().replace(/^\uFEFF/u, ""));
  return values;
}

function parseNumber(value) {
  const number = Number.parseFloat(String(value || "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function getHeaderIndex(headers, label) {
  const normalizedLabel = normalizeText(label);
  return headers.findIndex((header) => normalizeText(header) === normalizedLabel);
}

async function loadJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function wait(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRetryDelay(attempt) {
  return Math.min(30000, delayMs * 2 ** attempt);
}

function isRetryableStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function isRetryableError(error) {
  const code = error?.cause?.code || error?.code;
  return (
    error?.name === "AbortError" ||
    error?.name === "TimeoutError" ||
    error?.message === "terminated" ||
    ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ECONNREFUSED", "UND_ERR_SOCKET"].includes(code)
  );
}

function getJsonArray(text) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);

    if (!match) {
      throw new Error("LLM response did not contain JSON array.");
    }

    return JSON.parse(match[0]);
  }
}

function makePrompt(rows) {
  return `Jsi parser českých názvů SVJ. Vrať pouze validní JSON array, žádný markdown.

Úkol:
- Z každého záznamu určete jednu standardní adresu domu.
- Formát: "Obec ulice číslo" nebo "Obec číslo", pokud ulice chybí.
- Pokud SVJ obsahuje více domů nebo rozsah čísel, vyber první dům / nejnižší číslo.
- Zachovej českou diakritiku.
- Nehádej ulici, pokud není v textu.
- Pokud adresa nejde určit, standardizedAddress = null.

Příklad:
Input: {"id":"x","zadatel":"Společenství vlastníků bytových jednotek čp. 140‚141 a 142 ve Hvožďanech","obec":"Hvožďany"}
Output: {"id":"x","standardizedAddress":"Hvožďany 140","confidence":"high"}

Vrať položky ve tvaru:
[
  {"id":"...","standardizedAddress":"...","confidence":"high|medium|low"}
]

Záznamy:
${JSON.stringify(rows, null, 2)}`;
}

async function standardizeBatch(rows, token) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(requestTimeoutMs),
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: makePrompt(rows),
            },
          ],
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        const error = new Error(`LLM endpoint failed with ${response.status}: ${responseText}`);
        error.status = response.status;

        if (!isRetryableStatus(response.status)) {
          throw error;
        }

        lastError = error;
      } else {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        const parsed = getJsonArray(content);

        if (!Array.isArray(parsed)) {
          throw new Error("LLM response was not array.");
        }

        return parsed;
      }
    } catch (error) {
      if (!isRetryableError(error) && !error.status) {
        throw error;
      }

      lastError = error;
    }

    if (attempt < maxRetries) {
      const retryDelay = getRetryDelay(attempt);
      console.warn(
        `LLM request failed for ${rows.length} row(s), retry ${attempt + 1}/${maxRetries} in ${retryDelay}ms: ${
          lastError.message
        }`,
      );
      await wait(retryDelay);
    }
  }

  throw lastError || new Error("LLM request failed.");
}

async function standardizeRows(rows, token) {
  try {
    return await standardizeBatch(rows, token);
  } catch (error) {
    if (rows.length <= 1) {
      throw error;
    }

    const splitIndex = Math.ceil(rows.length / 2);
    console.warn(`Batch of ${rows.length} failed after retries. Splitting into ${splitIndex} + ${rows.length - splitIndex}.`);
    const left = await standardizeRows(rows.slice(0, splitIndex), token);
    const right = await standardizeRows(rows.slice(splitIndex), token);
    return [...left, ...right];
  }
}

async function geocode(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${query}, Česko`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "cz");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "renovuj.me hackathon preprocessing",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim failed with ${response.status}`);
  }

  const [result] = await response.json();

  if (!result) {
    return null;
  }

  return {
    lat: Number.parseFloat(result.lat),
    lon: Number.parseFloat(result.lon),
    displayName: result.display_name,
    osmType: result.osm_type,
    osmId: result.osm_id,
  };
}

await loadDotEnv();

const token = process.env.E_INFRA_API_TOKEN;

if (!token) {
  throw new Error("Missing E_INFRA_API_TOKEN in environment or .env.");
}

const csv = await readFile(inputPath, "utf8");
const lines = csv.split(/\r?\n/).filter(Boolean);
const headers = parseDelimitedLine(lines.shift());
const applicantIndex = getHeaderIndex(headers, "Žadatel");
const municipalityIndex = getHeaderIndex(headers, "Obec");
const supportIndex = getHeaderIndex(headers, "Podpora");
const paidIndex = getHeaderIndex(headers, "Vyplaceno");
const purposeIndex = headers.findIndex((header) => normalizeText(header).startsWith("ucel"));
const dateIndex = getHeaderIndex(headers, "Datum podpisu rozhodnutí");
const records = [];

if ([applicantIndex, municipalityIndex, supportIndex, paidIndex, purposeIndex, dateIndex].some((index) => index < 0)) {
  throw new Error(`CSV header mismatch. Found headers: ${headers.join(" | ")}`);
}

for (const line of lines) {
  const columns = parseDelimitedLine(line);
  const applicant = columns[applicantIndex] || "";

  if (!normalizeText(applicant).includes("spolecenstvi vlastniku")) {
    continue;
  }

  const municipalityName = cleanPart(columns[municipalityIndex] || "");

  if (!municipalityName) {
    continue;
  }

  records.push({
    id: `${applicant}|${columns[dateIndex] || ""}|${columns[purposeIndex] || ""}`,
    applicant,
    municipalityName,
    support: parseNumber(columns[supportIndex]),
    paid: parseNumber(columns[paidIndex]),
    purpose: columns[purposeIndex] || "",
    signedAt: columns[dateIndex] || "",
  });

  if (records.length >= limit) {
    break;
  }
}

const llmCache = shouldRefresh ? {} : await loadJson(llmCachePath, {});
const geocodeCache = await loadJson(geocodeCachePath, {});
let standardizedCount = 0;
let geocodedCount = 0;

for (let index = 0; index < records.length; index += batchSize) {
  const batch = records.slice(index, index + batchSize);
  const missingRows = batch
    .filter((record) => !llmCache[record.id])
    .map((record) => ({
      id: record.id,
      zadatel: record.applicant,
      obec: record.municipalityName,
    }));

  if (missingRows.length > 0) {
    const standardized = await standardizeRows(missingRows, token);

    for (const item of standardized) {
      llmCache[item.id] = {
        standardizedAddress: item.standardizedAddress || null,
        confidence: item.confidence || "low",
      };
    }

    await writeFile(llmCachePath, JSON.stringify(llmCache, null, 2), "utf8");
    await wait(delayMs);
  }

  for (const record of batch) {
    const cached = llmCache[record.id] || {};
    record.standardizedAddress = cached.standardizedAddress || null;
    record.addressConfidence = cached.confidence || "low";
    record.applicantAddress = record.standardizedAddress || record.applicant;
    record.geocodeQuery = record.standardizedAddress;
    record.parseQuality = record.standardizedAddress ? "llm" : "missing";

    if (record.standardizedAddress) {
      standardizedCount += 1;
    }

    if (!shouldGeocode || !record.standardizedAddress) {
      continue;
    }

    if (!(record.standardizedAddress in geocodeCache)) {
      try {
        geocodeCache[record.standardizedAddress] = await geocode(record.standardizedAddress);
      } catch (error) {
        geocodeCache[record.standardizedAddress] = { error: error.message };
      }

      await writeFile(geocodeCachePath, JSON.stringify(geocodeCache, null, 2), "utf8");
      await wait(delayMs);
    }

    const geocoded = geocodeCache[record.standardizedAddress];

    if (geocoded?.lat && geocoded?.lon) {
      record.lat = geocoded.lat;
      record.lon = geocoded.lon;
      record.geocodedDisplayName = geocoded.displayName;
      record.osmType = geocoded.osmType;
      record.osmId = geocoded.osmId;
      geocodedCount += 1;
    }
  }

  console.log(`Processed ${Math.min(index + batchSize, records.length)} / ${records.length}`);
}

records.sort((left, right) => right.support - left.support);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "sfzp_aktivni_IS.csv",
      parser: "e-infra-chat-completions",
      model,
      geocoded: shouldGeocode,
      total: records.length,
      standardizedCount,
      geocodedCount,
      records,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(
  `Wrote ${records.length} SVJ records. Standardized ${standardizedCount}. Geocoded ${geocodedCount}.`,
);
