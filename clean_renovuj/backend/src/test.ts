import { getCalculationMetrics, CalculateRequestSchema } from "./index";
import { getPropertyByAddress, getPersonas } from "./db";
import { calculateUrgencyCurve } from "./calculator";
import { getServerConfig } from "./config";

console.log("==================================================");
console.log("RUNNING RENOVUJ BACKEND VERIFICATION SUITE...");
console.log("==================================================");

let failedTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedTests++;
  }
}

// ----------------------------------------------------
// Test 1: Configuration Management
// ----------------------------------------------------
try {
  const config = getServerConfig();
  assert(
    config.nodeEnv !== undefined && typeof config.jwtSecret === "string" && config.jwtSecret.length > 0,
    "Server configuration loads securely with fallback secrets."
  );
} catch (err: any) {
  console.error("[FAIL] Configuration failed to load:", err.message);
  failedTests++;
}

// ----------------------------------------------------
// Test 2: Cadastral Mock DB Retrieval
// ----------------------------------------------------
const testAddress = "Vinohradská 56, Praha 2";
const prop = getPropertyByAddress(testAddress);
assert(
  prop.address === testAddress && prop.flats === "18 residential units",
  "mock db correctly retrieves properties by address and returns 18 flats for Vinohrady."
);

// ----------------------------------------------------
// Test 3: Urgency Integral Calculus Calculation
// ----------------------------------------------------
const urgencyParams = {
  baseUtilityWastePerYear: 38000,
  utilityGrowthRate: 0.04,
  baseRenovationCost: 1250000,
  materialInflationRate: 0.03,
  horizonYears: 8,
  pointsPerYear: 12,
};
const points = calculateUrgencyCurve(urgencyParams);
assert(
  points.length === 8 * 12 + 1,
  `urgency curve returns correct number of resolution points (${points.length} points generated).`
);

// Check starting point (t = 0)
const pStart = points[0];
assert(
  pStart.t === 0 && pStart.utilities === 0 && pStart.materials === 0 && pStart.sum === 0,
  "At t=0, cumulative waste and material inflation is 0 CZK."
);

// Check intermediate point calculations (e.g. t = 1)
const p1 = points[12]; // index 12 represents t = 1 year
// Analytical check for utilities at t=1: 38000 * (1.04 - 1)/ln(1.04) = 38000 * 0.04 / 0.0392207 = 38755 CZK
// Analytical check for materials at t=1: 1250000 * (1.03 - 1) = 37500 CZK
// Total sum = 38755 + 37500 = 76255 CZK
assert(
  Math.abs(p1.utilities - 38755) <= 2 && Math.abs(p1.materials - 37500) <= 2,
  `Analytical math integration check: utilities waste (${p1.utilities} vs 38755) and material inflation (${p1.materials} vs 37500) at t=1 are correct.`
);

// ----------------------------------------------------
// Test 4: Financial Metrics Scaling & Splits
// ----------------------------------------------------
const payload = {
  address: "Vinohradská 56, Praha 2",
  selectedGoals: ["insulation", "ventilation"],
};
const result = getCalculationMetrics(payload);

// Assert project values
assert(
  result.financials.totalProjectCost === 14280000,
  "financial calculator sets base project cost correctly for an 18-flat building."
);
assert(
  result.financials.monthly.loanRepayment === 2500,
  "monthly straight-line amortization is 2,500 CZK."
);
assert(
  result.financials.monthly.net === -50,
  "net monthly cost correctly computes to -50 CZK/flat."
);
assert(
  result.financials.financingMix[0].amount === 13500000,
  "NZÚ blended financing portion accurately calculates to 13.5M CZK (95% share)."
);

// ----------------------------------------------------
// Test 5: Input Schema Validation (Zod Validation)
// ----------------------------------------------------
try {
  CalculateRequestSchema.parse({
    address: "",
    selectedGoals: [],
  });
  console.error("[FAIL] Zod schema allowed an invalid payload through!");
  failedTests++;
} catch (e: any) {
  assert(
    true,
    "Zod schema successfully blocks invalid requests (missing address and goals)."
  );
}

// ----------------------------------------------------
// Final Summary
// ----------------------------------------------------
console.log("==================================================");
console.log(`TEST EXECUTION COMPLETED: Passed ${passedTests}, Failed ${failedTests}`);
console.log("==================================================");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
