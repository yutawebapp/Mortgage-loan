import { parseNumericInput as num } from "./numericInput";
import type { RefinanceRequest } from "./api/refinance";
import type { RepaymentMethod } from "./api/simulation";

export type RefinanceForm = {
  balanceMan: string;
  currentRate: string;
  remainingYears: string;
  newRate: string;
  newYears: string;
  method: RepaymentMethod;
  costsMan: string;
};

export type RefinanceErrors = Partial<
  Record<"balanceMan" | "currentRate" | "remainingYears" | "newRate" | "newYears" | "costsMan", string>
>;

const toYen = (man: number) => Math.round(man * 10000);

/** newYears is the effective value (already resolved from the default). */
export function validateRefinance(v: RefinanceForm): { request: RefinanceRequest | null; errors: RefinanceErrors } {
  const errors: RefinanceErrors = {};

  const balMan = num(v.balanceMan);
  const balance = toYen(balMan);
  if (!Number.isFinite(balMan)) errors.balanceMan = "現在の残債を入力してください。";
  else if (balance < 1 || balance > 1_000_000_000)
    errors.balanceMan = "現在の残債は10億円以下で、1円以上になるよう入力してください。";

  const rateCheck = (s: string, label: string) => {
    const r = num(s);
    if (!Number.isFinite(r)) return `${label}を入力してください。`;
    if (r < 0 || r > 20) return `${label}は0%以上20%以下で入力してください。`;
    return undefined;
  };
  const yearsCheck = (s: string, label: string) => {
    const y = num(s);
    if (!Number.isFinite(y)) return `${label}を入力してください。`;
    if (!Number.isInteger(y) || y < 1 || y > 50) return `${label}は1〜50年の整数で入力してください。`;
    return undefined;
  };

  const e1 = rateCheck(v.currentRate, "現在の金利");
  if (e1) errors.currentRate = e1;
  const e2 = yearsCheck(v.remainingYears, "現在ローンの残り期間");
  if (e2) errors.remainingYears = e2;
  const e3 = rateCheck(v.newRate, "借り換え後の金利");
  if (e3) errors.newRate = e3;
  const e4 = yearsCheck(v.newYears, "借り換え後の返済期間");
  if (e4) errors.newYears = e4;

  const costsMan = num(v.costsMan);
  const costs = toYen(costsMan);
  if (!Number.isFinite(costsMan)) errors.costsMan = "借り換え諸費用を入力してください（なければ0）。";
  else if (costs < 0 || costs > 100_000_000) errors.costsMan = "借り換え諸費用は0円以上1億円以下で入力してください。";

  if (Object.keys(errors).length > 0) return { request: null, errors };
  return {
    request: {
      remainingBalance: balance,
      currentAnnualRatePercent: num(v.currentRate),
      remainingYears: num(v.remainingYears),
      newAnnualRatePercent: num(v.newRate),
      newYears: num(v.newYears),
      method: v.method,
      refinanceCosts: costs,
    },
    errors,
  };
}

type Q = string | string[] | undefined;

/** rate は借り換え後、currentRate は現在の金利。残債・残期間は別途入力する。 */
export function refinanceInitialFromQuery(q: { rate?: Q; currentRate?: Q; method?: Q }): Partial<RefinanceForm> {
  const out: Partial<RefinanceForm> = {};
  const validRate = (r: Q): r is string => typeof r === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(r) && Number(r) <= 20;
  if (validRate(q.rate)) out.newRate = q.rate;
  if (validRate(q.currentRate)) out.currentRate = q.currentRate;
  if (q.method === "EQUAL_PAYMENT" || q.method === "EQUAL_PRINCIPAL") out.method = q.method;
  return out;
}

export function monthsLabel(month: number): string {
  const y = Math.floor(month / 12);
  const m = month % 12;
  return y === 0 ? `${m}か月目` : `${y}年${m}か月目`;
}

/** Signed difference phrased neutrally, e.g. "約1,000円少なくなる". */
export function diffPhrase(n: number): string {
  if (n === 0) return "差はありません";
  return `約${Math.abs(n).toLocaleString("ja-JP")}円${n > 0 ? "少なくなる" : "多くなる"}`;
}
