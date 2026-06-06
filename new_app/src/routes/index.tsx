import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Layers,
  Wind,
  Leaf,
  CloudRain,
  Recycle,
  Droplets,
  Flame,
  SunMedium,
  Upload,
  FileText,
  X,
  Sparkles,
  Download,
  Eye,
  MessagesSquare,
  Printer,
  Phone,
  Mail,
  Check,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import buildingsAsset from "@/assets/panelak_intro_page.png.asset.json";
import houseAsset from "@/assets/basic_house.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "renovuj.me — Your first step to collective renovation" },
      {
        name: "description",
        content:
          "Scope, estimate, and defend renovation projects for your building. Built for active members of apartment owner associations.",
      },
      { property: "og:title", content: "renovuj.me" },
      {
        property: "og:description",
        content: "Your first step to collective renovation.",
      },
    ],
  }),
  component: LandingPage,
});

type Step =
  | "hero"
  | "goals"
  | "property"
  | "summary"
  | "financials"
  | "urgency"
  | "community"
  | "stakeholders"
  | "distribution";

type AddressMatch = {
  id: string;
  displayName: string;
  municipalityName?: string;
  street?: string;
  cp?: string;
  zip?: string;
  lat?: string;
  lon?: string;
};

type AddressSearchResponse = {
  query: string;
  matches: AddressMatch[];
  attribution?: string;
};

type BuildingInfo = {
  query?: string;
  lookup?: {
    addressId?: number;
    buildingId?: number;
  };
  address?: {
    municipalityName?: string;
    municipalityPartName?: string;
    streetName?: string;
    cp?: string;
    zip?: string;
    ruianId?: number;
    lat?: number | null;
    lon?: number | null;
  };
  building?: {
    usage?: string;
    completedAt?: string;
    builtAreaM2?: number;
    floorAreaM2?: number;
    floors?: number;
    flats?: number;
    utilities?: {
      heating?: string;
    };
  };
};

type RenovationGoalCode =
  | "INSULATION"
  | "HEAT_SOURCE"
  | "PHOTOVOLTAICS"
  | "GREEN_ROOF"
  | "VENTILATION";

type RenovationCalculationInput = {
  floorArea: number;
  footprintArea: number;
  numberOfFlats: number;
  vulnerableFlats: number;
  selectedGoals: RenovationGoalCode[];
};

type RenovationCalculation = {
  grossCapEx: number;
  directSubsidyVulnerable: number;
  netStateLoanAmount: number;
  maxStateLoanAmount: number;
  stateLoanTermYears: number;
  monthlyStateLoanPayment: number;
  estimatedYearlySavings: number;
  penaltyLostSavings: number;
  penaltyCapexInflation: number;
  penaltyLostZeroInterest: number;
  totalWaitPenalty: number;
};

type ReconstructionExample = {
  applicant?: string;
  applicantAddress?: string;
  municipalityName?: string;
  support?: number;
  paid?: number;
  purpose?: string;
  signedAt?: string;
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
};

type ReconstructionExamplesResponse = {
  municipalityName: string;
  mode: "same-city" | "fallback";
  localCount: number;
  totalCount: number;
  stats?: {
    currentYear?: number;
    thisYear?: { year?: number; applicants?: number; paid?: number };
    latestYear?: { year?: number; applicants?: number; paid?: number };
    totalApplicants?: number;
    totalPaid?: number;
  };
  examples: ReconstructionExample[];
};

type MaterialPersona = {
  id: string;
  name: string;
  type: string;
  description: string;
  initials?: string;
};

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "")
).replace(/\/$/, "");

function getApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function askAdvisor(question: string, context?: unknown) {
  const response = await fetch(getApiUrl("/api/advisor"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, context }),
  });
  const data = (await response.json()) as { answer?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Advisor failed.");
  }

  return data.answer || "No answer returned.";
}

const FINANCIALS = {
  totalProjectCost: 14_280_000, // CZK — full envelope across all eligible measures
  outOfPocket: 240_000,
  outOfPocketUnit: "CZK upfront (~13 300 CZK / flat)",
  outOfPocketNote:
    "Covers the energy audit, project documentation and the SVJ's mandatory 5% co-financing of the commercial tranche. The NZÚ 2026 subsidy and interest-free loan absorb the rest of the 14.28M CZK envelope.",
  valueUplift: 11, // %
  valueBefore: 168_400_000, // CZK — 18 units in Vinohrady at current m² price
  valueAfter: 186_900_000, // CZK — post-renovation appraisal (energy class C, new facade)
  monthly: {
    loanRepayment: 2100, // per flat
    energySavings: 2450, // per flat
    net: 350, // per flat — slight monthly surplus
    note: "Per flat. Fond oprav contribution unchanged at 38 CZK / m².",
  },
  financingMix: [
    {
      label: "Nová zelená úsporám — state subsidy",
      pct: 42,
      amount: 6_000_000,
      color: "hsl(150 55% 42%)",
    },
    {
      label: "NZÚ interest-free loan (20 yr, 0%)",
      pct: 36,
      amount: 5_140_000,
      color: "hsl(210 70% 50%)",
    },
    {
      label: "Česká spořitelna commercial tranche",
      pct: 17,
      amount: 2_430_000,
      color: "hsl(32 85% 55%)",
    },
    {
      label: "SVJ fond oprav co-financing",
      pct: 5,
      amount: 710_000,
      color: "hsl(280 35% 55%)",
    },
  ],
};

const INFERRED_PROPERTY = {
  address: "Vinohradská 1421/56, 120 00 Praha 2 — Vinohrady",
  yearBuilt: "1928",
  buildingType: "Brick tenement (činžovní dům)",
  foundation: "Stone and lime mortar, partial concrete underpinning",
  loadBearing: "Solid brick, 600 mm perimeter walls",
  roof: "Pitched, ceramic tile cladding",
  floors: "5 above ground + 1 basement",
  flats: "18 residential units",
  commercialUnits: "2 ground-floor retail spaces",
  heating: "Central gas boiler (district connection available)",
  hotWater: "Shared gas boiler, 1990s riser",
  windows: "Mixed — ~60% replaced with double-glazed (2009)",
  facade: "Original plaster, no external insulation",
  lastRenovation: "Roof and risers, 2014",
  energyClass: "G — Extremely inefficient",
  cadastralId: "2679/4",
  protectedZone: "Yes — Vinohrady conservation area",
};

const GOALS = [
  { id: "insulation", label: "Insulation", Icon: Layers },
  { id: "ventilation", label: "Ventilation with heat recovery", Icon: Wind },
  { id: "green-roof", label: "Green roof", Icon: Leaf },
  { id: "rainwater", label: "Rainwater and wastewater", Icon: CloudRain },
  { id: "wastewater-heat", label: "Wastewater heat recovery", Icon: Recycle },
  { id: "hot-water", label: "Hot water preparation", Icon: Droplets },
  { id: "heat-source", label: "Heat source replacement", Icon: Flame },
  { id: "photovoltaic", label: "Photovoltaic systems", Icon: SunMedium },
] as const;

const GOAL_TO_NZU: Partial<Record<(typeof GOALS)[number]["id"], RenovationGoalCode>> = {
  insulation: "INSULATION",
  ventilation: "VENTILATION",
  "green-roof": "GREEN_ROOF",
  "heat-source": "HEAT_SOURCE",
  photovoltaic: "PHOTOVOLTAICS",
};

// Question -> goal ids that trigger it. Empty triggers => always shown.
type QType = "single" | "multi" | "yesno";
type Question = {
  id: string;
  label: string;
  triggers: string[]; // goal ids; show if any selected (empty = always)
  type: QType;
  options?: string[];
};

const QUESTIONS: Question[] = [
  {
    id: "facade",
    label: "What is the prevailing condition of the facade and windows?",
    triggers: ["insulation", "heat-source", "ventilation"],
    type: "single",
    options: [
      "Like new — recently renovated",
      "Good — minor wear",
      "Worn — visible deterioration",
      "Poor — urgent repair needed",
    ],
  },
  {
    id: "roof",
    label: "What is the technical condition and type of your roof?",
    triggers: ["photovoltaic", "green-roof", "rainwater"],
    type: "single",
    options: [
      "Flat — good condition",
      "Flat — needs work",
      "Pitched — good condition",
      "Pitched — needs work",
    ],
  },
  {
    id: "heat",
    label: "What is the condition of your main heat source and vertical pipes (risers)?",
    triggers: ["heat-source", "hot-water", "wastewater-heat"],
    type: "single",
    options: ["Recently replaced", "Functional but ageing", "Original / outdated", "Not sure"],
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
    label:
      "Do seniors or households receiving housing allowances make up a significant portion of the building's residents?",
    triggers: [], // always shown — informs vulnerable-household bonus
    type: "single",
    options: ["Yes, significant share", "Some", "No / unsure"],
  },
  {
    id: "recent-reco",
    label: "Did the property undergo this kind of reconstruction in the last 15 years?",
    triggers: [], // always
    type: "yesno",
  },
];

