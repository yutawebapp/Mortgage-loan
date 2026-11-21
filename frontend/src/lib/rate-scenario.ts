import type { RateScenarioRequest } from "./api/rate-scenario";
import type { RepaymentMethod } from "./api/simulation";

export const RISE_PRESETS = [0.5, 1, 2] as const;
export const MAX_RISE_POINTS = 5;

export type RateScenarioForm = {
  principalMan: string;
  rate: string;
  years: string;
  method: RepaymentMethod;
  riseAfterYears: string;
  /** 選択中のプリセット上昇幅 */
  presets: number[];
  /** 任意の上昇幅（空なら未使用） */
  custom: string;
};

export type RateScenarioErrors = Partial<
  Record<"principalMan" | "rate" | "years" | "riseAfterYears" | "risePoints", string>
>;

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const toYen = (man: number) => Math.round(man * 10000);

/** 上昇幅の一覧（プリセット＋任意値）。重複は除き、昇順に並べる。 */
export function collectRisePoints(presets: number[], custom: string): number[] {
  const all = [...presets];
  const c = num(custom);
  if (custom.trim() !== "" && Number.isFinite(c)) all.push(c);
  return [...new Set(all)].sort((a, b) => a - b);
}

export function validateRateScenario(v: RateScenarioForm): {
  request: RateScenarioRequest | null;
  errors: RateScenarioErrors;
} {
  const errors: RateScenarioErrors = {};

  const man = num(v.principalMan);
  const principal = toYen(man);
  if (!Number.isFinite(man)) errors.principalMan = "借入金額を入力してください。";
  else if (principal < 1 || principal > 1_000_000_000)
    errors.principalMan = "借入金額は10億円以下で、1円以上になるよう入力してください。";

  const rate = num(v.rate);
  if (!Number.isFinite(rate)) errors.rate = "当初金利を入力してください。";
  else if (rate < 0 || rate > 20) errors.rate = "当初金利は0%以上20%以下で入力してください。";

  const years = num(v.years);
  if (!Number.isFinite(years)) errors.years = "返済期間を入力してください。";
  else if (!Number.isInteger(years) || years < 2 || years > 50)
    errors.years = "返済期間は2〜50年の整数で入力してください。";

  const rise = num(v.riseAfterYears);
  if (!Number.isFinite(rise)) errors.riseAfterYears = "金利が上昇する時期を入力してください。";
  else if (!Number.isInteger(rise) || rise < 1) errors.riseAfterYears = "金利が上昇する時期は1年以上の整数で入力してください。";
  else if (!errors.years && rise > years - 1)
    errors.riseAfterYears = `金利が上昇する時期は、返済期間（${years}年）より前の${years - 1}年後までで入力してください。`;

  if (v.custom.trim() !== "") {
    const c = num(v.custom);
    if (!Number.isFinite(c) || c <= 0 || c > 10)
      errors.risePoints = "上昇幅（任意）は0より大きく10以下の数値で入力してください。";
  }
  const points = collectRisePoints(v.presets, v.custom);
  if (!errors.risePoints) {
    if (points.length === 0) errors.risePoints = "上昇幅を1つ以上選んでください。";
    else if (points.length > MAX_RISE_POINTS) errors.risePoints = `上昇幅は${MAX_RISE_POINTS}つまで選べます。`;
    else if (!errors.rate && points.some((p) => rate + p > 20 + 1e-9))
      errors.risePoints = "当初金利に上昇幅を足した金利が20%を超えないように選んでください。";
  }

  if (Object.keys(errors).length > 0) return { request: null, errors };
  return {
    request: {
      principal,
      annualRatePercent: rate,
      years,
      method: v.method,
      riseAfterYears: rise,
      risePoints: points,
    },
    errors,
  };
}

/** 0.5 → "+0.5"（%ポイント）。 */
export function risePointLabel(p: number): string {
  return `+${Number(p.toFixed(3))}`;
}

/** Signed yen difference, e.g. "+12,345円" / "−1,000円" / "0円". */
export function signedYen(n: number): string {
  if (n === 0) return "0円";
  return `${n > 0 ? "+" : "−"}${Math.abs(n).toLocaleString("ja-JP")}円`;
}

type Q = string | string[] | undefined;

/** Initial form values from ?principal= (万円), ?rate= (0..20), ?years= (2..50). Invalid values are ignored. */
export function rateScenarioInitialFromQuery(q: { rate?: Q; principal?: Q; years?: Q }): Partial<RateScenarioForm> {
  const out: Partial<RateScenarioForm> = {};
  const dec = (v: Q) => (typeof v === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(v) ? v : null);
  const rate = dec(q.rate);
  if (rate !== null && Number(rate) <= 20) out.rate = rate;
  const principal = dec(q.principal);
  if (principal !== null && Number(principal) >= 1 && Number(principal) <= 100000) out.principalMan = principal;
  const years = typeof q.years === "string" && /^\d{1,2}$/.test(q.years) ? Number(q.years) : null;
  if (years !== null && years >= 2 && years <= 50) out.years = String(years);
  return out;
}
