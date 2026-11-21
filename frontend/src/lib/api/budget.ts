import { ApiError, type ProblemDetail } from "./simulation";

export { ApiError };

export type BudgetRequest = {
  downPayment?: number;
  desiredMonthlyPayment: number;
  annualRatePercent: number;
  years: number;
  closingCostRatePercent?: number;
  annualIncome?: number;
};

export type BudgetResponse = {
  maxPropertyPrice: number;
  maxLoanAmount: number;
  downPayment: number;
  totalBudget: number;
  closingCosts: number;
  closingCostRatePercent: number;
  monthlyPayment: number;
  loanExceedsPrice: boolean;
  burdenRatioPercent: number | null;
};

export async function calculateBudget(body: BudgetRequest, signal?: AbortSignal): Promise<BudgetResponse> {
  const res = await fetch("/api/v1/simulations/budget", {
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
  return (await res.json()) as BudgetResponse;
}
