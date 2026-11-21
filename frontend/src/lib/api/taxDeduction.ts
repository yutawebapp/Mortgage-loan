import { ApiError, type ProblemDetail, type RepaymentMethod } from "./simulation";
import type { BorrowerMode, PersonRole } from "../borrowerMode";

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
  /** 省略時は SINGLE。 */
  mode?: BorrowerMode;
  /** PAIR_LOAN / JOINT_DEBT のとき必須（円）。 */
  partnerAnnualIncome?: number;
  /** PAIR_LOAN / JOINT_DEBT のみ（0〜30）。 */
  partnerSocialInsuranceRatePercent?: number;
  /** PAIR_LOAN / JOINT_DEBT のみ。あなたの負担割合（1〜99、既定50）。 */
  shareAPercent?: number;
  /** PAIR_LOAN / JOINT_DEBT のみ（既定 false）。 */
  partnerChildcareHousehold?: boolean;
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

export type TaxDeductionPerson = {
  role: PersonRole;
  principal: number;
  limitAmount: number | null;
  eligible: boolean;
  ineligibleReason: string | null;
  years: TaxDeductionYear[];
  totals: TaxDeductionTotals | null;
};

export type TaxDeductionResponse = {
  mode?: BorrowerMode;
  /** PAIR_LOAN / JOINT_DEBT のときだけ入る。上位の years / totals は対象者の合計。 */
  persons?: TaxDeductionPerson[] | null;
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
