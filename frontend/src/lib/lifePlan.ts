import type { LifePlanRequest, LifePlanSummary, SchoolPlan, UniversityPlan } from "./api/lifePlan";
import type { RepaymentMethod } from "./api/simulation";

export type ChildForm = { age: string; schoolPlan: SchoolPlan; university: UniversityPlan };

export type LifePlanForm = {
  // 最初から表示
  age: string;
  takeHomeMan: string; // 手取り年収（万円）
  livingMan: string; // 毎月の生活費（住居費を除く・万円）
  savingsMan: string; // 現在の貯蓄（万円）
  loanMan: string; // 借入額（万円）。0 は借入なし
  rate: string;
  years: string;
  children: ChildForm[];
  // 詳細設定
  retireAge: string;
  pensionAge: string;
  retireIncomeMan: string; // 退職後の年間収入（万円）
  retireLivingMan: string; // 退職後の毎月の生活費（万円）
  growth: string;
  returnRate: string;
  endAge: string;
  upfrontMan: string; // 購入時に貯蓄から払う額（万円）
  method: RepaymentMethod;
  housingMonthly: string; // 円/月
  housingTaxYearly: string; // 円/年
};

export type ScalarKey = Exclude<keyof LifePlanForm, "children" | "method">;
export type ChildErrors = { age?: string };
export type LifePlanErrors = Partial<Record<ScalarKey, string>> & { children?: ChildErrors[] };

export const MAX_CHILDREN = 3;

export const SCHOOL_PLANS: { value: SchoolPlan; label: string }[] = [
  { value: "ALL_PUBLIC", label: "すべて公立" },
  { value: "PRIVATE_HIGH", label: "高校だけ私立" },
  { value: "PRIVATE_JUNIOR_AND_HIGH", label: "中学・高校が私立" },
  { value: "ALL_PRIVATE", label: "幼稚園から私立" },
];

export const UNIVERSITY_PLANS: { value: UniversityPlan; label: string }[] = [
  { value: "NONE", label: "進学しない" },
  { value: "NATIONAL", label: "国公立（国立の標準額）" },
  { value: "PRIVATE", label: "私立" },
];

export const newChild = (): ChildForm => ({ age: "3", schoolPlan: "ALL_PUBLIC", university: "NATIONAL" });

/** 画面の項目で、詳細設定（折りたたみ）に入っているもの。 */
export const ADVANCED_KEYS: readonly ScalarKey[] = [
  "retireAge",
  "pensionAge",
  "retireIncomeMan",
  "retireLivingMan",
  "growth",
  "returnRate",
  "endAge",
  "upfrontMan",
  "housingMonthly",
  "housingTaxYearly",
];

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const toYen = (man: number) => Math.round(man * 10000);
const MAX_YEN = 1_000_000_000;
const MAX_MONTHLY = 10_000_000;
const MAX_SAVINGS = 10_000_000_000;

function intRange(s: string, min: number, max: number, label: string, key: ScalarKey, errors: LifePlanErrors): number {
  const n = num(s);
  if (!Number.isFinite(n)) errors[key] = `${label}を入力してください。`;
  else if (!Number.isInteger(n) || n < min || n > max) errors[key] = `${label}は${min}〜${max}の整数で入力してください。`;
  return n;
}

/** 万円の欄を円にする。範囲外は errors に入れる。 */
function manField(
  s: string,
  maxYen: number,
  label: string,
  key: ScalarKey,
  errors: LifePlanErrors,
  blankMeansError = true,
): number {
  if (s.trim() === "") {
    if (blankMeansError) errors[key] = `${label}を入力してください（なければ0）。`;
    return 0;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) {
    errors[key] = `${label}を数字で入力してください。`;
    return 0;
  }
  const y = toYen(n);
  if (y < 0 || y > maxYen) {
    errors[key] = `${label}は0円以上${maxYen.toLocaleString("ja-JP")}円以下で入力してください。`;
    return 0;
  }
  return y;
}

function yenField(s: string, max: number, label: string, key: ScalarKey, errors: LifePlanErrors): number {
  if (s.trim() === "") return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > max) {
    errors[key] = `${label}は0円以上${max.toLocaleString("ja-JP")}円以下の整数で入力してください。`;
    return 0;
  }
  return n;
}

