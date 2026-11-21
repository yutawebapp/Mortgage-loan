import type { RateTypeCase, RateTypeCode, RateTypesRequest } from "./api/rateTypes";
import type { RepaymentMethod } from "./api/simulation";
import { DEFAULT_METHOD, DEFAULT_PRINCIPAL_MAN, DEFAULT_RATE, DEFAULT_YEARS } from "./defaults";
import { signedYen } from "./rate-scenario";

export type RateTypesForm = {
  principalMan: string;
  years: string;
  method: RepaymentMethod;
  variableRate: string;
  variableRiseAfter: string;
  variableRisePoints: string;
  fixedPeriodYears: string;
  fixedPeriodRate: string;
  fixedPeriodAfterRate: string;
  fullFixedRate: string;
};

export type RateTypesErrors = Partial<Record<Exclude<keyof RateTypesForm, "method">, string>>;

// 固定期間・全期間固定の金利は金利タイプ比較の仮の値のため、共通の既定値（./defaults）には含めない。
export const RATE_TYPES_DEFAULTS: RateTypesForm = {
  principalMan: DEFAULT_PRINCIPAL_MAN,
  years: DEFAULT_YEARS,
  method: DEFAULT_METHOD,
  variableRate: DEFAULT_RATE,
  variableRiseAfter: "5",
  variableRisePoints: "1",
  fixedPeriodYears: "10",
  fixedPeriodRate: "1.4",
  fixedPeriodAfterRate: "2.0",
  fullFixedRate: "1.8",
};

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const toYen = (man: number) => Math.round(man * 10000);

function rateError(label: string, s: string): string | undefined {
  const r = num(s);
  if (!Number.isFinite(r)) return `${label}を入力してください。`;
  if (r < 0 || r > 20) return `${label}は0%以上20%以下で入力してください。`;
  return undefined;
}

export function validateRateTypes(v: RateTypesForm): { request: RateTypesRequest | null; errors: RateTypesErrors } {
  const errors: RateTypesErrors = {};

  const man = num(v.principalMan);
  const principal = toYen(man);
  if (!Number.isFinite(man)) errors.principalMan = "借入金額を入力してください。";
  else if (principal < 1 || principal > 1_000_000_000)
    errors.principalMan = "借入金額は10億円以下で、1円以上になるよう入力してください。";

  const years = num(v.years);
  if (!Number.isFinite(years)) errors.years = "返済期間を入力してください。";
  else if (!Number.isInteger(years) || years < 2 || years > 50)
    errors.years = "返済期間は2〜50年の整数で入力してください。";

  const vRate = num(v.variableRate);
  const e1 = rateError("変動金利", v.variableRate);
  if (e1) errors.variableRate = e1;

  const rise = num(v.variableRiseAfter);
  if (!Number.isFinite(rise)) errors.variableRiseAfter = "金利が上昇する時期を入力してください。";
  else if (!Number.isInteger(rise) || rise < 1)
    errors.variableRiseAfter = "金利が上昇する時期は1年以上の整数で入力してください。";
  else if (!errors.years && rise > years - 1)
    errors.variableRiseAfter = `金利が上昇する時期は、返済期間（${years}年）より前の${years - 1}年後までで入力してください。`;

  const points = num(v.variableRisePoints);
  if (!Number.isFinite(points)) errors.variableRisePoints = "上昇幅を入力してください。";
  else if (points <= 0 || points > 10) errors.variableRisePoints = "上昇幅は0より大きく10以下で入力してください。";
  else if (!errors.variableRate && vRate + points > 20 + 1e-9)
    errors.variableRisePoints = "変動金利に上昇幅を足した金利が20%を超えないように入力してください。";

  const fp = num(v.fixedPeriodYears);
  if (!Number.isFinite(fp)) errors.fixedPeriodYears = "固定期間を入力してください。";
  else if (!Number.isInteger(fp) || fp < 1) errors.fixedPeriodYears = "固定期間は1年以上の整数で入力してください。";
  else if (!errors.years && fp > years - 1)
    errors.fixedPeriodYears = `固定期間は、返済期間（${years}年）より短い${years - 1}年までで入力してください。`;

  const e2 = rateError("固定期間中の金利", v.fixedPeriodRate);
  if (e2) errors.fixedPeriodRate = e2;
  const e3 = rateError("固定期間終了後の金利", v.fixedPeriodAfterRate);
  if (e3) errors.fixedPeriodAfterRate = e3;
  const e4 = rateError("全期間固定の金利", v.fullFixedRate);
  if (e4) errors.fullFixedRate = e4;

  if (Object.keys(errors).length > 0) return { request: null, errors };
  return {
    request: {
      principal,
      years,
      method: v.method,
      variableRatePercent: vRate,
      variableRiseAfterYears: rise,
      variableRisePoints: points,
      fixedPeriodYears: fp,
      fixedPeriodRatePercent: num(v.fixedPeriodRate),
      fixedPeriodAfterRatePercent: num(v.fixedPeriodAfterRate),
      fullFixedRatePercent: num(v.fullFixedRate),
    },
    errors,
  };
}

