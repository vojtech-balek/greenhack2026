import { z } from "zod";
import { getPropertyByAddress } from "./db";
import { calculateFinancials, calculateUrgencyCurve } from "./calculator";

export * from "./types";
export * from "./config";
export * from "./db";
export * from "./calculator";

/**
 * Validation schema for calculation requests.
 * Treat all input parameters as untrusted.
 */
export const CalculateRequestSchema = z.object({
  address: z.string().min(1, "Address is required"),
  selectedGoals: z.array(z.string()).min(1, "At least one goal must be selected"),
  answers: z.record(z.string(), z.string()).default({}),
});

export type CalculateRequest = z.infer<typeof CalculateRequestSchema>;

/**
 * High-level orchestration endpoint that validates client input,
 * fetches corresponding cadastral metadata, and performs financial
 * and cost-of-waiting calculations.
 */
export function getCalculationMetrics(payload: unknown) {
  // 1. Validate incoming payload against strict schema constraints
  const validated = CalculateRequestSchema.parse(payload);

  // 2. Query property details from cadastral metadata registry
  const property = getPropertyByAddress(validated.address);

  // 3. Perform financial feasibility analysis
  const financials = calculateFinancials(property, validated.selectedGoals);

  // 4. Compute cost of waiting curves over an 8-year horizon
  // Hardcoded baselines match the Prague Vinohrady brick tenement baseline metrics
  const urgencyParams = {
    baseUtilityWastePerYear: 38000,
    utilityGrowthRate: 0.04,
    baseRenovationCost: 1250000,
    materialInflationRate: 0.03,
    horizonYears: 8,
    pointsPerYear: 12,
  };
  const urgencyData = calculateUrgencyCurve(urgencyParams);

  return {
    property,
    financials,
    urgencyData,
  };
}
