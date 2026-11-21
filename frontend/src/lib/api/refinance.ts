import { ApiError, type ProblemDetail, type RepaymentMethod } from "./simulation";

export { ApiError };

export type RefinanceRequest = {
  remainingBalance: number;
  currentAnnualRatePercent: number;
  remainingYears: number;
  newAnnualRatePercent: number;
  newYears: number;
  method: RepaymentMethod;
  refinanceCosts?: number;
};

export type LoanSummary = {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
};

export type CumulativeSavingPoint = { month: number; net: number };

export type RefinanceResponse = {
  current: LoanSummary;
  refinanced: LoanSummary;
  refinanceCosts: number;
  monthlySaving: number;
  totalSaving: number;
  breakEvenMonth: number | null;
  cumulativeSaving: CumulativeSavingPoint[];
};

export async function calculateRefinance(
  body: RefinanceRequest,
  signal?: AbortSignal,
): Promise<RefinanceResponse> {
  const res = await fetch("/api/v1/simulations/refinance", {
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
  return (await res.json()) as RefinanceResponse;
}
