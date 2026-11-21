import type { RentVsBuyRequest, RentVsBuySummary } from "./api/rentVsBuy";
import type { RepaymentMethod } from "./api/simulation";
import { derivedLoan } from "./totalCost";

export type RentVsBuyForm = {
  // 購入
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
  // 賃貸
  rent: string; // 円/月
  rentGrowth: string; // %/年
  renewalMonths: string; // 家賃の何か月分
  renewalInterval: string; // 年
  rentInitial: string; // 円
  // 比較の条件
  horizon: string; // 年
  assetChange: string; // %/年（マイナス可）
  saleCost: string; // %
};

export type RentVsBuyErrors = Partial<Record<Exclude<keyof RentVsBuyForm, "method">, string>>;

/** 詳細設定（折りたたみ）に入っている項目。 */
export const ADVANCED_KEYS: readonly (keyof RentVsBuyErrors)[] = [
  "closingRate",
  "rentGrowth",
  "renewalMonths",
  "renewalInterval",
  "rentInitial",
  "assetChange",
  "saleCost",
];

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const toYen = (man: number) => Math.round(man * 10000);
const MAX_YEN = 1_000_000_000;

/** 円の整数欄。空欄は 0 として扱う（required=false のとき）。 */
function yenField(
  raw: string,
  min: number,
  max: number,
  label: string,
  key: keyof RentVsBuyErrors,
  errors: RentVsBuyErrors,
  required = false,
): number {
  if (raw.trim() === "") {
    if (required) errors[key] = `${label}を入力してください。`;
    return 0;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
    errors[key] = `${label}は${min.toLocaleString("ja-JP")}円以上${max.toLocaleString("ja-JP")}円以下の整数で入力してください。`;
    return 0;
  }
  return n;
}

/** 範囲つきの数値欄（%・か月など）。空欄は 0 として扱う。 */
function rangeField(
  raw: string,
  min: number,
  max: number,
  label: string,
  unit: string,
  key: keyof RentVsBuyErrors,
  errors: RentVsBuyErrors,
): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    errors[key] = `${label}は${min}${unit}以上${max}${unit}以下で入力してください。`;
    return 0;
  }
  return n;
}

export function validateRentVsBuy(v: RentVsBuyForm): {
  request: RentVsBuyRequest | null;
  errors: RentVsBuyErrors;
  /** 物件価格・頭金・諸費用の割合が正しいときの借入額の目安（円）。0 以下なら借入なし。 */
  loanEstimate: number | null;
} {
  const errors: RentVsBuyErrors = {};

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

  const mgmt = yenField(v.managementFee, 0, 1_000_000, "管理費", "managementFee", errors);
  const repair = yenField(v.repairReserve, 0, 1_000_000, "修繕積立金", "repairReserve", errors);
  const tax = yenField(v.propertyTax, 0, 10_000_000, "固定資産税・都市計画税", "propertyTax", errors);
  const ins = yenField(v.insurance, 0, 10_000_000, "保険料", "insurance", errors);

  const rent = yenField(v.rent, 1, 10_000_000, "家賃", "rent", errors, true);
  const growth = rangeField(v.rentGrowth, 0, 10, "家賃の年間上昇率", "%", "rentGrowth", errors);
  const renewalMonths = rangeField(v.renewalMonths, 0, 6, "更新料", "か月", "renewalMonths", errors);

  let interval = 2;
  if (v.renewalInterval.trim() === "") errors.renewalInterval = "更新の間隔を入力してください。";
  else {
    const n = Number(v.renewalInterval);
    if (!Number.isInteger(n) || n < 1 || n > 5) errors.renewalInterval = "更新の間隔は1〜5年の整数で入力してください。";
    else interval = n;
  }
  const rentInitial = yenField(v.rentInitial, 0, 100_000_000, "入居時の初期費用", "rentInitial", errors);

  const horizon = num(v.horizon);
  if (!Number.isFinite(horizon)) errors.horizon = "比べる期間を入力してください。";
  else if (!Number.isInteger(horizon) || horizon < 1 || horizon > 50)
    errors.horizon = "比べる期間は1〜50年の整数で入力してください。";

  const asset = rangeField(v.assetChange, -10, 10, "物件価値の年間変化率", "%", "assetChange", errors);
  const sale = rangeField(v.saleCost, 0, 10, "売却時にかかる費用の割合", "%", "saleCost", errors);

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
      monthlyRent: rent,
      rentGrowthPercent: growth,
      renewalFeeMonths: renewalMonths,
      renewalIntervalYears: interval,
      rentInitialCost: rentInitial,
      horizonYears: horizon,
      assetChangeRatePercent: asset,
      saleCostRatePercent: sale,
    },
    errors,
    loanEstimate,
  };
}

