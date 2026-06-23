import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const constructionCodelistPath = join(process.cwd(), "src", "backend", "data", "CE_DRUH_KONSTRUKCE.csv");
const reconstructionCsvPath = join(process.cwd(), "src", "backend", "data", "reconstructions", "sfzp_aktivni_IS.csv");
const reconstructionPreparedPath = join(process.cwd(), "src", "backend", "data", "reconstructions", "sfzp_hoa_geocoded.json");
const ruianApiKey = process.env.RUIAN_API_KEY || "";

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

function cleanPart(value: string): string {
  return value.replace(/^[,;\s]+|[,;\s]+$/g, "").trim();
}

function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs-CZ")
    .trim();
}

function uniqueCandidates(candidates: any[]): any[] {
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

function getNumberMatches(value: string): RegExpMatchArray[] {
  const pattern = /(?:č\.?\s*p\.?\s*)?(\d{1,5})(?:\s*\/\s*\d+[a-zA-Z]?)?/giu;
  return [...value.matchAll(pattern)];
}

function pickHouseNumberSegment(segments: string[]): number {
  if (segments.length > 1) {
    const laterSegment = segments.slice(1).findIndex((segment) => getNumberMatches(segment).length > 0);

    if (laterSegment >= 0) {
      return laterSegment + 1;
    }
  }

  const firstSegment = segments.findIndex((segment) => getNumberMatches(segment).length > 0);
  return firstSegment >= 0 ? firstSegment : 0;
}

function splitStreetAndNumber(segment: string): { cp: string; textBeforeNumber: string } {
  const numberMatches = getNumberMatches(segment);

  if (numberMatches.length === 0) {
    return { cp: "", textBeforeNumber: segment };
  }

  const cpMatch = numberMatches.at(-1)!;
  const cp = cpMatch[1];
  const textBeforeNumber = cleanPart(segment.slice(0, cpMatch.index));
  const textAfterNumber = cleanPart(segment.slice(cpMatch.index! + cpMatch[0].length));
  const remainingText = cleanPart([textBeforeNumber, textAfterNumber].filter(Boolean).join(" "));

  return { cp, textBeforeNumber: remainingText };
}

function createSplitCandidates(textBeforeNumber: string, baseCandidate: any): any[] {
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

function getMunicipalityVariants(value: string): string[] {
  const variants = [value];
  const withoutDistrictNumber = cleanPart(value.replace(/\s+\d+$/u, ""));

  if (withoutDistrictNumber && withoutDistrictNumber !== value) {
    variants.push(withoutDistrictNumber);
  }

  return variants;
}

function parseAddress(input: string) {
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
  const candidates: any[] = [];

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

function normalizeZip(value: any): string {
  return String(value || "").replace(/\s+/g, "");
}

function normalizeHouseNumber(value: any): string {
  const match = String(value || "").match(/\d{1,5}/);
  return match ? match[0] : "";
}

function normalizeOrientationNumber(value: any): string {
  const number = normalizeHouseNumber(value);
  const suffix = cleanPart(String(value || "").replace(number, ""));
  return number ? `${number}${suffix}` : "";
}

function pickMunicipality(address: any): string {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.city_district ||
    ""
  );
}

function normalizeNominatimResult(result: any) {
  const address = result.address || {};
  const municipalityName = cleanPart(pickMunicipality(address));
  const street = cleanPart(address.road || address.pedestrian || address.footway || address.path || "");
  const cp = normalizeHouseNumber(address.house_number);
  const zip = normalizeZip(address.postcode);

  if (!municipalityName || !cp) {
    return null;
  }

  return {
    id: String(result.place_id),
    displayName: result.display_name,
    municipalityName,
    street,
    cp,
    zip,
    lat: result.lat,
    lon: result.lon,
    osmType: result.osm_type,
    osmId: result.osm_id,
  };
}

export async function searchAddresses(query: string) {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 3) {
    throw new Error("Zadejte alespoň tři znaky adresy.");
  }

  const searchUrl = new URL("https://nominatim.openstreetmap.org/search");
  searchUrl.searchParams.set("q", trimmedQuery);
  searchUrl.searchParams.set("format", "jsonv2");
  searchUrl.searchParams.set("addressdetails", "1");
  searchUrl.searchParams.set("countrycodes", "cz");
  searchUrl.searchParams.set("limit", "5");

  const response = await fetch(searchUrl, {
    headers: {
      "accept": "application/json",
      "user-agent": "renovuj.me hackathon prototype",
    },
  });

  if (!response.ok) {
    throw new Error(`Address search failed with ${response.status}`);
  }

  const results = (await response.json()) as any[];
  const matches = results.map(normalizeNominatimResult).filter(Boolean);

  return {
    query: trimmedQuery,
    matches,
    attribution: "© OpenStreetMap contributors",
  };
}

function parseCsvLine(line: string): string[] {
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

function parseDelimitedLine(line: string, delimiter = ","): string[] {
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

function parseNumber(value: any): number {
  const number = Number.parseFloat(String(value || "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function toFiniteNumber(value: any): number | null {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function formatApplicantAddress(applicant: string): string {
  return String(applicant || "")
    .replace(/^společenství vlastníků(?:\s+jednotek|\s+bytových jednotek)?(?:\s+pro\s+dům|\s+domu|\s+v\s+domě)?/iu, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadPreparedReconstructionExamples(): Promise<any[]> {
  try {
    const prepared = JSON.parse(await readFile(reconstructionPreparedPath, "utf8"));
    return Array.isArray(prepared.records) ? prepared.records : [];
  } catch {
    return [];
  }
}

function calculateReconstructionStats(examples: any[]): any {
  const currentYear = new Date().getFullYear().toString();
  const byYear = new Map();
  let totalPaid = 0;

  for (const example of examples) {
    const year = String(example.signedAt || "").slice(0, 4);
    const paid = Number(example.paid) || 0;

    if (!year) {
      continue;
    }

    const yearStats = byYear.get(year) || { year, applicants: 0, paid: 0 };
    yearStats.applicants += 1;
    yearStats.paid += paid;
    byYear.set(year, yearStats);
    totalPaid += paid;
  }

  const yearly = [...byYear.values()].sort((left, right) => left.year.localeCompare(right.year));
  const latestYear = yearly.at(-1)?.year || currentYear;

  return {
    currentYear,
    thisYear: byYear.get(currentYear) || { year: currentYear, applicants: 0, paid: 0 },
    latestYear: byYear.get(latestYear) || { year: latestYear, applicants: 0, paid: 0 },
    totalApplicants: examples.length,
    totalPaid,
  };
}

function addExampleToMunicipalityMap(map: Map<string, any[]>, example: any) {
  const key = normalizeText(example.municipalityName);

  if (!key) {
    return;
  }

  if (!map.has(key)) {
    map.set(key, []);
  }

  map.get(key)!.push(example);
}

function pickRandomExamples(examples: any[], limit: number): any[] {
  return [...examples]
    .map((example) => ({ example, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .slice(0, limit)
    .map((entry) => entry.example);
}

let reconstructionExamplesPromise: Promise<any> | undefined;

async function loadReconstructionExamples() {
  const preparedExamples = await loadPreparedReconstructionExamples();
  const csv = await readFile(reconstructionCsvPath, "utf8");
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = parseDelimitedLine(lines.shift()!);
  const applicantIndex = headers.indexOf("Žadatel");
  const municipalityIndex = headers.indexOf("Obec");
  const supportIndex = headers.indexOf("Podpora");
  const paidIndex = headers.indexOf("Vyplaceno");
  const purposeIndex = headers.indexOf("Účel (Výzva – Číslo žádosti)");
  const dateIndex = headers.indexOf("Datum podpisu rozhodnutí");
  const byMunicipality = new Map<string, any[]>();
  const allExamples = [];
  const preparedByMunicipality = new Map<string, any[]>();

  for (const example of preparedExamples) {
    addExampleToMunicipalityMap(preparedByMunicipality, example);
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

    const example = {
      applicant,
      applicantAddress: formatApplicantAddress(applicant),
      municipalityName,
      support: parseNumber(columns[supportIndex]),
      paid: parseNumber(columns[paidIndex]),
      purpose: columns[purposeIndex] || "",
      signedAt: columns[dateIndex] || "",
    };
    const key = normalizeText(municipalityName);

    addExampleToMunicipalityMap(byMunicipality, example);
    allExamples.push(example);
  }

  for (const examples of byMunicipality.values()) {
    examples.sort((left, right) => right.support - left.support);
  }

  allExamples.sort((left, right) => right.support - left.support);

  const statsSource = preparedExamples.length > 0 ? preparedExamples : allExamples;

  return {
    byMunicipality,
    preparedByMunicipality,
    allExamples,
    preparedExamples: preparedExamples.sort((left, right) => (right.support || 0) - (left.support || 0)),
    stats: calculateReconstructionStats(statsSource),
  };
}

function getReconstructionExamplesStore() {
  reconstructionExamplesPromise ??= loadReconstructionExamples();
  return reconstructionExamplesPromise;
}

export async function getReconstructionExamples({ municipalityName, limit = 4 }: { municipalityName: string; limit?: number }) {
  const store = await getReconstructionExamplesStore();
  const key = normalizeText(municipalityName);
  const localPreparedExamples = store.preparedByMunicipality.get(key) || [];
  const localFallbackExamples = store.byMunicipality.get(key) || [];
  const localExamples = localPreparedExamples.length > 0 ? localPreparedExamples : localFallbackExamples;
  const fallbackPool = store.preparedExamples.length > 0 ? store.preparedExamples : store.allExamples;
  const selected = pickRandomExamples(localExamples.length > 0 ? localExamples : fallbackPool, limit);

  return {
    municipalityName,
    mode: localExamples.length > 0 ? "same-city" : "fallback",
    localCount: localExamples.length,
    totalCount: fallbackPool.length,
    stats: store.stats,
    examples: selected,
  };
}

async function loadConstructionTypes(): Promise<Map<number, string>> {
  const csvBuffer = await readFile(constructionCodelistPath);
  const csv = new TextDecoder("windows-1250").decode(csvBuffer);
  const lines = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift()!);
  const codeIndex = headers.indexOf("KOD");
  const nameIndex = headers.indexOf("NAZEV");
  const shortNameIndex = headers.indexOf("ZKRACENY_NAZEV");
  const map = new Map<number, string>();

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

function formatDate(value: any): string | null {
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

async function fetchJson(url: string | URL) {
  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`);
  }

  return response.json();
}

async function loadLayerDomains(layerId: number, fieldNames: string[]): Promise<Map<string, Map<number, string>>> {
  const layerUrl = new URL(`https://ags.cuzk.cz/arcgis/rest/services/RUIAN/MapServer/${layerId}`);
  layerUrl.searchParams.set("f", "json");

  const layer = await fetchJson(layerUrl);
  const domains = new Map<string, Map<number, string>>();

  for (const field of layer.fields || []) {
    if (!fieldNames.includes(field.name) || !field.domain?.codedValues) {
      continue;
    }

    domains.set(
      field.name,
      new Map(field.domain.codedValues.map((entry: any) => [Number(entry.code), entry.name]))
    );
  }

  return domains;
}

let layer3DomainsPromise: Promise<Map<string, Map<number, string>>> | undefined;

function getLayer3Domains(): Promise<Map<string, Map<number, string>>> {
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

function domainLabel(domains: Map<string, Map<number, string>>, fieldName: string, code: any): string | null {
  if (code === null || code === undefined || code === "") {
    return null;
  }

  return domains.get(fieldName)?.get(Number(code)) || `Kod ${code}`;
}

async function validateAddressCandidate(candidate: any) {
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

async function getAddressId(parsedAddress: any) {
  const errors = [];

  for (const candidate of parsedAddress.candidates) {
    try {
      const validatedAddress = await validateAddressCandidate(candidate);

      if (validatedAddress.place?.ruianId) {
        return { ...validatedAddress, matchedCandidate: candidate };
      }
    } catch (error: any) {
      errors.push(error.message);
    }
  }

  if (errors.length > 0) {
    throw new Error("Adresu se nepodařilo spolehlivě najít. Zkuste přidat obec, ulici, PSČ a číslo popisné.");
  }

  throw new Error("Adresu se nepodařilo spolehlivě najít.");
}

async function getBuildingId(addressId: number): Promise<number> {
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

function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function parseRuianAddressText(value: string) {
  const parts = value.split(",").map(cleanPart).filter(Boolean);
  const streetMatch = parts[0]?.match(/^(.+?)\s+(\d{1,5})(?:\/(\d+[a-zA-Z]?))?$/u);
  const municipalityMatch = parts.at(-1)?.match(/^(\d{3}\s?\d{2})\s+(.+)$/u);
  const municipalityName = municipalityMatch ? cleanPart(municipalityMatch[2]) : cleanPart(parts.at(-1) || "");

  return {
    streetName: streetMatch ? cleanPart(streetMatch[1]) : "",
    cp: streetMatch ? streetMatch[2] : "",
    co: streetMatch?.[3] || "",
    municipalityPartName: parts.length > 2 ? parts[1] : "",
    zip: municipalityMatch ? normalizeZip(municipalityMatch[1]) : "",
    municipalityName: municipalityName.replace(/^Praha\s+\d+$/iu, "Praha"),
  };
}

async function findNearestAddressPoint(lat: number, lon: number) {
  const addressPointUrl = new URL("https://ags.cuzk.cz/arcgis/rest/services/RUIAN/MapServer/1/query");
  addressPointUrl.searchParams.set("geometry", JSON.stringify({
    x: lon,
    y: lat,
    spatialReference: { wkid: 4326 },
  }));
  addressPointUrl.searchParams.set("geometryType", "esriGeometryPoint");
  addressPointUrl.searchParams.set("inSR", "4326");
  addressPointUrl.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  addressPointUrl.searchParams.set("distance", "35");
  addressPointUrl.searchParams.set("units", "esriSRUnit_Meter");
  addressPointUrl.searchParams.set(
    "outFields",
    "kod,stavebniobjekt,adresa,cislodomovni,cisloorientacni,cisloorientacnipismeno,psc"
  );
  addressPointUrl.searchParams.set("returnGeometry", "true");
  addressPointUrl.searchParams.set("outSR", "4326");
  addressPointUrl.searchParams.set("f", "json");

  const response = await fetchJson(addressPointUrl);
  const features = response.features || [];
  const nearest = features
    .map((feature: any) => {
      const featureLat = toFiniteNumber(feature.geometry?.y);
      const featureLon = toFiniteNumber(feature.geometry?.x);

      if (featureLat === null || featureLon === null) {
        return null;
      }

      return {
        feature,
        distance: distanceMeters({ lat, lon }, { lat: featureLat, lon: featureLon }),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.distance - b.distance)[0];

  if (!nearest?.feature?.attributes?.kod) {
    return null;
  }

  const attributes = nearest.feature.attributes;
  const parsed = parseRuianAddressText(attributes.adresa || "");
  const orientationNumber = [
    normalizeOrientationNumber(attributes.cisloorientacni),
    cleanPart(attributes.cisloorientacnipismeno || ""),
  ].filter(Boolean).join("");

  return {
    addressId: attributes.kod,
    buildingId: attributes.stavebniobjekt,
    distanceMeters: nearest.distance,
    address: {
      confidence: 1,
      municipalityName: parsed.municipalityName,
      municipalityPartName: parsed.municipalityPartName,
      streetName: parsed.streetName,
      zip: normalizeZip(attributes.psc) || parsed.zip,
      cp: normalizeHouseNumber(attributes.cislodomovni) || parsed.cp,
      co: orientationNumber || parsed.co,
      displayName: attributes.adresa || "",
      ruianId: attributes.kod,
      lat,
      lon,
    },
  };
}

async function getBuildingAttributes(buildingId: number) {
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

export async function getBuildingInfo(addressInput: any) {
  const selectedLat = typeof addressInput === "object" && addressInput !== null ? toFiniteNumber(addressInput.lat) : null;
  const selectedLon = typeof addressInput === "object" && addressInput !== null ? toFiniteNumber(addressInput.lon) : null;

  const parsedAddress =
    typeof addressInput === "string"
      ? parseAddress(addressInput)
      : {
          address: addressInput.displayName || addressInput.address || "",
          zip: normalizeZip(addressInput.zip),
          cp: normalizeHouseNumber(addressInput.cp),
          candidates: uniqueCandidates([
            {
              address: addressInput.displayName || addressInput.address || "",
              municipalityName: cleanPart(addressInput.municipalityName || ""),
              street: cleanPart(addressInput.street || ""),
              zip: normalizeZip(addressInput.zip),
              cp: normalizeHouseNumber(addressInput.cp),
            },
          ]),
        };

  const addressPoint =
    selectedLat !== null && selectedLon !== null
      ? await findNearestAddressPoint(selectedLat, selectedLon).catch(() => null)
      : null;
  const validatedAddress = addressPoint ? null : await getAddressId(parsedAddress);
  const addressId = addressPoint?.addressId || validatedAddress.place.ruianId;
  const buildingId = addressPoint?.buildingId || await getBuildingId(addressId);
  const attributes = await getBuildingAttributes(buildingId);
  const constructionTypes = await constructionTypesPromise;
  const layer3Domains = await getLayer3Domains();
  const constructionCode = attributes.druhkonstrukcekod;
  const resolvedAddress = addressPoint?.address;

  return {
    query: resolvedAddress?.displayName || parsedAddress.address,
    lookup: {
      addressId,
      buildingId,
      matchedCandidate: addressPoint
        ? {
            address: resolvedAddress?.displayName || parsedAddress.address,
            municipalityName: resolvedAddress?.municipalityName || "",
            street: resolvedAddress?.streetName || "",
            zip: resolvedAddress?.zip || "",
            cp: resolvedAddress?.cp || "",
            distanceMeters: addressPoint.distanceMeters,
          }
        : validatedAddress.matchedCandidate,
    },
    address: {
      confidence: resolvedAddress?.confidence ?? validatedAddress?.place?.confidence,
      municipalityName: resolvedAddress?.municipalityName ?? validatedAddress?.place?.municipalityName,
      municipalityPartName: resolvedAddress?.municipalityPartName ?? validatedAddress?.place?.municipalityPartName,
      streetName: resolvedAddress?.streetName ?? validatedAddress?.place?.streetName,
      zip: resolvedAddress?.zip ?? validatedAddress?.place?.zip,
      cp: resolvedAddress?.cp ?? validatedAddress?.place?.cp,
      ruianId: addressId,
      lat: resolvedAddress?.lat ?? selectedLat,
      lon: resolvedAddress?.lon ?? selectedLon,
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
