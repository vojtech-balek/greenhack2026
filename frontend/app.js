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
  answers: Object.fromEntries(questions.map((question) => [question.id, null])),
};

const addressForm = document.querySelector("#addressForm");
const addressInput = document.querySelector("#addressInput");
const basicInfoSection = document.querySelector("#basicInfo");
const questionList = document.querySelector("#questionList");

function scrollToBasicInfo() {
  basicInfoSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  window.setTimeout(() => {
    basicInfoSection.focus({ preventScroll: true });
  }, 720);
}

function handleAddressSubmit(event) {
  event.preventDefault();
  state.address = addressInput.value.trim();
  scrollToBasicInfo();
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
renderQuestions();
