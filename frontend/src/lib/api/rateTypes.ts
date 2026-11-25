import { ApiError, type ProblemDetail, type RepaymentMethod } from "./simulation";

export { ApiError };

export type RateTypeCode = "VARIABLE_FLAT" | "VARIABLE_RISE" | "FIXED_PERIOD" | "FULL_FIXED";

export type RateTypesRequest = {
  /** 借入金額（円、1〜1,000,000,000） */
  principal: number;
  /** 返済期間（年、2〜50） */
  years: number;
  method: RepaymentMethod;
  /** 変動金利（年率 %、0〜20） */
  variableRatePercent: number;
  /** 変動金利が上昇するまでの年数（1〜years−1） */
  variableRiseAfterYears: number;
  /** 上昇幅（%ポイント、0 < x <= 10。変動金利 + 上昇幅 <= 20） */
  variableRisePoints: number;
  /** 固定期間（年、1〜years−1） */
  fixedPeriodYears: number;
  fixedPeriodRatePercent: number;
  fixedPeriodAfterRatePercent: number;
  fullFixedRatePercent: number;
};

export type RateTypeCase = {
  type: RateTypeCode;
  rateFirstPercent: number;
  rateAfterPercent: number | null;
  switchAfterYears: number | null;
  firstMonthlyPayment: number;
  monthlyPaymentBeforeSwitch: number | null;
  monthlyPaymentAfterSwitch: number | null;
  totalPayment: number;
  totalInterest: number;
  /** 全期間固定の総返済額との差（全期間固定自身は 0） */
  totalPaymentDiffFromFullFixed: number;
  /** 年ごとの返済額（長さ years） */
  yearlyPayments: number[];
};

export type RateTypesResponse = {
  /** 常に4件。VARIABLE_FLAT, VARIABLE_RISE, FIXED_PERIOD, FULL_FIXED の順 */
  cases: RateTypeCase[];
  notes: string[];
};

export async function calculateRateTypes(body: RateTypesRequest, signal?: AbortSignal): Promise<RateTypesResponse> {
  const res = await fetch("/api/v1/simulations/rate-types", {
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
  return (await res.json()) as RateTypesResponse;
}
