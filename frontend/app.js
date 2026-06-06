import { calculateNzuRenovation } from "./nzuCalculator.js";

const scopeOptions = [
  {
    id: "zatepleni",
    label: "Zateplení",
    icon: "/img/icons/zatepleni.png",
  },
  {
    id: "fotovoltaika",
    label: "Fotovoltaické systémy",
    icon: "/img/icons/fotovoltaicke_systemy.png",
  },
  {
    id: "zdroj-tepla",
    label: "Výměna zdroje tepla",
    icon: "/img/icons/vymena_zdroje_tepla.png",
  },
  {
    id: "tepla-voda",
    label: "Příprava teplé vody",
    icon: "/img/icons/priprava_teple_vody.png",
  },
  {
    id: "rekuperace",
    label: "Větrání s rekuperací",
    icon: "/img/icons/vetrani_s_rekuperaci.png",
  },
  {
    id: "destova-voda",
    label: "Dešťová a odpadní voda",
    icon: "/img/icons/destova_a_odpadni_voda.png",
  },
  {
    id: "zelena-strecha",
    label: "Zelená střecha",
    icon: "/img/icons/zelena_strecha.png",
  },
  {
    id: "odpadni-teplo",
    label: "Využití tepla z odpadní vody",
    icon: "/img/icons/vyuziti_tepla_z_odpadni_vodyt.png",
  },
  {
    id: "zranitelne-domacnosti",
    label: "Bonus pro zranitelné domácnosti",
    icon: "/img/icons/bonus_pro_zranitelne_domacnosti.png",
  },
];

const questions = [
  {
    id: "envelope",
    text: "Jaký je převládající stav fasády a oken?",
    triggers: ["zatepleni", "zdroj-tepla", "rekuperace"],
    options: [
      { value: "uninsulated", label: "Dům je nezateplený" },
      { value: "partial", label: "Částečně zateplený" },
      { value: "complete", label: "Kompletně zateplený s novými okny" },
    ],
  },
  {
    id: "roof",
    text: "Jaký je technický stav a typ vaší střechy?",
    triggers: ["fotovoltaika", "zelena-strecha", "destova-voda"],
    options: [
      { value: "flat_rebuild", label: "Plochá k rekonstrukci" },
      { value: "sloped_good", label: "Šikmá s dobrou orientací" },
      { value: "recently_fixed", label: "Nedávno opravená" },
    ],
  },
  {
    id: "internal_infrastructure",
    text: "V jakém stavu je váš hlavní zdroj tepla a svislé rozvody?",
    triggers: ["zdroj-tepla", "tepla-voda", "odpadni-teplo"],
    options: [
      { value: "old_boiler", label: "Kotel starší 15 let" },
      { value: "risers_before_rebuild", label: "Rozvody před rekonstrukcí" },
      { value: "modernized", label: "Vše je modernizované" },
    ],
  },
  {
    id: "surroundings",
    text: "Má dům vlastní pozemek, vnitroblok, nebo snadný přístup k hlavní kanalizaci?",
    triggers: ["destova-voda", "odpadni-teplo"],
    options: [
      { value: "yes", label: "Ano" },
      { value: "no", label: "Ne" },
      { value: "unknown", label: "Nevíme" },
    ],
  },
  {
    id: "demographics",
    text: "Tvoří významnou část obyvatel domu senioři nebo domácnosti pobírající příspěvky na bydlení?",
    triggers: ["zranitelne-domacnosti"],
    options: [
      { value: "yes", label: "Ano" },
      { value: "no", label: "Ne" },
      { value: "unknown", label: "Nevíme" },
    ],
  },
];

