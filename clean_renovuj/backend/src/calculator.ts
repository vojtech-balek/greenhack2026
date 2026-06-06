import { Financials, UrgencyParams, UrgencyPoint, Property } from "./types";

/**
 * Calculates the Urgency Curve (cost of waiting) over a time horizon.
 * Integrates the compound utility waste and construction inflation.
 */
export function calculateUrgencyCurve(params: UrgencyParams): UrgencyPoint[] {
  const {
    baseUtilityWastePerYear,
    utilityGrowthRate,
    baseRenovationCost,
    materialInflationRate,
    horizonYears,
    pointsPerYear,
  } = params;

  const totalPoints = horizonYears * pointsPerYear;
  const dataPoints: UrgencyPoint[] = [];

  for (let i = 0; i <= totalPoints; i++) {
    const t = i / pointsPerYear;

    // 1. Cumulative utilities wasted (Integral of base * (1 + rate)^t)
    // If rate is 0, integration resolves to: base * t
    let utilities = 0;
    if (utilityGrowthRate === 0) {
      utilities = baseUtilityWastePerYear * t;
    } else {
      utilities =
        (baseUtilityWastePerYear * (Math.pow(1 + utilityGrowthRate, t) - 1)) /
        Math.log(1 + utilityGrowthRate);
    }

    // 2. Material & labor inflation (Discrete compounded extra cost)
    const materials = baseRenovationCost * (Math.pow(1 + materialInflationRate, t) - 1);

    const sum = utilities + materials;

    dataPoints.push({
      t,
      utilities: Math.round(utilities),
      materials: Math.round(materials),
      sum: Math.round(sum),
    });
  }

  return dataPoints;
}

/**
 * Computes financial metrics (valuation, splits, and flat-level cash flow).
 */
export function calculateFinancials(property: Property, selectedGoals: string[]): Financials {
  // Parse flat count from property record (e.g. "18 residential units" -> 18)
  const flatsMatch = property.flats.match(/\d+/);
  const flatsCount = flatsMatch ? parseInt(flatsMatch[0], 10) : 18;
  
  // Calculate average sizes and prices
  const averageFlatSize = 80; // m2
  const averagePricePerM2 = 180000; // CZK
  
  const valueBefore = flatsCount * averageFlatSize * averagePricePerM2;
  const valueUpliftPercent = 11; // 11% market value increase
  const valueAfter = valueBefore * (1 + valueUpliftPercent / 100);

  // Scaled renovation costs
  // Base project cost is 14.28M CZK for an 18-flat building
  const scaleFactor = flatsCount / 18;
  const totalProjectCost = Math.round(14280000 * scaleFactor);

  // NZÚ 2026+ covers up to 750,000 CZK per flat
  const nzuMaxLimit = flatsCount * 750000;
  const nzuAmount = Math.min(totalProjectCost, nzuMaxLimit);
  const commercialAmount = Math.max(0, totalProjectCost - nzuAmount);

  // Financing mix percentages
  const nzuPct = Math.round((nzuAmount / totalProjectCost) * 100);
  const otherPct = 100 - nzuPct;

  // Monthly breakdown per flat (straight-line 25-year interest-free loan)
  const loanRepaymentPerFlat = Math.round(750000 / 25 / 12); // 2500 CZK
  const energySavingsPerFlat = 2450; // CZK
  const netPerFlat = energySavingsPerFlat - loanRepaymentPerFlat; // -50 CZK (break-even)

  const financingMix = [
    {
      label: "Nová zelená úsporám 2026+ — interest-free loan (up to 25 yr)",
      pct: nzuPct,
      amount: nzuAmount,
      color: "hsl(150 55% 42%)",
      group: "nzu" as const,
    },
    {
      label: "Commercial top-up (combinable with NZÚ)",
      pct: otherPct,
      amount: commercialAmount,
      color: "hsl(32 85% 55%)",
      group: "other" as const,
    },
  ];

  return {
    totalProjectCost,
    outOfPocket: 0,
    outOfPocketUnit: `CZK upfront (0 CZK / flat)`,
    outOfPocketNote: `The NZÚ 2026+ interest-free loan (up to 750 000 CZK / flat, capped per measure by SFŽP) plus a small commercial top-up cover the full ${new Intl.NumberFormat("cs-CZ").format(totalProjectCost)} CZK envelope. Nothing comes out of your pocket on day one.`,
    valueUplift: valueUpliftPercent,
    valueBefore,
    valueAfter,
    monthly: {
      loanRepayment: loanRepaymentPerFlat,
      energySavings: energySavingsPerFlat,
      net: netPerFlat,
      note: "Per flat. Numbers are an illustrative model — actual splátka and savings depend on the chosen bank, drawdown profile and as-built energy performance.",
    },
    financingMix,
  };
}
