import type { RepaymentRequest, RepaymentMethod, ScheduleRow } from "./api/simulation";

export type FormValues = {
  principalMan: string;
  rate: string;
  years: string;
  method: RepaymentMethod;
  useBonus: boolean;
  bonusMan: string;
};

export type FormErrors = Partial<Record<"principalMan" | "rate" | "years" | "bonusMan", string>>;

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const toYen = (man: number) => Math.round(man * 10000);

export function validate(v: FormValues): { request: RepaymentRequest | null; errors: FormErrors } {
  const errors: FormErrors = {};
  const man = num(v.principalMan);
  const principal = toYen(man);
  if (!Number.isFinite(man)) errors.principalMan = "借入金額を入力してください。";
  else if (principal < 1 || principal > 1_000_000_000)
    errors.principalMan = "借入金額は10億円以下で、1円以上になるよう入力してください。";

  const rate = num(v.rate);
  if (!Number.isFinite(rate)) errors.rate = "金利を入力してください。";
  else if (rate < 0 || rate > 20) errors.rate = "金利は0%以上20%以下で入力してください。";

  const years = num(v.years);
  if (!Number.isFinite(years)) errors.years = "返済期間を入力してください。";
  else if (!Number.isInteger(years) || years < 1 || years > 50)
    errors.years = "返済期間は1〜50年の整数で入力してください。";

  let bonus = 0;
  if (v.useBonus) {
    const b = num(v.bonusMan);
    if (!Number.isFinite(b)) errors.bonusMan = "ボーナス返済分の借入額を入力してください。";
    else {
      bonus = toYen(b);
      if (b < 0) errors.bonusMan = "0円以上で入力してください。";
      else if (!errors.principalMan && bonus > principal)
        errors.bonusMan = "ボーナス返済分は借入金額以下にしてください。";
    }
  }
  if (Object.keys(errors).length > 0) return { request: null, errors };
  const request: RepaymentRequest = {
    principal,
    annualRatePercent: rate,
    years,
    method: v.method,
  };
  if (v.useBonus) request.bonusAmount = bonus;
  return { request, errors };
}

export type YearRow = {
  year: number;
  payment: number;
  bonusPayment: number;
  principal: number;
  interest: number;
  balance: number;
};

export function aggregateByYear(rows: ScheduleRow[]): YearRow[] {
  const map = new Map<number, YearRow>();
  for (const r of rows) {
    const year = Math.ceil(r.month / 12);
    const y = map.get(year) ?? { year, payment: 0, bonusPayment: 0, principal: 0, interest: 0, balance: 0 };
    y.payment += r.payment;
    y.bonusPayment += r.bonusPayment;
    y.principal += r.principal;
    y.interest += r.interest;
    y.balance = r.balance;
    map.set(year, y);
  }
  return [...map.values()];
}

export const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

type Q = string | string[] | undefined;

/** Initial form values from URL query (rate %, principal 万円, years). Invalid values are ignored. */
export function initialFromQuery(q: { rate?: Q; principal?: Q; years?: Q }): Partial<FormValues> {
  const out: Partial<FormValues> = {};
  const dec = (v: Q) => (typeof v === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(v) ? v : null);
  const rate = dec(q.rate);
  if (rate !== null && Number(rate) <= 20) out.rate = rate;
  const principal = dec(q.principal);
  if (principal !== null && Number(principal) >= 1 && Number(principal) <= 100000) out.principalMan = principal;
  const years = typeof q.years === "string" && /^\d{1,2}$/.test(q.years) ? Number(q.years) : null;
  if (years !== null && years >= 1 && years <= 50) out.years = String(years);
  return out;
}
