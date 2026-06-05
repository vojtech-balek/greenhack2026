import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const frontendDir = join(rootDir, "frontend");
const backendImgDir = join(rootDir, "backend", "img");
const constructionCodelistPath = join(rootDir, "backend", "data", "CE_DRUH_KONSTRUKCE.csv");
const port = Number.parseInt(process.env.PORT || "3000", 10);

async function loadDotEnv(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    const entries = {};

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

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      entries[key] = value;
    }

    return entries;
  } catch {
    return {};
  }
}

const dotEnv = await loadDotEnv(join(rootDir, ".env"));
const ruianApiKey = process.env.RUIAN_API_KEY || dotEnv.RUIAN_API_KEY || "";
const buildingAttributeFields = [
  "kod",
  "typstavebnihoobjektukod",
  "zpusobvyuzitikod",
  "dokonceni",
  "druhkonstrukcekod",
  "obestavenyprostor",
  "pocetbytu",
  "pocetpodlazi",
  "podlahovaplocha",
  "pripojenikanalizacekod",
  "pripojeniplynkod",
  "pripojenivodovodkod",
  "vybavenivytahemkod",
  "zastavenaplocha",
  "zpusobvytapenikod",
];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function json(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": mimeTypes[".json"] });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function cleanPart(value) {
  return value.replace(/^[,;\s]+|[,;\s]+$/g, "").trim();
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  const unique = [];

  for (const candidate of candidates) {
    const key = [candidate.municipalityName, candidate.zip || "", candidate.cp, candidate.street || ""]
      .map((value) => value.toLocaleLowerCase("cs-CZ"))
      .join("|");

    if (!seen.has(key) && candidate.municipalityName && candidate.cp) {
      seen.add(key);
      unique.push(candidate);
    }
  }

  return unique;
}

function getNumberMatches(value) {
  const pattern = /(?:č\.?\s*p\.?\s*)?(\d{1,5})(?:\s*\/\s*\d+[a-zA-Z]?)?/giu;
  return [...value.matchAll(pattern)];
}

function pickHouseNumberSegment(segments) {
  if (segments.length > 1) {
    const laterSegment = segments.slice(1).findIndex((segment) => getNumberMatches(segment).length > 0);

    if (laterSegment >= 0) {
      return laterSegment + 1;
    }
  }

  const firstSegment = segments.findIndex((segment) => getNumberMatches(segment).length > 0);
  return firstSegment >= 0 ? firstSegment : 0;
}

function splitStreetAndNumber(segment) {
  const numberMatches = getNumberMatches(segment);

  if (numberMatches.length === 0) {
    return { cp: "", textBeforeNumber: segment };
  }

  const cpMatch = numberMatches.at(-1);
  const cp = cpMatch[1];
  const textBeforeNumber = cleanPart(segment.slice(0, cpMatch.index));
  const textAfterNumber = cleanPart(segment.slice(cpMatch.index + cpMatch[0].length));
  const remainingText = cleanPart([textBeforeNumber, textAfterNumber].filter(Boolean).join(" "));

  return { cp, textBeforeNumber: remainingText };
}

function createSplitCandidates(textBeforeNumber, baseCandidate) {
  const candidates = [];
  const tokens = textBeforeNumber.split(/\s+/).filter(Boolean);

  if (textBeforeNumber) {
    candidates.push({
      ...baseCandidate,
      municipalityName: textBeforeNumber,
      street: "",
    });
  }

  for (let index = 1; index < tokens.length; index += 1) {
    candidates.push({
      ...baseCandidate,
      municipalityName: tokens.slice(0, index).join(" "),
      street: tokens.slice(index).join(" "),
    });
  }

  return candidates;
}

function getMunicipalityVariants(value) {
  const variants = [value];
  const withoutDistrictNumber = cleanPart(value.replace(/\s+\d+$/u, ""));

  if (withoutDistrictNumber && withoutDistrictNumber !== value) {
    variants.push(withoutDistrictNumber);
  }

  return variants;
}

