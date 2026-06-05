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
const renovationScopeSection = document.querySelector("#renovationScope");
const houseInfoSection = document.querySelector("#houseInfo");
const scopeForm = document.querySelector("#scopeForm");
const scopeGrid = document.querySelector("#scopeGrid");
const scopeSubmit = document.querySelector("#scopeSubmit");
const scopeMessage = document.querySelector("#scopeMessage");
const questionList = document.querySelector("#questionList");
const houseImage = document.querySelector("#houseImage");

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

async function fetchBuildingInfo(address) {
  const response = await fetch("/api/building-info", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ address }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nepodařilo se načíst údaje o domu.");
  }

  return data;
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
  setMessage("Hledám adresu a načítám údaje z RÚIAN...", "neutral");

  try {
    const data = await fetchBuildingInfo(address);
    renderBuildingInfo(data);
    setMessage("Dům jsme našli. Vyberte, co chcete řešit.", "success");
    scrollToSection(renovationScopeSection);
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

  visibleQuestions.forEach((question, index) => {
    questionList.append(createQuestionItem(question, index));
  });
}

addressForm.addEventListener("submit", handleAddressSubmit);
scopeForm.addEventListener("submit", handleScopeSubmit);
renderScopeTiles();