const personas = [
  {
    id: "opatrna",
    name: "Paní Opatrná",
    type: "Debt-averse pensioner",
    image: "/img/personas/pani_opatrna.png",
    description:
      "Žije z pevného důchodu a půjčka pro ni znamená osobní hrozbu. Bojí se dluhu víc než pomalu rostoucích účtů.",
  },
  {
    id: "kalkulacka",
    name: "Pan Kalkulačka",
    type: "Absentee investor",
    image: "/img/personas/pan_kalkulacka.png",
    description:
      "V domě nebydlí a náklady na energie platí nájemník. Slyší hlavně na růst hodnoty bytu a budoucí regulace.",
  },
  {
    id: "zitrek",
    name: "Pan Zítřek",
    type: "Chronic procrastinator",
    initials: "Z",
    description:
      "Souhlasí v principu, ale proces mu připadá složitý. Chce další schůzi, další nabídky a další odklad.",
  },
  {
    id: "neduverivy",
    name: "Pan Nedůvěřivý",
    type: "Suspicious penny-pincher",
    initials: "N",
    description:
      "Čeká podvod od firem, bank i dotací. Soustředí se na vysokou cenu a přehlíží drahé nicnedělání.",
  },
  {
    id: "inzenyr",
    name: "Pan Inženýr",
    type: "Over-analyzer",
    initials: "I",
    description:
      "Chce stoprocentní jistotu, přesné modely a právní rozbory. Nekonečná data drží rozhodnutí mimo dosah.",
  },
];

const scopeImpact = {
  zatepleni: 28000,
  fotovoltaika: 22000,
  "zdroj-tepla": 26000,
  "tepla-voda": 12000,
  rekuperace: 15000,
  "destova-voda": 9000,
  "zelena-strecha": 11000,
  "odpadni-teplo": 8000,
  "zranitelne-domacnosti": 18000,
};

const answerImpact = {
  envelope: {
    uninsulated: 32000,
    partial: 16000,
    complete: 4000,
  },
  roof: {
    flat_rebuild: 18000,
    sloped_good: 6000,
    recently_fixed: 3000,
  },
  internal_infrastructure: {
    old_boiler: 26000,
    risers_before_rebuild: 18000,
    modernized: 4000,
  },
  surroundings: {
    yes: 6000,
    no: 14000,
    unknown: 10000,
  },
  demographics: {
    yes: 22000,
    no: 5000,
    unknown: 12000,
  },
};

const state = {
  address: "",
  buildingInfo: null,
  latestCalculation: null,
  latestNzuInput: null,
  latestCommunityData: null,
  selectedScopes: new Set(),
  answers: Object.fromEntries(questions.map((question) => [question.id, null])),
  selectedPersonas: new Map(),
};

const addressForm = document.querySelector("#addressForm");
const addressInput = document.querySelector("#addressInput");
const addressSubmit = document.querySelector("#addressSubmit");
const submitLabel = document.querySelector("[data-submit-label]");
const formMessage = document.querySelector("#formMessage");
const addressResults = document.querySelector("#addressResults");
const renovationScopeSection = document.querySelector("#renovationScope");
const houseInfoSection = document.querySelector("#houseInfo");
const scopeForm = document.querySelector("#scopeForm");
const scopeGrid = document.querySelector("#scopeGrid");
const scopeSubmit = document.querySelector("#scopeSubmit");
const scopeMessage = document.querySelector("#scopeMessage");
const questionList = document.querySelector("#questionList");
const houseImage = document.querySelector("#houseImage");
const basicInfoForm = document.querySelector("#basicInfoForm");
const questionnaireSubmit = document.querySelector("#questionnaireSubmit");
const questionnaireMessage = document.querySelector("#questionnaireMessage");
const impactStage = document.querySelector("#impactStage");
const impactTotal = document.querySelector("#impactTotal");
const impactSummary = document.querySelector("#impactSummary");
const impactGrid = document.querySelector("#impactGrid");
const impactPlots = document.querySelector("#impactPlots");
const impactNext = document.querySelector("#impactNext");
const communityStage = document.querySelector("#communityStage");
const communityCount = document.querySelector("#communityCount");
const communitySummary = document.querySelector("#communitySummary");
const communityStats = document.querySelector("#communityStats");
const communityGrid = document.querySelector("#communityGrid");
const communityNext = document.querySelector("#communityNext");
const personaStrip = document.querySelector(".persona-strip");
const personaForm = document.querySelector("#personaForm");
const personaDescription = document.querySelector("#personaDescription");
const personaSelectionStatus = document.querySelector("#personaSelectionStatus");
const personaNext = document.querySelector("#personaNext");
const materialOutput = document.querySelector("#materialOutput");
const materialOutputLabel = document.querySelector("#materialOutputLabel");
const materialOutputText = document.querySelector("#materialOutputText");
const materialCopy = document.querySelector("#materialCopy");