function pctField(s: string, max: number, label: string, key: ScalarKey, errors: LifePlanErrors): number {
  if (s.trim() === "") return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > max) {
    errors[key] = `${label}は0%以上${max}%以下で入力してください。`;
    return 0;
  }
  return n;
}

export function validateLifePlan(v: LifePlanForm): { request: LifePlanRequest | null; errors: LifePlanErrors } {
  const errors: LifePlanErrors = {};

  const age = intRange(v.age, 18, 70, "あなたの年齢", "age", errors);
  const retire = intRange(v.retireAge, 1, 80, "退職年齢", "retireAge", errors);
  if (!errors.retireAge && !errors.age && retire <= age) errors.retireAge = "退職年齢は、あなたの年齢より大きい数字にしてください。";
  const pension = intRange(v.pensionAge, 50, 80, "年金などを受け取り始める年齢", "pensionAge", errors);
  const end = intRange(v.endAge, 1, 100, "想定する年齢の上限", "endAge", errors);
  if (!errors.endAge && !errors.retireAge && end <= retire) errors.endAge = "想定する年齢の上限は、退職年齢より大きい数字にしてください。";

  const takeHome = manField(v.takeHomeMan, MAX_YEN, "手取り年収", "takeHomeMan", errors);
  const living = manField(v.livingMan, MAX_MONTHLY, "毎月の生活費", "livingMan", errors);
  const savings = manField(v.savingsMan, MAX_SAVINGS, "現在の貯蓄", "savingsMan", errors);
  const retireIncome = manField(v.retireIncomeMan, MAX_YEN, "退職後の年間収入", "retireIncomeMan", errors);
  const retireLiving = manField(v.retireLivingMan, MAX_MONTHLY, "退職後の毎月の生活費", "retireLivingMan", errors);
  const upfront = manField(v.upfrontMan, MAX_SAVINGS, "購入時に貯蓄から払う額", "upfrontMan", errors, false);
  const loan = manField(v.loanMan, MAX_SAVINGS, "借入額", "loanMan", errors);

  let rate = 0;
  let years = 0;
  if (!errors.loanMan && loan > 0) {
    const r = num(v.rate);
    if (!Number.isFinite(r)) errors.rate = "金利を入力してください。";
    else if (r < 0 || r > 20) errors.rate = "金利は0%以上20%以下で入力してください。";
    else rate = r;
    years = intRange(v.years, 1, 50, "返済期間", "years", errors);
  }

  const growth = pctField(v.growth, 5, "収入の年間上昇率", "growth", errors);
  const ret = pctField(v.returnRate, 10, "貯蓄の運用利回り", "returnRate", errors);
  const housingMonthly = yenField(v.housingMonthly, MAX_MONTHLY, "毎月の住居費", "housingMonthly", errors);
  const housingTax = yenField(v.housingTaxYearly, MAX_MONTHLY, "毎年の住居費", "housingTaxYearly", errors);

  const childErrors: ChildErrors[] = v.children.map((c) => {
    const e: ChildErrors = {};
    const a = num(c.age);
    if (!Number.isFinite(a)) e.age = "お子さんの年齢を入力してください。";
    else if (!Number.isInteger(a) || a < 0 || a > 21) e.age = "お子さんの年齢は0〜21の整数で入力してください。";
    return e;
  });
  if (childErrors.some((e) => e.age)) errors.children = childErrors;

  if (Object.keys(errors).length > 0) return { request: null, errors };

  const request: LifePlanRequest = {
    currentAge: age,
    retireAge: retire,
    pensionStartAge: pension,
    lifeEndAge: end,
    annualTakeHomeIncome: takeHome,
    incomeGrowthPercent: growth,
    retirementAnnualIncome: retireIncome,
    monthlyLivingCost: living,
    retirementMonthlyLivingCost: retireLiving,
    savings,
    savingsReturnPercent: ret,
    upfrontPayment: upfront,
    loanPrincipal: loan,
    monthlyHousingCost: housingMonthly,
    annualHousingTax: housingTax,
  };
  if (loan > 0) {
    request.annualRatePercent = rate;
    request.years = years;
    request.method = v.method;
  }
  if (v.children.length > 0) {
    request.children = v.children.map((c) => ({ age: Number(c.age), schoolPlan: c.schoolPlan, university: c.university }));
  }
  return { request, errors };
}

