import { parseNumericInput as num } from "./numericInput";
import type { PrepaymentRequest, PrepaymentType } from "./api/prepayment";
import type { RepaymentMethod } from "./api/simulation";

export type PrepaymentForm = {
  principalMan: string;
  rate: string;
  years: string;
  method: RepaymentMethod;
  /** 繰上げ時期：返済開始から◯年 */
  afterYears: string;
  /** 繰上げ時期：◯か月（年と合わせた合計が返済開始からの月数） */
  afterMonths: string;
  prepayMan: string;
  type: PrepaymentType;
};

export type PrepaymentErrors = Partial<
  Record<"principalMan" | "rate" | "years" | "afterYears" | "afterMonths" | "prepayMan", string>
>;

const toYen = (man: number) => Math.round(man * 10000);

/** 返済開始から◯年◯か月後 → 月数。 */
export function toPrepaymentMonth(years: number, months: number): number {
  return years * 12 + months;
}

export function validatePrepayment(v: PrepaymentForm): {
  request: PrepaymentRequest | null;
  errors: PrepaymentErrors;
} {
  const errors: PrepaymentErrors = {};

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

  const ay = num(v.afterYears);
  if (!Number.isFinite(ay)) errors.afterYears = "繰上げ返済をする時期（年）を入力してください（なければ0）。";
  else if (!Number.isInteger(ay) || ay < 0 || ay > 49)
    errors.afterYears = "年は0〜49の整数で入力してください。";

  const am = num(v.afterMonths);
  if (!Number.isFinite(am)) errors.afterMonths = "繰上げ返済をする時期（か月）を入力してください（なければ0）。";
  else if (!Number.isInteger(am) || am < 0 || am > 11)
    errors.afterMonths = "か月は0〜11の整数で入力してください。";

  // Cross-field: 1 <= month <= years*12 − 1 (only when each part is itself valid).
  if (!errors.afterYears && !errors.afterMonths && !errors.years) {
    const month = toPrepaymentMonth(ay, am);
    const last = years * 12 - 1;
    if (month < 1) errors.afterMonths = "繰上げ返済の時期は、返済開始から1か月以上後にしてください。";
    else if (month > last)
      errors.afterMonths = `繰上げ返済の時期は、返済期間内（返済開始から${monthSpanLabel(last)}後まで）で入力してください。`;
  }

  const pm = num(v.prepayMan);
  const prepay = toYen(pm);
  if (!Number.isFinite(pm)) errors.prepayMan = "繰上げ返済額を入力してください。";
  else if (prepay < 1 || prepay > 1_000_000_000)
    errors.prepayMan = "繰上げ返済額は10億円以下で、1円以上になるよう入力してください。";

  if (Object.keys(errors).length > 0) return { request: null, errors };
  return {
    request: {
      principal,
      annualRatePercent: rate,
      years,
      method: v.method,
      prepaymentAfterMonth: toPrepaymentMonth(ay, am),
      prepaymentAmount: prepay,
      prepaymentType: v.type,
    },
    errors,
  };
}

/** 月数 → 「◯年◯か月」（0年・0か月は省略。0 は「0か月」）。 */
export function monthSpanLabel(months: number): string {
  const m = Math.max(0, Math.trunc(months));
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (y === 0) return `${r}か月`;
  return r === 0 ? `${y}年` : `${y}年${r}か月`;
}

type Q = string | string[] | undefined;

/** Initial form values from ?principal= (万円), ?rate= (0..20), ?years= (1..50). Invalid values are ignored. */
export function prepaymentInitialFromQuery(q: { rate?: Q; principal?: Q; years?: Q }): Partial<PrepaymentForm> {
  const out: Partial<PrepaymentForm> = {};
  const dec = (v: Q) => (typeof v === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(v) ? v : null);
  const rate = dec(q.rate);
  if (rate !== null && Number(rate) <= 20) out.rate = rate;
  const principal = dec(q.principal);
  if (principal !== null && Number(principal) >= 1 && Number(principal) <= 100000) out.principalMan = principal;
  const years = typeof q.years === "string" && /^\d{1,2}$/.test(q.years) ? Number(q.years) : null;
  if (years !== null && years >= 1 && years <= 50) out.years = String(years);
  return out;
}
