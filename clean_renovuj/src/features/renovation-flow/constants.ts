import {
  CloudRain,
  Droplets,
  Flame,
  Layers,
  Leaf,
  Recycle,
  SunMedium,
  Wind,
} from "lucide-react";
export type Step =
  | "hero"
  | "goals"
  | "property"
  | "summary"
  | "financials"
  | "urgency"
  | "community"
  | "stakeholders"
  | "distribution";

// All figures are illustrative for an 18-flat Vinohrady tenement and are
// re-derived from public sources cited in SOURCES below.
export const FINANCIALS = {
  totalProjectCost: 14_280_000, // CZK — full envelope across all eligible measures
  outOfPocket: 0,
  outOfPocketUnit: "CZK upfront (0 CZK / flat)",
  outOfPocketNote:
    "The NZU 2026+ interest-free loan (up to 750 000 CZK / flat, capped per measure by State Environmental Fund) plus a small commercial top-up cover the full 14.28M CZK envelope. Nothing comes out of your pocket on day one.",
  // Vinohrady avg offer price ≈ 180 000 CZK/m² (Brivo, Q1 2026), assumed
  // 18 flats × ~80 m² = 1 440 m². Post-renovation +11% is a working
  // estimate — real-world deep-renovation uplift in Czech panel/brick
  // housing typically lands in the 5–15% range.
  valueUplift: 11, // %
  valueBefore: 259_200_000, // CZK — 1 440 m² × 180 000 CZK/m²
  valueAfter: 287_700_000, // CZK — +11%
  monthly: {
    loanRepayment: 2500, // per flat — 750k principal / 25 yr / 12 mo
    energySavings: 2450, // per flat — illustrative; depends on heat source & envelope
    net: -50, // per flat — roughly break-even from month one
    note: "Per flat. Numbers are an illustrative model — actual repayment and savings depend on the chosen bank, drawdown profile and as-built energy performance.",
  },
  financingMix: [
    {
      label: "New Green Savings 2026+ — interest-free loan (up to 25 yr)",
      pct: 95,
      amount: 13_500_000, // 18 flats × 750 000 CZK
      color: "hsl(150 55% 42%)",
      group: "nzu" as const,
    },
    {
      label: "Commercial top-up (combinable with NZU)",
      pct: 5,
      amount: 780_000,
      color: "hsl(32 85% 55%)",
      group: "other" as const,
    },
  ],
};

// Single source-of-truth for the externally-verifiable claims on this page.
export const SOURCES = {
  nzu: {
    label: "State Environmental Fund / Ministry of Environment, press release 9 Mar 2026; novazelenausporam.cz",
    url: "https://sfzp.gov.cz/tiskove-centrum/tiskove-zpravy/detail-tiskove-zpravy/?id=409",
  },
  nzuLoanSvj: {
    label: "Homeowner associations and housing cooperatives: interest-free loan up to 750 000 CZK / flat, maturity up to 25 years",
    url: "https://novazelenausporam.cz/bezurocny-uver-svj-bytova-druzstva/",
  },
  vinohradyPrice: {
    label: "Brivo — Vinohrady ~180 000 CZK/m² (Q1 2026)",
    url: "https://www.brivo.cz/cena-bytu/praha/vinohrady",
  },
  energyDrift: {
    label: "Energy Regulatory Office regulated price decisions 2024–2025; Eurostat HH gas index",
    url: "https://eru.gov.cz/ceny-energii",
  },
  buildIndex: {
    label: "Czech Statistical Office — construction work price index, +2.7% YoY (2025)",
    url: "https://csu.gov.cz/ceny-vyrobcu",
  },
  whoDamp: {
    label: "WHO Guidelines for Indoor Air Quality: dampness and mould (2009)",
    url: "https://www.who.int/publications/i/item/9789289041683",
  },
  noise: {
    label: "Fraunhofer IBP / ift Rosenheim — new triple glazing + ETICS Rw gain ≈ 10 dB",
    url: "https://pub.dega-akustik.de/DAGA_2024/files/upload/paper/543.pdf",
  },
};




