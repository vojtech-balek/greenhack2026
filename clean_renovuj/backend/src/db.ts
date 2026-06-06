import { Property, Question, Neighbour, Persona } from "./types";

export const GOALS = [
  { id: "insulation", label: "Insulation" },
  { id: "ventilation", label: "Ventilation with heat recovery" },
  { id: "green-roof", label: "Green roof" },
  { id: "rainwater", label: "Rainwater and wastewater" },
  { id: "wastewater-heat", label: "Wastewater heat recovery" },
  { id: "hot-water", label: "Hot water preparation" },
  { id: "heat-source", label: "Heat source replacement" },
  { id: "photovoltaic", label: "Photovoltaic systems" },
] as const;

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
    label: "What is the condition of your main heat source and vertical pipes (risers)?",
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
    label: "Does the building have its own land, courtyard, or easy access to the main sewer?",
    triggers: ["rainwater", "wastewater-heat"],
    type: "single",
    options: ["Yes", "Limited access", "No"],
  },
  {
    id: "vulnerable",
    label: "Do seniors or households receiving housing allowances make up a significant portion of the building's residents?",
    triggers: [], // always shown
    type: "single",
    options: ["Yes, significant share", "Some", "No / unsure"],
  },
  {
    id: "recent-reco",
    label: "Did the property undergo this kind of reconstruction in the last 15 years?",
    triggers: [], // always shown
    type: "yesno",
  },
];

export const NEIGHBOURS: Neighbour[] = [
  {
    address: "Jenštejnská 1966/1, Praha 2",
    contact: "Contact via SVJ",
    coords: [50.0759, 14.4271],
    manager: "Petr Novák, chair, SVJ Jenštejnská",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Křemencova 178/10, Praha 1",
    contact: "Contact via SVJ",
    coords: [50.0808, 14.4187],
    manager: "Markéta Dvořáková, vice-chair",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Vodičkova 710/31, Praha 1",
    contact: "Contact via SVJ",
    coords: [50.0815, 14.4248],
    manager: "Tomáš Horák, building manager",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Štěpánská 615/24, Praha 1",
    contact: "Contact via SVJ",
    coords: [50.0810, 14.4276],
    manager: "Lucie Procházková, chair, SVJ Štěpánská",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Sokolská 1802/32, Praha 2",
    contact: "Contact via SVJ",
    coords: [50.0768, 14.4297],
    manager: "Jan Veselý, treasurer",
    color: "hsl(140 65% 42%)",
  },
];

export const PERSONAS: Persona[] = [
  {
    id: "pensioner",
    type: "The Pensioner",
    adjectives: ["cautious", "fixed-income", "loyal"],
    fear: "A higher fond oprav they cannot afford on their pension.",
    description:
      "Lived in the building for thirty years. Remembers when the risers were last replaced and who paid for it. Listens carefully, asks the same question three different ways, and votes only when she's certain her monthly contribution won't change. Reassure her with the NZÚ vulnerable-household bonus and a fixed-cap repayment chart — not with optimism.",
    color: "hsl(15 80% 55%)",
  },
  {
    id: "skeptic",
    type: "The Skeptic",
    adjectives: ["analytical", "argumentative", "well-read"],
    fear: "Being sold a subsidy that vanishes mid-project.",
    description:
      "Reads the SFŽP bulletins on weekends. Will print the call documentation and highlight clause 4.3.b in yellow. Doesn't trust contractors and especially doesn't trust banks. Win him over with sourced numbers, a named project manager, and a clear escape clause — never with marketing language.",
    color: "hsl(45 90% 50%)",
  },
  {
    id: "eco",
    type: "The Eco-Visionary",
    adjectives: ["ambitious", "impatient", "values-driven"],
    fear: "That the building settles for half-measures and locks in fossil heating for another twenty years.",
    description:
      "Already has solar at the family cottage. Wants the green roof, the heat pump, and the rainwater system in one go. Will champion the proposal in the meeting but may overshoot the budget envelope. Anchor her in phased delivery — she'll defend the plan louder than anyone if she sees the end state on the timeline.",
    color: "hsl(150 60% 45%)",
  },
  {
    id: "penny",
    type: "The Penny Pincher",
    adjectives: ["frugal", "spreadsheet-driven", "ROI-obsessed"],
    fear: "Paying a single koruna that doesn't return within eight years.",
    description:
      "Owns two flats and rents one out. Calculates payback in his head while you talk. Doesn't care about aesthetics or comfort — only about the net monthly delta. Show him the savings-vs-repayment line chart and the energy-class jump from G to C. The conversation ends the moment net cash flow turns green.",
    color: "hsl(200 70% 55%)",
  },
  {
    id: "absentee",
    type: "The Absentee Investor",
    adjectives: ["disengaged", "remote", "vote-by-proxy"],
    fear: "A special assessment landing in his inbox without warning.",
    description:
      "Bought the flat as a long-term hold. Lives in Brno or Munich. Never attends meetings, replies to emails after a week, and grants proxy to whoever asks first. Send him a one-page PDF with the number, the date, and a signature line — anything longer goes unread.",
    color: "hsl(270 60% 60%)",
  },
  {
    id: "newcomer",
    type: "The New Neighbour",
    adjectives: ["curious", "tech-savvy", "uncommitted"],
    fear: "Being outvoted by long-timers and stuck with the bill.",
    description:
      "Moved in last spring. Doesn't yet know the building's history but reads every email twice. Open to ambitious plans if the process feels transparent. Invite her early, give her a small role, and she becomes your most reliable yes-vote within two meetings.",
    color: "hsl(330 70% 55%)",
  },
];

const INFERRED_PROPERTY: Property = {
  address: "Vinohradská 56, Praha 2, Vinohrady",
  yearBuilt: "early 20th c.",
  buildingType: "Brick tenement (činžovní dům)",
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
  cadastralId: "see katastr nemovitostí",
  protectedZone: "Vinohrady conservation area (Praha 2)",
};

/**
 * Returns property characteristics by address.
 * Simulates a Cadastre Registry query with a fallback property.
 */
export function getPropertyByAddress(address: string): Property {
  // Simple check to match address, otherwise returns a copy of the Vinohrady činžovní dům
  const normalizedSearch = address.trim().toLowerCase();
  const normalizedBase = INFERRED_PROPERTY.address.toLowerCase();

  if (normalizedSearch.includes("vinohrad") || normalizedBase.includes(normalizedSearch)) {
    return { ...INFERRED_PROPERTY, address: address.trim() };
  }

  // General fallback mimicking a database entry with the search address
  return {
    ...INFERRED_PROPERTY,
    address: address.trim(),
    cadastralId: "inferred from katastr nemovitostí",
    protectedZone: "conservation zone - pending verification",
  };
}

/**
 * Returns all active question rules.
 */
export function getAllQuestions(): Question[] {
  return [...QUESTIONS];
}

/**
 * Filters questionnaire rules depending on selected goals.
 */
export function getQuestionsForGoals(selectedGoals: string[]): Question[] {
  const goalSet = new Set(selectedGoals);
  return QUESTIONS.filter(
    (q) => q.triggers.length === 0 || q.triggers.some((t) => goalSet.has(t))
  );
}

/**
 * Retrieves the neighborhood map points catalog.
 */
export function getNeighbours(): Neighbour[] {
  return [...NEIGHBOURS];
}

/**
 * Retrieves the stakeholder personas profiling templates.
 */
export function getPersonas(): Persona[] {
  return [...PERSONAS];
}
