import { ApiError, type ProblemDetail } from "./simulation";

export { ApiError };

export type EligibilityRequest = {
  annualIncome: number;
  otherAnnualRepayments?: number;
  annualRatePercent: number;
  years: number;
  screeningRatePercent?: number;
};

export type EligibilityScenario = {
  ratePercent: number;
  maxPrincipal: number;
  monthlyPayment: number;
};

export type EligibilityResponse = {
  burdenRatioLimitPercent: number;
  maxAnnualRepayment: number;
  availableAnnualRepayment: number;
  availableMonthlyRepayment: number;
  atScreeningRate: EligibilityScenario;
  atActualRate: EligibilityScenario;
};

export async function calculateEligibility(
  body: EligibilityRequest,
  signal?: AbortSignal,
): Promise<EligibilityResponse> {
  const res = await fetch("/api/v1/simulations/eligibility", {
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
  return (await res.json()) as EligibilityResponse;
}
