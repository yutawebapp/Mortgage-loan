import type { EnergyClass, HousingType, TaxDeductionRequest } from "./api/taxDeduction";
import type { RepaymentMethod } from "./api/simulation";

export type TaxDeductionForm = {
  housingType: HousingType;
  energyClass: EnergyClass;
  moveInYear: string;
  moveInMonth: string;
  childcare: boolean;
  floorAreaOver50: boolean;
  legacyException: boolean;
  principalMan: string;
  rate: string;
  years: string;
  method: RepaymentMethod;
  incomeMan: string;
  socialInsuranceRate: string;
};

export type TaxDeductionErrors = Partial<Record<keyof TaxDeductionForm, string>>;

export const MOVE_IN_YEARS = [2026, 2027, 2028, 2029, 2030] as const;
export const DEFAULT_SOCIAL_INSURANCE_RATE = "15";

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const toYen = (man: number) => Math.round(man * 10000);

/** 例外該当のチェックを表示する条件。新築で、性能が「その他」または「省エネ基準適合（2028年以降の入居）」のとき。 */
export function legacyExceptionKind(
  v: Pick<TaxDeductionForm, "housingType" | "energyClass" | "moveInYear">,
): "OTHER" | "ENERGY_STANDARD_2028" | null {
  if (v.housingType !== "NEW") return null;
  if (v.energyClass === "OTHER") return "OTHER";
  if (v.energyClass === "ENERGY_STANDARD" && Number(v.moveInYear) >= 2028) return "ENERGY_STANDARD_2028";
  return null;
}

export function legacyExceptionLabel(kind: "OTHER" | "ENERGY_STANDARD_2028"): string {
  return kind === "OTHER"
    ? "2023年末までに新築された家屋である"
    : "2027年末までに建築確認を受けた、または2028年6月30日までに建築された";
}

export function validateTaxDeduction(v: TaxDeductionForm): {
  request: TaxDeductionRequest | null;
  errors: TaxDeductionErrors;
} {
  const errors: TaxDeductionErrors = {};

  const my = num(v.moveInYear);
  if (!Number.isInteger(my) || my < 2026 || my > 2030) errors.moveInYear = "入居年は2026〜2030年から選んでください。";
  const mm = num(v.moveInMonth);
  if (!Number.isInteger(mm) || mm < 1 || mm > 12) errors.moveInMonth = "借入実行月は1〜12月から選んでください。";

  const pMan = num(v.principalMan);
  const principal = toYen(pMan);
  if (!Number.isFinite(pMan)) errors.principalMan = "借入金額を入力してください。";
  else if (principal < 1 || principal > 1_000_000_000)
    errors.principalMan = "借入金額は10億円以下で、1円以上になるよう入力してください。";

  const rate = num(v.rate);
  if (!Number.isFinite(rate)) errors.rate = "金利を入力してください。";
  else if (rate < 0 || rate > 20) errors.rate = "金利は0%以上20%以下で入力してください。";

  const years = num(v.years);
  if (!Number.isFinite(years)) errors.years = "返済期間を入力してください。";
  else if (!Number.isInteger(years) || years < 1 || years > 50)
    errors.years = "返済期間は1〜50年の整数で入力してください。";

  const incMan = num(v.incomeMan);
  const income = toYen(incMan);
  if (!Number.isFinite(incMan)) errors.incomeMan = "年収（額面）を入力してください。";
  else if (income < 1 || income > 1_000_000_000)
    errors.incomeMan = "年収は10億円以下で、1円以上になるよう入力してください。";

  const si = num(v.socialInsuranceRate);
  if (!Number.isFinite(si)) errors.socialInsuranceRate = "社会保険料率を入力してください。";
  else if (si < 0 || si > 30) errors.socialInsuranceRate = "社会保険料率は0%以上30%以下で入力してください。";

  if (Object.keys(errors).length > 0) return { request: null, errors };
  return {
    request: {
      housingType: v.housingType,
      energyClass: v.energyClass,
      moveInYear: my,
      moveInMonth: mm,
      childcareHousehold: v.childcare,
      floorAreaOver50: v.floorAreaOver50,
      legacyException: legacyExceptionKind(v) !== null && v.legacyException,
      principal,
      annualRatePercent: rate,
      years,
      method: v.method,
      annualIncome: income,
      socialInsuranceRatePercent: si,
    },
    errors,
  };
}

/** 返済期間が10年未満のときに出す案内（エラーではない）。 */
export function isUnderTenYears(yearsText: string): boolean {
  const y = num(yearsText);
  return Number.isInteger(y) && y >= 1 && y < 10;
}

type Q = string | string[] | undefined;

/** Initial form values from ?principal= (万円, 1..100000), ?rate= (0..20), ?years= (1..50). Invalid values are ignored. */
export function taxDeductionInitialFromQuery(q: { principal?: Q; rate?: Q; years?: Q }): Partial<TaxDeductionForm> {
  const out: Partial<TaxDeductionForm> = {};
  const p = q.principal;
  if (typeof p === "string" && /^\d{1,6}$/.test(p) && Number(p) >= 1 && Number(p) <= 100000) out.principalMan = p;
  const r = q.rate;
  if (typeof r === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(r) && Number(r) <= 20) out.rate = r;
  const y = q.years;
  if (typeof y === "string" && /^\d{1,2}$/.test(y) && Number(y) >= 1 && Number(y) <= 50) out.years = y;
  return out;
}

const INELIGIBLE_MESSAGES: Record<string, string> = {
  NOT_ELIGIBLE_BY_RULE:
    "この住宅の区分・入居年では、住宅ローン減税の対象外となる可能性があります。「例外に該当する」の項目が表示されている場合は、該当するかどうかを確認してください。",
  TERM_UNDER_10_YEARS: "返済期間が10年未満のローンは、住宅ローン減税の対象外となる可能性があります。",
  AREA_40S_INCOME_OVER_LIMIT:
    "床面積が40㎡台（約12.1〜15.1坪）の住宅は、所得が一定額を超えると対象外となる可能性があります。入力された年収では、この条件に当たる可能性があります。",
  INCOME_OVER_20M: "年収が2,000万円を超える場合は、住宅ローン減税の対象外となる可能性があります。",
};

export function ineligibleMessage(code: string | null | undefined): string {
  return (
    (code && INELIGIBLE_MESSAGES[code]) ||
    "入力された条件では、住宅ローン減税の対象外となる可能性があります。条件を変えて確認してください。"
  );
}

/** 円 → 「1,234万円」 (四捨五入、万円未満が残る小さい額は円表示)。 */
export function manOrYen(yenAmount: number): string {
  if (yenAmount !== 0 && Math.abs(yenAmount) < 10000) return `${yenAmount.toLocaleString("ja-JP")}円`;
  return `${(Math.round(yenAmount / 100) / 100).toLocaleString("ja-JP", { maximumFractionDigits: 2 })}万円`;
}

/** ISO date "2026-04-01" → "2026年4月1日". Anything else is returned as is. */
export function dateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : iso;
}

/** Only http(s) URLs are rendered as links. */
export function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

export { simulationHref } from "./eligibility";
