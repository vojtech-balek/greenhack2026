import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  AskAiProvider,
  AskAiBar,
  AskAiOverlay,
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
  Leaf,
  Flame,
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
import {
  FINANCIALS,
  GOALS,
  INFERRED_PROPERTY,
  QUESTIONS,
  STEP_LABELS,
  STEPS,
  STORAGE_KEY,
  type Question,
  type Step,
} from "./constants";
import {
  calculateRenovation,
  fetchBuildingInfo,
  fetchCommunityExamples,
  generateMaterial,
  generatePdf,
  searchAddresses,
} from "./api";
import { AiHintBubble, SplitShell } from "./components/shells";
import { ProcessingOverlay } from "./components/ProcessingOverlay";
import { GoalsStep, HeroStep } from "./components/steps/IntroSteps";
import { DistributionStep } from "./components/steps/DistributionStep";
import {
  SketchAbsentee,
  SketchCustom,
  SketchEco,
  SketchNewcomer,
  SketchPenny,
  SketchPensioner,
  SketchSkeptic,
} from "./components/stakeholder/PersonaSketches";


export function RenovationFlowPage() {
  const [address, setAddress] = useState("");
  const [step, setStep] = useState<Step>("hero");
  const [exiting, setExiting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(() => new Set());
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

  // Dynamic NZU Calculation hook
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
        const data = await calculateRenovation(payload);
        if (data) {
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
        const data = await fetchCommunityExamples(municipalityName);
        if (data) {
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
      setSearchError("Please enter an address.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const data = await searchAddresses(query);

      if (data.matches && data.matches.length > 0) {
        setAddressMatches(data.matches);
      } else {
        setSearchError("No matches found. Try adding the street and building number.");
      }
    } catch (err: any) {
      setSearchError(err.message || "Address search failed.");
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
      const data = await fetchBuildingInfo(match);

      setBuildingInfo(data);
      setProcessing(false);
      setSearching(false);
      transitionTo("goals");
    } catch (err: any) {
      setProcessing(false);
      setSearching(false);
      setSearchError(err.message || "Could not load building details.");
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
      estimatedYearlySavings: floorArea * 500 * 0.5,
      penaltyLostSavings: floorArea * 450 * 0.5 * 5,
      penaltyCapexInflation: numberOfFlats * 750000 * 0.25,
      penaltyLostZeroInterest: numberOfFlats * 750000 * 0.1,
      totalWaitPenalty: floorArea * 450 * 0.5 * 5 + numberOfFlats * 750000 * 0.35,
    };

    const nonFinancialBenefits = [
      "more stable apartment temperatures in winter and summer",
      "less draught, moisture, and mould risk",
      "quieter apartments thanks to a better building envelope",
      "healthier indoor air with suitable ventilation",
      "a better-looking building and shared spaces",
      "fewer breakdowns and unplanned repairs",
      "better readiness for future energy requirements",
      "fairer support for vulnerable neighbours",
    ];

    const selectedBuiltInPersonas = PERSONAS.filter((p) => selectedPersonaIds.has(p.id));
    const personasForMaterials = selectedBuiltInPersonas.length > 0 ? selectedBuiltInPersonas : PERSONAS;
    const mappedPersonas = personasForMaterials.map((p) => ({
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
          { label: "Higher construction cost", value: calcResult.penaltyCapexInflation },
          { label: "Lost savings", value: calcResult.penaltyLostSavings },
          { label: "Commercial interest", value: calcResult.penaltyLostZeroInterest },
        ],
        waitTrajectorySvg: null,
        suggestedCharts: [
          "bar chart: higher construction cost vs lost savings vs commercial interest",
          "line chart: growth in waiting costs from now to 5 years",
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
      const blob = await generatePdf(endpoint, payload);
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
      alert(err.message || "Could not generate the PDF.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateWhatsapp = async () => {
    if (generatingId) return;
    setGeneratingId("chat");
    try {
      const payload = buildMaterialPayload("whatsapp");
      const data = await generateMaterial(payload);

      setGeneratedChatContent(data.content);
      setChatDialogOpen(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Could not generate the message.");
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
        <StakeholderStep
          onContinue={() => transitionTo("distribution")}
          selectedPersonaIds={selectedPersonaIds}
          setSelectedPersonaIds={setSelectedPersonaIds}
        />
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
                  Searching addresses...
                </div>
              ) : searchError ? (
                <div className="py-2 text-center text-sm text-red-500">{searchError}</div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Choose the correct address:</p>
                  {addressMatches.map((match) => (
                    <button
                      key={match.id || match.displayName}
                      type="button"
                      onClick={() => handleSelectAddress(match)}
                      className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-foreground/[0.04] transition flex flex-col gap-0.5 cursor-pointer"
                    >
                      <strong className="text-sm font-semibold text-foreground">{match.displayName}</strong>
                      <span className="text-xs text-muted-foreground">
                        {[match.street, match.cp ? `building no. ${match.cp}` : null, match.municipalityName, match.zip ? `ZIP ${match.zip}` : null]
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
              placeholder="Enter the renovation address (e.g. Vinohradska 56, Prague)"
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
      label="Group message"
    >
      <div className="space-y-4">
        <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          WhatsApp / Messenger Message
        </h3>
        <p className="text-sm text-muted-foreground">
          Here is the generated message for your neighbours. You can copy it and send it to your building group.
        </p>
        <div className="relative rounded-2xl border border-border/60 bg-background/60 p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground max-h-60 overflow-y-auto">
            {generatedChatContent || "Generating..."}
          </pre>
        </div>
        <div className="flex justify-end gap-3">
          <PrimaryButton
            onClick={() => {
              if (generatedChatContent) {
                navigator.clipboard.writeText(generatedChatContent);
                alert("Copied to clipboard!");
              }
            }}
            disabled={!generatedChatContent}
          >
            Copy text
          </PrimaryButton>
        </div>
      </div>
    </GlassDialog>
    </AskAiProvider>

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
        floors: b.floors ? `${b.floors} floors` : INFERRED_PROPERTY.floors,
        flats: b.flats ? `${b.flats} flats` : INFERRED_PROPERTY.flats,
        commercialUnits: INFERRED_PROPERTY.commercialUnits,
        heating: b.utilities?.heating || INFERRED_PROPERTY.heating,
        hotWater: b.utilities?.water || INFERRED_PROPERTY.hotWater,
        windows: INFERRED_PROPERTY.windows,
        facade: INFERRED_PROPERTY.facade,
        lastRenovation: INFERRED_PROPERTY.lastRenovation,
        energyClass: INFERRED_PROPERTY.energyClass,
        cadastralId: b.stavebniObjektKod ? `Building object code: ${b.stavebniObjektKod}` : INFERRED_PROPERTY.cadastralId,
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
        { label: "Residential flats", value: p.flats }
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
        outOfPocketNote: `The full ${fmtCZK(calculation.grossCapEx)} CZK envelope is covered by the interest-free NZU loan (up to 750 000 CZK per flat, capped by State Environmental Fund measure rules) together with commercial top-up financing. You pay nothing out of pocket at the start.`,
        valueUplift: 11,
        valueBefore: floorArea * 180000,
        valueAfter: Math.round(floorArea * 180000 * 1.11),
        monthly: {
          loanRepayment: Math.round(calculation.monthlyStateLoanPayment),
          energySavings: Math.round(calculation.estimatedYearlySavings / 12 / flatsCount),
          net: Math.round(calculation.monthlyStateLoanPayment - (calculation.estimatedYearlySavings / 12 / flatsCount)),
          note: "Converted per flat. The numbers are an illustrative model — actual repayment and savings depend on the chosen bank, drawdown, and real energy performance of the building.",
        },
        financingMix: [
          {
            label: "New Green Savings — interest-free loan (up to 15 years)",
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

  useAskAiPlaceholder("How exactly does the interest-free NZU loan work?");

  return (
    <SplitShell buildingInfo={buildingInfo}>
      <div className="pb-40">


            <StepHeader
              title="Let's see what renovating could save you"
              subtitle="Here are the best financing options on the table today, and what they'd mean for your building. You don't have to figure this out alone, we're here to walk you through it."
            />



            <div className="mt-10 space-y-6">


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
                  Sources: State Environmental Fund 2026 press release, novazelenausporam.cz, Brivo Vinohrady ~180 000 CZK/m² (Q1 2026).
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
                      -{fmtCZK(f.monthly.loanRepayment)}
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
                    Net -{fmtCZK(f.monthly.net)} CZK / mo
                  </span>
                  <span className="text-xs italic text-muted-foreground">
                    {f.monthly.note}
                  </span>
                </div>

                <p className="mt-4 text-xs italic text-muted-foreground/70">
                  Sources: State Environmental Fund 2026 press release, novazelenausporam.cz, Brivo Vinohrady ~180 000 CZK/m² (Q1 2026).
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

                {/* Hero stat — NZU coverage */}
                <div className="mt-5 rounded-2xl bg-[hsl(150_55%_42%/0.10)] p-5">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[hsl(150_55%_30%)]">
                    New Green Savings 2026+ — interest-free loan
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
                    The State Environmental Fund pays the interest to a partner bank; homeowner associations and housing cooperatives can borrow up to 750 000 CZK per flat. Combinable with a regular commercial loan. Low-income flats unlock a separate bonus (up to 120 000 CZK/flat) paid into the repair fund.
                  </p>
                  <p className="mt-1 text-[0.65rem] italic text-muted-foreground/70">
                    Source: State Environmental Fund press release, 9 Mar 2026 · novazelenausporam.cz
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(150_55%_30%)] underline-offset-4 group-hover:underline">
                    See NZU energy advisory →
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

                {/* Breakdown with NZU bracket grouping */}
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
                  Sources: State Environmental Fund 2026 press release, novazelenausporam.cz, Brivo Vinohrady ~180 000 CZK/m² (Q1 2026).
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
  materialInflationRate: 0.03, // ~3% / yr — Czech Statistical Office construction work index, +2.7% YoY (2025)
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
                Drift assumptions: energy +4%/yr (Energy Regulatory Office / Eurostat HH gas index), construction +3%/yr (Czech Statistical Office construction work index, +2.7% YoY 2025). Baseline waste &amp; reference cost are placeholders until your audit is uploaded.
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
    address: "Jenstejnska 1966/1, Prague 2",
    contact: "Contact via SVJ",
    coords: [50.0759, 14.4271] as [number, number],
    manager: "Petr Novak, chair, SVJ Jenstejnska",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Kremencova 178/10, Prague 1",
    contact: "Contact via SVJ",
    coords: [50.0808, 14.4187] as [number, number],
    manager: "Markéta Dvorakova, vice-chair",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Vodickova 710/31, Prague 1",
    contact: "Contact via SVJ",
    coords: [50.0815, 14.4248] as [number, number],
    manager: "Tomas Horak, building manager",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Stepanska 615/24, Prague 1",
    contact: "Contact via SVJ",
    coords: [50.0810, 14.4276] as [number, number],
    manager: "Lucie Prochazkova, chair, SVJ Stepanska",
    color: "hsl(140 65% 42%)",
  },
  {
    address: "Sokolská 1802/32, Prague 2",
    contact: "Contact via SVJ",
    coords: [50.0768, 14.4297] as [number, number],
    manager: "Jan Vesely, treasurer",
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
              <div className="mt-6 grid grid-cols-[minmax(0,1fr)_minmax(max-content,1.6fr)] gap-3 rounded-2xl border border-border/50 bg-card/45 p-4 text-center backdrop-blur-sm">
                <div>
                  <span className="block text-2xl font-bold tracking-tight text-foreground">
                    {communityData.stats?.totalApplicants || 0}
                  </span>
                  <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">Association applications</span>
                </div>
                <div>
                  <span className="block whitespace-nowrap text-2xl font-bold tracking-tight text-foreground">
                    {fmtCZK(communityData.stats?.totalPaid || 0)} CZK
                  </span>
                  <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">total paid</span>
                </div>
              </div>
            )}

            {communityData?.examples && communityData.examples.length > 0 && (
              <div className="mt-8 space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Successful renovations nearby:</h4>
                <div className="space-y-3">
                  {communityData.examples.map((ex: any, i: number) => (
                    <div key={i} className="rounded-2xl border border-border/60 bg-background/50 p-4 transition hover:border-foreground/20">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-sm font-semibold text-foreground block">{ex.applicantAddress || ex.applicant}</strong>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-[hsl(150_55%_42%/0.12)] px-2.5 py-0.5 text-xs font-semibold text-[hsl(150_55%_30%)]">
                            {fmtCZK(ex.support)} CZK
                          </span>
                          <button
                            type="button"
                            className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-semibold text-foreground/80 transition hover:border-foreground/25 hover:bg-background"
                          >
                            Contact
                          </button>
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {ex.municipalityName} · {ex.purpose} · {ex.signedAt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ContinueRow onClick={onContinue} />

          </div>
    </SplitShell>
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
    fear: "A higher repair fund they cannot afford on their pension.",
    description:
      "Lived in the building for thirty years. Remembers when the risers were last replaced and who paid for it. Listens carefully, asks the same question three different ways, and votes only when she's certain her monthly contribution won't change. Reassure her with the NZU vulnerable-household bonus and a fixed-cap repayment chart — not with optimism.",
    sketch: <SketchPensioner />,
    color: "hsl(15 80% 55%)",
  },
  {
    id: "skeptic",
    type: "The Skeptic",
    adjectives: ["analytical", "argumentative", "well-read"],
    fear: "Being sold a subsidy that vanishes mid-project.",
    description:
      "Reads the State Environmental Fund bulletins on weekends. Will print the call documentation and highlight clause 4.3.b in yellow. Doesn't trust contractors and especially doesn't trust banks. Win him over with sourced numbers, a named project manager, and a clear escape clause — never with marketing language.",
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


function StakeholderStep({
  onContinue,
  selectedPersonaIds,
  setSelectedPersonaIds,
}: {
  onContinue: () => void;
  selectedPersonaIds: Set<string>;
  setSelectedPersonaIds: Dispatch<SetStateAction<Set<string>>>;
}) {
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

  const togglePersona = (id: string) => {
    setSelectedPersonaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const desc = custom.trim();
    if (!desc || adding) return;
    setAdding(true);
    // mock AI roundtrip — would call real endpoint later
    window.setTimeout(() => {
      const newPersona: Persona = {
        id: `custom-${Date.now()}`,
        type: `Your neighbor #${extraPersonas.length + 1}`,
        adjectives: ["custom"],
        fear: "Whatever they described in their own words.",
        description: desc,
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
            {allPersonas.map((p) => {
              const isSelected = selectedPersonaIds.has(p.id);
              const isCustomPersona = p.id.startsWith("custom-");

              return (
                <article
                  key={p.id}
                  style={{
                    borderColor: isSelected ? p.color || "hsl(var(--foreground))" : p.color ? `${p.color}80` : undefined,
                    backgroundColor: isSelected && p.color ? `${p.color}12` : undefined,
                  }}
                  className={[
                    "group relative flex flex-col items-start gap-5 overflow-hidden rounded-3xl border-2 bg-card/60 p-6 text-left transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-20px_rgba(0,0,0,0.25)]",
                    isSelected ? "shadow-[0_18px_45px_-28px_rgba(0,0,0,0.45)]" : "",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => togglePersona(p.id)}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? "Deselect" : "Select"} ${p.type}`}
                    className={[
                      "absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border transition",
                      isSelected
                        ? "border-transparent bg-foreground text-background"
                        : "border-border/70 bg-background/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    ].join(" ")}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : null}
                  </button>

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
                    {isCustomPersona && (
                      <p className="line-clamp-4 text-sm leading-relaxed text-foreground/75">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(p.id)}
                    className="mt-auto rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:border-foreground/25 hover:bg-background"
                  >
                    View brief
                  </button>
                </article>
              );
            })}
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
            {(() => {
              const isCustomPersona = persona.id.startsWith("custom-");

              return (
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
                {isCustomPersona ? "Your description" : "What they're afraid of"}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {isCustomPersona ? persona.description : persona.fear}
              </p>
            </div>

            {!isCustomPersona && (
              <p className="mt-5 text-sm leading-relaxed text-foreground/85">
                {persona.description}
              </p>
            )}
                </>
              );
            })()}
          </>
        )}
      </GlassDialog>
    </section>
  );
}