/** マイナス記号つきの円表示（実質負担は、マイナスになることがある）。 */
export function yenSigned(n: number): string {
  return `${n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("ja-JP")}円`;
}

/** 「約1,234万円」用（万円未満は四捨五入。マイナスは「−」）。 */
export function manSigned(n: number): string {
  const man = Math.round(Math.abs(n) / 10000);
  return `${n < 0 && man > 0 ? "−" : ""}${man.toLocaleString("ja-JP")}万円`;
}

/** 物件価値の変化率の表示（+1% / ±0% / −1%）。 */
export function ratePercentLabel(p: number): string {
  if (p === 0) return "±0%";
  return `${p > 0 ? "+" : "−"}${Math.abs(p)}%`;
}

/** 結果の見出し文。どちらが良いかは言わず、条件と事実だけを述べる。 */
export function crossoverSentences(s: RentVsBuySummary, horizonYears: number): { cumulative: string; net: string } {
  const cumulative =
    s.crossoverYearCumulative !== null
      ? `入力した条件では、${s.crossoverYearCumulative}年目に、購入の累計支出が賃貸の累計支出を初めて下回ります。`
      : `入力した条件では、${horizonYears}年の間、購入の累計支出が賃貸の累計支出を下回りません。`;
  const net =
    s.crossoverYearNet !== null
      ? `物件価値とローン残高を考慮した購入の実質負担では、${s.crossoverYearNet}年目に、賃貸の累計支出を初めて下回ります。`
      : `物件価値とローン残高を考慮した購入の実質負担でも、${horizonYears}年の間、賃貸の累計支出を下回りません。`;
  return { cumulative, net };
}

/** 感度表の「下回り始める年」。 */
export function crossoverLabel(year: number | null): string {
  return year === null ? "期間内にはなし" : `${year}年目`;
}

const NOTE_TEXT: Record<string, string> = {
  ASSET_VALUE_IS_ASSUMPTION: "物件の将来の価値は、入力した仮の値です。実際は大きく変わります。",
  NO_INVESTMENT_RETURN_ON_DIFFERENCE:
    "購入と賃貸の支出の差を運用した場合の収益や、頭金を運用した場合の収益は含まれません。",
  TAX_DEDUCTION_NOT_INCLUDED: "住宅ローン控除による税の軽減は含みません。",
  SAME_HOME_CONDITIONS_NOT_ASSURED: "賃貸と購入で、広さ・立地・設備が同じとは限りません。",
  OWNERSHIP_COSTS_CONTINUE_AFTER_LOAN:
    "ローンの完済後も、管理費・修繕積立金・税金などは続く前提で計算しています。",
};

const ASSUMPTION_TEXT: Record<string, string> = {
  CLOSING_COSTS_FINANCED_FROM_BUDGET:
    "諸費用は頭金と借入額を合わせた予算の中から支払う前提です。現金で別に用意する場合は頭金に含めてください。",
};

const pick = (table: Record<string, string>, codes: readonly string[]) =>
  codes.flatMap((c) => (Object.prototype.hasOwnProperty.call(table, c) ? [table[c]] : []));

/** 「この試算に含まれないもの」などの表示文。未知のコードは表示しない。 */
export function rentVsBuyNoteMessages(codes: readonly string[]): string[] {
  return pick(NOTE_TEXT, codes);
}

/** 「この試算の前提」の表示文。未知のコードは表示しない。 */
export function rentVsBuyAssumptionMessages(codes: readonly string[]): string[] {
  return pick(ASSUMPTION_TEXT, codes);
}