type Q = string | string[] | undefined;

/** Initial form values from ?principal= (万円) and ?years= (2..50). Invalid values are ignored. */
export function rateTypesInitialFromQuery(q: { principal?: Q; years?: Q }): Partial<RateTypesForm> {
  const out: Partial<RateTypesForm> = {};
  const principal =
    typeof q.principal === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(q.principal) ? q.principal : null;
  if (principal !== null && Number(principal) >= 1 && Number(principal) <= 100000) out.principalMan = principal;
  const years = typeof q.years === "string" && /^\d{1,2}$/.test(q.years) ? Number(q.years) : null;
  if (years !== null && years >= 2 && years <= 50) out.years = String(years);
  return out;
}

/** /rate-scenario へ引き継ぐリンク（借入金額・変動金利・返済期間）。 */
export function rateScenarioHref(principalYen: number, ratePercent: number, years: number): string {
  const p = new URLSearchParams();
  const man = Math.floor(principalYen / 10000);
  if (man >= 1 && man <= 100000) p.set("principal", String(man));
  p.set("rate", String(ratePercent));
  p.set("years", String(years));
  return `/rate-scenario?${p.toString()}`;
}

export const CASE_NAMES: Record<RateTypeCode, string> = {
  VARIABLE_FLAT: "変動・金利が変わらない場合",
  VARIABLE_RISE: "変動・金利が上昇した場合",
  FIXED_PERIOD: "固定期間選択型",
  FULL_FIXED: "全期間固定",
};

export const caseName = (c: Pick<RateTypeCase, "type">): string => CASE_NAMES[c.type] ?? c.type;

const pct = (r: number) => `${Number(r.toFixed(3))}%`;

/** 「0.7% → 1.7%」または「1.8%（一定）」。 */
export function rateLabel(c: Pick<RateTypeCase, "rateFirstPercent" | "rateAfterPercent">): string {
  return c.rateAfterPercent === null
    ? `${pct(c.rateFirstPercent)}（一定）`
    : `${pct(c.rateFirstPercent)} → ${pct(c.rateAfterPercent)}`;
}

export function switchLabel(c: Pick<RateTypeCase, "switchAfterYears">): string {
  return c.switchAfterYears === null ? "なし" : `返済開始から${c.switchAfterYears}年後`;
}

/** 全期間固定との総返済額の差。「+120万円」「−35万円」。1万円未満は円で表示。 */
export function signedMan(n: number): string {
  if (n === 0) return "0円";
  const man = Math.round(Math.abs(n) / 10000);
  if (man === 0) return signedYen(n);
  return `${n > 0 ? "+" : "−"}${man.toLocaleString("ja-JP")}万円`;
}

const NOTE_TEXTS: Record<string, string> = {
  RATES_ARE_USER_ASSUMPTIONS: "金利は入力した仮の値で、将来の金利を予測するものではありません。",
  SIMPLIFIED_RATE_CHANGE_MODEL:
    "金利の変更は1回だけ、残りの残高を残りの期間で再計算する簡易モデルです。5年ルール・125%ルールは反映していません。",
  FEES_AND_GUARANTEE_NOT_INCLUDED: "保証料・手数料・団信の違いは含まれません。",
};

/** 既知の注記コードだけを文章にする。未知のコードは無視する。 */
export function noteTexts(codes: string[]): string[] {
  return [...new Set(codes)].filter((c) => c in NOTE_TEXTS).map((c) => NOTE_TEXTS[c]);
}
