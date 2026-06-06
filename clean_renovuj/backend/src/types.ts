export type GoalId =
  | "insulation"
  | "ventilation"
  | "green-roof"
  | "rainwater"
  | "wastewater-heat"
  | "hot-water"
  | "heat-source"
  | "photovoltaic";

export interface Goal {
  id: GoalId;
  label: string;
}

export interface Property {
  address: string;
  yearBuilt: string;
  buildingType: string;
  foundation: string;
  loadBearing: string;
  roof: string;
  floors: string;
  flats: string;
  commercialUnits: string;
  heating: string;
  hotWater: string;
  windows: string;
  facade: string;
  lastRenovation: string;
  energyClass: string;
  cadastralId: string;
  protectedZone: string;
}

export type QuestionType = "single" | "multi" | "yesno";

export interface Question {
  id: string;
  label: string;
  triggers: string[];
  type: QuestionType;
  options?: string[];
}

export interface MonthlyBreakdown {
  loanRepayment: number;
  energySavings: number;
  net: number;
  note: string;
}

export interface FinancingSource {
  label: string;
  pct: number;
  amount: number;
  color: string;
  group: "nzu" | "other";
}

export interface Financials {
  totalProjectCost: number;
  outOfPocket: number;
  outOfPocketUnit: string;
  outOfPocketNote: string;
  valueUplift: number;
  valueBefore: number;
  valueAfter: number;
  monthly: MonthlyBreakdown;
  financingMix: FinancingSource[];
}

export interface UrgencyParams {
  baseUtilityWastePerYear: number;
  utilityGrowthRate: number;
  baseRenovationCost: number;
  materialInflationRate: number;
  horizonYears: number;
  pointsPerYear: number;
}

export interface UrgencyPoint {
  t: number;
  utilities: number;
  materials: number;
  sum: number;
}

export interface Persona {
  id: string;
  type: string;
  adjectives: string[];
  fear: string;
  description: string;
  color: string;
}

export interface Neighbour {
  address: string;
  contact: string;
  coords: [number, number];
  manager: string;
  color: string;
}

export interface CalculationResult {
  financials: Financials;
  urgencyData: UrgencyPoint[];
}