type Q = string | string[] | undefined;

/**
 * Initial form values from ?principal= (借入額・万円, 1..100000), ?rate= (0..20), ?years= (1..50).
 * 借入額は loanMan に入れる。不正な値は無視。
 */
export function lifePlanInitialFromQuery(q: { principal?: Q; rate?: Q; years?: Q }): Partial<LifePlanForm> {
  const out: Partial<LifePlanForm> = {};
  const dec = (v: Q) => (typeof v === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(v) ? v : null);
  const principal = dec(q.principal);
  if (principal !== null && Number(principal) >= 1 && Number(principal) <= 100000) out.loanMan = principal;
  const rate = dec(q.rate);
  if (rate !== null && Number(rate) <= 20) out.rate = rate;
  const years = typeof q.years === "string" && /^\d{1,2}$/.test(q.years) ? Number(q.years) : null;
  if (years !== null && years >= 1 && years <= 50) out.years = String(years);
  return out;
}

/** 子の入力欄が1つでも誤りのとき、その番号の誤りを返す。 */
export const childError = (errors: LifePlanErrors, i: number): ChildErrors => errors.children?.[i] ?? {};

/** マイナス記号つきの「約◯万円」。万円未満は四捨五入。 */
export function manApprox(n: number): string {
  const man = Math.round(Math.abs(n) / 10000);
  return `${n < 0 && man > 0 ? "−" : ""}${man.toLocaleString("ja-JP")}万円`;
}

export function yenSigned(n: number): string {
  return `${n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("ja-JP")}円`;
}

/** 結果の見出し文。良し悪しは言わず、条件と事実だけを述べる。 */
export function shortfallSentence(s: LifePlanSummary, endAge: number): string {
  return s.firstShortfallAge !== null
    ? `入力した条件では、${s.firstShortfallAge}歳の時点で、貯蓄がマイナスになります。`
    : `入力した条件では、${endAge}歳までの間、貯蓄はマイナスになりません。`;
}

/** 住宅ローンの完済の文言。返済額の合計は想定期間内（endAge まで）の支払いだけを数える。 */
export function loanSentence(s: LifePlanSummary, endAge: number): string {
  if (s.loanPayoffAge !== null) return `完済は${s.loanPayoffAge}歳の時点です。`;
  if (s.totalLoanPayment > 0) return `想定する期間（${endAge}歳まで）内には完済しません。`;
  return "借入はない計算です。";
}

export const ASSUMPTION_LINE =
  "この結果は、入力した収入・支出などの前提によって変わります。将来を予測するものではありません。金額はすべて現在の価値で、物価の上昇は考慮していません。";

const NOTE_TEXT: Record<string, string> = {
  TODAYS_YEN_NO_INFLATION: "物価の上昇や、収入・支出の変化は考慮しません。金額は現在の価値です。",
  INCOME_AND_COSTS_ARE_USER_INPUTS: "収入や生活費などは、入力された金額をもとに計算しています。",
  EDUCATION_AVERAGES_NOT_INDIVIDUAL: "教育費は、文部科学省の調査による全国平均で、個別の費用とは異なります。",
  UNIVERSITY_TUITION_ONLY: "大学は学費のみです。仕送り・通学費・住居費は含みません。",
  SIMPLIFIED_EVEN_YEARLY_MODEL: "年単位の簡易計算です。月ごとの収支の波や、年の途中の出来事は反映しません。",
  AGES_ARE_SCHOOL_YEAR_AGES: "お子さんの年齢は、その年度に通う学年に対応する年齢（4月1日時点）として計算しています。",
  PENSION_AMOUNT_IS_USER_INPUT: "年金額は入力値です。ねんきん定期便などでご確認ください。",
};

/** 「前提と含まれないもの」の表示文。未知のコードは表示しない。 */
export function lifePlanNoteMessages(codes: readonly string[]): string[] {
  return codes.flatMap((c) => (Object.prototype.hasOwnProperty.call(NOTE_TEXT, c) ? [NOTE_TEXT[c]] : []));
}

export { dateLabel, isHttpUrl } from "./taxDeduction";
