import { ApiError, type ProblemDetail } from "./simulation";
import type { BorrowerMode, PersonRole } from "../borrowerMode";

export { ApiError };

export type EligibilityRequest = {
  annualIncome: number;
  otherAnnualRepayments?: number;
  annualRatePercent: number;
  years: number;
  screeningRatePercent?: number;
  /** 省略時は SINGLE。 */
  mode?: BorrowerMode;
  /** mode が SINGLE 以外のとき必須（円）。 */
  partnerAnnualIncome?: number;
  partnerOtherAnnualRepayments?: number;
  /** JOINT_GUARANTEE のみ（0〜100、既定50）。 */
  partnerIncomeCountPercent?: number;
};

export type EligibilityScenario = {
  ratePercent: number;
  maxPrincipal: number;
  monthlyPayment: number;
};

export type EligibilityPerson = {
  role: PersonRole;
  burdenRatioLimitPercent: number;
  availableMonthlyRepayment: number;
  atScreeningRate: EligibilityScenario;
  atActualRate: EligibilityScenario;
};

export type EligibilityResponse = {
  mode?: BorrowerMode;
  /** ペアローンでは null（人ごとの値は persons）。 */
  burdenRatioLimitPercent: number | null;
  /** ペアローンのときだけ入る。 */
  persons?: EligibilityPerson[] | null;
  notes?: string[];
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
