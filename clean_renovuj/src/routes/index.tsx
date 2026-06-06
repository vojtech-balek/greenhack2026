import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AskAiProvider,
  AskAiBar,
  AskAiOverlay,
  BodyPortal,
  useAskAi,
  useAskAiPlaceholder,
} from "@/components/flow/ask-ai";
import { GlassDialog } from "@/components/flow/glass-dialog";
import {
  PrimaryButton,
  ContinueRow,
  StepHeader,
  SectionLabel,
  OptionPill,
  StepNavArrowButton,
} from "@/components/flow/primitives";
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
import buildingsAssetJson from "@/assets/panelak_intro_page.png.asset.json";
import houseAssetJson from "@/assets/basic_house.png.asset.json";

const buildingsAsset = {
  ...buildingsAssetJson,
  url: "/img/houses/panelak.png",
};

const getHouseImageUrl = (buildingInfo: any | null): string => {
  if (!buildingInfo || !buildingInfo.building) {
    return "/img/houses/panelak.png";
  }
  const type = (buildingInfo.building.buildingType || "").toLowerCase();
  const usage = (buildingInfo.building.usage || "").toLowerCase();
  if (
    type.includes("rodinný") ||
    type.includes("rodinny") ||
    usage.includes("rodinný") ||
    usage.includes("rodinny")
  ) {
    return "/img/houses/basic_house.png";
  }
  return "/img/houses/panelak.png";
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "renovuj.me · your first step to collective renovation" },
      {
        name: "description",
        content:
          "Plan, cost, and defend a renovation for your building. Made for the people who keep apartment owner associations moving.",
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

// All figures are illustrative for an 18-flat Vinohrady tenement and are
// re-derived from public sources cited in SOURCES below.
const FINANCIALS = {
  totalProjectCost: 14_280_000, // CZK — full envelope across all eligible measures
  outOfPocket: 0,
  outOfPocketUnit: "CZK upfront (0 CZK / flat)",
  outOfPocketNote:
    "The NZÚ 2026+ interest-free loan (up to 750 000 CZK / flat, capped per measure by SFŽP) plus a small commercial top-up cover the full 14.28M CZK envelope. Nothing comes out of your pocket on day one.",
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
    note: "Per flat. Numbers are an illustrative model — actual splátka and savings depend on the chosen bank, drawdown profile and as-built energy performance.",
  },
  financingMix: [
    {
      label: "Nová zelená úsporám 2026+ — interest-free loan (up to 25 yr)",
      pct: 95,
      amount: 13_500_000, // 18 flats × 750 000 CZK
      color: "hsl(150 55% 42%)",
      group: "nzu" as const,
    },
    {
      label: "Commercial top-up (combinable with NZÚ)",
      pct: 5,
      amount: 780_000,
      color: "hsl(32 85% 55%)",
      group: "other" as const,
    },
  ],
};

