export type RepaymentMethod = "EQUAL_PAYMENT" | "EQUAL_PRINCIPAL";

export type RepaymentRequest = {
  principal: number;
  annualRatePercent: number;
  years: number;
  method: RepaymentMethod;
  bonusAmount?: number;
};

export type ScheduleRow = {
  month: number;
  payment: number;
  bonusPayment: number;
  principal: number;
  interest: number;
  balance: number;
};

export type RepaymentResponse = {
  monthlyPayment: number;
  bonusPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: ScheduleRow[];
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