// Example pre-fill for an early-1900s Vinohrady brick tenement. Specific numbers (year, cadastre, last renovation) are placeholders
// shown during onboarding — they get overwritten with real cadastre /
// energy-audit data once the SVJ uploads its documents.
export const INFERRED_PROPERTY = {
  address: "Vinohradska 56, Prague 2, Vinohrady",
  yearBuilt: "early 20th c.",
  buildingType: "Brick tenement",
  foundation: "Stone and lime mortar, typical for the period",
  loadBearing: "Solid brick perimeter walls, ~600 mm",
  roof: "Pitched, ceramic tile cladding",
  floors: "5 above ground + 1 basement",
  flats: "18 residential units",
  commercialUnits: "2 ground-floor retail spaces",
  heating: "Central gas boiler",
  hotWater: "Shared gas boiler, original risers",
  windows: "Mixed, partial replacement with double-glazed",
  facade: "Original plaster, no external insulation",
  lastRenovation: "Partial (roof / risers) — to be confirmed",
  energyClass: "Likely F–G (to be confirmed by audit)",
  cadastralId: "see the Land Registry",
//   protectedZone: "Vinohrady conservation area (Prague 2)",
};

export const GOALS = [
  { id: "insulation", label: "Insulation", Icon: Layers },
  { id: "ventilation", label: "Ventilation with heat recovery", Icon: Wind },
  { id: "green-roof", label: "Green roof", Icon: Leaf },
  { id: "rainwater", label: "Rainwater and wastewater", Icon: CloudRain },
  { id: "wastewater-heat", label: "Wastewater heat recovery", Icon: Recycle },
  { id: "hot-water", label: "Hot water preparation", Icon: Droplets },
  { id: "heat-source", label: "Heat source replacement", Icon: Flame },
  { id: "photovoltaic", label: "Photovoltaic systems", Icon: SunMedium },
] as const;

// Question -> goal ids that trigger it. Empty triggers => always shown.
export type QType = "single" | "multi" | "yesno";
export type Question = {
  id: string;
  label: string;
  triggers: string[]; // goal ids; show if any selected (empty = always)
  type: QType;
  options?: string[];
};

export const QUESTIONS: Question[] = [
  {
    id: "facade",
    label: "What is the prevailing condition of the facade and windows?",
    triggers: ["insulation", "heat-source", "ventilation"],
    type: "single",
    options: [
      "Like new, recently renovated",
      "Good, minor wear",
      "Worn, visible deterioration",
      "Poor, urgent repair needed",
    ],
  },
  {
    id: "roof",
    label: "What is the technical condition and type of your roof?",
    triggers: ["photovoltaic", "green-roof", "rainwater"],
    type: "single",
    options: [
      "Flat, good condition",
      "Flat, needs work",
      "Pitched, good condition",
      "Pitched, needs work",
    ],
  },
  {
    id: "heat",
    label:
      "What is the condition of your main heat source and vertical pipes (risers)?",
    triggers: ["heat-source", "hot-water", "wastewater-heat"],
    type: "single",
    options: [
      "Recently replaced",
      "Functional but ageing",
      "Original / outdated",
      "Not sure",
    ],
  },
  {
    id: "land",
    label:
      "Does the building have its own land, courtyard, or easy access to the main sewer?",
    triggers: ["rainwater", "wastewater-heat"],
    type: "single",
    options: ["Yes", "Limited access", "No"],
  },
  {
    id: "vulnerable",
    label:
      "Do seniors or households receiving housing allowances make up a significant portion of the building's residents?",
    triggers: [], // always shown — informs vulnerable-household bonus
    type: "single",
    options: ["Yes, significant share", "Some", "No / unsure"],
  },
  {
    id: "recent-reco",
    label:
      "Did the property undergo this kind of reconstruction in the last 15 years?",
    triggers: [], // always
    type: "yesno",
  },
];

export const STORAGE_KEY = "renovuj.state.v1";

export const STEPS: Step[] = [
  "hero",
  "goals",
  "property",
  "summary",
  "financials",
  "urgency",
  "community",
  "stakeholders",
  "distribution",
];

export const STEP_LABELS: Record<Step, string> = {
  hero: "Start",
  goals: "Goals",
  property: "Property",
  summary: "Summary",
  financials: "Financials",
  urgency: "Urgency",
  community: "Community",
  stakeholders: "Stakeholders",
  distribution: "Distribution",
};
