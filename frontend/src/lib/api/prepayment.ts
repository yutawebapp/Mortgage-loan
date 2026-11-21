import { ApiError, type ProblemDetail, type RepaymentMethod } from "./simulation";

export { ApiError };

export type PrepaymentType = "SHORTEN_TERM" | "REDUCE_PAYMENT";

export type PrepaymentRequest = {
  principal: number;
  annualRatePercent: number;
  years: number;
  method: RepaymentMethod;
  /** 繰上げ返済を行う返済回（この回の支払い直後）。1〜years*12−1 */
  prepaymentAfterMonth: number;
  prepaymentAmount: number;
  prepaymentType: PrepaymentType;
};

export type PrepaymentBaseline = {
  months: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
};

export type PrepaymentAfter = {
  months: number;
  monthlyPaymentBefore: number;
  monthlyPaymentAfter: number;
  /** 繰上げ返済額そのものは含まない */
  totalPayment: number;
  totalInterest: number;
};

export type PrepaymentScheduleRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  prepayment: number;
  balance: number;
};

export type PrepaymentResponse = {
  appliedPrepayment: number;
  baseline: PrepaymentBaseline;
  afterPrepayment: PrepaymentAfter;
  interestSaving: number;
  monthsShortened: number;
  /** 繰上げ後のスケジュールのみ */
  schedule: PrepaymentScheduleRow[];
};

export async function calculatePrepayment(
  body: PrepaymentRequest,
  signal?: AbortSignal,
): Promise<PrepaymentResponse> {
  const res = await fetch("/api/v1/simulations/prepayment", {
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
  return (await res.json()) as PrepaymentResponse;
}
