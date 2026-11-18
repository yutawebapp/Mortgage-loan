import type { TotalCostRequest } from "./api/totalCost";
import type { RepaymentMethod } from "./api/simulation";

export type TotalCostForm = {
  priceMan: string;
  downMan: string;
  closingRate: string;
  rate: string;
  years: string;
  method: RepaymentMethod;
  managementFee: string; // 円/月
  repairReserve: string; // 円/月
  propertyTax: string; // 円/年
  insurance: string; // 円/年
};

export type TotalCostErrors = Partial<Record<Exclude<keyof TotalCostForm, "method">, string>>;

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const toYen = (man: number) => Math.round(man * 10000);
const MAX_YEN = 1_000_000_000;

/** 保有コスト欄（円）。空欄は 0 として扱う。 */
function costField(
  raw: string,
  max: number,
  label: string,
  key: keyof TotalCostErrors,
  errors: TotalCostErrors,
): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > max) {
    errors[key] = `${label}は0円以上${max.toLocaleString("ja-JP")}円以下の整数で入力してください。`;
    return 0;
  }
  return n;
}

/** 諸費用（円）。物件価格 × 割合を円未満四捨五入した目安（画面表示用）。 */
export function estimateClosingCost(priceYen: number, ratePercent: number): number {
  return Math.round((priceYen * ratePercent) / 100);
}

/** 借入額の目安 = 物件価格 + 諸費用 − 頭金（円）。 */
export function derivedLoan(priceYen: number, downYen: number, ratePercent: number): number {
  return priceYen + estimateClosingCost(priceYen, ratePercent) - downYen;
}

export function validateTotalCost(v: TotalCostForm): {
  request: TotalCostRequest | null;
  errors: TotalCostErrors;
  /** 物件価格・頭金・諸費用の割合が正しいときの借入額の目安（円）。0 以下なら借入なし。 */
  loanEstimate: number | null;
} {
  const errors: TotalCostErrors = {};

  const priceMan = num(v.priceMan);
  const price = toYen(priceMan);
  if (!Number.isFinite(priceMan)) errors.priceMan = "物件価格を入力してください。";
  else if (price < 1 || price > MAX_YEN)
    errors.priceMan = "物件価格は10億円以下で、1円以上になるよう入力してください。";

  const downMan = num(v.downMan);
  const down = toYen(downMan);
  if (!Number.isFinite(downMan)) errors.downMan = "頭金を入力してください（なければ0）。";
  else if (down < 0 || down > MAX_YEN) errors.downMan = "頭金は0円以上10億円以下で入力してください。";

  const closing = num(v.closingRate);
  if (!Number.isFinite(closing)) errors.closingRate = "諸費用の割合を入力してください。";
  else if (closing < 0 || closing > 30) errors.closingRate = "諸費用の割合は0%以上30%以下で入力してください。";

  const rate = num(v.rate);
  if (!Number.isFinite(rate)) errors.rate = "金利を入力してください。";
  else if (rate < 0 || rate > 20) errors.rate = "金利は0%以上20%以下で入力してください。";

  const years = num(v.years);
  if (!Number.isFinite(years)) errors.years = "返済期間を入力してください。";
  else if (!Number.isInteger(years) || years < 1 || years > 50)
    errors.years = "返済期間は1〜50年の整数で入力してください。";

  const mgmt = costField(v.managementFee, 1_000_000, "管理費", "managementFee", errors);
  const repair = costField(v.repairReserve, 1_000_000, "修繕積立金", "repairReserve", errors);
  const tax = costField(v.propertyTax, 10_000_000, "固定資産税・都市計画税", "propertyTax", errors);
  const ins = costField(v.insurance, 10_000_000, "保険料", "insurance", errors);

  const baseOk = !errors.priceMan && !errors.downMan && !errors.closingRate;
  const loanEstimate = baseOk ? derivedLoan(price, down, closing) : null;

  if (Object.keys(errors).length > 0 || loanEstimate === null || loanEstimate <= 0)
    return { request: null, errors, loanEstimate };

  return {
    request: {
      propertyPrice: price,
      downPayment: down,
      closingCostRatePercent: closing,
      annualRatePercent: rate,
      years,
      method: v.method,
      monthlyManagementFee: mgmt,
      monthlyRepairReserve: repair,
      annualPropertyTax: tax,
      annualInsurance: ins,
    },
    errors,
    loanEstimate,
  };
}

/** 円 → 「約1,234万円」用（万円未満は四捨五入）。 */
export function approxManLabel(yenAmount: number): string {
  return `${Math.round(yenAmount / 10000).toLocaleString("ja-JP")}万円`;
}

/** 全体に占める割合（%）。 */
export function sharePercent(part: number, whole: number): number {
  if (!(whole > 0) || !(part > 0)) return 0;
  return Math.min(100, (part / whole) * 100);
}

const NOTE_TEXT: Record<string, string> = {
  OWNERSHIP_COST_CONSTANT: "管理費・修繕積立金・税金・保険料は、入力した金額が毎年同じとして計算しています。将来の値上がりや税額の変動は含まれません。",
  NO_RESALE_VALUE: "売却したときの価格や、住まいの資産価値は含まれません。",
  COSTS_AFTER_LOAN_TERM_EXCLUDED: "ローンの返済が終わったあとにかかる保有コストは含まれません。",
  TAX_DEDUCTION_NOT_INCLUDED: "住宅ローン控除による税の軽減は含まれません。",
};

const ASSUMPTION_TEXT: Record<string, string> = {
  CLOSING_COSTS_FINANCED_FROM_BUDGET:
    "諸費用は、頭金と借入額を合わせた予算の中から支払う前提です。諸費用を現金で別に用意する場合は、頭金に含めて入力してください。",
};

const pick = (table: Record<string, string>, codes: readonly string[]) =>
  codes.flatMap((c) => (Object.prototype.hasOwnProperty.call(table, c) ? [table[c]] : []));

/** 「含まれないもの」の表示文。未知のコードは表示しない。 */
export function noteMessages(codes: readonly string[]): string[] {
  return pick(NOTE_TEXT, codes);
}

/** 「この試算の前提」の表示文。未知のコードは表示しない。 */
export function assumptionMessages(codes: readonly string[]): string[] {
  return pick(ASSUMPTION_TEXT, codes);
}

type Q = string | string[] | undefined;

/** ?principal=（物件価格・万円）, ?rate=(0..20), ?years=(1..50)。不正な値は無視。 */
export function totalCostInitialFromQuery(q: { rate?: Q; principal?: Q; years?: Q }): Partial<TotalCostForm> {
  const out: Partial<TotalCostForm> = {};
  const dec = (v: Q) => (typeof v === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(v) ? v : null);
  const rate = dec(q.rate);
  if (rate !== null && Number(rate) <= 20) out.rate = rate;
  const price = dec(q.principal);
  if (price !== null && Number(price) >= 1 && Number(price) <= 100000) out.priceMan = price;
  const years = typeof q.years === "string" && /^\d{1,2}$/.test(q.years) ? Number(q.years) : null;
  if (years !== null && years >= 1 && years <= 50) out.years = String(years);
  return out;
}

export { simulationHref } from "./eligibility";