function setLoading(isLoading) {
  addressSubmit.disabled = isLoading;
  addressInput.disabled = isLoading;
  submitLabel.textContent = isLoading ? "Načítám" : "Pokračovat";
  addressForm.classList.toggle("is-loading", isLoading);
}

function setMessage(message, type = "neutral") {
  formMessage.textContent = message;
  formMessage.dataset.type = type;
}

function clearAddressResults() {
  addressResults.hidden = true;
  addressResults.replaceChildren();
}

function scrollToSection(section) {
  section.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  window.setTimeout(() => {
    section.focus({ preventScroll: true });
  }, 720);
}

function normalizeUsage(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("cs-CZ");
}

function updateHouseImage(buildingInfo) {
  const usage = normalizeUsage(buildingInfo?.building?.usage);
  const isApartmentBuilding = usage === "bytový dům";
  const isFamilyHouse = usage === "rodinný dům";

  houseImage.src = isApartmentBuilding ? "/img/houses/panelak.png" : "/img/houses/basic_house.png";
  houseImage.alt = isApartmentBuilding
    ? "Ilustrace bytového domu"
    : isFamilyHouse
      ? "Ilustrace rodinného domu"
      : "Ilustrace domu";
}

function renderBuildingInfo(data) {
  state.buildingInfo = data;
  updateHouseImage(data);
}

async function searchAddressMatches(address) {
  const response = await fetch(`/api/address-search?q=${encodeURIComponent(address)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nepodařilo se vyhledat adresu.");
  }

  return data;
}

async function fetchBuildingInfo(address) {
  const body = typeof address === "string" ? { address } : { selectedAddress: address };
  const response = await fetch("/api/building-info", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nepodařilo se načíst údaje o domu.");
  }

  return data;
}

async function loadBuildingFromSelection(selectedAddress) {
  state.address = selectedAddress.displayName;
  setLoading(true);
  setMessage("Načítám údaje o vybraném domě z RÚIAN...", "neutral");
  clearAddressResults();

  try {
    const data = await fetchBuildingInfo(selectedAddress);
    renderBuildingInfo(data);
    setMessage("Dům jsme našli. Vyberte, co chcete řešit.", "success");
    scrollToSection(renovationScopeSection);
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

function renderAddressMatches(data) {
  addressResults.replaceChildren();

  if (data.matches.length === 0) {
    setMessage("Nenašli jsme adresu s číslem domu. Zkuste přidat obec, ulici a PSČ.", "error");
    addressResults.hidden = true;
    return;
  }

  const list = document.createElement("div");
  list.className = "address-match-list";

  data.matches.forEach((match) => {
    const button = document.createElement("button");
    button.className = "address-match";
    button.type = "button";

    const title = document.createElement("strong");
    title.textContent = match.displayName;

    const details = document.createElement("span");
    details.textContent = [
      match.street,
      match.cp ? `č.p. ${match.cp}` : null,
      match.municipalityName,
      match.zip ? `PSČ ${match.zip}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    button.append(title, details);
    button.addEventListener("click", () => loadBuildingFromSelection(match));
    list.append(button);
  });

  const attribution = document.createElement("p");
  attribution.className = "address-attribution";
  attribution.textContent = data.attribution;

  addressResults.append(list, attribution);
  addressResults.hidden = false;
  setMessage("Vyberte správnou adresu ze seznamu.", "success");
}

