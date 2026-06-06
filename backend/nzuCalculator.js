export const ENERGY_COST_BASELINE = 450;
export const CAPEX_INFLATION_RATE = 0.05;
export const ENERGY_INFLATION_RATE = 0.04;
export const STATE_LOAN_TERM_YEARS = 25;
export const COMMERCIAL_INTEREST_RATE = 0.06;

const MAX_TOTAL_SAVINGS_RATE = 0.85;
const WAIT_YEARS = 5;
const MONTHS_PER_YEAR = 12;

const RENOVATION_GOALS = {
  INSULATION: {
    cost: ({ floorArea }) => floorArea * 5000,
    savingsRate: 0.4,
  },
  HEAT_SOURCE: {
    cost: ({ floorArea }) => floorArea * 1500,
    savingsRate: 0.3,
  },
  VENTILATION: {
    cost: ({ floorArea }) => floorArea * 2000,
    savingsRate: 0.15,
  },
  GREEN_ROOF: {
    cost: ({ footprintArea }) => footprintArea * 2500,
    savingsRate: 0.05,
  },
  PHOTOVOLTAICS: {
    cost: ({ numberOfFlats }) => 400000 + numberOfFlats * 40000,
    savingsRate: 0.2,
  },
};

function assertFiniteNumber(value, fieldName) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number.`);
  }
}

function validateInputs(input) {
  assertFiniteNumber(input.floorArea, "floorArea");
  assertFiniteNumber(input.footprintArea, "footprintArea");
  assertFiniteNumber(input.numberOfFlats, "numberOfFlats");
  assertFiniteNumber(input.vulnerableFlats, "vulnerableFlats");

  if (input.floorArea < 0 || input.footprintArea < 0 || input.numberOfFlats <= 0 || input.vulnerableFlats < 0) {
    throw new RangeError("Areas must be non-negative, numberOfFlats must be positive, vulnerableFlats non-negative.");
  }

  if (input.vulnerableFlats > input.numberOfFlats) {
    throw new RangeError("vulnerableFlats cannot exceed numberOfFlats.");
  }

  if (!Array.isArray(input.selectedGoals)) {
    throw new TypeError("selectedGoals must be an array.");
  }

  input.selectedGoals.forEach((goal) => {
    if (!RENOVATION_GOALS[goal]) {
      throw new RangeError(`Unknown renovation goal: ${goal}`);
    }
  });
}

function calculateTotalCommercialInterest(principal) {
  if (principal === 0) {
    return 0;
  }

  const monthlyInterestRate = COMMERCIAL_INTEREST_RATE / MONTHS_PER_YEAR;
  const numberOfPayments = STATE_LOAN_TERM_YEARS * MONTHS_PER_YEAR;
  const compoundFactor = (1 + monthlyInterestRate) ** numberOfPayments;
  const monthlyPayment =
    principal * ((monthlyInterestRate * compoundFactor) / (compoundFactor - 1));

  return monthlyPayment * numberOfPayments - principal;
}

export function calculateNzuRenovation(input) {
  validateInputs(input);

  const selectedGoalConfigs = input.selectedGoals.map((goal) => RENOVATION_GOALS[goal]);

  const grossCapEx = selectedGoalConfigs.reduce((sum, goal) => sum + goal.cost(input), 0);

  const vulnerableRatio = input.vulnerableFlats / input.numberOfFlats;
  const directSubsidyVulnerable = grossCapEx * vulnerableRatio;
  const netStateLoanAmount = grossCapEx - directSubsidyVulnerable;
  const monthlyStateLoanPayment = netStateLoanAmount / (STATE_LOAN_TERM_YEARS * MONTHS_PER_YEAR);

  const currentAnnualEnergyCost = input.floorArea * ENERGY_COST_BASELINE;
  const totalSavingsRate = Math.min(
    selectedGoalConfigs.reduce((sum, goal) => sum + goal.savingsRate, 0),
    MAX_TOTAL_SAVINGS_RATE,
  );
  const estimatedYearlySavings = currentAnnualEnergyCost * totalSavingsRate;

  const inflatedCapEx = grossCapEx * (1 + CAPEX_INFLATION_RATE) ** WAIT_YEARS;
  const penaltyCapexInflation = inflatedCapEx - grossCapEx;
  const penaltyLostSavings = Array.from({ length: WAIT_YEARS }).reduce(
    (sum, _, yearIndex) => sum + estimatedYearlySavings * (1 + ENERGY_INFLATION_RATE) ** yearIndex,
    0,
  );
  const penaltyLostZeroInterest = calculateTotalCommercialInterest(inflatedCapEx);
  const totalWaitPenalty = penaltyCapexInflation + penaltyLostSavings + penaltyLostZeroInterest;

  return {
    grossCapEx: Math.round(grossCapEx),
    directSubsidyVulnerable: Math.round(directSubsidyVulnerable),
    netStateLoanAmount: Math.round(netStateLoanAmount),
    monthlyStateLoanPayment: Math.round(monthlyStateLoanPayment),
    estimatedYearlySavings: Math.round(estimatedYearlySavings),
    penaltyLostSavings: Math.round(penaltyLostSavings),
    penaltyCapexInflation: Math.round(penaltyCapexInflation),
    penaltyLostZeroInterest: Math.round(penaltyLostZeroInterest),
    totalWaitPenalty: Math.round(totalWaitPenalty),
  };
}
