import { ApiError, type ProblemDetail, type RepaymentMethod } from "./simulation";

export { ApiError };

export type TotalCostRequest = {
  propertyPrice: number;
  downPayment: number;
  closingCostRatePercent?: number;
  annualRatePercent: number;
  years: number;
  method: RepaymentMethod;
  monthlyManagementFee?: number;
  monthlyRepairReserve?: number;
  annualPropertyTax?: number;
  annualInsurance?: number;
};

/**
 * 諸費用は、頭金と借入額を合わせた予算（= 物件価格 + 諸費用）の中から支払う前提。
 * 借入額 = 物件価格 + 諸費用 − 頭金。
 */
export type TotalCostInitial = {
  downPayment: number;
  /** 予算に含まれる諸費用（参考値。頭金とは別に加算しない） */
  closingCost: number;
  /** = downPayment（初期費用は頭金のみ） */
  initialCost: number;
};

export type TotalCostTotals = {
  totalLoanPayment: number;
  totalInterest: number;
  totalOwnershipCost: number;
  /** = 頭金 + totalLoanPayment + totalOwnershipCost */
  grandTotal: number;
  monthlyAverage: number;
  firstMonthLoanPayment: number;
};

export type TotalCostYear = {
  year: number;
  loanPayment: number;
  interestPaid: number;
  principalPaid: number;
  yearEndBalance: number;
  ownershipCost: number;
  yearTotal: number;
  /** 頭金から始まる累計 */
  cumulativeOutlay: number;
};

export type TotalCostResponse = {
  initial: TotalCostInitial;
  loanPrincipal: number;
  totals: TotalCostTotals;
  years: TotalCostYear[];
  /** Codes such as OWNERSHIP_COST_CONSTANT, CLOSING_COSTS_FINANCED_FROM_BUDGET, NO_RESALE_VALUE, COSTS_AFTER_LOAN_TERM_EXCLUDED, TAX_DEDUCTION_NOT_INCLUDED. */
  notes: string[];
};

export async function calculateTotalCost(
  body: TotalCostRequest,
  signal?: AbortSignal,
): Promise<TotalCostResponse> {
  const res = await fetch("/api/v1/simulations/total-cost", {
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
  return (await res.json()) as TotalCostResponse;
}