// Single source-of-truth for the externally-verifiable claims on this page.
const SOURCES = {
  nzu: {
    label: "SFŽP ČR / MŽP, press release 9. 3. 2026; novazelenausporam.cz",
    url: "https://sfzp.gov.cz/tiskove-centrum/tiskove-zpravy/detail-tiskove-zpravy/?id=409",
  },
  nzuLoanSvj: {
    label: "SVJ/BD: interest-free loan up to 750 000 CZK / flat, splatnost až 25 let",
    url: "https://novazelenausporam.cz/bezurocny-uver-svj-bytova-druzstva/",
  },
  vinohradyPrice: {
    label: "Brivo — Vinohrady ~180 000 CZK/m² (Q1 2026)",
    url: "https://www.brivo.cz/cena-bytu/praha/vinohrady",
  },
  energyDrift: {
    label: "ERÚ regulated price decisions 2024–2025; Eurostat HH gas index",
    url: "https://eru.gov.cz/ceny-energii",
  },
  buildIndex: {
    label: "ČSÚ — Indexy cen stavebních prací, +2.7% YoY (2025)",
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




// Example pre-fill for an early-1900s Vinohrady brick tenement (činžovní
// dům). Specific numbers (year, cadastre, last renovation) are placeholders
// shown during onboarding — they get overwritten with real cadastre /
// energy-audit data once the SVJ uploads its documents.
const INFERRED_PROPERTY = {
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
//   protectedZone: "Vinohrady conservation area (Praha 2)",
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

const STORAGE_KEY = "renovuj.state.v1";

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

function LandingPage() {
  const [address, setAddress] = useState("");
  const [step, setStep] = useState<Step>("hero");
  const [exiting, setExiting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [energyFile, setEnergyFile] = useState<File | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [maxStepIndex, setMaxStepIndex] = useState(0);

  // Dynamic API state hooks
  const [buildingInfo, setBuildingInfo] = useState<any | null>(null);
  const [calculation, setCalculation] = useState<any | null>(null);
  const [communityData, setCommunityData] = useState<any | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedChatContent, setGeneratedChatContent] = useState<string | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [addressMatches, setAddressMatches] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);


  useEffect(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore storage access errors */
    }
    setHydrated(true);
  }, []);

  // Dynamic NZÚ Calculation hook
  useEffect(() => {
    if (!hydrated) return;

    const goalMap: Record<string, string> = {
      insulation: "INSULATION",
      "heat-source": "HEAT_SOURCE",
      ventilation: "VENTILATION",
      "green-roof": "GREEN_ROOF",
      photovoltaic: "PHOTOVOLTAICS",
    };

    const selectedGoals = Array.from(selected)
      .map((g) => goalMap[g])
      .filter(Boolean);

    if (selectedGoals.length === 0) {
      setCalculation(null);
      return;
    }

    const building = buildingInfo?.building || {};
    const numberOfFlats = Math.max(1, Number(building.flats) || 18);
    const floorArea = Number(building.floorAreaM2) || numberOfFlats * 80;
    const footprintArea = Number(building.builtAreaM2) || (Number(building.floors) > 0 ? floorArea / Number(building.floors) : floorArea / 5);

    let vulnerableFlats = 0;
    const vulnAnswer = answers.vulnerable;
    if (vulnAnswer === "Yes, significant share") {
      vulnerableFlats = Math.max(1, Math.round(numberOfFlats * 0.3));
    } else if (vulnAnswer === "Some") {
      vulnerableFlats = Math.max(1, Math.round(numberOfFlats * 0.15));
    }

    const payload = {
      floorArea,
      footprintArea,
      numberOfFlats,
      vulnerableFlats,
      selectedGoals,
      renovationType: selectedGoals.includes("INSULATION") ? "COMPLEX" : "PARTIAL",
    };

    const runCalc = async () => {
      try {
        const response = await fetch("/api/calculate-renovation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          setCalculation(data);
        }
      } catch (err) {
        console.error("Failed to run NZU calculation:", err);
      }
    };

    runCalc();
  }, [hydrated, buildingInfo, selected, answers]);

  // Dynamic Community examples hook
  useEffect(() => {
    if (!hydrated || !buildingInfo) return;
    const municipalityName = buildingInfo?.address?.municipalityName || "";
    if (!municipalityName) return;

    const fetchCommunity = async () => {
      try {
        const response = await fetch(`/api/reconstruction-examples?municipalityName=${encodeURIComponent(municipalityName)}`);
        if (response.ok) {
          const data = await response.json();
          setCommunityData(data);
        }
      } catch (err) {
        console.error("Failed to fetch community examples:", err);
      }
    };

    fetchCommunity();
  }, [hydrated, buildingInfo]);

  const stepIndex = STEPS.indexOf(step);

  const transitionTo = (next: Step) => {
    if (exiting) return;
    const nextIdx = STEPS.indexOf(next);
    setExiting(true);
    window.setTimeout(() => {
      setStep(next);
      setMaxStepIndex((m) => Math.max(m, nextIdx));
      setExiting(false);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    }, 420);
  };

  const goToIndex = (idx: number) => {
    if (idx < 0 || idx >= STEPS.length) return;
    if (idx > maxStepIndex) return; // no jumping to the future
    if (idx === stepIndex) return;
    transitionTo(STEPS[idx]);
  };


  const handleAddressSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = address.trim();
    if (!query) {
      setSearchError("Zadejte prosím adresu.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vyhledávání adresy selhalo.");

      if (data.matches && data.matches.length > 0) {
        setAddressMatches(data.matches);
      } else {
        setSearchError("Nenašli jsme žádné shody. Zkuste upřesnit ulici a číslo popisné.");
      }
    } catch (err: any) {
      setSearchError(err.message || "Vyhledávání adresy selhalo.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAddress = async (match: any) => {
    setSearching(true);
    setSearchError(null);
    setAddressMatches([]);
    setAddress(match.displayName);
    try {
      setProcessing(true);
      const response = await fetch("/api/building-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedAddress: match }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nepodařilo se načíst údaje o domu.");

      setBuildingInfo(data);
      setProcessing(false);
      setSearching(false);
      transitionTo("goals");
    } catch (err: any) {
      setProcessing(false);
      setSearching(false);
      setSearchError(err.message || "Nepodařilo se načíst údaje o domu.");
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

  const buildMaterialPayload = (format: string) => {
    const goalMap: Record<string, string> = {
      insulation: "INSULATION",
      "heat-source": "HEAT_SOURCE",
      ventilation: "VENTILATION",
      "green-roof": "GREEN_ROOF",
      photovoltaic: "PHOTOVOLTAICS",
    };

    const selectedGoals = Array.from(selected)
      .map((g) => {
        const matchingGoal = GOALS.find((goal) => goal.id === g);
        return {
          id: g,
          label: matchingGoal?.label || g,
          nzuGoal: goalMap[g] || null,
        };
      });

    const answeredQuestions = Object.entries(answers)
      .filter(([, value]) => value)
      .map(([questionId, value]) => {
        const question = QUESTIONS.find((item) => item.id === questionId);
        return {
          id: questionId,
          question: question?.label || questionId,
          answer: value,
        };
      });

    const building = buildingInfo?.building || {};
    const addr = buildingInfo?.address || {};

    const numberOfFlats = Math.max(1, Number(building.flats) || 18);
    const floorArea = Number(building.floorAreaM2) || numberOfFlats * 80;
    const footprintArea = Number(building.builtAreaM2) || (Number(building.floors) > 0 ? floorArea / Number(building.floors) : floorArea / 5);

    let vulnerableFlats = 0;
    const vulnAnswer = answers.vulnerable;
    if (vulnAnswer === "Yes, significant share") {
      vulnerableFlats = Math.max(1, Math.round(numberOfFlats * 0.3));
    } else if (vulnAnswer === "Some") {
      vulnerableFlats = Math.max(1, Math.round(numberOfFlats * 0.15));
    }

    const nzuInput = {
      floorArea,
      footprintArea,
      numberOfFlats,
      vulnerableFlats,
      selectedGoals: selectedGoals.map((g) => g.nzuGoal).filter(Boolean) as string[],
      renovationType: selectedGoals.some((g) => g.nzuGoal === "INSULATION") ? ("COMPLEX" as const) : ("PARTIAL" as const),
    };

    const calcResult = calculation || {
      grossCapEx: numberOfFlats * 750000,
      directSubsidyVulnerable: vulnerableFlats * 120000,
      netStateLoanAmount: numberOfFlats * 750000 - vulnerableFlats * 120000,
      maxStateLoanAmount: numberOfFlats * 750000,
      stateLoanTermYears: 25,
      monthlyStateLoanPayment: (numberOfFlats * 750000 - vulnerableFlats * 120000) / (25 * 12),
      estimatedYearlySavings: floorArea * 450 * 0.5,
      penaltyLostSavings: floorArea * 450 * 0.5 * 5,
      penaltyCapexInflation: numberOfFlats * 750000 * 0.25,
      penaltyLostZeroInterest: numberOfFlats * 750000 * 0.1,
      totalWaitPenalty: floorArea * 450 * 0.5 * 5 + numberOfFlats * 750000 * 0.35,
    };

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

    const mappedPersonas = PERSONAS.map((p) => ({
      id: p.id === "penny" ? "neduverivy" : p.id === "absentee" ? "kalkulacka" : p.id === "newcomer" ? "newcomer" : p.id === "pensioner" ? "opatrna" : p.id === "skeptic" ? "inzenyr" : p.id,
      name: p.type,
      type: p.type,
      description: p.description,
    }));

    return {
      format,
      context: {
        address: {
          input: address,
          municipalityName: addr.municipalityName || null,
          streetName: addr.streetName || null,
          cp: addr.cp || null,
        },
        building: {
          usage: building.usage || null,
          completedAt: building.completedAt || null,
          floorAreaM2: floorArea,
          builtAreaM2: footprintArea,
          floors: building.floors || null,
          flats: numberOfFlats,
          heating: building.utilities?.heating || null,
        },
        selectedGoals,
        answeredQuestions,
        nonFinancialBenefits,
        calculation: {
          input: nzuInput,
          result: calcResult,
        },
        selectedPersonas: mappedPersonas,
      },
      selectedPersonas: mappedPersonas,
      visuals: {
        penaltyBreakdown: [
          { label: "Dražší stavba", value: calcResult.penaltyCapexInflation },
          { label: "Ztracené úspory", value: calcResult.penaltyLostSavings },
          { label: "Komerční úrok", value: calcResult.penaltyLostZeroInterest },
        ],
        waitTrajectorySvg: null,
        suggestedCharts: [
          "bar chart: dražší stavba vs ztracené úspory vs komerční úrok",
          "line chart: růst nákladů čekání od teď do 5 let",
        ],
      },
      localExamples: communityData
        ? {
            summary: {
              mode: communityData.mode,
              localCount: communityData.localCount,
              stats: communityData.stats,
            },
            examples: (communityData.examples || []).slice(0, 3),
          }
        : null,
    };
  };

  const handleDownloadPdf = async (id: string) => {
    if (generatingId) return;
    setGeneratingId(id);
    const endpoint = id === "cheatsheet" ? "/api/generate-pdf" : "/api/generate-leaflet";
    const filename = id === "cheatsheet" ? "renovace-svj-onepager.pdf" : "renovace-svj-letak.pdf";
    try {
      const payload = buildMaterialPayload(id === "cheatsheet" ? "pdf" : "leaflet");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Generování PDF selhalo.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Nepodařilo se vygenerovat PDF.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateWhatsapp = async () => {
    if (generatingId) return;
    setGeneratingId("chat");
    try {
      const payload = buildMaterialPayload("whatsapp");
      const response = await fetch("/api/generate-material", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generování WhatsApp zprávy selhalo.");

      setGeneratedChatContent(data.content);
      setChatDialogOpen(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Nepodařilo se vygenerovat zprávu.");
    } finally {
      setGeneratingId(null);
    }
  };

  const visibleQuestions = QUESTIONS.filter(
    (q) => q.triggers.length === 0 || q.triggers.some((t) => selected.has(t)),
  );

  return (
    <AskAiProvider>
    <main className="relative min-h-screen bg-background">
      <header className="app-container fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-background/60 py-4 sm:py-5 backdrop-blur-md">
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

      {hydrated && step === "financials" && <AiHintBubble />}

      {hydrated && step !== "hero" && (
        <aside className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex animate-blur-in-soft">
          <StepNavArrowButton
            onClick={() => goToIndex(stepIndex - 1)}
            disabled={stepIndex <= 0}
            label="Previous step"
          >
            <ChevronUp className="h-4 w-4" />
          </StepNavArrowButton>

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

          <StepNavArrowButton
            onClick={() => goToIndex(stepIndex + 1)}
            disabled={stepIndex + 1 > maxStepIndex || stepIndex + 1 >= STEPS.length}
            label="Next step"
          >
            <ChevronDown className="h-4 w-4" />
          </StepNavArrowButton>
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
          buildingInfo={buildingInfo}
          onContinue={() => {
            setProcessing(true);
            window.setTimeout(() => {
              setProcessing(false);
              transitionTo("summary");
            }, 3000);
          }}
        />
      ) : step === "summary" ? (
        <SummaryStep
          onContinue={() => transitionTo("financials")}
          address={address}
          buildingInfo={buildingInfo}
        />

      ) : step === "financials" ? (
        <FinancialsStep onContinue={() => transitionTo("urgency")} calculation={calculation} buildingInfo={buildingInfo} />
      ) : step === "urgency" ? (
        <UrgencyStep onContinue={() => transitionTo("community")} calculation={calculation} buildingInfo={buildingInfo} />
      ) : step === "community" ? (
        <CommunityStep onContinue={() => transitionTo("stakeholders")} communityData={communityData} />
      ) : step === "stakeholders" ? (
        <StakeholderStep onContinue={() => transitionTo("distribution")} />
      ) : step === "distribution" ? (
        <DistributionStep
          generatingId={generatingId}
          onDownloadPdf={handleDownloadPdf}
          onGenerateWhatsapp={handleGenerateWhatsapp}
        />
      ) : (
        <div
          key={step}
          className={exiting ? "animate-blur-out" : "animate-blur-in"}
        >
          {step === "hero" ? (
            <HeroStep address={address} setAddress={setAddress} />
          ) : (
            <GoalsStep selected={selected} toggleGoal={toggleGoal} />
          )}
        </div>
      )}

      {step === "hero" && (
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto flex flex-col w-[min(640px,calc(100%-2rem))] gap-3">
          {/* Matches Panel */}
          {(searching || addressMatches.length > 0 || searchError) && (
            <div className="w-full max-h-60 overflow-y-auto rounded-3xl border border-white/40 bg-background/80 p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl backdrop-saturate-150 animate-scale-in">
              {searching ? (
                <div className="py-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border border-muted-foreground/30 border-t-muted-foreground" />
                  Vyhledávám adresy...
                </div>
              ) : searchError ? (
                <div className="py-2 text-center text-sm text-red-500">{searchError}</div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Vyberte správnou adresu:</p>
                  {addressMatches.map((match) => (
                    <button
                      key={match.id || match.displayName}
                      type="button"
                      onClick={() => handleSelectAddress(match)}
                      className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-foreground/[0.04] transition flex flex-col gap-0.5 cursor-pointer"
                    >
                      <strong className="text-sm font-semibold text-foreground">{match.displayName}</strong>
                      <span className="text-xs text-muted-foreground">
                        {[match.street, match.cp ? `č.p. ${match.cp}` : null, match.municipalityName, match.zip ? `PSČ ${match.zip}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={handleAddressSearchSubmit}
            className="group relative flex w-full items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2 py-2 pl-6 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl backdrop-saturate-150 transition focus-within:border-foreground/30 focus-within:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.3)]"
          >
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (addressMatches.length > 0) setAddressMatches([]);
                if (searchError) setSearchError(null);
              }}
              placeholder="Zadejte adresu renovace (např. Vinohradská 56, Praha)"
              className="h-11 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
              aria-label="Renovation address"
            />
            <button
              type="submit"
              disabled={searching}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-[1.03] hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer"
              aria-label="Continue"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}

      {step === "goals" && (
        <div className="fixed inset-x-0 bottom-28 z-40 mx-auto flex w-[min(640px,calc(100%-2rem))] justify-center">
          <PrimaryButton
            onClick={() => transitionTo("property")}
            disabled={selected.size === 0}
          >
            Proceed
          </PrimaryButton>

        </div>
      )}

      {step !== "property" && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-40 bg-gradient-to-t from-background via-background/70 to-transparent" />
      )}

      {processing && <ProcessingOverlay />}
    </main>
    <AskAiBar />
    <AskAiOverlay />
    <GlassDialog
      open={chatDialogOpen}
      onClose={() => setChatDialogOpen(false)}
      label="Skupinová zpráva"
    >
      <div className="space-y-4">
        <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          WhatsApp / Messenger Message
        </h3>
        <p className="text-sm text-muted-foreground">
          Zde je vygenerovaná zpráva pro vaše sousedy. Můžete ji zkopírovat a poslat do vaší sousedské skupiny.
        </p>
        <div className="relative rounded-2xl border border-border/60 bg-background/60 p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground max-h-60 overflow-y-auto">
            {generatedChatContent || "Generuji..."}
          </pre>
        </div>
        <div className="flex justify-end gap-3">
          <PrimaryButton
            onClick={() => {
              if (generatedChatContent) {
                navigator.clipboard.writeText(generatedChatContent);
                alert("Zkopírováno do schránky!");
              }
            }}
            disabled={!generatedChatContent}
          >
            Kopírovat text
          </PrimaryButton>
        </div>
      </div>
    </GlassDialog>
    </AskAiProvider>

  );
}


function HeroStep({
  address,
  setAddress,
}: {
  address: string;
  setAddress: (v: string) => void;
}) {
  return (
    <StepShell topPadding="hero">
      <h1 className="font-display max-w-[18ch] text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[4rem] md:text-[5.5rem] lg:text-[6.25rem]">
        <span className="block text-foreground">Your first step</span>
        <span className="block text-foreground/35">
          to collective renovation.
        </span>
      </h1>

      <div className="relative mt-1 sm:mt-2">
        <img
          src={buildingsAsset.url}
          alt="Row of European apartment buildings at dusk with warm window lights"
          className="relative mx-auto w-full select-none animate-hero-drift"
          draggable={false}
        />
      </div>
    </StepShell>
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
    <StepShell topPadding="tight">
      <StepHeader
        title="What is the goal of your renovation?"
        subtitle="Pick whatever feels right, we'll take it from there."
        subtitleVariant="italic"
      />


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
    </StepShell>
  );
}


function PropertyStep({
  questions,
  answers,
  setAnswers,
  energyFile,
  setEnergyFile,
  onContinue,
  buildingInfo,
}: {
  questions: Question[];
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  energyFile: File | null;
  setEnergyFile: (f: File | null) => void;
  onContinue: () => void;
  buildingInfo?: any;
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
    <SplitShell buildingInfo={buildingInfo}>
      <div className="pb-12">



        <StepHeader
          title="Tell us a bit about your building"
          subtitle="A few quick questions, one at a time."
          subtitleVariant="italic"
        />


        <ol className="mt-10 space-y-10">
          {questions.map((q, i) => (
            <li key={q.id} className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-sm font-semibold text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                  {q.label}
                </h3>
              </div>

              {q.type === "yesno" ? (
                <div className="flex gap-3 pl-9">
                  {["Yes", "No"].map((opt) => (
                    <OptionPill
                      key={opt}
                      size="md"
                      selected={answers[q.id] === opt}
                      onClick={() => setAnswer(q.id, opt)}
                    >
                      {opt}
                    </OptionPill>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pl-9">
                  {q.options?.map((opt) => (
                    <OptionPill
                      key={opt}
                      selected={answers[q.id] === opt}
                      onClick={() => setAnswer(q.id, opt)}
                    >
                      {opt}
                    </OptionPill>
                  ))}
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
                  <span className="text-sm font-normal text-muted-foreground">
                    (optional)
                  </span>
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
                    <span className="truncate text-sm text-foreground">
                      {energyFile.name}
                    </span>
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
                  <span className="text-xs text-muted-foreground">
                    PDF · up to 10 MB
                  </span>
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

        <ContinueRow onClick={onContinue} label="Continue" topMargin="mt-12" />

      </div>
    </SplitShell>
  );
}


function SummaryStep({
  onContinue,
  address,
  buildingInfo,
}: {
  onContinue: () => void;
  address: string;
  buildingInfo: any | null;
}) {
  const b = buildingInfo?.building || {};
  const addr = buildingInfo?.address || {};

  const p = buildingInfo
    ? {
        address: address || addr.displayName || buildingInfo?.query || INFERRED_PROPERTY.address,
        yearBuilt: b.completedAt || INFERRED_PROPERTY.yearBuilt,
        buildingType: b.buildingType || INFERRED_PROPERTY.buildingType,
        foundation: INFERRED_PROPERTY.foundation,
        loadBearing: b.constructionType || INFERRED_PROPERTY.loadBearing,
        roof: INFERRED_PROPERTY.roof,
        floors: b.floors ? `${b.floors} podlaží` : INFERRED_PROPERTY.floors,
        flats: b.flats ? `${b.flats} bytů` : INFERRED_PROPERTY.flats,
        commercialUnits: INFERRED_PROPERTY.commercialUnits,
        heating: b.utilities?.heating || INFERRED_PROPERTY.heating,
        hotWater: b.utilities?.water || INFERRED_PROPERTY.hotWater,
        windows: INFERRED_PROPERTY.windows,
        facade: INFERRED_PROPERTY.facade,
        lastRenovation: INFERRED_PROPERTY.lastRenovation,
        energyClass: INFERRED_PROPERTY.energyClass,
        cadastralId: b.stavebniObjektKod ? `Stavební objekt Kód: ${b.stavebniObjektKod}` : INFERRED_PROPERTY.cadastralId,
//         protectedZone: INFERRED_PROPERTY.protectedZone,
      }
    : INFERRED_PROPERTY;

  const groups: {
    title: string;
    items: { label: string; value: string }[];
  }[] = [
    {
      title: "Identity",
      items: [
        { label: "Address", value: p.address },
        { label: "Cadastral parcel", value: p.cadastralId },
//         { label: "Protected zone", value: p.protectedZone },
      ],
    },
    {
      title: "Structure",
      items: [
        { label: "Year built", value: p.yearBuilt },
        { label: "Building type", value: p.buildingType },
        { label: "Foundation", value: p.foundation },
      ],
    },
    {
      title: "Layout",
      items: [
        { label: "Floors", value: p.floors },
        { label: "Residential flats", value: p.flats },
        { label: "Commercial units", value: p.commercialUnits },
      ],
    },
    {
      title: "Systems",
      items: [
        { label: "Heating", value: p.heating },
      ],
    },
    {
      title: "History",
      items: [
        { label: "Last renovation", value: p.lastRenovation },
        { label: "Energy class", value: p.energyClass },
      ],
    },
  ];

  return (
    <SplitShell buildingInfo={buildingInfo}>
      <div className="pb-12">

          <StepHeader
            size="md"
            title="Here's your building"
            subtitle="We pulled this together from public registries (cadastre, building permits, energy performance) and what you just shared. Anything off? You can fix it in the next step."
          />


          <div className="mt-12 space-y-10">
            {groups.map((g, gi) => (
              <section
                key={g.title}
                className={gi === 0 ? "" : "border-t border-border/60 pt-10"}
              >
                <div className="flex items-center gap-4">
                  <h3 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.28em] text-foreground/90">
                    {g.title}
                  </h3>
                  <span className="h-px flex-1 bg-border/60" aria-hidden />
                </div>
                <dl className="mt-6 grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
                  {g.items.map((it) => (
                    <div key={it.label} className="flex flex-col gap-1.5">
                      <dt className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-foreground/45">
                        {it.label}
                      </dt>
                      <dd className="font-display text-[1.05rem] font-medium leading-snug text-foreground">
                        {it.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>



          <ContinueRow onClick={onContinue} label="Looks right, continue" topMargin="mt-8" />

      </div>
    </SplitShell>

  );
}



function FinancialsStep({
  onContinue,
  calculation,
  buildingInfo,
}: {
  onContinue: () => void;
  calculation: any | null;
  buildingInfo: any | null;
}) {
  const fmtCZK = (n: number) =>
    new Intl.NumberFormat("cs-CZ").format(n).replace(/\u00A0/g, " ");

  const flatsCount = buildingInfo?.building?.flats || 18;
  const floorArea = buildingInfo?.building?.floorAreaM2 || 1440;

  const f = calculation
    ? {
        totalProjectCost: calculation.grossCapEx,
        outOfPocket: 0,
        outOfPocketUnit: "CZK upfront (0 CZK / flat)",
        outOfPocketNote: `Celkovou obálku ve výši ${fmtCZK(calculation.grossCapEx)} Kč plně pokryje bezúročný úvěr NZÚ (až 750 000 Kč na byt, zastropovaný podle opatření SFŽP) spolu s komerčním dofinancováním. Na začátku neplatíte nic z vlastní kapsy.`,
        valueUplift: 11,
        valueBefore: floorArea * 180000,
        valueAfter: Math.round(floorArea * 180000 * 1.11),
        monthly: {
          loanRepayment: Math.round(calculation.monthlyStateLoanPayment),
          energySavings: Math.round(calculation.estimatedYearlySavings / 12 / flatsCount),
          net: Math.round(calculation.monthlyStateLoanPayment - (calculation.estimatedYearlySavings / 12 / flatsCount)),
          note: "Přepočteno na jeden byt. Čísla představují orientační model — skutečná splátka a úspora závisí na zvolené bance, čerpání a reálné energetické náročnosti budovy.",
        },
        financingMix: [
          {
            label: "Nová zelená úsporám — interest free loan úvěr (až 15 let)",
            pct: Math.round((calculation.netStateLoanAmount / calculation.grossCapEx) * 100) || 95,
            amount: calculation.netStateLoanAmount,
            color: "hsl(150 55% 42%)",
            group: "nzu" as const,
          },
          {
            label: "Commercial loan",
            pct: Math.max(0, 100 - (Math.round((calculation.netStateLoanAmount / calculation.grossCapEx) * 100) || 95)),
            amount: Math.max(0, calculation.grossCapEx - calculation.netStateLoanAmount),
            color: "hsl(32 85% 55%)",
            group: "other" as const,
          },
        ],
      }
    : FINANCIALS;

  useAskAiPlaceholder("How exactly does the interest-free NZÚ loan work?");

  return (
    <SplitShell buildingInfo={buildingInfo}>
      <div className="pb-40">


            <StepHeader
              title="Let's see what renovating could save you"
              subtitle="Here are the best financing options on the table today, and what they'd mean for your building. You don't have to figure this out alone, we're here to walk you through it."
            />



            <div className="mt-10 space-y-6">
              {/* Out-of-pocket — what each owner actually pays today */}
              <article className="rounded-[28px] border border-border/60 bg-card/70 p-7">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  What you pay today
                </p>

                <p className="mt-3 font-display text-[3.5rem] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground">
                  0 CZK <span className="text-foreground/40">/ flat</span>
                </p>

                {/* Crossed-out full cost → 0 */}
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Full project cost</span>
                  <span className="font-mono tabular-nums text-foreground/50 line-through decoration-[hsl(20_75%_50%)]/60 decoration-[1.5px]">
                    {fmtCZK(f.totalProjectCost)} CZK
                  </span>
                  <span className="text-muted-foreground/60">→</span>
                  <span className="rounded-md bg-[hsl(150_55%_42%/0.12)] px-2 py-0.5 font-mono text-sm font-semibold tabular-nums text-[hsl(150_55%_28%)]">
                    0 CZK upfront
                  </span>
                </div>

                <p className="mt-5 max-w-[55ch] text-sm leading-relaxed text-foreground/75">
                  The NZÚ 2026+ interest-free loan (up to 750 000 CZK / flat) plus a small commercial top-up cover the full envelope. Nothing leaves your pocket on day one.
                </p>
                <p className="mt-3 text-xs italic text-muted-foreground/70">
                  Sources: SFŽP 2026 press release, novazelenausporam.cz, Brivo Vinohrady ~180 000 CZK/m² (Q1 2026).
                </p>
              </article>

              {/* Property value uplift — lead with the CZK gain per flat */}
              <article className="rounded-[28px] border border-border/60 bg-card/70 p-7">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Property value, per flat
                  </p>
                  <span className="rounded-full bg-[hsl(150_55%_42%/0.12)] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[hsl(150_55%_30%)]">
                    On completion
                  </span>
                </div>

                {/* Hero: the gain in CZK */}
                <p className="mt-3 font-display text-[3.5rem] font-semibold leading-[1.05] tracking-[-0.04em] text-[hsl(150_55%_28%)]">
                  +{fmtCZK(Math.round((f.valueAfter - f.valueBefore) / flatsCount))}
                  <span className="ml-2 text-2xl font-medium text-foreground/55">CZK</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ≈ +{f.valueUplift}% market value, immediately after renovation
                </p>

                {/* Stacked-gain bar: base + delta */}
                <div className="mt-7">
                  <div className="mb-2 flex items-baseline justify-between gap-3 text-[0.7rem] text-muted-foreground">
                    <span>Today's market value ({flatsCount} flats)</span>
                    <span className="font-mono tabular-nums text-foreground/80">
                      {fmtCZK(f.valueBefore)} CZK
                    </span>
                  </div>
                  <div className="flex h-9 w-full overflow-hidden rounded-md">
                    <div
                      className="h-full bg-muted-foreground/15"
                      style={{ width: `${(f.valueBefore / f.valueAfter) * 100}%` }}
                    />
                    <div
                      className="h-full bg-[hsl(150_55%_55%)]"
                      style={{ width: `${((f.valueAfter - f.valueBefore) / f.valueAfter) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-3 text-[0.7rem] text-muted-foreground">
                    <span className="font-semibold text-[hsl(150_55%_28%)] tabular-nums">
                      +{fmtCZK(f.valueAfter - f.valueBefore)} CZK uplift
                    </span>
                    <span className="font-mono tabular-nums text-foreground/80">
                      → {fmtCZK(f.valueAfter)} CZK
                    </span>
                  </div>
                </div>

                <p className="mt-5 text-xs italic text-muted-foreground/70">
                  Sources: SFŽP 2026 press release, novazelenausporam.cz, Brivo Vinohrady ~180 000 CZK/m² (Q1 2026).
                </p>
              </article>



              {/* Monthly — balance metaphor */}
              <article className="rounded-[28px] border border-border/60 bg-card/70 p-7">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Monthly, per flat
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                  <div className="rounded-2xl bg-[hsl(20_85%_55%/0.06)] p-4">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[hsl(20_75%_42%)]">
                      Loan repayment
                    </p>
                    <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">
                      −{fmtCZK(f.monthly.loanRepayment)}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">CZK</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-center text-2xl font-light text-muted-foreground/60 sm:flex-col">
                    +
                  </div>

                  <div className="rounded-2xl bg-[hsl(150_55%_42%/0.08)] p-4">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[hsl(150_55%_30%)]">
                      Energy savings
                    </p>
                    <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">
                      +{fmtCZK(f.monthly.energySavings)}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">CZK</span>
                    </p>
                  </div>
                </div>

                {/* Hand-noted net */}
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-foreground px-4 font-display text-sm font-semibold text-background">
                    Net +{fmtCZK(f.monthly.net)} CZK / mo
                  </span>
                  <span className="text-xs italic text-muted-foreground">
                    {f.monthly.note}
                  </span>
                </div>

                <p className="mt-4 text-xs italic text-muted-foreground/70">
                  Sources: SFŽP 2026 press release, novazelenausporam.cz, Brivo Vinohrady ~180 000 CZK/m² (Q1 2026).
                </p>
              </article>


              {/* Financing mix */}
              <a
                href="https://novazelenausporam.cz/energeticke-poradenstvi/"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-[28px] border-2 border-[hsl(150_55%_42%/0.35)] bg-gradient-to-br from-[hsl(150_55%_42%/0.08)] via-card to-card p-7 transition hover:-translate-y-0.5 hover:border-[hsl(150_55%_42%/0.6)]"
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[hsl(150_55%_30%)]">
                    2026 blended financing model
                  </p>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {fmtCZK(f.totalProjectCost)} CZK total
                  </p>
                </div>

                {/* Hero stat — NZÚ coverage */}
                <div className="mt-5 rounded-2xl bg-[hsl(150_55%_42%/0.10)] p-5">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[hsl(150_55%_30%)]">
                    Nová zelená úsporám 2026+ — interest-free loan
                  </p>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="font-display text-[4.5rem] font-semibold leading-none tracking-[-0.04em] text-[hsl(150_55%_28%)]">
                      0%
                    </span>
                    <span className="font-mono text-sm tabular-nums text-foreground/70">
                      interest · up to 25 yr · ≈ 13 500 000 CZK
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                    SFŽP ČR pays the interest to a partner bank; SVJ/BD can borrow up to 750 000 CZK per flat. Combinable with a regular commercial loan. Low-income flats unlock a separate bonus (up to 120 000 CZK/flat) into fond oprav.
                  </p>
                  <p className="mt-1 text-[0.65rem] italic text-muted-foreground/70">
                    Source: SFŽP ČR press release 9. 3. 2026 · novazelenausporam.cz
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(150_55%_30%)] underline-offset-4 group-hover:underline">
                    See NZÚ energy advisory →
                  </p>
                </div>

                {/* Chunky segmented bar */}
                <div className="mt-6 flex h-4 gap-[3px] overflow-hidden">
                  {f.financingMix.map((m, i) => (
                    <div
                      key={i}
                      className="h-full first:rounded-l-md last:rounded-r-md"
                      style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                    />
                  ))}
                </div>

                {/* Breakdown with NZÚ bracket grouping */}
                <ul className="mt-5 space-y-2.5">
                  {f.financingMix.map((m, i) => {
                    const isFirstNzu = m.group === "nzu" && f.financingMix[i - 1]?.group !== "nzu";
                    const isLastNzu = m.group === "nzu" && f.financingMix[i + 1]?.group !== "nzu";
                    const isNzu = m.group === "nzu";
                    return (
                      <li
                        key={i}
                        className={[
                          "flex items-start gap-3 text-sm",
                          isNzu ? "border-l-2 border-[hsl(150_55%_42%/0.4)] pl-3" : "pl-3",
                          isFirstNzu ? "pt-1" : "",
                          isLastNzu ? "pb-1" : "",
                        ].join(" ")}
                      >
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
                    );
                  })}
                </ul>
                <p className="mt-5 text-xs italic text-muted-foreground/70">
                  Sources: SFŽP 2026 press release, novazelenausporam.cz, Brivo Vinohrady ~180 000 CZK/m² (Q1 2026).
                </p>
              </a>


            </div>

            <div className="mt-12">
              <p className="text-sm text-muted-foreground">Beyond the numbers.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[hsl(150_60%_42%/0.25)] bg-[hsl(150_60%_42%/0.07)] p-5 transition hover:-translate-y-0.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(150_60%_42%/0.18)] text-[hsl(150_55%_30%)]" aria-hidden>
                    <Leaf className="h-4 w-4" />
                  </span>
                  <h4 className="mt-4 font-display text-base font-semibold tracking-tight text-foreground">A home that breathes clean</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">No more cold-wall damp — the root of black mould.</p>
                  <p className="mt-2 text-xs italic text-[hsl(150_45%_32%)]/80">WHO IAQ Guidelines (2009): dampness &amp; mould raise respiratory symptoms / asthma by ~30–50%.</p>
                </div>
                <div className="rounded-2xl border border-[hsl(20_85%_55%/0.25)] bg-[hsl(20_85%_55%/0.07)] p-5 transition hover:-translate-y-0.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(20_85%_55%/0.18)] text-[hsl(20_75%_42%)]" aria-hidden>
                    <Flame className="h-4 w-4" />
                  </span>
                  <h4 className="mt-4 font-display text-base font-semibold tracking-tight text-foreground">Warm floors, quiet evenings</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">Even walls, no draft, the street fades away.</p>
                  <p className="mt-2 text-xs italic text-[hsl(20_65%_40%)]/80">New triple-glazed windows + ETICS façade: typically ≈ −10 dB on street noise (Fraunhofer IBP).</p>
                </div>
                <div className="rounded-2xl border border-[hsl(210_75%_52%/0.25)] bg-[hsl(210_75%_52%/0.07)] p-5 transition hover:-translate-y-0.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(210_75%_52%/0.18)] text-[hsl(210_65%_40%)]" aria-hidden>
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <h4 className="mt-4 font-display text-base font-semibold tracking-tight text-foreground">A building you're proud of</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">A clean façade resets how the whole house feels.</p>
                </div>
              </div>
            </div>


            <ContinueRow onClick={onContinue} />


          </div>
    </SplitShell>
  );
}


// =====================================================================
// UrgencyStep — interactive cost-of-waiting chart with two stacked
// growth components: utilities wasted + material & labour inflation.
// All numbers are mock; will be wired to real per-property data later.
// =====================================================================
const URGENCY = {
  // Per-property baselines (CZK). Defaults are illustrative; will be wired
  // to the SVJ's real energy + audit data once uploaded.
  baseUtilityWastePerYear: 38_000, // current annual utility "waste" vs renovated
  utilityGrowthRate: 0.04, // ~4% / yr long-run drift — Eurostat HH gas index avg
  baseRenovationCost: 1_250_000, // today's renovation price (reference)
  materialInflationRate: 0.03, // ~3% / yr — ČSÚ stavební práce index, +2.7% YoY (2025)
  horizonYears: 8,
  pointsPerYear: 12, // monthly resolution for smooth interpolation
};

function buildUrgencyData(baseUtilityWastePerYear: number, baseRenovationCost: number) {
  const {
    utilityGrowthRate,
    materialInflationRate,
    horizonYears,
    pointsPerYear,
  } = URGENCY;

  const total = horizonYears * pointsPerYear;
  const out: {
    t: number; // fractional years from now
    utilities: number; // cumulative wasted utility cost
    materials: number; // extra cost vs renovating today
    sum: number;
  }[] = [];

  for (let i = 0; i <= total; i++) {
    const t = i / pointsPerYear;
    // cumulative wasted utilities — integral of base*(1+r)^t
    const u =
      (baseUtilityWastePerYear *
        (Math.pow(1 + utilityGrowthRate, t) - 1)) /
      Math.log(1 + utilityGrowthRate);
    // material / labour inflation — extra cost vs today
    const m =
      baseRenovationCost * (Math.pow(1 + materialInflationRate, t) - 1);
    out.push({
      t,
      utilities: Math.round(u),
      materials: Math.round(m),
      sum: Math.round(u + m),
    });
  }
  return out;
}

function UrgencyStep({
  onContinue,
  calculation,
  buildingInfo,
}: {
  onContinue: () => void;
  calculation: any | null;
  buildingInfo?: any;
}) {
  const baseUtilityWastePerYear = calculation ? calculation.estimatedYearlySavings : URGENCY.baseUtilityWastePerYear * 18;
  const baseRenovationCost = calculation ? calculation.grossCapEx : URGENCY.baseRenovationCost * 18;
  const data = buildUrgencyData(baseUtilityWastePerYear, baseRenovationCost);
  const maxIndex = data.length - 1;
  const [idx, setIdx] = useState(Math.round(maxIndex * 0.45));
  const point = data[idx];

  useAskAiPlaceholder("What money do I waste yearly with our current heating?");

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
    <SplitShell buildingInfo={buildingInfo}>
      <div className="pb-40">

            <StepHeader
              title="The sooner you start, the easier it gets"
              subtitle="Energy bills and renovation prices both keep ticking up. Acting now locks in today's costs, and we'll walk you through each step so it stays manageable."
            />


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
                    </defs>
                    <CartesianGrid stroke="hsl(0 0% 0% / 0.06)" vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={[0, URGENCY.horizonYears]}
                      ticks={[0, 2, 4, 6, 8]}
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
                            <div className="mt-1 border-t border-border/60 pt-1 font-semibold text-foreground">
                              Total: {fmtCZK(p.utilities + p.materials)} CZK
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
                    <ReferenceLine
                      x={point.t}
                      stroke="hsl(0 0% 0% / 0.45)"
                      strokeDasharray="4 4"
                    />
                    <ReferenceDot
                      x={point.t}
                      y={point.utilities + point.materials}
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
                  <span>+{URGENCY.horizonYears} years</span>
                </div>
              </div>

              {/* Legend + per-component breakdown */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(28_92%_60%)]" />
                    Utilities wasted
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                    {fmtCZK(point.utilities)} CZK
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Energy bills overpaid vs a renovated home, at
                    +{Math.round(URGENCY.utilityGrowthRate * 100)}%/yr drift.
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
                    Extra renovation cost vs today, at
                    +{Math.round(URGENCY.materialInflationRate * 100)}%/yr drift.
                  </p>
                </div>
              </div>
              <p className="mt-5 text-xs italic text-muted-foreground/70">
                Drift assumptions: energy +4%/yr (ERÚ / Eurostat HH gas index), construction +3%/yr (ČSÚ stavební práce, +2.7% YoY 2025). Baseline waste &amp; reference cost are placeholders until your audit is uploaded.
              </p>
            </article>

            <ContinueRow onClick={onContinue} />

          </div>
    </SplitShell>
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
    contact: "Contact via SVJ",
    coords: [50.0759, 14.4271] as [number, number],
    manager: "Petr Novák, chair, SVJ Jenštejnská",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Křemencova 178/10, Praha 1",
    contact: "Contact via SVJ",
    coords: [50.0808, 14.4187] as [number, number],
    manager: "Markéta Dvořáková, vice-chair",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Vodičkova 710/31, Praha 1",
    contact: "Contact via SVJ",
    coords: [50.0815, 14.4248] as [number, number],
    manager: "Tomáš Horák, building manager",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Štěpánská 615/24, Praha 1",
    contact: "Contact via SVJ",
    coords: [50.0810, 14.4276] as [number, number],
    manager: "Lucie Procházková, chair, SVJ Štěpánská",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Sokolská 1802/32, Praha 2",
    contact: "Contact via SVJ",
    coords: [50.0768, 14.4297] as [number, number],
    manager: "Jan Veselý, treasurer",
    color: "hsl(140 65% 42%)",
  },
];

function CommunityStep({
  onContinue,
  communityData,
}: {
  onContinue: () => void;
  communityData: any | null;
}) {
  const mapFloatingRef = useRef<HTMLDivElement | null>(null);
  const mapInlineRef = useRef<HTMLDivElement | null>(null);
  const [isLg, setIsLg] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const markersRef = useRef<unknown[]>([]);

  const fmtCZK = (n: number) =>
    new Intl.NumberFormat("cs-CZ").format(Math.round(n)).replace(/\u00A0/g, " ");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useAskAiPlaceholder("How many properties were renovated in Prague this year?");


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
        center: PRAGUE_CENTER,
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

      markersRef.current = NEIGHBOURS.map((n, i) => {
        const marker = L.marker(n.coords, { icon: greenIcon }).addTo(map!);
        marker.bindPopup(
          `<strong>${n.address}</strong><br/>${n.manager}<br/>${n.contact}`,
        );
        marker.on("click", () => setActiveIdx(i));
        return marker;
      });
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
      markersRef.current = [];
    };
  }, [isLg]);

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
    <SplitShell
      leftFloating={
        <div className="w-full max-w-[480px] overflow-hidden rounded-3xl border border-border/70 bg-card/60 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)]">
          <div
            ref={mapFloatingRef}
            className="h-[60vh] max-h-[560px] w-full"
            aria-label="Map of nearby renovated properties in Prague"
          />
        </div>
      }
      leftMobile={
        <div className="w-full overflow-hidden rounded-3xl border border-border/70 bg-card/60 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.25)]">
          <div
            ref={mapInlineRef}
            className="h-[320px] w-full"
            aria-label="Map of nearby renovated properties in Prague"
          />
        </div>
      }
    >
      <div className="pb-40">

            <StepHeader
              title="You're not alone"
              subtitle="Starting this on your own can feel like a lot, but you aren't. Here are buildings near you that have already renovated, with the people who led them. They're happy to share what they learned."
            />

            {communityData && (
              <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-border/50 bg-card/45 p-4 text-center backdrop-blur-sm">
                <div>
                  <span className="block text-2xl font-bold tracking-tight text-foreground">
                    {communityData.stats?.totalApplicants || 0}
                  </span>
                  <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">SVJ žádostí</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold tracking-tight text-foreground">
                    {fmtCZK(communityData.stats?.totalPaid || 0)}
                  </span>
                  <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">celkem vyplaceno</span>
                </div>
                <div>
                  <span className="block text-base font-bold tracking-tight text-[hsl(150_55%_30%)] capitalize py-1">
                    {communityData.mode === "same-city" ? "Praha" : "Celá ČR"}
                  </span>
                  <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground block">lokalita</span>
                </div>
              </div>
            )}

            {communityData?.examples && communityData.examples.length > 0 && (
              <div className="mt-8 space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Úspěšné renovace v okolí:</h4>
                <div className="space-y-3">
                  {communityData.examples.map((ex: any, i: number) => (
                    <div key={i} className="rounded-2xl border border-border/60 bg-background/50 p-4 transition hover:border-foreground/20">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-sm font-semibold text-foreground block">{ex.applicantAddress || ex.applicant}</strong>
                        <span className="rounded-full bg-[hsl(150_55%_42%/0.12)] px-2.5 py-0.5 text-xs font-semibold text-[hsl(150_55%_30%)]">
                          {fmtCZK(ex.support)} Kč
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {ex.municipalityName} · {ex.purpose} · {ex.signedAt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact list */}
            <ul className="mt-6 space-y-2">
              {NEIGHBOURS.map((n, i) => (
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
                      <span className="block text-xs text-muted-foreground">
                        {n.manager}
                      </span>
                    </span>
                    <span className="self-center font-mono text-sm tabular-nums text-foreground/85">
                      {n.contact}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <ContinueRow onClick={onContinue} />

          </div>
    </SplitShell>
  );
}





// AiPortal is now an alias for the shared BodyPortal. Kept so existing
// call sites continue to work while we migrate them off.
const AiPortal = BodyPortal;

// ---------- Shared step shells ----------------------------------------------
// Two layout primitives every step shares so paddings, max-widths and the
// fixed-house alignment stay consistent across the whole flow.
//
// `StepShell`  — full-width pages (Hero, Goals, Stakeholder, Distribution).
//                Content is capped at 70% of the global 1400px app-container
//                (≈980px) and centered, so everything lines up with the header.
//
// `SplitShell` — two-pane pages (Property, Summary, Financials, Urgency,
//                Community). A fixed asset (house or map) sits centered in
//                the left half of the app-container; the right pane is a
//                single explicit column centered inside its half so content
//                is never flush to the viewport edge on wide monitors.

function DefaultHouseFloating({ buildingInfo }: { buildingInfo?: any }) {
  return (
    <img
      src={getHouseImageUrl(buildingInfo)}
      alt="Your property"
      className="w-full max-w-[460px] select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
      draggable={false}
    />
  );
}

function DefaultHouseMobile({ buildingInfo }: { buildingInfo?: any }) {
  return (
    <img
      src={getHouseImageUrl(buildingInfo)}
      alt="Your property"
      className="w-full max-w-[420px] select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
      draggable={false}
    />
  );
}

function StepShell({
  children,
  topPadding = "default",
}: {
  children: React.ReactNode;
  topPadding?: "default" | "hero" | "tight";
}) {
  const pad =
    topPadding === "hero"
      ? "pt-28 sm:pt-36 pb-20"
      : topPadding === "tight"
        ? "pt-28 sm:pt-32 pb-40"
        : "pt-32 pb-32";
  return (
    <section className="relative z-10 min-h-screen w-full">
      <div className={["app-container", pad].join(" ")}>
        <div className="mx-auto w-full lg:w-[70%] max-w-[980px]">
          {children}
        </div>
      </div>
    </section>
  );
}

function SplitShell({
  children,
  leftFloating,
  leftMobile,
  buildingInfo,
}: {
  children: React.ReactNode;
  leftFloating?: React.ReactNode;
  leftMobile?: React.ReactNode;
  buildingInfo?: any;
}) {
  const { chatOpen } = useAskAi();
  const blurClasses = chatOpen
    ? "scale-[0.99] opacity-80 blur-md"
    : "scale-100 opacity-100 blur-0";
  const contentBlur = chatOpen
    ? "pointer-events-none scale-[0.99] opacity-80 blur-md"
    : "blur-0 opacity-100";

  return (
    <section className="relative min-h-screen w-full">
      {/* Fixed left pane — portaled so it stays pinned to the viewport.
          Aligned to the global app-container's left half at every width. */}
      <AiPortal>
        <div className="pointer-events-none fixed inset-0 z-30 hidden lg:block">
          <div className="app-container relative h-full">
            <aside
              className={[
                "absolute top-1/2 left-8 flex w-[calc(50%-2rem)] -translate-y-1/2 justify-center",
                "transition-[filter,transform,opacity] duration-500 ease-out",
                blurClasses,
              ].join(" ")}
              aria-hidden={chatOpen}
            >
              {leftFloating ?? <DefaultHouseFloating buildingInfo={buildingInfo} />}
            </aside>
          </div>
        </div>
      </AiPortal>

      {/* Right pane content (and the mobile-only left block stacked above it) */}
      <div
        className={[
          "animate-blur-in transition-[filter,transform,opacity] duration-500 ease-out",
          contentBlur,
        ].join(" ")}
        aria-hidden={chatOpen}
      >
        <div className="app-container py-20">
          <div className="lg:hidden mb-8 flex items-center justify-center">
            {leftMobile ?? <DefaultHouseMobile buildingInfo={buildingInfo} />}
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Spacer mirroring the fixed left pane */}
            <div className="hidden lg:block" aria-hidden />
            <div className="flex justify-center">
              <div className="w-full max-w-[560px]">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



function AiHintBubble() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <BodyPortal>
      <div className="pointer-events-none fixed bottom-[148px] left-1/2 z-[101] -translate-x-1/2 px-4 animate-fade-in">
        <div className="pointer-events-auto relative inline-flex max-w-[300px] items-start gap-2 rounded-2xl border border-border/60 bg-background py-2 pl-3.5 pr-2 text-[12.5px] leading-snug text-foreground shadow-[0_18px_50px_-12px_rgba(0,0,0,0.25)]">
          <span className="py-0.5">
            If anything's unclear, just ask our AI below.
          </span>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
            }}
            aria-label="Dismiss"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border/60 bg-background" />
        </div>
      </div>
    </BodyPortal>
  );
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
        <span className="font-display tabular-nums font-medium text-foreground">
          {value}
        </span>
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
  type: string;
  adjectives: string[];
  fear: string;
  description: string;
  sketch: React.ReactNode;
  color?: string;
};

const PERSONAS: Persona[] = [
  {
    id: "pensioner",
    type: "The Pensioner",
    adjectives: ["cautious", "fixed-income", "loyal"],
    fear: "A higher fond oprav they cannot afford on their pension.",
    description:
      "Lived in the building for thirty years. Remembers when the risers were last replaced and who paid for it. Listens carefully, asks the same question three different ways, and votes only when she's certain her monthly contribution won't change. Reassure her with the NZÚ vulnerable-household bonus and a fixed-cap repayment chart — not with optimism.",
    sketch: <SketchPensioner />,
    color: "hsl(15 80% 55%)",
  },
  {
    id: "skeptic",
    type: "The Skeptic",
    adjectives: ["analytical", "argumentative", "well-read"],
    fear: "Being sold a subsidy that vanishes mid-project.",
    description:
      "Reads the SFŽP bulletins on weekends. Will print the call documentation and highlight clause 4.3.b in yellow. Doesn't trust contractors and especially doesn't trust banks. Win him over with sourced numbers, a named project manager, and a clear escape clause — never with marketing language.",
    sketch: <SketchSkeptic />,
    color: "hsl(45 90% 50%)",
  },
  {
    id: "eco",
    type: "The Eco-Visionary",
    adjectives: ["ambitious", "impatient", "values-driven"],
    fear: "That the building settles for half-measures and locks in fossil heating for another twenty years.",
    description:
      "Already has solar at the family cottage. Wants the green roof, the heat pump, and the rainwater system in one go. Will champion the proposal in the meeting but may overshoot the budget envelope. Anchor her in phased delivery — she'll defend the plan louder than anyone if she sees the end state on the timeline.",
    sketch: <SketchEco />,
    color: "hsl(150 60% 45%)",
  },
  {
    id: "penny",
    type: "The Penny Pincher",
    adjectives: ["frugal", "spreadsheet-driven", "ROI-obsessed"],
    fear: "Paying a single koruna that doesn't return within eight years.",
    description:
      "Owns two flats and rents one out. Calculates payback in his head while you talk. Doesn't care about aesthetics or comfort — only about the net monthly delta. Show him the savings-vs-repayment line chart and the energy-class jump from G to C. The conversation ends the moment net cash flow turns green.",
    sketch: <SketchPenny />,
    color: "hsl(200 70% 55%)",
  },
  {
    id: "absentee",
    type: "The Absentee Investor",
    adjectives: ["disengaged", "remote", "vote-by-proxy"],
    fear: "A special assessment landing in his inbox without warning.",
    description:
      "Bought the flat as a long-term hold. Lives in Brno or Munich. Never attends meetings, replies to emails after a week, and grants proxy to whoever asks first. Send him a one-page PDF with the number, the date, and a signature line — anything longer goes unread.",
    sketch: <SketchAbsentee />,
    color: "hsl(270 60% 60%)",
  },
  {
    id: "newcomer",
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
  type: "The Heritage Guardian",
  adjectives: ["traditional", "detail-obsessed", "vocal"],
  fear: "That any external insulation will ruin the original Vinohrady facade and trigger a heritage office dispute.",
  description:
    "Knows the building's protected-zone status by heart and will quote the památkáři rulebook in the meeting. Open to renovation only when historical detailing is preserved — cornices, window proportions, original plaster texture. Bring her the heritage office pre-consultation note and she becomes your most credible ally.",
};

function StakeholderStep({ onContinue }: { onContinue: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [extraPersonas, setExtraPersonas] = useState<Persona[]>([]);
  const [adding, setAdding] = useState(false);
  useAskAiPlaceholder("What are common fears owners have when renovating?");
  const { chatOpen } = useAskAi();

  const allPersonas = [...PERSONAS, ...extraPersonas];

  const persona = allPersonas.find((p) => p.id === openId) ?? null;
  const personaOpen = Boolean(persona);
  const anyOverlay = chatOpen || personaOpen;


  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const desc = custom.trim();
    if (!desc || adding) return;
    setAdding(true);
    // mock AI roundtrip — would call real endpoint later
    window.setTimeout(() => {
      const newPersona: Persona = {
        id: `custom-${Date.now()}`,
        ...MOCK_CUSTOM_PERSONA,
        sketch: <SketchCustom />,
      };
      setExtraPersonas((prev) => [...prev, newPersona]);
      setCustom("");
      setAdding(false);
    }, 650);
  };



  return (
    <section className="relative min-h-screen w-full">
      <div
        className={[
          "animate-blur-in transition-[filter,transform,opacity] duration-500 ease-out",
          anyOverlay
            ? "pointer-events-none scale-[0.99] opacity-80 blur-md"
            : "blur-0 opacity-100",
        ].join(" ")}
        aria-hidden={anyOverlay}
      >
        <div className="mx-auto min-h-screen w-full max-w-[1100px] px-8 pt-32 pb-44">
          <StepHeader
            title="We'll have your back in the meeting"
            subtitle="You won't be walking in cold. Pick the neighbour who's hesitant and what's on their mind, and we'll prep the answers with you."
            subtitleMaxWidth="max-w-[68ch]"
          />


          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allPersonas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpenId(p.id)}
                style={{
                  borderColor: p.color ? `${p.color}80` : undefined,
                }}
                className="group relative flex flex-col items-start gap-5 overflow-hidden rounded-3xl border-2 bg-card/60 p-6 text-left transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-20px_rgba(0,0,0,0.25)]"
              >
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
              </button>
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
              Describe yours, and the more specific you get, the better we can prepare you.
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
              <PrimaryButton
                type="submit"
                size="sm"
                disabled={adding || !custom.trim()}
                hideArrow={adding}
              >
                {adding ? "Adding…" : "Add neighbour"}
              </PrimaryButton>

            </div>
          </form>

          <ContinueRow onClick={onContinue} topMargin="mt-12" />

        </div>
      </div>

      {/* Persona detail dialog */}
      <GlassDialog
        open={personaOpen}
        onClose={() => setOpenId(null)}
        label={persona?.type ?? "Stakeholder"}
      >
        {persona && (
          <>
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
              <p className="mt-1 text-sm font-medium text-foreground">
                {persona.fear}
              </p>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-foreground/85">
              {persona.description}
            </p>
          </>
        )}
      </GlassDialog>
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
  // Elderly woman: bun, oval glasses, soft shawl
  return (
    <SketchBase>
      {/* hair bun */}
      <ellipse cx="50" cy="22" rx="7" ry="4" />
      {/* head */}
      <path d="M34 42c0-9 7-16 16-16s16 7 16 16v4c0 9-7 16-16 16s-16-7-16-16z" />
      {/* glasses */}
      <circle cx="43" cy="42" r="4" />
      <circle cx="57" cy="42" r="4" />
      <path d="M47 42h6" />
      {/* gentle smile */}
      <path d="M45 52c2 2 8 2 10 0" />
      {/* shawl shoulders */}
      <path d="M22 90c4-14 14-22 28-22s24 8 28 22" />
      <path d="M38 70l12 8 12-8" />
    </SketchBase>
  );
}

function SketchSkeptic() {
  // Furrowed brow, reading glasses on nose tip, pursed mouth, paper
  return (
    <SketchBase>
      <circle cx="48" cy="38" r="15" />
      {/* furrowed brows angling down toward nose */}
      <path d="M37 32l9 3" />
      <path d="M59 32l-9 3" />
      {/* eyes — narrowed */}
      <path d="M40 38c1-1 4-1 5 0" />
      <path d="M51 38c1-1 4-1 5 0" />
      {/* nose */}
      <path d="M48 42v4" />
      {/* tight mouth */}
      <path d="M44 50h8" />
      {/* shoulders */}
      <path d="M22 88c4-14 14-22 26-22s22 8 26 22" />
      {/* paper held in hand */}
      <path d="M62 74h16v14H62z" />
      <path d="M65 78h10M65 82h10M65 86h6" />
    </SketchBase>
  );
}

function SketchEco() {
  // Sprout leaf above head, bright eyes, peaceful smile
  return (
    <SketchBase>
      {/* leaf sprout */}
      <path d="M50 22c-5-2-9-7-6-13 6 1 9 6 6 13z" />
      <path d="M50 22c5-2 9-7 6-13-6 1-9 6-6 13z" />
      <path d="M50 22v8" />
      {/* head */}
      <circle cx="50" cy="40" r="14" />
      {/* bright open eyes */}
      <circle cx="44" cy="40" r="1.2" fill="currentColor" />
      <circle cx="56" cy="40" r="1.2" fill="currentColor" />
      {/* smile */}
      <path d="M44 48c2 3 10 3 12 0" />
      {/* shoulders with small leaf pin */}
      <path d="M22 90c4-14 14-22 28-22s24 8 28 22" />
      <path d="M64 78c2-1 4 0 4 3 0 2-2 3-4 2z" />
    </SketchBase>
  );
}

function SketchPenny() {
  // Glasses, tight mouth, calculator + currency symbol
  return (
    <SketchBase>
      <circle cx="46" cy="38" r="14" />
      {/* glasses */}
      <circle cx="41" cy="38" r="3.5" />
      <circle cx="51" cy="38" r="3.5" />
      <path d="M44.5 38h3" />
      {/* thinking mouth */}
      <path d="M42 48l8-2" />
      {/* shoulders */}
      <path d="M20 90c4-14 12-22 26-22s22 8 26 22" />
      {/* calculator */}
      <rect x="64" y="20" width="20" height="26" rx="2" />
      <path d="M67 26h14" />
      <path d="M68 32h2M73 32h2M78 32h2M68 38h2M73 38h2M78 38h2" />
      {/* currency symbol Kč floating */}
      <path d="M70 56h2v8M72 60l4-4M72 60l4 4" />
    </SketchBase>
  );
}

function SketchAbsentee() {
  // Back-of-head silhouette facing away, paper airplane flying off with dashed trail
  return (
    <SketchBase>
      {/* back of head — smooth bald dome */}
      <path d="M38 44c0-8 5-15 12-15s12 7 12 15v6" />
      {/* neck */}
      <path d="M45 50c0 4 0 7-1 9M55 50c0 4 0 7 1 9" />
      {/* ear hint on the right (turned slightly) */}
      <path d="M62 44c2 0 3 2 3 4s-1 4-3 4" />
      {/* shoulders / upper back */}
      <path d="M22 90c4-14 14-22 28-22s24 8 28 22" />
      {/* paper airplane upper-right */}
      <path d="M74 18l12 4-10 5-2 5-2-6-4-2z" />
      <path d="M76 27l4-4" />
      {/* dashed flight trail from nape to airplane */}
      <path d="M52 50 Q 64 38 74 22" strokeDasharray="2 4" opacity="0.5" fill="none" />
    </SketchBase>
  );
}

function SketchNewcomer() {
  // Friendly face, raised waving hand, moving box at side
  return (
    <SketchBase>
      <circle cx="46" cy="38" r="14" />
      {/* eyes */}
      <circle cx="41" cy="38" r="1.2" fill="currentColor" />
      <circle cx="51" cy="38" r="1.2" fill="currentColor" />
      {/* big friendly smile */}
      <path d="M40 46c3 4 10 4 12 0" />
      {/* shoulders */}
      <path d="M20 90c4-14 12-22 26-22s22 8 26 22" />
      {/* waving arm + hand */}
      <path d="M60 68l10-14" />
      <path d="M70 54c-2-2-1-6 2-7s5 2 4 5l-2 4z" />
      {/* small motion lines */}
      <path d="M76 46l3-3M80 50l3-2M78 56l3-1" opacity="0.6" />
    </SketchBase>
  );
}

function SketchCustom() {
  return (
    <SketchBase>
      <circle cx="50" cy="38" r="14" strokeDasharray="3 3" />
      <path d="M22 90c4-14 14-22 28-22s24 8 28 22" strokeDasharray="3 3" />
      <path d="M50 22v-8M44 18l12 0" />
      <path d="M44 38h2M54 38h2" />
      <path d="M44 46c2 2 8 2 12 0" />
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
    format: "",
    description: "All the key numbers in one place, plus a tailored approach for every type of neighbour — and a reminder this is also about cleaner air, quieter evenings, and a warmer home.",
    primary: { label: "Download", icon: Download },
    Icon: FileText,
    color: "hsl(20 85% 55%)",
  },
  {
    id: "chat",
    step: "02",
    title: "Group chat message",
    format: "",
    description: "A warm opener to start the conversation in your building's WhatsApp or Messenger group.",
    primary: { label: "Copy", icon: MessagesSquare },
    Icon: MessagesSquare,
    color: "hsl(150 60% 42%)",
  },
  {
    id: "flyer",
    step: "03",
    title: "Notice-board flyer",
    format: "",
    description: "A printable A4 to hand out or pin up, so neighbours have something to take home and think about.",
    primary: { label: "Download", icon: Printer },
    Icon: Printer,
    color: "hsl(210 75% 52%)",
  },
];


function DistributionStep({
  generatingId,
  onDownloadPdf,
  onGenerateWhatsapp,
}: {
  generatingId: string | null;
  onDownloadPdf: (id: string) => void;
  onGenerateWhatsapp: () => void;
}) {
  return (
    <section className="relative min-h-screen w-full">
      <div className="animate-blur-in mx-auto min-h-screen w-full max-w-[1100px] px-8 pt-32 pb-32">
        <h2 className="font-display text-[2.25rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.75rem]">
          It's time to act.
        </h2>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          As promised, we've got your back. Here's everything you need to bring your neighbours along.
        </p>

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
                <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                  {a.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (a.id === "chat") {
                    onGenerateWhatsapp();
                  } else {
                    onDownloadPdf(a.id);
                  }
                }}
                disabled={generatingId !== null}
                style={{ backgroundColor: a.color }}
                className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <a.primary.icon className="h-4 w-4" />
                {generatingId === a.id ? "Generuji..." : a.primary.label}
              </button>
            </article>
          ))}
        </div>


        {/* Prominent, caring CTA */}
        <div className="mt-12 rounded-3xl border border-primary/20 bg-primary/[0.04] p-8 md:p-10">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-[50ch]">
              <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Need a bit more help?
              </h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                If you'd like more precise answers, advice on what to do next,
                or just someone to talk it through with — book a quick call.
                It's completely free, no strings attached.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98]"
            >
              Book a free call
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Buena suggestion */}
        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-6 md:p-7">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Interested in more positive changes?
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                We'd suggest moving your property management to an innovative,
                AI-supported platform.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold tracking-tight text-foreground">
              <span
                aria-hidden
                className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background"
              >
                B
              </span>
              Buena
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessingOverlay() {
  const tasks = [
    "Gathering data from open sources",
    "Reading your answers",
    "Stitching it all together",
    "Almost ready",
  ];
  const stepMs = 3000 / tasks.length;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setIdx((i) => Math.min(i + 1, tasks.length - 1)),
      stepMs,
    );
    return () => window.clearInterval(id);
  }, []);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-xl animate-fade-in"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-5">
        <span
          className="inline-block h-9 w-9 rounded-full border-2 border-foreground/15 border-t-foreground/70 animate-spin"
          aria-hidden
        />
        <div className="relative h-6 w-[min(320px,80vw)] overflow-hidden text-center">
          {tasks.map((t, i) => (
            <span
              key={t}
              className="absolute inset-0 flex items-center justify-center text-sm text-foreground/75 transition-all duration-700 ease-out"
              style={{
                opacity: i === idx ? 1 : 0,
                filter: i === idx ? "blur(0px)" : "blur(6px)",
                transform: i === idx ? "translateY(0)" : "translateY(4px)",
              }}
            >
              {t} ✨
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