function parseAddress(input) {
  const address = input.trim().replace(/\s+/g, " ");
  const zipMatch = address.match(/\b(\d{3})\s?(\d{2})\b/);
  const zip = zipMatch ? `${zipMatch[1]}${zipMatch[2]}` : "";
  const addressWithoutZip = cleanPart(zipMatch ? address.replace(zipMatch[0], " ") : address);
  const segments = addressWithoutZip.split(",").map(cleanPart).filter(Boolean);
  const numberSegmentIndex = pickHouseNumberSegment(segments);
  const numberSegment = segments[numberSegmentIndex] || addressWithoutZip;
  const { cp, textBeforeNumber } = splitStreetAndNumber(numberSegment);

  if (!cp) {
    throw new Error("Zadejte adresu včetně čísla popisného.");
  }

  const otherSegments = segments.filter((_, index) => index !== numberSegmentIndex);
  const baseCandidate = { address, zip, cp };
  const candidates = [];

  for (const segment of otherSegments) {
    for (const municipalityName of getMunicipalityVariants(segment)) {
      candidates.push({
        ...baseCandidate,
        municipalityName,
        street: textBeforeNumber,
      });
    }
  }

  candidates.push(...createSplitCandidates(textBeforeNumber, baseCandidate));

  if (zip && textBeforeNumber) {
    candidates.push({
      ...baseCandidate,
      municipalityName: textBeforeNumber,
      street: "",
    });
  }

  const parsedCandidates = uniqueCandidates(candidates);

  if (parsedCandidates.length === 0) {
    throw new Error("Zadejte obec, číslo popisné a případně PSČ, například: Praha, Vodičkova 18, 110 00.");
  }

  return { address, zip, cp, candidates: parsedCandidates };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (const character of line) {
    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === ";" && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

async function loadConstructionTypes() {
  const csvBuffer = await readFile(constructionCodelistPath);
  const csv = new TextDecoder("windows-1250").decode(csvBuffer);
  const lines = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());
  const codeIndex = headers.indexOf("KOD");
  const nameIndex = headers.indexOf("NAZEV");
  const shortNameIndex = headers.indexOf("ZKRACENY_NAZEV");
  const map = new Map();

  for (const line of lines) {
    const columns = parseCsvLine(line);
    const code = columns[codeIndex];
    const label = columns[shortNameIndex] || columns[nameIndex];

    if (code && label) {
      map.set(Number(code), label);
    }
  }

  return map;
}

const constructionTypesPromise = loadConstructionTypes();

function formatDate(value) {
  if (typeof value !== "number") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`);
  }

  return response.json();
}

async function loadLayerDomains(layerId, fieldNames) {
  const layerUrl = new URL(`https://ags.cuzk.cz/arcgis/rest/services/RUIAN/MapServer/${layerId}`);
  layerUrl.searchParams.set("f", "json");

  const layer = await fetchJson(layerUrl);
  const domains = new Map();

  for (const field of layer.fields || []) {
    if (!fieldNames.includes(field.name) || !field.domain?.codedValues) {
      continue;
    }

    domains.set(
      field.name,
      new Map(field.domain.codedValues.map((entry) => [Number(entry.code), entry.name])),
    );
  }

  return domains;
}

let layer3DomainsPromise;

function getLayer3Domains() {
  layer3DomainsPromise ??= loadLayerDomains(3, [
    "typstavebnihoobjektukod",
    "zpusobvyuzitikod",
    "pripojenikanalizacekod",
    "pripojeniplynkod",
    "pripojenivodovodkod",
    "vybavenivytahemkod",
    "zpusobvytapenikod",
  ]).catch(() => new Map());

  return layer3DomainsPromise;
}

function domainLabel(domains, fieldName, code) {
  if (code === null || code === undefined || code === "") {
    return null;
  }

  return domains.get(fieldName)?.get(Number(code)) || `Kod ${code}`;
}

async function validateAddressCandidate(candidate) {
  const validationUrl = new URL("https://ruian.fnx.io/api/v1/ruian/validate");
  validationUrl.searchParams.set("municipalityName", candidate.municipalityName);
  validationUrl.searchParams.set("cp", candidate.cp);

  if (candidate.zip) {
    validationUrl.searchParams.set("zip", candidate.zip);
  }

  if (candidate.street) {
    validationUrl.searchParams.set("street", candidate.street);
  }

  if (ruianApiKey) {
    validationUrl.searchParams.set("apiKey", ruianApiKey);
  }

  return fetchJson(validationUrl);
}

async function getAddressId(parsedAddress) {
  const errors = [];

  for (const candidate of parsedAddress.candidates) {
    try {
      const validatedAddress = await validateAddressCandidate(candidate);

      if (validatedAddress.place?.ruianId) {
        return { ...validatedAddress, matchedCandidate: candidate };
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (errors.length > 0) {
    throw new Error("Adresu se nepodařilo spolehlivě najít. Zkuste přidat obec, ulici, PSČ a číslo popisné.");
  }

  throw new Error("Adresu se nepodařilo spolehlivě najít.");
}

async function getBuildingId(addressId) {
  const buildingUrl = new URL("https://ags.cuzk.cz/arcgis/rest/services/RUIAN/MapServer/1/query");
  buildingUrl.searchParams.set("where", `kod=${addressId}`);
  buildingUrl.searchParams.set("outFields", "stavebniobjekt");
  buildingUrl.searchParams.set("returnGeometry", "false");
  buildingUrl.searchParams.set("f", "json");

  const buildingResponse = await fetchJson(buildingUrl);
  const attributes = buildingResponse.features?.[0]?.attributes;
  const buildingId = attributes?.stavebniobjekt ?? attributes?.stavebniObjektKod;

  if (!buildingId) {
    throw new Error("K adrese se nepodařilo dohledat kód stavebního objektu.");
  }

  return buildingId;
}

async function getBuildingAttributes(buildingId) {
  const attributesUrl = new URL("https://ags.cuzk.cz/arcgis/rest/services/RUIAN/MapServer/3/query");
  attributesUrl.searchParams.set("where", `kod=${buildingId}`);
  attributesUrl.searchParams.set("outFields", buildingAttributeFields.join(","));
  attributesUrl.searchParams.set("returnGeometry", "false");
  attributesUrl.searchParams.set("f", "json");

  const attributesResponse = await fetchJson(attributesUrl);
  const attributes = attributesResponse.features?.[0]?.attributes;

  if (!attributes) {
    throw new Error("K nalezenému stavebnímu objektu se nepodařilo načíst parametry domu.");
  }

  return attributes;
}

async function getBuildingInfo(addressInput) {
  const parsedAddress = parseAddress(addressInput);
  const validatedAddress = await getAddressId(parsedAddress);
  const addressId = validatedAddress.place.ruianId;
  const buildingId = await getBuildingId(addressId);
  const attributes = await getBuildingAttributes(buildingId);
  const constructionTypes = await constructionTypesPromise;
  const layer3Domains = await getLayer3Domains();
  const constructionCode = attributes.druhkonstrukcekod;

  return {
    query: parsedAddress.address,
    lookup: {
      addressId,
      buildingId,
      matchedCandidate: validatedAddress.matchedCandidate,
    },
    address: {
      confidence: validatedAddress.place.confidence,
      municipalityName: validatedAddress.place.municipalityName,
      municipalityPartName: validatedAddress.place.municipalityPartName,
      streetName: validatedAddress.place.streetName,
      zip: validatedAddress.place.zip,
      cp: validatedAddress.place.cp,
      ruianId: addressId,
    },
    building: {
      stavebniObjektKod: attributes.kod,
      buildingTypeCode: attributes.typstavebnihoobjektukod ?? null,
      buildingType: domainLabel(layer3Domains, "typstavebnihoobjektukod", attributes.typstavebnihoobjektukod),
      usageCode: attributes.zpusobvyuzitikod ?? null,
      usage: domainLabel(layer3Domains, "zpusobvyuzitikod", attributes.zpusobvyuzitikod),
      completedAt: formatDate(attributes.dokonceni),
      completedAtRaw: attributes.dokonceni,
      builtAreaM2: attributes.zastavenaplocha ?? null,
      floorAreaM2: attributes.podlahovaplocha ?? null,
      enclosedVolumeM3: attributes.obestavenyprostor ?? null,
      constructionTypeCode: constructionCode ?? null,
      constructionType:
        constructionTypes.get(Number(constructionCode)) || (constructionCode ? `Kód ${constructionCode}` : null),
      floors: attributes.pocetpodlazi ?? null,
      flats: attributes.pocetbytu ?? null,
      utilities: {
        sewerCode: attributes.pripojenikanalizacekod ?? null,
        sewer: domainLabel(layer3Domains, "pripojenikanalizacekod", attributes.pripojenikanalizacekod),
        gasCode: attributes.pripojeniplynkod ?? null,
        gas: domainLabel(layer3Domains, "pripojeniplynkod", attributes.pripojeniplynkod),
        waterCode: attributes.pripojenivodovodkod ?? null,
        water: domainLabel(layer3Domains, "pripojenivodovodkod", attributes.pripojenivodovodkod),
        elevatorCode: attributes.vybavenivytahemkod ?? null,
        elevator: domainLabel(layer3Domains, "vybavenivytahemkod", attributes.vybavenivytahemkod),
        heatingCode: attributes.zpusobvytapenikod ?? null,
        heating: domainLabel(layer3Domains, "zpusobvytapenikod", attributes.zpusobvytapenikod),
      },
    },
  };
}

function resolveStaticPath(urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  const resolvedPath = normalize(join(frontendDir, cleanPath));

  if (!resolvedPath.startsWith(frontendDir)) {
    return null;
  }

  return resolvedPath;
}

function resolveImagePath(urlPath) {
  if (!urlPath.startsWith("/img/")) {
    return null;
  }

  const relativePath = urlPath.replace(/^\/img\//, "");
  const resolvedPath = normalize(join(backendImgDir, relativePath));

  if (!resolvedPath.startsWith(backendImgDir)) {
    return null;
  }

  return resolvedPath;
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const filePath = resolveImagePath(url.pathname) || resolveStaticPath(url.pathname);

  if (!filePath) {
    json(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(file);
  } catch {
    json(response, 404, { error: "Not found" });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/health") {
    json(response, 200, { ok: true, service: "renovuj.me" });
    return;
  }

  if (url.pathname === "/api/site-status") {
    json(response, 200, { label: "Ready", updatedAt: new Date().toISOString() });
    return;
  }

  if (url.pathname === "/api/building-info" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const buildingInfo = await getBuildingInfo(body.address || "");
      json(response, 200, buildingInfo);
    } catch (error) {
      json(response, 400, { error: error.message || "Nepodařilo se načíst údaje o domu." });
    }

    return;
  }

  await serveStatic(request, response);
});

server.listen(port, () => {
  console.log(`renovuj.me running at http://localhost:${port}`);
});