const STEPS: Step[] = [
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

const STEP_LABELS: Record<Step, string> = {
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

function toPositiveNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function selectedNzuGoals(selected: Set<string>) {
  return Array.from(selected)
    .map((id) => GOAL_TO_NZU[id as (typeof GOALS)[number]["id"]])
    .filter((goal): goal is RenovationGoalCode => Boolean(goal));
}

function estimateVulnerableFlats(answers: Record<string, string>, flats: number) {
  const answer = answers.vulnerable || "";
  if (answer.startsWith("Yes")) return Math.max(1, Math.round(flats * 0.25));
  if (answer.startsWith("Some")) return Math.max(1, Math.round(flats * 0.1));
  return 0;
}

function buildCalculationInput(
  buildingInfo: BuildingInfo | null,
  selected: Set<string>,
  answers: Record<string, string>,
): RenovationCalculationInput | null {
  const goals = selectedNzuGoals(selected);
  if (goals.length === 0) return null;

  const building = buildingInfo?.building;
  const numberOfFlats = Math.round(toPositiveNumber(building?.flats, 12));
  const floorArea = Math.round(toPositiveNumber(building?.floorAreaM2, numberOfFlats * 70));
  const footprintFallback =
    building?.floors && building.floors > 0 ? floorArea / building.floors : floorArea / 3;
  const footprintArea = Math.round(toPositiveNumber(building?.builtAreaM2, footprintFallback));

  return {
    floorArea,
    footprintArea,
    numberOfFlats,
    vulnerableFlats: estimateVulnerableFlats(answers, numberOfFlats),
    selectedGoals: goals,
  };
}

function selectedGoalDetails(selected: Set<string>) {
  return GOALS.filter((goal) => selected.has(goal.id)).map((goal) => ({
    id: goal.id,
    label: goal.label,
    nzuGoal: GOAL_TO_NZU[goal.id],
  }));
}

function answeredQuestionDetails(answers: Record<string, string>) {
  return QUESTIONS.filter((question) => answers[question.id]).map((question) => ({
    id: question.id,
    label: question.label,
    answer: answers[question.id],
  }));
}

function buildMaterialPayload({
  format,
  address,
  buildingInfo,
  selected,
  answers,
  calculationInput,
  calculation,
  communityData,
  selectedPersonas,
}: {
  format: "whatsapp" | "pdf" | "leaflet";
  address: string;
  buildingInfo: BuildingInfo | null;
  selected: Set<string>;
  answers: Record<string, string>;
  calculationInput: RenovationCalculationInput | null;
  calculation: RenovationCalculation | null;
  communityData: ReconstructionExamplesResponse | null;
  selectedPersonas: MaterialPersona[];
}) {
  const building = buildingInfo?.building;
  const normalizedAddress = buildingInfo?.address;
  const nonFinancialBenefits = [
    "stabilnější teplota v bytech v zimě i v létě",
    "méně průvanu, vlhkosti a rizika plísní",
    "tišší byty díky lepší obálce domu",
    "zdravější vnitřní vzduch při vhodném větrání",
    "lepší vzhled domu a společných prostor",
    "méně havárií a neplánovaných oprav",
    "lepší připravenost na budoucí energetické požadavky",
    "férovější řešení pro zranitelné sousedy",
  ];

  return {
    format,
    context: {
      address: {
        input: address,
        municipalityName: normalizedAddress?.municipalityName ?? null,
        streetName: normalizedAddress?.streetName ?? null,
        cp: normalizedAddress?.cp ?? null,
      },
      building: {
        usage: building?.usage ?? null,
        completedAt: building?.completedAt ?? null,
        floorAreaM2: building?.floorAreaM2 ?? calculationInput?.floorArea ?? null,
        builtAreaM2: building?.builtAreaM2 ?? calculationInput?.footprintArea ?? null,
        floors: building?.floors ?? null,
        flats: building?.flats ?? calculationInput?.numberOfFlats ?? null,
        heating: building?.utilities?.heating ?? null,
      },
      selectedGoals: selectedGoalDetails(selected),
      answeredQuestions: answeredQuestionDetails(answers),
      nonFinancialBenefits,
      calculation: {
        input: calculationInput ?? {},
        result: calculation ?? {},
      },
      selectedPersonas,
    },
    selectedPersonas,
    visuals: {
      penaltyBreakdown: [
        { label: "Lost savings", value: calculation?.penaltyLostSavings ?? 0 },
        { label: "More expensive construction", value: calculation?.penaltyCapexInflation ?? 0 },
        { label: "Lost zero-interest loan", value: calculation?.penaltyLostZeroInterest ?? 0 },
      ],
    },
    localExamples: {
      summary: communityData
        ? {
            mode: communityData.mode,
            localCount: communityData.localCount,
            stats: communityData.stats,
          }
        : null,
      examples: (communityData?.examples ?? []).slice(0, 3),
    },
  };
}

function LandingPage() {
  const [address, setAddress] = useState("");
  const [step, setStep] = useState<Step>("hero");
  const [exiting, setExiting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [energyFile, setEnergyFile] = useState<File | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [maxStepIndex, setMaxStepIndex] = useState(0);
  const [addressMatches, setAddressMatches] = useState<AddressMatch[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressMatch | null>(null);
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo | null>(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isLoadingBuilding, setIsLoadingBuilding] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [showAddressMatches, setShowAddressMatches] = useState(false);
  const [calculationInput, setCalculationInput] = useState<RenovationCalculationInput | null>(null);
  const [calculation, setCalculation] = useState<RenovationCalculation | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isLoadingCalculation, setIsLoadingCalculation] = useState(false);
  const [communityData, setCommunityData] = useState<ReconstructionExamplesResponse | null>(null);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState<MaterialPersona[]>([]);
  const [customPersonas, setCustomPersonas] = useState<MaterialPersona[]>([]);

  useEffect(() => {
    window.localStorage.removeItem("renovuj.state.v1");
    setHydrated(true);
  }, []);

  const stepIndex = STEPS.indexOf(step);

  const transitionTo = (next: Step) => {
    if (exiting) return;
    const nextIdx = STEPS.indexOf(next);
    setExiting(true);
    window.setTimeout(() => {
      setStep(next);
      setMaxStepIndex((m) => Math.max(m, nextIdx));
      setExiting(false);
    }, 420);
  };

  const goToIndex = (idx: number) => {
    if (idx < 0 || idx >= STEPS.length) return;
    if (idx > maxStepIndex) return; // no jumping to the future
    if (idx === stepIndex) return;
    transitionTo(STEPS[idx]);
  };

  useEffect(() => {
    if (!hydrated) return;

    const query = address.trim();
    if (query.length < 3 || selectedAddress?.displayName === query) {
      setAddressMatches([]);
      setIsSearchingAddress(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearchingAddress(true);
      setAddressError(null);

      try {
        const response = await fetch(
          getApiUrl(`/api/address-search?q=${encodeURIComponent(query)}`),
          { signal: controller.signal },
        );
        const data = (await response.json()) as AddressSearchResponse | { error?: string };

        if (!response.ok) {
          throw new Error("error" in data ? data.error : "Failed to search address.");
        }

        setAddressMatches((data as AddressSearchResponse).matches ?? []);
        setShowAddressMatches(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        setAddressMatches([]);
        setAddressError(error instanceof Error ? error.message : "Failed to search address.");
      } finally {
        if (!controller.signal.aborted) setIsSearchingAddress(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [address, hydrated, selectedAddress]);

  useEffect(() => {
    if (!hydrated) return;

    const input = buildCalculationInput(buildingInfo, selected, answers);
    setCalculationInput(input);

    if (!input) {
      setCalculation(null);
      setCalculationError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingCalculation(true);
    setCalculationError(null);

    fetch(getApiUrl("/api/calculate-renovation"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as RenovationCalculation | { error?: string };
        if (!response.ok) {
          throw new Error("error" in data ? data.error : "Failed to calculate renovation.");
        }
        setCalculation(data as RenovationCalculation);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setCalculation(null);
        setCalculationError(
          error instanceof Error ? error.message : "Failed to calculate renovation.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingCalculation(false);
      });

    return () => controller.abort();
  }, [answers, buildingInfo, hydrated, selected]);

  useEffect(() => {
    if (!hydrated) return;

    const municipalityName = buildingInfo?.address?.municipalityName;
    if (!municipalityName) {
      setCommunityData(null);
      setCommunityError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingCommunity(true);
    setCommunityError(null);

    fetch(
      getApiUrl(
        `/api/reconstruction-examples?municipalityName=${encodeURIComponent(municipalityName)}`,
      ),
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = (await response.json()) as ReconstructionExamplesResponse | { error?: string };
        if (!response.ok) {
          throw new Error("error" in data ? data.error : "Failed to load reconstruction examples.");
        }
        setCommunityData(data as ReconstructionExamplesResponse);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setCommunityData(null);
        setCommunityError(
          error instanceof Error ? error.message : "Failed to load reconstruction examples.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingCommunity(false);
      });

    return () => controller.abort();
  }, [buildingInfo?.address?.municipalityName, hydrated]);

  const fetchBuildingInfo = async (input: string | AddressMatch) => {
    const body = typeof input === "string" ? { address: input } : { selectedAddress: input };
    const response = await fetch(getApiUrl("/api/building-info"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as BuildingInfo | { error?: string };

    if (!response.ok) {
      throw new Error("error" in data ? data.error : "Failed to load building data.");
    }

    return data as BuildingInfo;
  };

  const selectAddressMatch = async (match: AddressMatch) => {
    setSelectedAddress(match);
    setAddress(match.displayName);
    setAddressMatches([]);
    setShowAddressMatches(false);
    setAddressError(null);
    setIsLoadingBuilding(true);

    try {
      const data = await fetchBuildingInfo(match);
      setBuildingInfo(data);
      transitionTo("goals");
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "Failed to load building data.");
    } finally {
      setIsLoadingBuilding(false);
    }
  };

  const onSubmitHero = async (e: React.FormEvent) => {
    e.preventDefault();

    const query = address.trim();
    if (!query) {
      setAddressError("Enter a building address first.");
      return;
    }

    setAddressError(null);
    setShowAddressMatches(false);
    setIsLoadingBuilding(true);

    try {
      const input = selectedAddress?.displayName === query ? selectedAddress : query;
      const data = await fetchBuildingInfo(input);
      setBuildingInfo(data);
      transitionTo("goals");
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "Failed to load building data.");
      setShowAddressMatches(addressMatches.length > 0);
    } finally {
      setIsLoadingBuilding(false);
    }
  };

  const toggleGoal = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleQuestions = QUESTIONS.filter(
    (q) => q.triggers.length === 0 || q.triggers.some((t) => selected.has(t)),
  );

  return (
    <main className="relative min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-50 mx-auto flex w-full max-w-[1400px] items-center justify-between bg-background/60 px-8 py-4 sm:py-5 backdrop-blur-md">
        <a
          href="/"
          className="font-display text-[2.25rem] font-bold tracking-tight text-foreground animate-blur-in-soft"
        >
          renovuj<span className="text-muted-foreground">.me</span>
        </a>
        <nav className="flex items-center gap-8 text-[1.1rem] font-semibold text-foreground/80 animate-blur-in-soft">
          <a href="/manifesto" className="transition hover:text-foreground">
            Manifesto
          </a>
          <a href="/contact" className="transition hover:text-foreground">
            Contact us
          </a>
        </nav>
      </header>

      {hydrated && step !== "hero" && (
        <aside className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex animate-blur-in-soft">
          <button
            type="button"
            onClick={() => goToIndex(stepIndex - 1)}
            disabled={stepIndex <= 0}
            aria-label="Previous step"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground/70 shadow-[0_6px_20px_-10px_rgba(0,0,0,0.3)] backdrop-blur-md transition hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border/60 disabled:hover:text-foreground/70"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          <ul className="flex flex-col items-center gap-2.5 rounded-full border border-border/50 bg-background/60 px-2 py-3 backdrop-blur-md">
            {STEPS.slice(0, maxStepIndex + 1).map((s, i) => {
              const isCurrent = i === stepIndex;
              return (
                <li key={s} className="animate-blur-in-soft">
                  <button
                    type="button"
                    onClick={() => goToIndex(i)}
                    aria-label={`Go to ${STEP_LABELS[s]}`}
                    aria-current={isCurrent ? "step" : undefined}
                    className="group relative flex items-center justify-center transition cursor-pointer"
                  >
                    <span
                      className={`block rounded-full transition-all duration-300 ${
                        isCurrent
                          ? "h-2.5 w-2.5 bg-foreground"
                          : "h-1.5 w-1.5 bg-foreground/35 group-hover:bg-foreground/70"
                      }`}
                    />
                    <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-background opacity-0 transition group-hover:opacity-100">
                      {STEP_LABELS[s]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => goToIndex(stepIndex + 1)}
            disabled={stepIndex + 1 > maxStepIndex || stepIndex + 1 >= STEPS.length}
            aria-label="Next step"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground/70 shadow-[0_6px_20px_-10px_rgba(0,0,0,0.3)] backdrop-blur-md transition hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border/60 disabled:hover:text-foreground/70"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </aside>
      )}

      {!hydrated ? (
        <div aria-hidden className="min-h-screen" />
      ) : step === "property" ? (
        <PropertyStep
          questions={visibleQuestions}
          answers={answers}
          setAnswers={setAnswers}
          energyFile={energyFile}
          setEnergyFile={setEnergyFile}
          onContinue={() => transitionTo("summary")}
        />
      ) : step === "summary" ? (
        <SummaryStep buildingInfo={buildingInfo} onContinue={() => transitionTo("financials")} />
      ) : step === "financials" ? (
        <FinancialsStep
          calculation={calculation}
          calculationInput={calculationInput}
          isLoadingCalculation={isLoadingCalculation}
          calculationError={calculationError}
          onContinue={() => transitionTo("urgency")}
        />
      ) : step === "urgency" ? (
        <UrgencyStep calculation={calculation} onContinue={() => transitionTo("community")} />
      ) : step === "community" ? (
        <CommunityStep
          buildingInfo={buildingInfo}
          communityData={communityData}
          isLoadingCommunity={isLoadingCommunity}
          communityError={communityError}
          onContinue={() => transitionTo("stakeholders")}
        />
      ) : step === "stakeholders" ? (
        <StakeholderStep
          selectedPersonas={selectedPersonas}
          setSelectedPersonas={setSelectedPersonas}
          customPersonas={customPersonas}
          setCustomPersonas={setCustomPersonas}
          onContinue={() => transitionTo("distribution")}
        />
      ) : step === "distribution" ? (
        <DistributionStep
          address={address}
          buildingInfo={buildingInfo}
          selected={selected}
          answers={answers}
          calculationInput={calculationInput}
          calculation={calculation}
          communityData={communityData}
          selectedPersonas={selectedPersonas}
        />
      ) : (
        <div key={step} className={exiting ? "animate-blur-out" : "animate-blur-in"}>
          {step === "hero" ? (
            <HeroStep address={address} setAddress={setAddress} />
          ) : (
            <GoalsStep selected={selected} toggleGoal={toggleGoal} />
          )}
        </div>
      )}

      {step === "hero" && (
        <form
          onSubmit={onSubmitHero}
          className="fixed inset-x-0 bottom-16 z-30 mx-auto flex w-[min(640px,calc(100%-2rem))]"
        >
          <div className="group relative flex w-full items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2 py-2 pl-6 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl backdrop-saturate-150 transition focus-within:border-foreground/30 focus-within:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.3)]">
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setSelectedAddress(null);
                setBuildingInfo(null);
              }}
              onFocus={() => setShowAddressMatches(addressMatches.length > 0)}
              placeholder="Renovation address"
              className="h-11 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
              aria-label="Renovation address"
              disabled={isLoadingBuilding}
            />
            <button
              type="submit"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-[1.03] hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Continue"
              disabled={isLoadingBuilding}
            >
              <ArrowRight className="h-5 w-5" />
            </button>

            {(showAddressMatches || isSearchingAddress || addressError) && (
              <div className="absolute inset-x-0 bottom-full mb-3 overflow-hidden rounded-3xl border border-border/70 bg-background/90 shadow-[0_18px_60px_-18px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                {isSearchingAddress && (
                  <p className="px-5 py-4 text-sm italic text-muted-foreground">
                    Searching Czech address registry...
                  </p>
                )}

                {addressError && (
                  <p className="border-b border-border/60 px-5 py-4 text-sm text-destructive">
                    {addressError}
                  </p>
                )}

                {showAddressMatches && addressMatches.length > 0 && (
                  <ul className="max-h-[280px] overflow-y-auto py-2">
                    {addressMatches.map((match) => (
                      <li key={match.id}>
                        <button
                          type="button"
                          onClick={() => selectAddressMatch(match)}
                          className="block w-full px-5 py-3 text-left transition hover:bg-muted/70"
                          disabled={isLoadingBuilding}
                        >
                          <span className="block text-sm font-medium text-foreground">
                            {match.displayName}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {[
                              match.street,
                              match.cp ? `c.p. ${match.cp}` : null,
                              match.municipalityName,
                              match.zip ? `PSC ${match.zip}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </form>
      )}

      {step === "goals" && (
        <div className="fixed inset-x-0 bottom-28 z-40 mx-auto flex w-[min(640px,calc(100%-2rem))] justify-center">
          <button
            type="button"
            onClick={() => transitionTo("property")}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35)] transition enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Proceed
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step !== "property" && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-40 bg-gradient-to-t from-background via-background/70 to-transparent" />
      )}
    </main>
  );
}

function HeroStep({ address, setAddress }: { address: string; setAddress: (v: string) => void }) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-[1400px] px-8 pt-28 sm:pt-36">
      <h1 className="font-display max-w-[18ch] text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[4rem] md:text-[5.5rem] lg:text-[6.25rem]">
        <span className="block text-foreground">Your first step</span>
        <span className="block text-foreground/35">to collective renovation.</span>
      </h1>

      <div className="relative mt-1 sm:mt-2">
        <img
          src={buildingsAsset.url}
          alt="Row of European apartment buildings at dusk with warm window lights"
          className="relative mx-auto w-full select-none animate-hero-drift"
          draggable={false}
        />
      </div>
    </section>
  );
}

function GoalsStep({
  selected,
  toggleGoal,
}: {
  selected: Set<string>;
  toggleGoal: (id: string) => void;
}) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-[1100px] px-8 pt-28 sm:pt-32 pb-40">
      <h2 className="font-display text-[2rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.75rem]">
        What is the goal of your renovation?
      </h2>
      <p className="mt-2 text-sm italic text-muted-foreground sm:text-base">Press to select</p>

      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
        {GOALS.map(({ id, label, Icon }) => {
          const isOn = selected.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleGoal(id)}
              className={[
                "group flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition",
                "hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.3)]",
                isOn
                  ? "border-foreground/80 bg-foreground/[0.04]"
                  : "border-border/70 bg-background/40",
              ].join(" ")}
              aria-pressed={isOn}
            >
              <span
                className={[
                  "grid h-20 w-20 place-items-center rounded-2xl transition",
                  isOn
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground/80 group-hover:bg-muted/80",
                ].join(" ")}
              >
                <Icon className="h-9 w-9" strokeWidth={1.5} />
              </span>
              <span className="text-sm font-medium text-foreground/85 sm:text-[0.95rem]">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PropertyStep({
  questions,
  answers,
  setAnswers,
  energyFile,
  setEnergyFile,
  onContinue,
}: {
  questions: Question[];
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  energyFile: File | null;
  setEnergyFile: (f: File | null) => void;
  onContinue: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const setAnswer = (qid: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [qid]: value }));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setEnergyFile(f);
  };

  return (
    <section className="relative min-h-screen w-full">
      {/* Fixed house — portaled so it stays pinned to the viewport */}
      <AiPortal>
        <aside className="fixed top-[42%] left-[5%] z-50 hidden w-[40%] max-w-[500px] -translate-y-1/2 pointer-events-none lg:block">
          <img
            src={houseAsset.url}
            alt="Your property"
            className="w-full select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
            draggable={false}
          />
        </aside>
      </AiPortal>

      <div className="animate-blur-in min-h-screen w-full px-8 py-20 lg:ml-[50%] lg:w-[50%]">
        {/* Mobile house */}
        <div className="lg:hidden mb-8 flex items-center justify-center">
          <img
            src={houseAsset.url}
            alt="Your property"
            className="w-full max-w-[420px] select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
            draggable={false}
          />
        </div>

        {/* Questions — shifted right so they never overlap the fixed house */}
        <div className="pb-32">
          <h2 className="font-display text-[2rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
            Tell us more about your property
          </h2>
          <p className="mt-2 text-sm italic text-muted-foreground sm:text-base">
            A few quick questions — answer them one by one.
          </p>

          <ol className="mt-10 space-y-10">
            {questions.map((q, i) => (
              <li key={q.id} className="space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-sm font-semibold text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-semibold text-foreground sm:text-xl">{q.label}</h3>
                </div>

                {q.type === "yesno" ? (
                  <div className="flex gap-3 pl-9">
                    {["Yes", "No"].map((opt) => {
                      const on = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer(q.id, opt)}
                          className={[
                            "min-w-[110px] rounded-full border px-6 py-2.5 text-sm font-medium transition",
                            on
                              ? "border-foreground bg-foreground text-background"
                              : "border-border/70 bg-background/40 text-foreground/80 hover:border-foreground/40",
                          ].join(" ")}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pl-9">
                    {q.options?.map((opt) => {
                      const on = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer(q.id, opt)}
                          className={[
                            "rounded-full border px-4 py-2 text-sm transition",
                            on
                              ? "border-foreground bg-foreground text-background"
                              : "border-border/70 bg-background/40 text-foreground/80 hover:border-foreground/40",
                          ].join(" ")}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}

            {/* Optional energy label upload */}
            <li className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-sm font-semibold text-muted-foreground tabular-nums">
                  {String(questions.length + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                    Do you happen to have an energy label PDF?{" "}
                    <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                  </h3>
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    Uploading it improves our predictions.
                  </p>
                </div>
              </div>

              <div className="pl-9">
                {energyFile ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-5 w-5 shrink-0 text-foreground/70" />
                      <span className="truncate text-sm text-foreground">{energyFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnergyFile(null)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    className={[
                      "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                      dragOver
                        ? "border-foreground/60 bg-foreground/[0.04]"
                        : "border-border/70 bg-background/40 hover:border-foreground/30",
                    ].join(" ")}
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      Drop your PDF here or click to upload
                    </span>
                    <span className="text-xs text-muted-foreground">PDF · up to 10 MB</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setEnergyFile(f);
                  }}
                />
              </div>
            </li>
          </ol>

          <div className="mt-12 flex justify-end">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] active:scale-95"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatBuildingAddress(info: BuildingInfo | null) {
  const address = info?.address;
  const parts = [
    address?.streetName,
    address?.cp ? `c.p. ${address.cp}` : null,
    address?.municipalityName,
    address?.zip ? `PSC ${address.zip}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : INFERRED_PROPERTY.address;
}

function valueOrFallback(value: unknown, fallback: string) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function buildSummaryGroups(info: BuildingInfo | null): {
  title: string;
  items: { label: string; value: string; accent?: boolean }[];
}[] {
  const p = INFERRED_PROPERTY;
  const building = info?.building;
  const address = info?.address;
  const lookup = info?.lookup;

  return [
    {
      title: "Identity",
      items: [
        { label: "Address", value: formatBuildingAddress(info), accent: true },
        {
          label: "RUIAN address ID",
          value: valueOrFallback(address?.ruianId ?? lookup?.addressId, "Not available"),
        },
        { label: "RUIAN building ID", value: valueOrFallback(lookup?.buildingId, "Not available") },
      ],
    },
    {
      title: "Structure",
      items: [
        {
          label: "Completed",
          value: valueOrFallback(building?.completedAt, p.yearBuilt),
          accent: true,
        },
        { label: "Building usage", value: valueOrFallback(building?.usage, p.buildingType) },
        { label: "Foundation", value: p.foundation },
        { label: "Load-bearing walls", value: p.loadBearing },
        { label: "Roof", value: p.roof },
      ],
    },
    {
      title: "Layout",
      items: [
        { label: "Floors", value: valueOrFallback(building?.floors, p.floors) },
        {
          label: "Residential flats",
          value: valueOrFallback(building?.flats, p.flats),
          accent: true,
        },
        {
          label: "Built area",
          value: building?.builtAreaM2 ? `${building.builtAreaM2} m2` : "Not available",
        },
        {
          label: "Floor area",
          value: building?.floorAreaM2 ? `${building.floorAreaM2} m2` : "Not available",
        },
      ],
    },
    {
      title: "Systems & envelope",
      items: [
        { label: "Heating", value: valueOrFallback(building?.utilities?.heating, p.heating) },
        { label: "Hot water", value: p.hotWater },
        { label: "Windows", value: p.windows },
        { label: "Facade", value: p.facade },
      ],
    },
    {
      title: "History",
      items: [
        { label: "Last renovation", value: p.lastRenovation },
        { label: "Energy class", value: p.energyClass, accent: true },
      ],
    },
  ];
}

function SummaryStep({
  buildingInfo,
  onContinue,
}: {
  buildingInfo: BuildingInfo | null;
  onContinue: () => void;
}) {
  const groups = buildSummaryGroups(buildingInfo);

  return (
    <section className="relative min-h-screen w-full">
      <AiPortal>
        <aside className="fixed top-[42%] left-[5%] z-50 hidden w-[40%] max-w-[500px] -translate-y-1/2 pointer-events-none lg:block">
          <img
            src={houseAsset.url}
            alt="Your property"
            className="w-full select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
            draggable={false}
          />
        </aside>
      </AiPortal>

      <div className="animate-blur-in min-h-screen w-full px-8 py-20 lg:ml-[50%] lg:w-[50%]">
        <div className="lg:hidden mb-8 flex items-center justify-center">
          <img
            src={houseAsset.url}
            alt="Your property"
            className="w-full max-w-[420px] select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
            draggable={false}
          />
        </div>

        <div className="pb-32">
          <h2 className="font-display text-[2rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
            Summary of your property
          </h2>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
            From public registries — the cadastre, building permits, the energy performance
            database — combined with what you just told us, we were able to infer the following
            picture of your building. Look it over; anything off can be corrected in the next step.
          </p>

          <div className="mt-12 space-y-10">
            {groups.map((g) => (
              <div key={g.title}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border/70" />
                  <h3 className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {g.title}
                  </h3>
                  <span className="h-px flex-1 bg-border/70" />
                </div>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {g.items.map((it) => (
                    <div
                      key={it.label}
                      className={[
                        "rounded-2xl border px-4 py-3 transition",
                        it.accent
                          ? "border-foreground/70 bg-foreground/[0.04] sm:col-span-2"
                          : "border-border/70 bg-background/40",
                      ].join(" ")}
                    >
                      <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {it.label}
                      </dt>
                      <dd
                        className={[
                          "mt-1 text-foreground",
                          it.accent
                            ? "font-display text-lg font-semibold tracking-[-0.01em]"
                            : "text-[0.95rem]",
                        ].join(" ")}
                      >
                        {it.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-end">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] active:scale-95"
            >
              Looks right — continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinancialsStep({
  calculation,
  calculationInput,
  isLoadingCalculation,
  calculationError,
  onContinue,
}: {
  calculation: RenovationCalculation | null;
  calculationInput: RenovationCalculationInput | null;
  isLoadingCalculation: boolean;
  calculationError: string | null;
  onContinue: () => void;
}) {
  const monthlyPerFlat =
    calculation && calculationInput
      ? Math.round(calculation.monthlyStateLoanPayment / calculationInput.numberOfFlats)
      : FINANCIALS.monthly.loanRepayment;
  const savingsPerFlat =
    calculation && calculationInput
      ? Math.round(calculation.estimatedYearlySavings / 12 / calculationInput.numberOfFlats)
      : FINANCIALS.monthly.energySavings;
  const f = {
    ...FINANCIALS,
    totalProjectCost: calculation?.grossCapEx ?? FINANCIALS.totalProjectCost,
    outOfPocket: calculation?.directSubsidyVulnerable ?? FINANCIALS.outOfPocket,
    outOfPocketUnit: calculation
      ? "CZK vulnerable-household direct support counted by NZU"
      : FINANCIALS.outOfPocketUnit,
    outOfPocketNote: calculation
      ? `Backend NZU calculation. State loan: ${new Intl.NumberFormat("cs-CZ").format(
          calculation.netStateLoanAmount,
        )} CZK over ${calculation.stateLoanTermYears} years. Maximum state-loan envelope: ${new Intl.NumberFormat(
          "cs-CZ",
        ).format(calculation.maxStateLoanAmount)} CZK.`
      : FINANCIALS.outOfPocketNote,
    monthly: {
      loanRepayment: monthlyPerFlat,
      energySavings: savingsPerFlat,
      net: savingsPerFlat - monthlyPerFlat,
      note: calculation
        ? "Per flat, derived from backend NZU calculator."
        : FINANCIALS.monthly.note,
    },
    financingMix: calculation
      ? [
          {
            label: "NZU direct support for vulnerable households",
            pct:
              calculation.grossCapEx > 0
                ? Math.round((calculation.directSubsidyVulnerable / calculation.grossCapEx) * 100)
                : 0,
            amount: calculation.directSubsidyVulnerable,
            color: "hsl(150 55% 42%)",
          },
          {
            label: `NZU interest-free loan (${calculation.stateLoanTermYears} yr, 0%)`,
            pct:
              calculation.grossCapEx > 0
                ? Math.round((calculation.netStateLoanAmount / calculation.grossCapEx) * 100)
                : 0,
            amount: calculation.netStateLoanAmount,
            color: "hsl(210 70% 50%)",
          },
          {
            label: "Remaining commercial / reserve funding",
            pct:
              calculation.grossCapEx > 0
                ? Math.max(
                    0,
                    100 -
                      Math.round(
                        ((calculation.directSubsidyVulnerable + calculation.netStateLoanAmount) /
                          calculation.grossCapEx) *
                          100,
                      ),
                  )
                : 0,
            amount: Math.max(
              0,
              calculation.grossCapEx -
                calculation.directSubsidyVulnerable -
                calculation.netStateLoanAmount,
            ),
            color: "hsl(32 85% 55%)",
          },
        ]
      : FINANCIALS.financingMix,
  };
  const [question, setQuestion] = useState("");
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  const submitAi = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || thinking) return;
    setAsked(q);
    setQuestion("");
    setThinking(true);
    setAiReply(null);

    try {
      setAiReply(await askAdvisor(q, { section: "financials", calculation, calculationInput }));
    } catch (error) {
      setAiReply(error instanceof Error ? error.message : "Advisor failed.");
    } finally {
      setThinking(false);
    }
  };

  const fmtCZK = (n: number) => new Intl.NumberFormat("cs-CZ").format(n).replace(/\u00A0/g, " ");

  const chatOpen = Boolean(asked || thinking || aiReply);

  const closeChat = () => {
    setAsked(null);
    setAiReply(null);
    setThinking(false);
  };

  return (
    <section className="relative min-h-screen w-full">
      {/* Floating house — portaled to body so it stays pinned to the viewport */}
      <AiPortal>
        <aside
          className={[
            "fixed top-[42%] left-[5%] z-30 hidden w-[40%] max-w-[500px] -translate-y-1/2 pointer-events-none lg:block",
            "transition-[filter,transform,opacity] duration-500 ease-out",
            chatOpen ? "scale-[0.99] opacity-80 blur-md" : "scale-100 opacity-100 blur-0",
          ].join(" ")}
          aria-hidden={chatOpen}
        >
          <img
            src={houseAsset.url}
            alt="Your property"
            className="w-full select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
            draggable={false}
          />
        </aside>
      </AiPortal>

      {/* Page content — blurs out when the AI chat is open */}
      <div
        className={[
          "animate-blur-in transition-[filter,transform,opacity] duration-500 ease-out",
          chatOpen ? "pointer-events-none scale-[0.99] opacity-80 blur-md" : "blur-0 opacity-100",
        ].join(" ")}
        aria-hidden={chatOpen}
      >
        <div className="min-h-screen w-full px-8 py-20 lg:ml-[50%] lg:w-[50%]">
          <div className="lg:hidden mb-8 flex items-center justify-center">
            <img
              src={houseAsset.url}
              alt="Your property"
              className="w-full max-w-[420px] select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
              draggable={false}
            />
          </div>

          <div className="pb-40">
            <h2 className="font-display text-[2rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
              Let's look at the numbers
            </h2>
            <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
              Personalised to your building, your goals, and today's NZÚ 2026 subsidy framework.
              Every figure below is calculated from the data we just collected.
            </p>
            <div className="mt-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-muted-foreground">
              {isLoadingCalculation
                ? "Calculating with backend NZU model..."
                : calculationError
                  ? calculationError
                  : calculation
                    ? "Using backend /api/calculate-renovation."
                    : "Select renovation goals to calculate the backend NZU estimate."}
            </div>

            <div className="mt-10 space-y-5">
              {/* Out-of-pocket cost */}
              <article className="rounded-3xl border border-border/70 bg-card/60 p-6 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)] backdrop-blur-sm">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Out-of-pocket initial cost
                </p>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="font-display text-[3.5rem] font-semibold leading-none tracking-[-0.04em] text-foreground">
                    {fmtCZK(f.outOfPocket)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {f.outOfPocketUnit}
                  </span>
                </div>
                <p className="mt-4 max-w-[55ch] text-sm leading-relaxed text-muted-foreground">
                  {f.outOfPocketNote}
                </p>
              </article>

              {/* Property value uplift */}
              <article className="rounded-3xl border border-border/70 bg-card/60 p-6 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)] backdrop-blur-sm">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Property value uplift
                </p>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="font-display text-[3rem] font-semibold leading-none tracking-[-0.04em] text-foreground">
                    +{f.valueUplift}%
                  </span>
                  <span className="text-sm text-muted-foreground">Immediate upon completion</span>
                </div>
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Before renovation</span>
                    <span className="font-medium text-foreground">{fmtCZK(f.valueBefore)} CZK</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(f.valueBefore / f.valueAfter) * 100}%`,
                        background: "linear-gradient(90deg, hsl(210 70% 60%), hsl(195 75% 55%))",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>After renovation</span>
                    <span className="font-medium text-foreground">{fmtCZK(f.valueAfter)} CZK</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full w-full rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, hsl(150 60% 45%), hsl(170 65% 45%), hsl(190 70% 50%))",
                      }}
                    />
                  </div>
                </div>
              </article>

              {/* Monthly net-neutral equation */}
              <article className="rounded-3xl border border-border/70 bg-card/60 p-6 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)] backdrop-blur-sm">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Monthly net-neutral equation
                </p>
                <div className="mt-4 space-y-3">
                  <Row
                    label="Loan repayment"
                    value={`-${fmtCZK(f.monthly.loanRepayment)} CZK / mo`}
                    pct={(f.monthly.loanRepayment / f.monthly.energySavings) * 100}
                    tone="negative"
                  />
                  <Row
                    label="Energy savings"
                    value={`+${fmtCZK(f.monthly.energySavings)} CZK / mo`}
                    pct={100}
                    tone="positive"
                  />
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-foreground/20 bg-foreground/[0.04] px-4 py-3">
                  <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                    Net +{fmtCZK(f.monthly.net)} CZK / mo
                  </span>
                  <span className="text-sm text-muted-foreground">{f.monthly.note}</span>
                </div>
              </article>

              {/* Financing mix */}
              <article className="rounded-3xl border border-border/70 bg-card/60 p-6 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)] backdrop-blur-sm">
                <div className="flex items-baseline justify-between">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    2026 blended financing model
                  </p>
                  <p className="font-display text-sm font-semibold tabular-nums text-foreground">
                    {fmtCZK(f.totalProjectCost)} CZK total
                  </p>
                </div>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
                  {f.financingMix.map((m, i) => (
                    <div
                      key={i}
                      className="h-full"
                      style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                    />
                  ))}
                </div>
                <ul className="mt-5 space-y-3">
                  {f.financingMix.map((m, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="flex-1 text-foreground/85">{m.label}</span>
                      <span className="font-mono tabular-nums text-xs text-muted-foreground">
                        {fmtCZK(m.amount)} CZK
                      </span>
                      <span className="w-10 text-right font-display tabular-nums font-semibold text-foreground">
                        {m.pct}%
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] active:scale-95"
              >
                Proceed
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Glass overlay + pinned Ask AI bar — portaled to <body> so they truly fix to the viewport, not the animated section */}
      <AiPortal>
        {chatOpen && (
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-background/30 px-4 pb-36 pt-10 backdrop-blur-xl animate-fade-in sm:items-center sm:pb-40"
            role="dialog"
            aria-modal="true"
            aria-label="AI assistant"
            onClick={closeChat}
          >
            <div
              className="relative w-full max-w-[640px] animate-scale-in rounded-3xl border border-white/40 bg-background/55 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeChat}
                aria-label="Close AI chat"
                className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-background/60 text-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 transition hover:scale-[1.06] hover:bg-background/80 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              {asked && (
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md border border-foreground/15 bg-foreground/[0.06] px-4 py-3 text-sm font-medium text-foreground">
                  {asked}
                </div>
              )}

              <div className="mt-4 flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex-1 rounded-2xl rounded-tl-md border border-white/40 bg-background/70 px-4 py-3 text-sm leading-relaxed text-foreground/90 backdrop-blur-md">
                  <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Renovuj AI
                  </p>
                  {thinking ? (
                    <span className="inline-flex items-center gap-1.5 italic text-muted-foreground">
                      Thinking
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                      </span>
                    </span>
                  ) : (
                    aiReply
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-20 left-1/2 z-[100] flex w-[min(720px,calc(100%-2rem))] -translate-x-1/2 will-change-transform">
          <form
            onSubmit={submitAi}
            className="group relative flex w-full items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2 py-2 pl-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 transition focus-within:border-foreground/30 focus-within:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </span>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="How exactly does the interest-free NZÚ loan work?"
              className="h-11 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
              aria-label="Ask AI"
            />
            <button
              type="submit"
              disabled={thinking || !question.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-[1.03] hover:opacity-95 active:scale-95"
              aria-label="Send"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      </AiPortal>
    </section>
  );
}

// =====================================================================
// UrgencyStep — interactive cost-of-waiting chart with two stacked
// growth components: utilities wasted + material & labour inflation.
// All numbers are mock; will be wired to real per-property data later.
// =====================================================================
const URGENCY = {
  // mock per-property baselines (CZK)
  baseUtilityWastePerYear: 38_000, // current annual utility "waste" vs renovated
  utilityGrowthRate: 0.1, // 10% / year — energy price drift
  baseRenovationCost: 1_250_000, // today's renovation price (reference)
  materialInflationRate: 0.2, // 20% / year — material & labour drift
  horizonYears: 8,
  pointsPerYear: 12, // monthly resolution for smooth interpolation
};

function buildUrgencyData(calculation: RenovationCalculation | null) {
  if (calculation) {
    const horizonYears = 5;
    const pointsPerYear = URGENCY.pointsPerYear;
    const total = horizonYears * pointsPerYear;
    return Array.from({ length: total + 1 }, (_, i) => {
      const t = i / pointsPerYear;
      const ratio = t / horizonYears;
      const utilities = Math.round(calculation.penaltyLostSavings * ratio);
      const materials = Math.round(calculation.penaltyCapexInflation * ratio);
      const loan = Math.round(calculation.penaltyLostZeroInterest * ratio);
      return {
        t,
        utilities,
        materials,
        loan,
        sum: utilities + materials + loan,
      };
    });
  }

  const {
    baseUtilityWastePerYear,
    utilityGrowthRate,
    baseRenovationCost,
    materialInflationRate,
    horizonYears,
    pointsPerYear,
  } = URGENCY;

  const total = horizonYears * pointsPerYear;
  const out: {
    t: number; // fractional years from now
    utilities: number; // cumulative wasted utility cost
    materials: number; // extra cost vs renovating today
    loan: number;
    sum: number;
  }[] = [];

  for (let i = 0; i <= total; i++) {
    const t = i / pointsPerYear;
    // cumulative wasted utilities — integral of base*(1+r)^t
    const u =
      (baseUtilityWastePerYear * (Math.pow(1 + utilityGrowthRate, t) - 1)) /
      Math.log(1 + utilityGrowthRate);
    // material / labour inflation — extra cost vs today
    const m = baseRenovationCost * (Math.pow(1 + materialInflationRate, t) - 1);
    out.push({
      t,
      utilities: Math.round(u),
      materials: Math.round(m),
      loan: 0,
      sum: Math.round(u + m),
    });
  }
  return out;
}

function UrgencyStep({
  calculation,
  onContinue,
}: {
  calculation: RenovationCalculation | null;
  onContinue: () => void;
}) {
  const data = buildUrgencyData(calculation);
  const maxIndex = data.length - 1;
  const [idx, setIdx] = useState(Math.round(maxIndex * 0.45));
  const point = data[idx];
  const chartHorizonYears = data[maxIndex]?.t ?? URGENCY.horizonYears;

  const [question, setQuestion] = useState("");
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  const submitAi = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || thinking) return;
    setAsked(q);
    setQuestion("");
    setThinking(true);
    setAiReply(null);

    try {
      setAiReply(await askAdvisor(q, { section: "urgency", calculation, selectedYear: point.t }));
    } catch (error) {
      setAiReply(error instanceof Error ? error.message : "Advisor failed.");
    } finally {
      setThinking(false);
    }
  };

  const chatOpen = Boolean(asked || thinking || aiReply);
  const closeChat = () => {
    setAsked(null);
    setAiReply(null);
    setThinking(false);
  };

  const fmtCZK = (n: number) =>
    new Intl.NumberFormat("cs-CZ").format(Math.round(n)).replace(/\u00A0/g, " ");

  const yearsLabel = (t: number) => {
    const years = Math.floor(t);
    const months = Math.round((t - years) * 12);
    if (years === 0) return `${months} mo`;
    if (months === 0) return `${years} yr`;
    return `${years} yr ${months} mo`;
  };

  return (
    <section className="relative min-h-screen w-full">
      {/* Floating house */}
      <AiPortal>
        <aside
          className={[
            "fixed top-[42%] left-[5%] z-30 hidden w-[40%] max-w-[500px] -translate-y-1/2 pointer-events-none lg:block",
            "transition-[filter,transform,opacity] duration-500 ease-out",
            chatOpen ? "scale-[0.99] opacity-80 blur-md" : "scale-100 opacity-100 blur-0",
          ].join(" ")}
          aria-hidden={chatOpen}
        >
          <img
            src={houseAsset.url}
            alt="Your property"
            className="w-full select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
            draggable={false}
          />
        </aside>
      </AiPortal>

      {/* Page content */}
      <div
        className={[
          "animate-blur-in transition-[filter,transform,opacity] duration-500 ease-out",
          chatOpen ? "pointer-events-none scale-[0.99] opacity-80 blur-md" : "blur-0 opacity-100",
        ].join(" ")}
        aria-hidden={chatOpen}
      >
        <div className="min-h-screen w-full px-8 py-20 lg:ml-[50%] lg:w-[50%]">
          <div className="lg:hidden mb-8 flex items-center justify-center">
            <img
              src={houseAsset.url}
              alt="Your property"
              className="w-full max-w-[420px] select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
              draggable={false}
            />
          </div>

          <div className="pb-40">
            <h2 className="font-display text-[2rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
              Waiting only makes it more expensive
            </h2>
            <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
              Every year you postpone, two things keep stacking against you: energy bills you keep
              overpaying, and the renovation itself becoming pricier as materials and labour drift
              upwards.
            </p>

            <article className="mt-10 rounded-3xl border border-border/70 bg-card/60 p-6 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)] backdrop-blur-sm">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Cumulative cost of waiting
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-[2.75rem] font-semibold leading-none tracking-[-0.04em] text-foreground tabular-nums">
                      {fmtCZK(point.sum)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      CZK · in {yearsLabel(point.t)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data}
                    margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                    onMouseMove={(e: { activeTooltipIndex?: number }) => {
                      if (typeof e?.activeTooltipIndex === "number") {
                        setIdx(e.activeTooltipIndex);
                      }
                    }}
                  >
                    <defs>
                      <linearGradient id="gUtil" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(28 92% 60%)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="hsl(28 92% 60%)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gMat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(46 95% 58%)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="hsl(46 95% 58%)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gLoan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(210 75% 55%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(210 75% 55%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(0 0% 0% / 0.06)" vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={[0, chartHorizonYears]}
                      ticks={
                        chartHorizonYears <= 5
                          ? [0, 1, 2, 3, 4, 5]
                          : [0, 2, 4, 6, chartHorizonYears]
                      }
                      tickFormatter={(v) => (v === 0 ? "now" : `+${v}y`)}
                      stroke="hsl(0 0% 0% / 0.4)"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(0 0% 0% / 0.4)"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1_000_000
                          ? `${(v / 1_000_000).toFixed(1)}M`
                          : `${Math.round(v / 1000)}k`
                      }
                      width={48}
                    />
                    <Tooltip
                      cursor={{ stroke: "hsl(0 0% 0% / 0.25)", strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload as (typeof data)[number];
                        return (
                          <div className="rounded-xl border border-border/70 bg-background/95 px-3 py-2 text-xs shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md">
                            <div className="font-semibold text-foreground">
                              In {yearsLabel(p.t)}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-foreground/80">
                              <span className="h-2 w-2 rounded-full bg-[hsl(28_92%_60%)]" />
                              Utilities wasted: {fmtCZK(p.utilities)} CZK
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-foreground/80">
                              <span className="h-2 w-2 rounded-full bg-[hsl(46_95%_58%)]" />
                              Material & labour: +{fmtCZK(p.materials)} CZK
                            </div>
                            {p.loan > 0 && (
                              <div className="mt-0.5 flex items-center gap-2 text-foreground/80">
                                <span className="h-2 w-2 rounded-full bg-[hsl(210_75%_55%)]" />
                                Lost zero-interest loan: +{fmtCZK(p.loan)} CZK
                              </div>
                            )}
                            <div className="mt-1 border-t border-border/60 pt-1 font-semibold text-foreground">
                              Total: {fmtCZK(p.sum)} CZK
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="utilities"
                      stackId="1"
                      stroke="hsl(28 92% 50%)"
                      strokeWidth={2}
                      fill="url(#gUtil)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="materials"
                      stackId="1"
                      stroke="hsl(46 95% 48%)"
                      strokeWidth={2}
                      fill="url(#gMat)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="loan"
                      stackId="1"
                      stroke="hsl(210 75% 50%)"
                      strokeWidth={2}
                      fill="url(#gLoan)"
                      isAnimationActive={false}
                    />
                    <ReferenceLine x={point.t} stroke="hsl(0 0% 0% / 0.45)" strokeDasharray="4 4" />
                    <ReferenceDot
                      x={point.t}
                      y={point.sum}
                      r={5}
                      fill="hsl(var(--foreground))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Scrubber */}
              <div className="mt-2">
                <input
                  type="range"
                  min={0}
                  max={maxIndex}
                  step={1}
                  value={idx}
                  onChange={(e) => setIdx(Number(e.target.value))}
                  aria-label="Pick a point in time"
                  className="w-full accent-foreground"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <span>now</span>
                  <span>+{chartHorizonYears} years</span>
                </div>
              </div>

              {/* Legend + per-component breakdown */}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(28_92%_60%)]" />
                    Utilities wasted
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                    {fmtCZK(point.utilities)} CZK
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Energy bills overpaid vs a renovated home, at +
                    {Math.round(URGENCY.utilityGrowthRate * 100)}%/yr drift.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(46_95%_58%)]" />
                    Material & labour inflation
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                    +{fmtCZK(point.materials)} CZK
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Extra renovation cost vs today, at +
                    {Math.round(URGENCY.materialInflationRate * 100)}%/yr drift.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(210_75%_55%)]" />
                    Lost zero-interest loan
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                    +{fmtCZK(point.loan)} CZK
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Commercial interest cost avoided by acting while the 0% state loan is available.
                  </p>
                </div>
              </div>
            </article>

            <div className="mt-10 flex justify-end">
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] active:scale-95"
              >
                Proceed
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Glass overlay + pinned Ask AI bar */}
      <AiPortal>
        {chatOpen && (
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-background/30 px-4 pb-36 pt-10 backdrop-blur-xl animate-fade-in sm:items-center sm:pb-40"
            role="dialog"
            aria-modal="true"
            aria-label="AI assistant"
            onClick={closeChat}
          >
            <div
              className="relative w-full max-w-[640px] animate-scale-in rounded-3xl border border-white/40 bg-background/55 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeChat}
                aria-label="Close AI chat"
                className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-background/60 text-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 transition hover:scale-[1.06] hover:bg-background/80 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              {asked && (
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md border border-foreground/15 bg-foreground/[0.06] px-4 py-3 text-sm font-medium text-foreground">
                  {asked}
                </div>
              )}

              <div className="mt-4 flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex-1 rounded-2xl rounded-tl-md border border-white/40 bg-background/70 px-4 py-3 text-sm leading-relaxed text-foreground/90 backdrop-blur-md">
                  <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Renovuj AI
                  </p>
                  {thinking ? (
                    <span className="inline-flex items-center gap-1.5 italic text-muted-foreground">
                      Thinking
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                      </span>
                    </span>
                  ) : (
                    aiReply
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-20 left-1/2 z-[100] flex w-[min(720px,calc(100%-2rem))] -translate-x-1/2 will-change-transform">
          <form
            onSubmit={submitAi}
            className="group relative flex w-full items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2 py-2 pl-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 transition focus-within:border-foreground/30 focus-within:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </span>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What money do I waste yearly with our current heating?"
              className="h-11 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
              aria-label="Ask AI"
            />
            <button
              type="submit"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-[1.03] hover:opacity-95 active:scale-95"
              aria-label="Send"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      </AiPortal>
    </section>
  );
}

// =====================================================================
// CommunityStep — "You're not alone": map of nearby renovated properties
// in Prague centre with red markers + contact list. Mock data; will be
// wired to a real source later.
// =====================================================================
const PRAGUE_CENTER: [number, number] = [50.0875, 14.4214];

const NEIGHBOURS = [
  {
    address: "Jenštejnská 1966/1, Praha 2",
    contact: "+420 776 112 305",
    coords: [50.0759, 14.4271] as [number, number],
    manager: "Petr Novák — Chair, SVJ Jenštejnská",
    color: "hsl(15 80% 55%)",
  },
  {
    address: "Křemencova 178/10, Praha 1",
    contact: "+420 602 884 217",
    coords: [50.0808, 14.4187] as [number, number],
    manager: "Markéta Dvořáková — Vice-chair",
    color: "hsl(45 90% 50%)",
  },
  {
    address: "Vodičkova 710/31, Praha 1",
    contact: "+420 731 209 466",
    coords: [50.0815, 14.4248] as [number, number],
    manager: "Tomáš Horák — Building manager",
    color: "hsl(150 60% 45%)",
  },
  {
    address: "Štěpánská 615/24, Praha 1",
    contact: "+420 605 991 028",
    coords: [50.081, 14.4276] as [number, number],
    manager: "Lucie Procházková — Chair, SVJ Štěpánská",
    color: "hsl(200 70% 55%)",
  },
  {
    address: "Sokolská 1802/32, Praha 2",
    contact: "+420 724 558 113",
    coords: [50.0768, 14.4297] as [number, number],
    manager: "Jan Veselý — Treasurer",
    color: "hsl(270 60% 60%)",
  },
  {
    address: "Truhlářská 1108/13, Praha 1",
    contact: "+420 608 410 772",
    coords: [50.0892, 14.4309] as [number, number],
    manager: "Eva Kratochvílová — Chair",
    color: "hsl(330 70% 55%)",
  },
  {
    address: "Klimentská 1216/46, Praha 1",
    contact: "+420 777 304 188",
    coords: [50.0918, 14.4326] as [number, number],
    manager: "Adam Beneš — Building manager",
    color: "hsl(180 70% 45%)",
  },
];

function exampleCoordinate(example: ReconstructionExample, index: number): [number, number] {
  const lat = Number(example.lat ?? example.latitude);
  const lon = Number(example.lon ?? example.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];

  const angle = (index / 8) * Math.PI * 2;
  return [PRAGUE_CENTER[0] + Math.sin(angle) * 0.012, PRAGUE_CENTER[1] + Math.cos(angle) * 0.018];
}

function buildCommunityNeighbours(communityData: ReconstructionExamplesResponse | null) {
  const colors = [
    "hsl(15 80% 55%)",
    "hsl(45 90% 50%)",
    "hsl(150 60% 45%)",
    "hsl(200 70% 55%)",
    "hsl(270 60% 60%)",
    "hsl(330 70% 55%)",
  ];

  if (!communityData?.examples?.length) return NEIGHBOURS;

  return communityData.examples.slice(0, 7).map((example, index) => ({
    address:
      example.applicantAddress ||
      [example.municipalityName, example.applicant].filter(Boolean).join(" · ") ||
      "Renovated SVJ project",
    contact: example.signedAt || "Decision date not listed",
    coords: exampleCoordinate(example, index),
    manager: [
      example.applicant || "SVJ / BD applicant",
      example.support
        ? `${new Intl.NumberFormat("cs-CZ").format(example.support)} CZK support`
        : null,
      example.purpose,
    ]
      .filter(Boolean)
      .join(" · "),
    color: colors[index % colors.length],
  }));
}

function CommunityStep({
  buildingInfo,
  communityData,
  isLoadingCommunity,
  communityError,
  onContinue,
}: {
  buildingInfo: BuildingInfo | null;
  communityData: ReconstructionExamplesResponse | null;
  isLoadingCommunity: boolean;
  communityError: string | null;
  onContinue: () => void;
}) {
  const mapFloatingRef = useRef<HTMLDivElement | null>(null);
  const mapInlineRef = useRef<HTMLDivElement | null>(null);
  const [isLg, setIsLg] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const markersRef = useRef<unknown[]>([]);
  const neighbours = useMemo(() => buildCommunityNeighbours(communityData), [communityData]);
  const mapCenter = useMemo<[number, number]>(() => {
    const lat = Number(buildingInfo?.address?.lat);
    const lon = Number(buildingInfo?.address?.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : PRAGUE_CENTER;
  }, [buildingInfo]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [question, setQuestion] = useState("");
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  const submitAi = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || thinking) return;
    setAsked(q);
    setQuestion("");
    setThinking(true);
    setAiReply(null);

    try {
      setAiReply(
        await askAdvisor(q, {
          section: "community",
          building: buildingInfo,
          nearbyExamples: neighbours.slice(0, 5),
        }),
      );
    } catch (error) {
      setAiReply(error instanceof Error ? error.message : "Advisor failed.");
    } finally {
      setThinking(false);
    }
  };

  const chatOpen = Boolean(asked || thinking || aiReply);
  const closeChat = () => {
    setAsked(null);
    setAiReply(null);
    setThinking(false);
  };

  // Initialise Leaflet client-side only — re-init when we switch container (lg/mobile)
  useEffect(() => {
    const container = isLg ? mapFloatingRef.current : mapInlineRef.current;
    if (!container) return;
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !container) return;

      map = L.map(container, {
        center: mapCenter,
        zoom: 14,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const greenIcon = L.divIcon({
        className: "renovuj-marker",
        html: `<span style="
          display:block;width:18px;height:18px;border-radius:9999px;
          background:hsl(140 65% 42%);
          border:2px solid hsl(0 0% 100%);
          box-shadow:0 4px 10px -2px hsl(140 65% 28% / 0.5),
                     0 0 0 4px hsl(140 65% 42% / 0.18);
        "></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      markersRef.current = neighbours.map((n, i) => {
        const marker = L.marker(n.coords, { icon: greenIcon }).addTo(map!);
        marker.bindPopup(`<strong>${n.address}</strong><br/>${n.manager}<br/>${n.contact}`);
        marker.on("click", () => setActiveIdx(i));
        return marker;
      });
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
      markersRef.current = [];
    };
  }, [isLg, mapCenter, neighbours]);

  const focusNeighbour = async (i: number) => {
    setActiveIdx(i);
    const L = (await import("leaflet")).default;
    const m = markersRef.current[i] as import("leaflet").Marker | undefined;
    if (m) {
      m.openPopup();
      const ll = m.getLatLng();
      // pan smoothly
      // @ts-expect-error map is captured in init effect; use marker's map
      const map = m._map as import("leaflet").Map | undefined;
      if (map) map.setView(ll, Math.max(map.getZoom(), 15), { animate: true });
    }
    void L;
  };

  return (
    <section className="relative min-h-screen w-full">
      {/* Floating interactive map (replaces the house on this slide) */}
      <AiPortal>
        <aside
          className={[
            "fixed top-[42%] left-[5%] z-30 hidden w-[40%] max-w-[520px] -translate-y-1/2 lg:block",
            "transition-[filter,transform,opacity] duration-500 ease-out",
            chatOpen ? "scale-[0.99] opacity-80 blur-md" : "scale-100 opacity-100 blur-0",
          ].join(" ")}
          aria-hidden={chatOpen}
        >
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/60 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)]">
            <div
              ref={mapFloatingRef}
              className="h-[60vh] max-h-[560px] w-full"
              aria-label="Map of nearby renovated properties in Prague"
            />
          </div>
        </aside>
      </AiPortal>

      <div
        className={[
          "animate-blur-in transition-[filter,transform,opacity] duration-500 ease-out",
          chatOpen ? "pointer-events-none scale-[0.99] opacity-80 blur-md" : "blur-0 opacity-100",
        ].join(" ")}
        aria-hidden={chatOpen}
      >
        <div className="min-h-screen w-full px-8 py-20 lg:ml-[50%] lg:w-[50%]">
          {/* Mobile map (replaces the mobile house image on this slide) */}
          <div className="lg:hidden mb-8 overflow-hidden rounded-3xl border border-border/70 bg-card/60 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)]">
            <div
              ref={mapInlineRef}
              className="h-[320px] w-full"
              aria-label="Map of nearby renovated properties in Prague"
            />
          </div>

          <div className="pb-40">
            <h2 className="font-display text-[2rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
              You're not alone
            </h2>
            <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
              We know it can be intimidating to start this alone — but you aren't. We've collected
              similar properties close to yours where renovations happened recently. Here are
              contacts of their managers who did it, and who can help you with advice.
            </p>
            <div className="mt-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-muted-foreground">
              {isLoadingCommunity
                ? "Loading local reconstruction examples from backend..."
                : communityError
                  ? communityError
                  : communityData
                    ? communityData.mode === "same-city"
                      ? `${communityData.localCount} examples found in ${communityData.municipalityName}.`
                      : `No exact local set found for ${communityData.municipalityName}; showing strongest fallback examples.`
                    : "Local proof will load after the address is resolved."}
            </div>

            {/* Contact list */}
            <ul className="mt-6 space-y-2">
              {neighbours.map((n, i) => (
                <li key={n.address}>
                  <button
                    type="button"
                    onClick={() => focusNeighbour(i)}
                    className={[
                      "group flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left transition",
                      activeIdx === i
                        ? "bg-foreground/[0.04]"
                        : "bg-background/40 hover:bg-foreground/[0.02]",
                    ].join(" ")}
                    style={{
                      borderColor: activeIdx === i ? n.color : `${n.color}66`,
                    }}
                  >
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_4px]"
                      style={{
                        backgroundColor: n.color,
                        boxShadow: `0 0 0 4px ${n.color}30`,
                      }}
                    />
                    <span className="flex-1">
                      <span className="block font-display text-base font-semibold text-foreground">
                        {n.address}
                      </span>
                      <span className="block text-xs text-muted-foreground">{n.manager}</span>
                    </span>
                    <span className="self-center font-mono text-sm tabular-nums text-foreground/85">
                      {n.contact}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex justify-end">
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] active:scale-95"
              >
                Proceed
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Glass overlay + pinned Ask AI bar */}
      <AiPortal>
        {chatOpen && (
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-background/30 px-4 pb-36 pt-10 backdrop-blur-xl animate-fade-in sm:items-center sm:pb-40"
            role="dialog"
            aria-modal="true"
            aria-label="AI assistant"
            onClick={closeChat}
          >
            <div
              className="relative w-full max-w-[640px] animate-scale-in rounded-3xl border border-white/40 bg-background/55 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeChat}
                aria-label="Close AI chat"
                className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-background/60 text-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 transition hover:scale-[1.06] hover:bg-background/80 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              {asked && (
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md border border-foreground/15 bg-foreground/[0.06] px-4 py-3 text-sm font-medium text-foreground">
                  {asked}
                </div>
              )}

              <div className="mt-4 flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex-1 rounded-2xl rounded-tl-md border border-white/40 bg-background/70 px-4 py-3 text-sm leading-relaxed text-foreground/90 backdrop-blur-md">
                  <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Renovuj AI
                  </p>
                  {thinking ? (
                    <span className="inline-flex items-center gap-1.5 italic text-muted-foreground">
                      Thinking
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                      </span>
                    </span>
                  ) : (
                    aiReply
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-20 left-1/2 z-[100] flex w-[min(720px,calc(100%-2rem))] -translate-x-1/2 will-change-transform">
          <form
            onSubmit={submitAi}
            className="group relative flex w-full items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2 py-2 pl-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 transition focus-within:border-foreground/30 focus-within:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </span>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="How many properties were renovated in Prague this year?"
              className="h-11 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
              aria-label="Ask AI"
            />
            <button
              type="submit"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-[1.03] hover:opacity-95 active:scale-95"
              aria-label="Send"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      </AiPortal>
    </section>
  );
}

function AiPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(<>{children}</>, document.body);
}

function Row({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: string;
  pct: number;
  tone: "positive" | "negative";
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/85">{label}</span>
        <span className="font-display tabular-nums font-medium text-foreground">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              tone === "positive"
                ? "linear-gradient(90deg, hsl(150 60% 45%), hsl(170 65% 45%))"
                : "linear-gradient(90deg, hsl(12 80% 58%), hsl(28 92% 60%))",
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// StakeholderStep — full-width persona tiles
// ============================================================

type Persona = {
  id: string;
  name: string;
  type: string;
  adjectives: string[];
  fear: string;
  description: string;
  sketch: React.ReactNode;
  color?: string;
};

const PERSONAS: Persona[] = [
  {
    id: "opatrna",
    name: "Paní Opatrná",
    type: "Debt-averse pensioner",
    adjectives: ["cautious", "fixed-income", "debt-averse"],
    fear: "Půjčka pro ni znamená osobní hrozbu a bojí se růstu měsíčních plateb.",
    description:
      "Lived in the building for thirty years. Remembers when the risers were last replaced and who paid for it. Listens carefully, asks the same question three different ways, and votes only when she's certain her monthly contribution won't change. Reassure her with the NZÚ vulnerable-household bonus and a fixed-cap repayment chart — not with optimism.",
    sketch: <SketchPensioner />,
    color: "hsl(15 80% 55%)",
  },
  {
    id: "kalkulacka",
    name: "Pan Kalkulačka",
    type: "Absentee investor",
    adjectives: ["ROI-driven", "remote", "value-focused"],
    fear: "V domě nebydlí a zajímá ho hlavně hodnota bytu.",
    description:
      "Reads the SFŽP bulletins on weekends. Will print the call documentation and highlight clause 4.3.b in yellow. Doesn't trust contractors and especially doesn't trust banks. Win him over with sourced numbers, a named project manager, and a clear escape clause — never with marketing language.",
    sketch: <SketchSkeptic />,
    color: "hsl(45 90% 50%)",
  },
  {
    id: "zitrek",
    name: "Pan Zítřek",
    type: "Chronic procrastinator",
    adjectives: ["overwhelmed", "delay-prone", "process-averse"],
    fear: "Souhlasí v principu, ale chce další schůzi, další nabídky a další odklad.",
    description:
      "Already has solar at the family cottage. Wants the green roof, the heat pump, and the rainwater system in one go. Will champion the proposal in the meeting but may overshoot the budget envelope. Anchor her in phased delivery — she'll defend the plan louder than anyone if she sees the end state on the timeline.",
    sketch: <SketchEco />,
    color: "hsl(150 60% 45%)",
  },
  {
    id: "neduverivy",
    name: "Pan Nedůvěřivý",
    type: "Suspicious penny-pincher",
    adjectives: ["suspicious", "frugal", "anti-sales"],
    fear: "Čeká podvod od firem, bank i dotací a soustředí se na vysokou cenu.",
    description:
      "Owns two flats and rents one out. Calculates payback in his head while you talk. Doesn't care about aesthetics or comfort — only about the net monthly delta. Show him the savings-vs-repayment line chart and the energy-class jump from G to C. The conversation ends the moment net cash flow turns green.",
    sketch: <SketchPenny />,
    color: "hsl(200 70% 55%)",
  },
  {
    id: "inzenyr",
    name: "Pan Inženýr",
    type: "Over-analyzer",
    adjectives: ["technical", "detail-heavy", "certainty-seeking"],
    fear: "Chce stoprocentní jistotu, přesné modely a právní rozbory.",
    description:
      "Bought the flat as a long-term hold. Lives in Brno or Munich. Never attends meetings, replies to emails after a week, and grants proxy to whoever asks first. Send him a one-page PDF with the number, the date, and a signature line — anything longer goes unread.",
    sketch: <SketchAbsentee />,
    color: "hsl(270 60% 60%)",
  },
  {
    id: "newcomer",
    name: "The New Neighbour",
    type: "The New Neighbour",
    adjectives: ["curious", "tech-savvy", "uncommitted"],
    fear: "Being outvoted by long-timers and stuck with the bill.",
    description:
      "Moved in last spring. Doesn't yet know the building's history but reads every email twice. Open to ambitious plans if the process feels transparent. Invite her early, give her a small role, and she becomes your most reliable yes-vote within two meetings.",
    sketch: <SketchNewcomer />,
    color: "hsl(330 70% 55%)",
  },
];

const MOCK_CUSTOM_PERSONA: Omit<Persona, "id" | "sketch"> = {
  name: "Vlastní persona",
  type: "The Heritage Guardian",
  adjectives: ["traditional", "detail-obsessed", "vocal"],
  fear: "That any external insulation will ruin the original Vinohrady facade and trigger a heritage office dispute.",
  description:
    "Knows the building's protected-zone status by heart and will quote the památkáři rulebook in the meeting. Open to renovation only when historical detailing is preserved — cornices, window proportions, original plaster texture. Bring her the heritage office pre-consultation note and she becomes your most credible ally.",
};

function toMaterialPersona(persona: Persona): MaterialPersona {
  return {
    id: persona.id,
    name: persona.name,
    type: persona.type,
    description: persona.description,
  };
}

function StakeholderStep({
  selectedPersonas,
  setSelectedPersonas,
  customPersonas,
  setCustomPersonas,
  onContinue,
}: {
  selectedPersonas: MaterialPersona[];
  setSelectedPersonas: React.Dispatch<React.SetStateAction<MaterialPersona[]>>;
  customPersonas: MaterialPersona[];
  setCustomPersonas: React.Dispatch<React.SetStateAction<MaterialPersona[]>>;
  onContinue: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState("");
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  const selectedPersonaIds = new Set(selectedPersonas.map((persona) => persona.id));
  const extraPersonas: Persona[] = customPersonas.map((persona) => ({
    ...persona,
    adjectives: ["custom", "building-specific"],
    fear: persona.description,
    sketch: <SketchCustom />,
    color: "hsl(330 70% 55%)",
  }));
  const allPersonas = [...PERSONAS, ...extraPersonas];

  const submitAi = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || thinking) return;
    setAsked(q);
    setQuestion("");
    setThinking(true);
    setAiReply(null);

    try {
      setAiReply(
        await askAdvisor(q, {
          section: "stakeholders",
          selectedPersonas,
          customPersonas,
        }),
      );
    } catch (error) {
      setAiReply(error instanceof Error ? error.message : "Advisor failed.");
    } finally {
      setThinking(false);
    }
  };

  const chatOpen = Boolean(asked || thinking || aiReply);
  const closeChat = () => {
    setAsked(null);
    setAiReply(null);
    setThinking(false);
  };

  const persona = allPersonas.find((p) => p.id === openId) ?? null;
  const personaOpen = Boolean(persona);
  const anyOverlay = chatOpen || personaOpen;

  const togglePersona = (personaToToggle: Persona) => {
    const materialPersona = toMaterialPersona(personaToToggle);
    setSelectedPersonas((current) =>
      current.some((item) => item.id === materialPersona.id)
        ? current.filter((item) => item.id !== materialPersona.id)
        : [...current, materialPersona],
    );
  };

  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const desc = custom.trim();
    if (!desc || adding) return;
    setAdding(true);
    const newPersona: MaterialPersona = {
      id: `custom-${Date.now()}`,
      name: "Vlastní persona",
      type: "Popis z vašeho domu",
      description: desc,
    };
    setCustomPersonas((current) => [...current, newPersona]);
    setSelectedPersonas((current) => [...current, newPersona]);
    setCustom("");
    setAdding(false);
  };

  return (
    <section className="relative min-h-screen w-full">
      <div
        className={[
          "animate-blur-in transition-[filter,transform,opacity] duration-500 ease-out",
          anyOverlay ? "pointer-events-none scale-[0.99] opacity-80 blur-md" : "blur-0 opacity-100",
        ].join(" ")}
        aria-hidden={anyOverlay}
      >
        <div className="mx-auto min-h-screen w-full max-w-[1400px] px-8 pt-32 pb-44">
          <h2 className="font-display text-[2rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
            We'll have your back in a meeting
          </h2>
          <p className="mt-3 max-w-[68ch] text-base leading-relaxed text-muted-foreground">
            We want you to have accurate and legally-grounded arguments in any council debate.
            Select who's blocking your proposal and what they're afraid of:
          </p>
          <p className="mt-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-muted-foreground">
            {selectedPersonas.length > 0
              ? `Saved for generated handouts: ${selectedPersonas.length} persona${
                  selectedPersonas.length === 1 ? "" : "s"
                }.`
              : "Select one or more personas, or describe your own neighbour."}
          </p>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allPersonas.map((p) => (
              <article
                key={p.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedPersonaIds.has(p.id)}
                onClick={() => togglePersona(p)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    togglePersona(p);
                  }
                }}
                style={{
                  borderColor: p.color ? `${p.color}80` : undefined,
                }}
                className={[
                  "group relative flex cursor-pointer flex-col items-start gap-5 overflow-hidden rounded-3xl border-2 bg-card/60 p-6 text-left transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-20px_rgba(0,0,0,0.25)]",
                  selectedPersonaIds.has(p.id) ? "ring-2 ring-foreground/70" : "",
                ].join(" ")}
              >
                {selectedPersonaIds.has(p.id) && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                    <Check className="h-3.5 w-3.5" />
                    Selected
                  </span>
                )}
                <div
                  className="grid h-28 w-full place-items-center rounded-2xl"
                  style={{
                    backgroundColor: p.color ? `${p.color}1A` : "rgba(0,0,0,0.03)",
                  }}
                >
                  <div className="h-24 w-24 text-foreground/80 transition group-hover:text-foreground">
                    {p.sketch}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                    {p.type}
                  </h3>
                  <p className="text-sm font-medium text-foreground/70">{p.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.adjectives.map((a) => (
                      <span
                        key={a}
                        style={{
                          borderColor: p.color ? `${p.color}66` : undefined,
                          color: p.color,
                        }}
                        className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenId(p.id);
                  }}
                  className="mt-auto rounded-full border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground/70 transition hover:border-foreground/40 hover:text-foreground"
                >
                  View strategy
                </button>
              </article>
            ))}
          </div>

          {/* Custom persona input */}
          <form
            onSubmit={submitCustom}
            className="mt-14 rounded-3xl border border-dashed border-border bg-background/40 p-6"
          >
            <label
              htmlFor="custom-persona"
              className="block font-display text-lg font-semibold text-foreground"
            >
              Haven't found your neighbour?
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe your peculiar one — the more specific, the better we'll prepare you.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                id="custom-persona"
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                disabled={adding}
                placeholder="e.g. The retired engineer who has redrawn the heating diagram three times…"
                className="h-12 flex-1 rounded-full border border-border/70 bg-background/80 px-5 text-sm text-foreground placeholder:text-muted-foreground/80 focus:border-foreground/30 focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={adding || !custom.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {adding ? "Adding…" : "Add neighbour"}
                {!adding && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>

          <div className="mt-12 flex justify-end">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35)] transition hover:scale-[1.02] active:scale-95"
            >
              Proceed
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Persona detail overlay */}
      <AiPortal>
        {persona && (
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-background/30 px-4 py-10 backdrop-blur-xl animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label={persona.type}
            onClick={() => setOpenId(null)}
          >
            <div
              className="relative w-full max-w-[640px] animate-scale-in rounded-3xl border border-white/40 bg-background/70 p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpenId(null)}
                aria-label="Close"
                className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-background/70 text-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:scale-[1.06] active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-5">
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-foreground/[0.05] text-foreground">
                  <div className="h-20 w-20">{persona.sketch}</div>
                </div>
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Stakeholder
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
                    {persona.type}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {persona.adjectives.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-border/70 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  What they're afraid of
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{persona.fear}</p>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-foreground/85">
                {persona.description}
              </p>
            </div>
          </div>
        )}

        {/* AI chat overlay */}
        {chatOpen && (
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-background/30 px-4 pb-36 pt-10 backdrop-blur-xl animate-fade-in sm:items-center sm:pb-40"
            role="dialog"
            aria-modal="true"
            aria-label="AI assistant"
            onClick={closeChat}
          >
            <div
              className="relative w-full max-w-[640px] animate-scale-in rounded-3xl border border-white/40 bg-background/55 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeChat}
                aria-label="Close AI chat"
                className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-background/60 text-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 transition hover:scale-[1.06] hover:bg-background/80 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              {asked && (
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md border border-foreground/15 bg-foreground/[0.06] px-4 py-3 text-sm font-medium text-foreground">
                  {asked}
                </div>
              )}

              <div className="mt-4 flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex-1 rounded-2xl rounded-tl-md border border-white/40 bg-background/70 px-4 py-3 text-sm leading-relaxed text-foreground/90 backdrop-blur-md">
                  <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Renovuj AI
                  </p>
                  {thinking ? (
                    <span className="inline-flex items-center gap-1.5 italic text-muted-foreground">
                      Thinking
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                      </span>
                    </span>
                  ) : (
                    aiReply
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-20 left-1/2 z-[100] flex w-[min(720px,calc(100%-2rem))] -translate-x-1/2 will-change-transform">
          <form
            onSubmit={submitAi}
            className="group relative flex w-full items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2 py-2 pl-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 transition focus-within:border-foreground/30 focus-within:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </span>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What are common fears owners have when renovating?"
              className="h-11 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
              aria-label="Ask AI"
            />
            <button
              type="submit"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-[1.03] hover:opacity-95 active:scale-95"
              aria-label="Send"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      </AiPortal>
    </section>
  );
}

// ---- Minimal persona sketches (inline SVG, single-stroke style) ----

function SketchBase({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      {children}
    </svg>
  );
}

function SketchPensioner() {
  return (
    <SketchBase>
      <circle cx="50" cy="36" r="14" />
      <path d="M30 80c2-14 12-22 20-22s18 8 20 22" />
      <path d="M40 34c2-6 18-6 20 0" />
      <path d="M44 38h2M54 38h2" />
      <path d="M46 46c2 2 6 2 8 0" />
    </SketchBase>
  );
}

function SketchSkeptic() {
  return (
    <SketchBase>
      <circle cx="50" cy="36" r="14" />
      <path d="M30 80c2-14 12-22 20-22s18 8 20 22" />
      <path d="M40 32l6 4M54 36l6-4" />
      <path d="M44 38h2M54 38h2" />
      <path d="M44 48c4-2 8-2 12 0" />
    </SketchBase>
  );
}

function SketchEco() {
  return (
    <SketchBase>
      <circle cx="50" cy="36" r="14" />
      <path d="M30 80c2-14 12-22 20-22s18 8 20 22" />
      <path d="M40 22c4 4 12 4 18-2" />
      <path d="M44 38h2M54 38h2" />
      <path d="M44 46c2 3 8 3 12 0" />
      <path d="M68 22c-2 6 2 10 6 8" />
    </SketchBase>
  );
}

function SketchPenny() {
  return (
    <SketchBase>
      <circle cx="50" cy="36" r="14" />
      <path d="M30 80c2-14 12-22 20-22s18 8 20 22" />
      <path d="M42 36l4 2 4-2M54 36l4 2 4-2" />
      <path d="M46 48h8" />
      <path d="M30 70l8-6 8 4 8-8 8 6 8-4" />
    </SketchBase>
  );
}

function SketchAbsentee() {
  return (
    <SketchBase>
      <circle cx="50" cy="36" r="14" />
      <path d="M30 80c2-14 12-22 20-22s18 8 20 22" />
      <path d="M40 38h6M54 38h6" />
      <path d="M44 48h12" />
      <path d="M14 86l72-72" strokeDasharray="3 4" opacity="0.5" />
    </SketchBase>
  );
}

function SketchNewcomer() {
  return (
    <SketchBase>
      <circle cx="50" cy="36" r="14" />
      <path d="M30 80c2-14 12-22 20-22s18 8 20 22" />
      <path d="M44 38h2M54 38h2" />
      <path d="M44 46c2 2 8 2 12 0" />
      <path d="M64 24l4-4 6 2-2 6-4 4z" />
    </SketchBase>
  );
}

function SketchCustom() {
  return (
    <SketchBase>
      <circle cx="50" cy="36" r="14" strokeDasharray="3 3" />
      <path d="M30 80c2-14 12-22 20-22s18 8 20 22" strokeDasharray="3 3" />
      <path d="M44 38h2M54 38h2" />
      <path d="M44 46c2 2 8 2 12 0" />
      <path d="M50 14v6M44 17l12 0" />
    </SketchBase>
  );
}

// ============================================================
// DistributionStep — final action: download toolkit + specialist CTA
// ============================================================

type Asset = {
  id: string;
  step: string;
  title: string;
  format: string;
  description: string;
  primary: { label: string; icon: React.ComponentType<{ className?: string }> };
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const ASSETS: Asset[] = [
  {
    id: "cheatsheet",
    step: "01",
    title: "Hallway cheat-sheet",
    format: "PDF · 1 page",
    description: "Numbers and savings on one printable page.",
    primary: { label: "Download", icon: Download },
    Icon: FileText,
    color: "hsl(20 85% 55%)",
  },
  {
    id: "chat",
    step: "02",
    title: "Group chat message",
    format: "Plain text",
    description: "Copy-paste opener for WhatsApp or Messenger.",
    primary: { label: "Copy", icon: MessagesSquare },
    Icon: MessagesSquare,
    color: "hsl(150 60% 42%)",
  },
  {
    id: "flyer",
    step: "03",
    title: "Notice-board flyer",
    format: "PDF · print-ready",
    description: "A4 infographic for the lift or foyer.",
    primary: { label: "Download", icon: Printer },
    Icon: Printer,
    color: "hsl(210 75% 52%)",
  },
];

function DistributionStep({
  address,
  buildingInfo,
  selected,
  answers,
  calculationInput,
  calculation,
  communityData,
  selectedPersonas,
}: {
  address: string;
  buildingInfo: BuildingInfo | null;
  selected: Set<string>;
  answers: Record<string, string>;
  calculationInput: RenovationCalculationInput | null;
  calculation: RenovationCalculation | null;
  communityData: ReconstructionExamplesResponse | null;
  selectedPersonas: MaterialPersona[];
}) {
  const [workingAsset, setWorkingAsset] = useState<string | null>(null);
  const [assetMessage, setAssetMessage] = useState<string | null>(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const runAssetAction = async (asset: Asset) => {
    setWorkingAsset(asset.id);
    setAssetMessage(null);

    try {
      if (asset.id === "chat") {
        const response = await fetch(getApiUrl("/api/generate-material"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            buildMaterialPayload({
              format: "whatsapp",
              address,
              buildingInfo,
              selected,
              answers,
              calculationInput,
              calculation,
              communityData,
              selectedPersonas,
            }),
          ),
        });
        const data = (await response.json()) as { content?: string; error?: string };
        if (!response.ok) throw new Error(data.error || "Failed to generate WhatsApp text.");
        await navigator.clipboard.writeText(data.content || "");
        setAssetMessage("Group chat text copied to clipboard.");
        return;
      }

      const endpoint = asset.id === "flyer" ? "/api/generate-leaflet" : "/api/generate-pdf";
      const response = await fetch(getApiUrl(endpoint), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          buildMaterialPayload({
            format: asset.id === "flyer" ? "leaflet" : "pdf",
            address,
            buildingInfo,
            selected,
            answers,
            calculationInput,
            calculation,
            communityData,
            selectedPersonas,
          }),
        ),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to generate PDF.");
      }

      const blob = await response.blob();
      downloadBlob(
        blob,
        asset.id === "flyer" ? "renovace-svj-letak.pdf" : "renovace-svj-onepager.pdf",
      );
      setAssetMessage(`${asset.title} downloaded.`);
    } catch (error) {
      setAssetMessage(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setWorkingAsset(null);
    }
  };

  return (
    <section className="relative min-h-screen w-full">
      <div className="animate-blur-in mx-auto min-h-screen w-full max-w-[1100px] px-8 pt-32 pb-32">
        <h2 className="font-display text-[2.25rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.75rem]">
          It's time to act.
        </h2>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          Three formats. Pick whichever fits the conversation.
        </p>
        <p className="mt-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-muted-foreground">
          {selectedPersonas.length > 0
            ? `Generation will use: ${selectedPersonas
                .map((persona) => persona.name || persona.type)
                .join(", ")}.`
            : "No stakeholder persona selected; generation will use the generic neighbour tone."}
        </p>
        {assetMessage && (
          <p className="mt-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-muted-foreground">
            {assetMessage}
          </p>
        )}

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {ASSETS.map((a) => (
            <article
              key={a.id}
              style={{ borderColor: a.color }}
              className="flex flex-col gap-6 rounded-2xl border-2 bg-background p-7 transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-20px_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-start justify-between">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl border"
                  style={{
                    borderColor: `${a.color}66`,
                    backgroundColor: `${a.color}1A`,
                    color: a.color,
                  }}
                >
                  <a.Icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-xs tracking-[0.14em] text-muted-foreground">
                  {a.step}
                </span>
              </div>

              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  {a.title}
                </h3>
                <p
                  className="mt-1.5 text-xs font-medium uppercase tracking-[0.12em]"
                  style={{ color: a.color }}
                >
                  {a.format}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-foreground/70">{a.description}</p>
              </div>

              <button
                type="button"
                style={{ backgroundColor: a.color }}
                onClick={() => runAssetAction(a)}
                disabled={workingAsset !== null}
                className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
              >
                <a.primary.icon className="h-4 w-4" />
                {workingAsset === a.id ? "Working..." : a.primary.label}
              </button>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-6 pt-6 md:flex-row md:items-center">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Want a second pair of eyes?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Free 30-min call with an independent specialist.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-6 text-sm font-semibold text-foreground transition hover:bg-foreground hover:text-background"
          >
            Book a call
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
