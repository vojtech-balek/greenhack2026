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
    id: "windows",
    text: "Má dům nezateplená okna?",
  },
  {
    id: "facade",
    text: "Chybí domu zateplení obvodových stěn?",
  },
  {
    id: "thermal",
    text: "Chybí domu jakákoliv tepelně izolační opatření?",
  },
  {
    id: "planning",
    text: "Řešíte renovaci v příštích 12 měsících?",
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
const buildingCard = document.querySelector("#buildingCard");
const buildingTitle = document.querySelector("#buildingTitle");
const buildingAddress = document.querySelector("#buildingAddress");
const buildingCode = document.querySelector("#buildingCode");
const addressCode = document.querySelector("#addressCode");
const buildingFacts = document.querySelector("#buildingFacts");
const confidencePill = document.querySelector("#confidencePill");

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

function formatValue(value, fallback = "Nezjištěno") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return value;
}

function createFact(label, value, suffix = "") {
  const item = document.createElement("div");
  item.className = "fact-item";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  const cleanValue = formatValue(value);
  valueElement.textContent = cleanValue === "Nezjištěno" ? cleanValue : `${cleanValue}${suffix}`;

  item.append(labelElement, valueElement);
  return item;
}

function renderBuildingInfo(data) {
  state.buildingInfo = data;
  buildingCard.hidden = false;

  const address = data.address;
  const building = data.building;
  const titleParts = [address.municipalityName, address.cp ? `č.p. ${address.cp}` : null].filter(Boolean);
  const addressParts = [
    address.municipalityPartName,
    address.zip ? `PSČ ${address.zip}` : null,
    data.query ? `zadáno: ${data.query}` : null,
  ].filter(Boolean);

  buildingTitle.textContent = titleParts.join(", ") || "Údaje o domu";
  buildingAddress.textContent = addressParts.join(" · ");
  buildingCode.textContent = formatValue(building.stavebniObjektKod);
  addressCode.textContent = formatValue(address.ruianId);
  confidencePill.textContent =
    typeof address.confidence === "number" ? `${Math.round(address.confidence * 100)}% shoda` : "Adresa nalezena";

  const utilities = building.utilities || {};

  buildingFacts.replaceChildren(
    createFact("Typ objektu", building.buildingType),
    createFact("Způsob využití", building.usage),
    createFact("Dokončení stavby", building.completedAt),
    createFact("Zastavěná plocha", building.builtAreaM2, " m²"),
    createFact("Podlahová plocha", building.floorAreaM2, " m²"),
    createFact("Obestavěný prostor", building.enclosedVolumeM3, " m³"),
    createFact("Konstrukční materiál", building.constructionType),
    createFact("Počet podlaží", building.floors),
    createFact("Počet bytů", building.flats),
    createFact("Vodovod", utilities.water),
    createFact("Kanalizace", utilities.sewer),
    createFact("Plyn", utilities.gas),
    createFact("Výtah", utilities.elevator),
    createFact("Vytápění", utilities.heating),
    createFact("Kód konstrukce", building.constructionTypeCode),
  );
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

  scrollToSection(houseInfoSection);
}

function createToggle(question, value, label) {
  const button = document.createElement("button");
  button.className = "toggle-option";
  button.type = "button";
  button.textContent = label;
  button.dataset.value = value;
  button.setAttribute("aria-pressed", "false");

  button.addEventListener("click", () => {
    state.answers[question.id] = value;

    const group = button.closest(".toggle-group");
    group.querySelectorAll(".toggle-option").forEach((option) => {
      const isActive = option.dataset.value === value;
      option.classList.toggle("is-selected", isActive);
      option.setAttribute("aria-pressed", String(isActive));
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
  toggleGroup.append(createToggle(question, "yes", "Ano"));
  toggleGroup.append(createToggle(question, "no", "Ne"));

  item.append(number, text, toggleGroup);
  return item;
}

function renderQuestions() {
  questions.forEach((question, index) => {
    questionList.append(createQuestionItem(question, index));
  });
}

addressForm.addEventListener("submit", handleAddressSubmit);
scopeForm.addEventListener("submit", handleScopeSubmit);
renderScopeTiles();
renderQuestions();
