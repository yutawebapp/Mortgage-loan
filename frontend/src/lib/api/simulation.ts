export type RepaymentMethod = "EQUAL_PAYMENT" | "EQUAL_PRINCIPAL";

export type RepaymentRequest = {
  principal: number;
  annualRatePercent: number;
  years: number;
  method: RepaymentMethod;
  bonusAmount?: number;
  /** 二人で借りる場合の本人の負担割合（%、1〜99）。未指定なら一人の計算。 */
  selfSharePercent?: number;
};

export type ScheduleRow = {
  month: number;
  payment: number;
  bonusPayment: number;
  principal: number;
  interest: number;
  balance: number;
};

export type PairPerson = {
  principal: number;
  bonusAmount: number;
  monthlyPayment: number;
  bonusPayment: number;
  totalPayment: number;
  totalInterest: number;
};

export type PairBreakdown = {
  self: PairPerson;
  partner: PairPerson;
  /** 注記のコード（例：PAIR_SHARE_PROVISIONAL）。 */
  notes: string[];
};

export type RepaymentResponse = {
  monthlyPayment: number;
  bonusPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: ScheduleRow[];
  /** selfSharePercent を指定したときだけ値が入る。 */
  pairBreakdown?: PairBreakdown | null;
};

export type ProblemDetail = {
  title?: string;
  detail?: string;
  status?: number;
  errors?: unknown;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function calculateRepayment(
  body: RepaymentRequest,
  signal?: AbortSignal,
): Promise<RepaymentResponse> {
  const res = await fetch("/api/v1/simulations/repayment", {
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
  return (await res.json()) as RepaymentResponse;
}