async function handleAddressSubmit(event) {
  event.preventDefault();

  const address = addressInput.value.trim();

  if (!address) {
    setMessage("Zadejte prosím obec a číslo popisné.", "error");
    addressInput.focus();
    return;
  }

  state.address = address;
  setLoading(true);
  setMessage("Hledám možné adresy...", "neutral");
  clearAddressResults();

  try {
    const data = await searchAddressMatches(address);
    renderAddressMatches(data);
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

function updateScopeState() {
  const selectedCount = state.selectedScopes.size;
  scopeSubmit.disabled = selectedCount === 0;
  scopeMessage.textContent =
    selectedCount === 0
      ? "Vyberte jednu nebo více oblastí."
      : `Vybráno: ${selectedCount}`;
}

function updateQuestionnaireState() {
  const answeredCount = Object.values(state.answers).filter(Boolean).length;
  questionnaireSubmit.disabled = answeredCount === 0;
  questionnaireMessage.textContent =
    answeredCount === 0
      ? "Odpovězte alespoň na jednu otázku."
      : `Zodpovězeno: ${answeredCount}`;
}

function createScopeTile(option) {
  const button = document.createElement("button");
  button.className = "scope-tile";
  button.type = "button";
  button.dataset.scope = option.id;
  button.setAttribute("aria-pressed", "false");

  const image = document.createElement("img");
  image.src = option.icon;
  image.alt = "";
  image.loading = "lazy";

  const label = document.createElement("span");
  label.textContent = option.label;

  button.append(image, label);

  button.addEventListener("click", () => {
    const isSelected = state.selectedScopes.has(option.id);

    if (isSelected) {
      state.selectedScopes.delete(option.id);
    } else {
      state.selectedScopes.add(option.id);
    }

    button.classList.toggle("is-selected", !isSelected);
    button.setAttribute("aria-pressed", String(!isSelected));
    updateScopeState();
  });

  return button;
}

function renderScopeTiles() {
  scopeOptions.forEach((option) => {
    scopeGrid.append(createScopeTile(option));
  });
}

function handleScopeSubmit(event) {
  event.preventDefault();

  if (state.selectedScopes.size === 0) {
    updateScopeState();
    return;
  }

  renderQuestions();
  scrollToSection(houseInfoSection);
}

function createToggle(question, option) {
  const button = document.createElement("button");
  button.className = "toggle-option";
  button.type = "button";
  button.textContent = option.label;
  button.dataset.value = option.value;
  button.setAttribute("aria-pressed", "false");

  button.addEventListener("click", () => {
    state.answers[question.id] = option.value;

    const group = button.closest(".toggle-group");
    group.querySelectorAll(".toggle-option").forEach((toggle) => {
      const isActive = toggle.dataset.value === option.value;
      toggle.classList.toggle("is-selected", isActive);
      toggle.setAttribute("aria-pressed", String(isActive));
    });

    updateQuestionnaireState();
  });

  return button;
}

function createQuestionItem(question, index) {
  const item = document.createElement("article");
  item.className = "question-item";

  const number = document.createElement("span");
  number.className = "question-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const text = document.createElement("h3");
  text.textContent = question.text;

  const toggleGroup = document.createElement("div");
  toggleGroup.className = "toggle-group";
  toggleGroup.setAttribute("aria-label", question.text);
  toggleGroup.dataset.options = String(question.options.length);
  question.options.forEach((option) => {
    toggleGroup.append(createToggle(question, option));
  });

  item.append(number, text, toggleGroup);
  return item;
}

function getVisibleQuestions() {
  return questions.filter((question) =>
    question.triggers.some((trigger) => state.selectedScopes.has(trigger)),
  );
}

function renderQuestions() {
  const visibleQuestions = getVisibleQuestions();
  questionList.replaceChildren();

  state.answers = Object.fromEntries(questions.map((question) => [question.id, null]));

  visibleQuestions.forEach((question, index) => {
    questionList.append(createQuestionItem(question, index));
  });

  updateQuestionnaireState();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(value);
}

function createImpactCard(label, value, detail) {
  const card = document.createElement("article");
  card.className = "impact-card";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.textContent = formatCurrency(value);

  const detailElement = document.createElement("p");
  detailElement.textContent = detail;

  card.append(labelElement, valueElement, detailElement);
  return card;
}

function createCommunityCard(example) {
  const card = document.createElement("article");
  card.className = "community-card";

  const municipality = document.createElement("span");
  municipality.textContent = example.municipalityName;

  const title = document.createElement("strong");
  title.textContent = example.applicantAddress || example.applicant;

  const amount = document.createElement("p");
  amount.textContent = `Podpora ${formatCurrency(example.support)}`;

  const meta = document.createElement("small");
  meta.textContent = [example.signedAt, example.purpose].filter(Boolean).join(" · ");

  card.append(municipality, title, amount, meta);
  return card;
}

function createCommunityStat(label, value, detail) {
  const card = document.createElement("article");
  card.className = "community-stat";

  const valueElement = document.createElement("strong");
  valueElement.textContent = value;

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const detailElement = document.createElement("small");
  detailElement.textContent = detail;

  card.append(valueElement, labelElement, detailElement);
  return card;
}

async function fetchCommunityExamples() {
  const municipalityName = state.buildingInfo?.address?.municipalityName || "";
  const params = new URLSearchParams({ municipalityName });

  const response = await fetch(`/api/reconstruction-examples?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nepodařilo se načíst příklady rekonstrukcí.");
  }

  return data;
}

function renderCommunityStats(stats) {
  if (!stats) {
    communityStats.replaceChildren();
    return;
  }

  const yearStats =
    stats.thisYear?.applicants > 0 || !stats.latestYear ? stats.thisYear : stats.latestYear;
  const yearLabel = yearStats.year === stats.currentYear ? "letos" : `v roce ${yearStats.year}`;

  communityStats.replaceChildren(
    createCommunityStat(
      `${yearLabel} podaných SVJ žádostí`,
      new Intl.NumberFormat("cs-CZ").format(yearStats.applicants || 0),
      "Aktivní záznamy programu SFŽP",
    ),
    createCommunityStat(
      `${yearLabel} vyplaceno`,
      formatCurrency(yearStats.paid || 0),
      "Součet vyplacené podpory pro SVJ",
    ),
    createCommunityStat(
      "celkem vyplaceno SVJ",
      formatCurrency(stats.totalPaid || 0),
      `${new Intl.NumberFormat("cs-CZ").format(stats.totalApplicants || 0)} úspěšných SVJ záznamů`,
    ),
  );
}

function renderCommunityExamples(data) {
  state.latestCommunityData = data;
  const localText =
    data.mode === "same-city"
      ? `${data.localCount} úspěšných SVJ ve stejné obci`
      : data.localCount > 0
        ? `${data.localCount} příkladů ve stejné obci`
        : "Příklady z aktivních projektů SFŽP";

  communityCount.textContent = localText;
  communitySummary.textContent =
    "We know it can be intimidating to take the first step alone - but you aren't. There are many success stories of people just like you.";
  renderCommunityStats(data.stats);
  communityGrid.replaceChildren(...data.examples.map(createCommunityCard));
}

const scopeGoalMap = {
  zatepleni: "INSULATION",
  fotovoltaika: "PHOTOVOLTAICS",
  "zdroj-tepla": "HEAT_SOURCE",
  rekuperace: "VENTILATION",
  "zelena-strecha": "GREEN_ROOF",
};

function getSelectedNzuGoals() {
  return [...state.selectedScopes].map((scopeId) => scopeGoalMap[scopeId]).filter(Boolean);
}

function estimateVulnerableFlats(numberOfFlats) {
  const demographicsAnswer = state.answers.demographics;

  if (demographicsAnswer === "yes") {
    return Math.max(1, Math.round(numberOfFlats * 0.3));
  }

  if (demographicsAnswer === "unknown") {
    return Math.max(0, Math.round(numberOfFlats * 0.15));
  }

  return 0;
}

function buildNzuInput() {
  const building = state.buildingInfo?.building || {};
  const numberOfFlats = Math.max(1, Number(building.flats) || 12);
  const floorArea = Number(building.floorAreaM2) || numberOfFlats * 70;
  const footprintArea =
    Number(building.builtAreaM2) ||
    (Number(building.floors) > 0 ? floorArea / Number(building.floors) : floorArea / 3);
  const selectedGoals = getSelectedNzuGoals();

  return {
    floorArea,
    footprintArea,
    numberOfFlats,
    vulnerableFlats: estimateVulnerableFlats(numberOfFlats),
    selectedGoals,
    renovationType: selectedGoals.includes("INSULATION") ? "COMPLEX" : "PARTIAL",
  };
}

function createPenaltyBars(calculation) {
  const items = [
    { label: "Dražší stavba", value: calculation.penaltyCapexInflation },
    { label: "Ztracené úspory", value: calculation.penaltyLostSavings },
    { label: "Komerční úrok", value: calculation.penaltyLostZeroInterest },
  ];
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const chart = document.createElement("article");
  chart.className = "impact-plot-card";

  const title = document.createElement("h3");
  title.textContent = "Z čeho se skládá trest za čekání";

  const bars = document.createElement("div");
  bars.className = "penalty-bars";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "penalty-bar-row";

    const label = document.createElement("span");
    label.textContent = item.label;

    const track = document.createElement("div");
    track.className = "penalty-bar-track";

    const fill = document.createElement("div");
    fill.className = "penalty-bar-fill";
    fill.style.width = `${Math.max(8, (item.value / maxValue) * 100)}%`;

    const value = document.createElement("strong");
    value.textContent = formatCurrency(item.value);

    track.append(fill);
    row.append(label, track, value);
    bars.append(row);
  });

  chart.append(title, bars);
  return chart;
}

function createWaitTrajectory(calculation) {
  const years = [0, 1, 2, 3, 4, 5];
  const points = years.map((year) => ({
    year,
    value:
      calculation.penaltyLostZeroInterest * (year / 5) +
      calculation.penaltyCapexInflation * (year / 5) +
      calculation.estimatedYearlySavings * year,
  }));
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const width = 560;
  const height = 230;
  const padX = 34;
  const padY = 24;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padY * 2;
  const path = points
    .map((point, index) => {
      const x = padX + (point.year / 5) * plotWidth;
      const y = height - padY - (point.value / maxValue) * plotHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const pointMarkers = points
    .map((point) => {
      const x = padX + (point.year / 5) * plotWidth;
      const y = height - padY - (point.value / maxValue) * plotHeight;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" />`;
    })
    .join("");
  const chart = document.createElement("article");
  chart.className = "impact-plot-card impact-line-card";
  chart.innerHTML = `
    <h3>Čím déle čekáte, tím dražší je start</h3>
    <svg class="impact-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Růst nákladů čekání po pěti letech">
      <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" />
      <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${height - padY}" />
      <path d="${path}" />
      ${pointMarkers}
      <text x="${padX}" y="${height - 4}">teď</text>
      <text x="${width - padX - 40}" y="${height - 4}">za 5 let</text>
      <text x="${width - padX - 132}" y="${padY + 14}">${formatCurrency(calculation.totalWaitPenalty)}</text>
    </svg>
  `;

  return chart;
}

function renderImpactPlots(calculation) {
  impactPlots.replaceChildren(createPenaltyBars(calculation), createWaitTrajectory(calculation));
}

function renderImpact() {
  const nzuInput = buildNzuInput();
  const calculation = calculateNzuRenovation(nzuInput);
  state.latestNzuInput = nzuInput;
  state.latestCalculation = calculation;
  impactTotal.textContent = formatCurrency(calculation.totalWaitPenalty);
  impactSummary.textContent =
    "Odhad podle NZÚ: dotace kryje podíl zranitelných domácností, zbytek dnes financuje 0% státní půjčka. Čekání zdražuje stavbu, bere úspory a může nahradit 0% půjčku komerčním úrokem.";

  impactGrid.replaceChildren(
    createImpactCard(
      "Měsíční splátka při akci teď",
      calculation.monthlyStateLoanPayment,
      `0% státní půjčka rozpočítaná na ${calculation.stateLoanTermYears} let po odečtení bonusu pro zranitelné byty.`,
    ),
    createImpactCard(
      "Roční úspora energií",
      calculation.estimatedYearlySavings,
      "Součet úspor z vybraných opatření, zastropovaný na 85 % dnešních nákladů.",
    ),
    createImpactCard(
      "Přímá podpora zranitelným",
      calculation.directSubsidyVulnerable,
      "Bonus při komplexní renovaci: až 2 000 Kč/m² do 60 m² na zranitelný byt.",
    ),
  );
  renderImpactPlots(calculation);
}

function handleQuestionnaireSubmit(event) {
  event.preventDefault();

  if (questionnaireSubmit.disabled) {
    updateQuestionnaireState();
    return;
  }

  renderImpact();
  fetchCommunityExamples()
    .then(renderCommunityExamples)
    .catch((error) => {
      communityCount.textContent = "Příklady se nepodařilo načíst";
      communitySummary.textContent = error.message;
      communityStats.replaceChildren();
      communityGrid.replaceChildren();
    });
  scrollToSection(impactStage);
}

function createPersonaCard(persona, options = {}) {
  const card = document.createElement("button");
  card.className = options.isCustom ? "persona-card persona-card-custom" : "persona-card";
  card.type = "button";
  card.dataset.personaId = persona.id;
  card.setAttribute("aria-pressed", "false");

  const image = document.createElement("div");
  image.className = persona.image ? "persona-image persona-image-real" : "persona-image";
  image.setAttribute("aria-hidden", "true");

  if (persona.image) {
    const img = document.createElement("img");
    img.src = persona.image;
    img.alt = "";
    img.loading = "lazy";
    image.append(img);
  } else {
    const initials = document.createElement("span");
    initials.className = "persona-initials";
    initials.textContent = persona.initials || persona.name.slice(0, 1);
    image.append(initials);
  }

  const content = document.createElement("div");
  content.className = "persona-content";

  const title = document.createElement("h3");
  title.textContent = persona.name;

  const label = document.createElement("span");
  label.className = "persona-type";
  label.textContent = persona.type;

  const text = document.createElement("p");
  text.textContent = persona.description;

  content.append(title, label, text);
  card.append(image, content);
  card.addEventListener("click", () => togglePersona(card));

  return card;
}

function renderPersonas() {
  personaStrip.replaceChildren(...personas.map((persona) => createPersonaCard(persona)));
}

function syncPersonaSelection() {
  document.querySelectorAll("[data-persona-id]").forEach((card) => {
    const isSelected = state.selectedPersonas.has(card.dataset.personaId);
    card.classList.toggle("is-selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });

  const count = state.selectedPersonas.size;
  personaSelectionStatus.textContent =
    count > 0
      ? `Uloženo pro další krok: ${count} ${count === 1 ? "persona" : count < 5 ? "persony" : "person"}.`
      : "Vyberte persony, které v domě potkáváte.";
}

function togglePersona(card) {
  const id = card.dataset.personaId;
  const persona = {
    id,
    name: card.querySelector("h3")?.textContent || "Persona",
    type: card.querySelector(".persona-type")?.textContent || "",
    description: card.querySelector("p")?.textContent || "",
  };

  if (state.selectedPersonas.has(id)) {
    state.selectedPersonas.delete(id);
  } else {
    state.selectedPersonas.set(id, persona);
  }

  syncPersonaSelection();
}

function handlePersonaSubmit(event) {
  event.preventDefault();

  const description = personaDescription.value.trim();

  if (!description) {
    personaDescription.focus();
    return;
  }

  const personaId = `custom-${Date.now()}`;
  const persona = {
    id: personaId,
    name: "Vlastní persona",
    type: "Popis z vašeho domu",
    initials: "+",
    description,
  };
  const card = createPersonaCard(persona, { isCustom: true });

  personaStrip.append(card);
  state.selectedPersonas.set(personaId, persona);
  personaDescription.value = "";
  syncPersonaSelection();
}

function getSelectedScopeDetails() {
  return [...state.selectedScopes].map((scopeId) => {
    const option = scopeOptions.find((scope) => scope.id === scopeId);
    return {
      id: scopeId,
      label: option?.label || scopeId,
      nzuGoal: scopeGoalMap[scopeId] || null,
    };
  });
}

function getAnsweredQuestions() {
  return Object.entries(state.answers)
    .filter(([, value]) => value)
    .map(([questionId, value]) => {
      const question = questions.find((item) => item.id === questionId);
      const option = question?.options.find((item) => item.value === value);
      return {
        id: questionId,
        question: question?.text || questionId,
        answer: option?.label || value,
      };
    });
}

function getMaterialCalculation() {
  if (!state.latestCalculation || !state.latestNzuInput) {
    const nzuInput = buildNzuInput();
    state.latestNzuInput = nzuInput;
    state.latestCalculation = calculateNzuRenovation(nzuInput);
  }

  return {
    input: state.latestNzuInput,
    result: state.latestCalculation,
  };
}

function getMaterialVisuals(calculation) {
  return {
    penaltyBreakdown: [
      { label: "Dražší stavba", value: calculation.penaltyCapexInflation },
      { label: "Ztracené úspory", value: calculation.penaltyLostSavings },
      { label: "Komerční úrok", value: calculation.penaltyLostZeroInterest },
    ],
    waitTrajectorySvg: impactPlots.querySelector(".impact-line-chart")?.outerHTML || null,
    suggestedCharts: [
      "bar chart: dražší stavba vs ztracené úspory vs komerční úrok",
      "line chart: růst nákladů čekání od teď do 5 let",
    ],
  };
}

function buildMaterialPayload(format) {
  const calculation = getMaterialCalculation();
  const building = state.buildingInfo?.building || {};
  const address = state.buildingInfo?.address || {};
  const selectedPersonas = [...state.selectedPersonas.values()];
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
        input: state.address,
        municipalityName: address.municipalityName || null,
        streetName: address.streetName || null,
        cp: address.cp || null,
      },
      building: {
        usage: building.usage || null,
        completedAt: building.completedAt || null,
        floorAreaM2: building.floorAreaM2 || calculation.input.floorArea,
        builtAreaM2: building.builtAreaM2 || calculation.input.footprintArea,
        floors: building.floors || null,
        flats: building.flats || calculation.input.numberOfFlats,
        heating: building.utilities?.heating || null,
      },
      selectedGoals: getSelectedScopeDetails(),
      answeredQuestions: getAnsweredQuestions(),
      nonFinancialBenefits,
      calculation,
      selectedPersonas,
    },
    selectedPersonas,
    visuals: getMaterialVisuals(calculation.result),
    localExamples: {
      summary: state.latestCommunityData
        ? {
            mode: state.latestCommunityData.mode,
            localCount: state.latestCommunityData.localCount,
            stats: state.latestCommunityData.stats,
          }
        : null,
      examples: (state.latestCommunityData?.examples || []).slice(0, 3),
    },
  };
}

async function generateMaterial(format, button) {
  if (format === "pdf") {
    await generatePdf(button);
    return;
  }

  const originalLabel = button.innerHTML;
  button.disabled = true;
  button.textContent = "Generuji...";
  materialOutput.hidden = false;
  materialOutputLabel.textContent = "Generuji výstup";
  materialOutputText.textContent = "Připravuji kontext domu, výpočty, grafy a persony...";

  try {
    const response = await fetch("/api/generate-material", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(buildMaterialPayload(format)),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Generování selhalo.");
    }

    materialOutputLabel.textContent =
      format === "whatsapp" ? "Zpráva do chatu" : format === "leaflet" ? "Leták na nástěnku" : "Tahák na schůzi SVJ";
    materialOutputText.textContent = data.content;
  } catch (error) {
    materialOutputLabel.textContent = "Generování selhalo";
    materialOutputText.textContent = error.message;
  } finally {
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
}

async function generatePdf(button) {
  const originalLabel = button.innerHTML;
  button.disabled = true;
  button.textContent = "Generuji PDF...";
  materialOutput.hidden = false;
  materialOutputLabel.textContent = "Generuji PDF";
  materialOutputText.textContent = "Připravuji A4 podklad pro schůzi SVJ...";

  try {
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(buildMaterialPayload("pdf")),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Generování PDF selhalo.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "renovace-svj-onepager.pdf";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    materialOutputLabel.textContent = "PDF připraveno";
    materialOutputText.textContent = "PDF bylo staženo jako renovace-svj-onepager.pdf.";
  } catch (error) {
    materialOutputLabel.textContent = "Generování PDF selhalo";
    materialOutputText.textContent = error.message;
  } finally {
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
}

addressForm.addEventListener("submit", handleAddressSubmit);
scopeForm.addEventListener("submit", handleScopeSubmit);
basicInfoForm.addEventListener("submit", handleQuestionnaireSubmit);
impactNext.addEventListener("click", () => scrollToSection(communityStage));
communityNext.addEventListener("click", () => scrollToSection(document.querySelector("#personasStage")));
personaForm.addEventListener("submit", handlePersonaSubmit);
personaNext.addEventListener("click", () => scrollToSection(document.querySelector("#actionStage")));
document.querySelectorAll("[data-material-format]").forEach((button) => {
  button.addEventListener("click", () => generateMaterial(button.dataset.materialFormat, button));
});
materialCopy.addEventListener("click", async () => {
  await navigator.clipboard.writeText(materialOutputText.textContent);
  materialCopy.textContent = "Zkopírováno";
  window.setTimeout(() => {
    materialCopy.textContent = "Kopírovat";
  }, 1200);
});
renderPersonas();
syncPersonaSelection();
renderScopeTiles();
