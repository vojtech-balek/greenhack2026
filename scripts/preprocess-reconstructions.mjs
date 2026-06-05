import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const inputPath = join(rootDir, "backend", "data", "reconstructions", "sfzp_aktivni_IS.csv");
const outputPath = join(rootDir, "backend", "data", "reconstructions", "sfzp_hoa_geocoded.json");
const cachePath = join(rootDir, "backend", "data", "reconstructions", "geocode-cache.json");
const args = new Set(process.argv.slice(2));
const shouldGeocode = args.has("--geocode");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : Infinity;
const delayArg = process.argv.find((arg) => arg.startsWith("--delay="));
const geocodeDelayMs = delayArg ? Number.parseInt(delayArg.split("=")[1], 10) : 1100;

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

function compactApplicant(applicant) {
  return cleanPart(
    applicant
      .replace(/\u201a/g, ",")
      .replace(
        /^společenství vlastníků(?:\s+jednotek|\s+bytových jednotek)?(?:\s+pro\s+dům|\s+domu|\s+v\s+domě)?/iu,
        "",
      )
      .replace(/\bPSČ\s*\d{3}\s*\d{2}\b/giu, "")
      .replace(/\b\d{3}\s*\d{2}\b/g, ""),
  );
}

function extractAddressParts(applicant, municipalityName) {
  const compacted = compactApplicant(applicant);
  const normalizedMunicipality = normalizeText(municipalityName);
  const segments = compacted
    .split(",")
    .map(cleanPart)
    .filter(Boolean)
    .filter((segment) => normalizeText(segment) !== normalizedMunicipality);
  const houseNumberMatch = compacted.match(
    /(?:č\.?\s*p\.?|čp\.?|cp\.?)?\s*(\d{1,5})(?:\s*[-–]\s*(\d{1,5}))?/iu,
  );
  const houseNumber = houseNumberMatch ? houseNumberMatch[1] : "";
  const rangeEnd = houseNumberMatch?.[2] || "";
  let street = "";

  const streetPattern = compacted.match(
    /(?:ulice|ul\.|třída|náměstí|nám\.|ulici)\s+([^,]+?)(?:\s+(?:v|ve|na)\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]|,|\d|$)/iu,
  );

  if (streetPattern) {
    street = cleanPart(streetPattern[1]);
  }

  if (!street && houseNumberMatch) {
    const numberSegment = segments.find((segment) => segment.includes(houseNumberMatch[0])) || "";
    const beforeNumber = cleanPart(numberSegment.slice(0, numberSegment.indexOf(houseNumberMatch[0])));

    if (beforeNumber && !/\b(dům|domu|č\.?p\.?|čp\.?|cp\.?)\b/iu.test(beforeNumber)) {
      street = beforeNumber;
    }
  }

  if (!street) {
    const namedSegment = segments.find((segment) => {
      const normalized = normalizeText(segment);
      return (
        !/\d{1,5}/.test(segment) &&
        normalized !== normalizedMunicipality &&
        !normalized.includes("spolecenstvi") &&
        !normalized.includes("vlastniku")
      );
    });
    street = namedSegment || "";
  }

  const query = [street && houseNumber ? `${street} ${houseNumber}` : "", municipalityName, "Česko"]
    .filter(Boolean)
    .join(", ");

  return {
    applicantAddress: compacted,
    street,
    houseNumber,
    houseNumberRangeEnd: rangeEnd,
    geocodeQuery: query,
    parseQuality: street && houseNumber ? "street-house" : houseNumber ? "house" : "municipality",
  };
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

async function geocode(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
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

const csv = await readFile(inputPath, "utf8");
const lines = csv.split(/\r?\n/).filter(Boolean);
const headers = parseDelimitedLine(lines.shift());
const applicantIndex = headers.indexOf("Žadatel");
const municipalityIndex = headers.indexOf("Obec");
const supportIndex = headers.indexOf("Podpora");
const paidIndex = headers.indexOf("Vyplaceno");
const purposeIndex = headers.indexOf("Účel (Výzva – Číslo žádosti)");
const dateIndex = headers.indexOf("Datum podpisu rozhodnutí");
const records = [];

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

  const addressParts = extractAddressParts(applicant, municipalityName);

  records.push({
    id: `${columns[applicantIndex] || ""}|${columns[dateIndex] || ""}|${columns[purposeIndex] || ""}`,
    applicant,
    municipalityName,
    support: parseNumber(columns[supportIndex]),
    paid: parseNumber(columns[paidIndex]),
    purpose: columns[purposeIndex] || "",
    signedAt: columns[dateIndex] || "",
    ...addressParts,
  });

  if (records.length >= limit) {
    break;
  }
}

const cache = await loadJson(cachePath, {});
let geocodedCount = 0;

if (shouldGeocode) {
  for (const record of records) {
    const cacheKey = record.geocodeQuery;

    if (!(cacheKey in cache)) {
      try {
        cache[cacheKey] = await geocode(cacheKey);
      } catch (error) {
        cache[cacheKey] = { error: error.message };
      }

      await wait(geocodeDelayMs);
    }

    const cached = cache[cacheKey];

    if (cached?.lat && cached?.lon) {
      record.lat = cached.lat;
      record.lon = cached.lon;
      record.geocodedDisplayName = cached.displayName;
      record.osmType = cached.osmType;
      record.osmId = cached.osmId;
      geocodedCount += 1;
    }
  }

  await writeFile(cachePath, JSON.stringify(cache, null, 2), "utf8");
}

records.sort((left, right) => right.support - left.support);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "sfzp_aktivni_IS.csv",
      geocoded: shouldGeocode,
      total: records.length,
      geocodedCount,
      records,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(
  `Wrote ${records.length} HOA reconstruction records to ${outputPath}${
    shouldGeocode ? ` (${geocodedCount} geocoded)` : ""
  }.`,
);
