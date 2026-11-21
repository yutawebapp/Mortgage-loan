import { ApiError, type ProblemDetail, type RepaymentMethod } from "./simulation";

export { ApiError };

export type RateScenarioRequest = {
  principal: number;
  annualRatePercent: number;
  years: number;
  method: RepaymentMethod;
  /** 金利が上昇するまでの年数（1〜years−1） */
  riseAfterYears: number;
  /** 上昇幅（%ポイント）。1〜5件、各 0 < x <= 10、当初金利 + x <= 20 */
  risePoints?: number[];
};

export type RateScenarioResult = {
  risePoints: number;
  rateAfterPercent: number;
  monthlyPaymentBefore: number;
  monthlyPaymentAfter: number;
  /** 切替直前から直後の変化。元金均等では負になることがある */
  monthlyPaymentIncrease: number;
  /** 切替直後の同じ月の据え置きとの差 */
  monthlyPaymentDifferenceVsBaseline: number;
  totalPayment: number;
  totalInterest: number;
  extraInterestVsBaseline: number;
  /** 長さ years*12 */
  monthlyPayments: number[];
};

export type RateScenarioResponse = {
  baseline: RateScenarioResult;
  scenarios: RateScenarioResult[];
};

export async function calculateRateScenarios(
  body: RateScenarioRequest,
  signal?: AbortSignal,
): Promise<RateScenarioResponse> {
  const res = await fetch("/api/v1/simulations/rate-scenarios", {
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
  return (await res.json()) as RateScenarioResponse;
}
