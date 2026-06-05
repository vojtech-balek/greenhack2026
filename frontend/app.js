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
  selectedScopes: new Set(),
  answers: Object.fromEntries(questions.map((question) => [question.id, null])),
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
const impactNext = document.querySelector("#impactNext");
const communityStage = document.querySelector("#communityStage");
const communityCount = document.querySelector("#communityCount");
const communitySummary = document.querySelector("#communitySummary");
const communityStats = document.querySelector("#communityStats");
const communityGrid = document.querySelector("#communityGrid");

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

function calculateImpact() {
  const selectedScopeCost = [...state.selectedScopes].reduce(
    (sum, scopeId) => sum + (scopeImpact[scopeId] || 0),
    0,
  );
  const answerCost = Object.entries(state.answers).reduce(
    (sum, [questionId, value]) => sum + (answerImpact[questionId]?.[value] || 0),
    0,
  );
  const buildingFactor = normalizeUsage(state.buildingInfo?.building?.usage) === "bytový dům" ? 1.35 : 1;
  const yearlyCost = Math.round((selectedScopeCost + answerCost) * buildingFactor);
  const threeYearCost = Math.round(yearlyCost * 3.18);
  const missedSubsidy = Math.round(selectedScopeCost * 1.8);

  return { yearlyCost, threeYearCost, missedSubsidy, selectedScopeCost, answerCost };
}

function renderImpact() {
  const impact = calculateImpact();
  impactTotal.textContent = formatCurrency(impact.threeYearCost);
  impactSummary.textContent =
    "Placeholder odhad kombinuje vybraná opatření, odpovědi z dotazníku a typ domu. Slouží jen pro hackathonový prototyp.";

  impactGrid.replaceChildren(
    createImpactCard(
      "Roční náklady čekání",
      impact.yearlyCost,
      "Hrubý dopad vyšších energií, údržby a horší připravenosti projektu.",
    ),
    createImpactCard(
      "Tříletý odklad",
      impact.threeYearCost,
      "Ukazuje, jak se může malý roční dopad nasčítat při čekání.",
    ),
    createImpactCard(
      "Riziko nevyužité podpory",
      impact.missedSubsidy,
      "Orientační hodnota příležitosti navázaná na zvolená opatření.",
    ),
  );
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

addressForm.addEventListener("submit", handleAddressSubmit);
scopeForm.addEventListener("submit", handleScopeSubmit);
basicInfoForm.addEventListener("submit", handleQuestionnaireSubmit);
impactNext.addEventListener("click", () => scrollToSection(communityStage));
renderScopeTiles();
