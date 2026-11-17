import { ApiError, type ProblemDetail, type RepaymentMethod } from "./simulation";

export { ApiError };

export type HousingType = "NEW" | "USED" | "RESALE";
export type EnergyClass = "CERTIFIED" | "ZEH" | "ENERGY_STANDARD" | "OTHER";

export type TaxDeductionRequest = {
  housingType: HousingType;
  energyClass: EnergyClass;
  moveInYear: number;
  moveInMonth: number;
  childcareHousehold?: boolean;
  floorAreaOver50?: boolean;
  legacyException?: boolean;
  principal: number;
  annualRatePercent: number;
  years: number;
  method: RepaymentMethod;
  annualIncome: number;
  socialInsuranceRatePercent?: number;
};

export type TaxDeductionRule = {
  limitAmount: number;
  deductionYears: number;
  ratePercent: number;
  childcareApplied: boolean;
  conditionCode: string;
  sourceUrl: string;
  verifiedOn: string;
};

export type TaxDeductionYear = {
  year: number;
  ordinal: number;
  annualPayment: number;
  yearEndBalance: number;
  deductionBase: number;
  deductionCap: number;
  incomeTaxBefore: number;
  incomeTaxAfter: number;
  residentTaxEstimate: number;
  incomeTaxCredit: number;
  residentTaxCredit: number;
  totalDeduction: number;
  unclaimed: number;
};

export type TaxDeductionTotals = {
  totalDeduction: number;
  totalUnclaimed: number;
  totalPayment: number;
  netCost: number;
  listedYears: number;
};

export type TaxDeductionAssumptions = {
  annualIncome: number;
  socialInsuranceRatePercent: number;
  estimatedTotalIncome: number;
  estimatedIncomeTaxBase: number;
  residentCapPerYear: number;
  taxParameterVerifiedOn: string;
  taxParameterSources: string[];
  notes: string[];
};

export type TaxDeductionResponse = {
  eligible: boolean;
  ineligibleReason: string | null;
  rule: TaxDeductionRule | null;
  years: TaxDeductionYear[];
  totals: TaxDeductionTotals | null;
  assumptions: TaxDeductionAssumptions | null;
};

export async function calculateTaxDeduction(
  body: TaxDeductionRequest,
  signal?: AbortSignal,
): Promise<TaxDeductionResponse> {
  const res = await fetch("/api/v1/simulations/tax-deduction", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const p = (await res.json()) as ProblemDetail;
      detail = p.detail ?? p.title ?? "";
    } catch {
      /* ignore non-JSON body */
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as TaxDeductionResponse;
}
