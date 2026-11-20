import type {
  RepaymentRequest,
  RepaymentMethod,
  ScheduleRow,
} from "./api/simulation";

export type FormValues = {
  principalMan: string;
  rate: string;
  years: string;
  method: RepaymentMethod;
  useBonus: boolean;
  bonusMan: string;
};

export type FormErrors = Partial<
  Record<
    "principalMan" | "rate" | "years" | "bonusMan" | "selfSharePercent",
    string
  >
>;

/** 二人で借りる（負担割合を分ける）設定。フォームの共通条件とは別に持つ。 */
export type PairOptions = { enabled: boolean; selfPercent: string };
export const initialPair: PairOptions = { enabled: false, selfPercent: "50" };

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const toYen = (man: number) => Math.round(man * 10000);

export function validate(
  v: FormValues,
  pair: PairOptions = initialPair,
): { request: RepaymentRequest | null; errors: FormErrors } {
  const errors: FormErrors = {};
  const man = num(v.principalMan);
  const principal = toYen(man);
  if (!Number.isFinite(man))
    errors.principalMan = "借入金額を入力してください。";
  else if (principal < 1 || principal > 1_000_000_000)
    errors.principalMan =
      "借入金額は10億円以下で、1円以上になるよう入力してください。";

  const rate = num(v.rate);
  if (!Number.isFinite(rate)) errors.rate = "金利を入力してください。";
  else if (rate < 0 || rate > 20)
    errors.rate = "金利は0%以上20%以下で入力してください。";

  const years = num(v.years);
  if (!Number.isFinite(years)) errors.years = "返済期間を入力してください。";
  else if (!Number.isInteger(years) || years < 1 || years > 50)
    errors.years = "返済期間は1〜50年の整数で入力してください。";

  let bonus = 0;
  if (v.useBonus) {
    const b = num(v.bonusMan);
    if (!Number.isFinite(b))
      errors.bonusMan = "ボーナス返済分の借入額を入力してください。";
    else {
      bonus = toYen(b);
      if (b < 0) errors.bonusMan = "0円以上で入力してください。";
      else if (!errors.principalMan && bonus > principal)
        errors.bonusMan = "ボーナス返済分は借入金額以下にしてください。";
    }
  }
  let selfSharePercent: number | null = null;
  if (pair.enabled) {
    const p = num(pair.selfPercent);
    if (!Number.isFinite(p))
      errors.selfSharePercent = "あなたの負担割合を入力してください。";
    else if (!Number.isInteger(p) || p < 1 || p > 99)
      errors.selfSharePercent = "負担割合は1〜99の整数で入力してください。";
    else selfSharePercent = p;
  }
  if (Object.keys(errors).length > 0) return { request: null, errors };
  const request: RepaymentRequest = {
    principal,
    annualRatePercent: rate,
    years,
    method: v.method,
  };
  if (v.useBonus) request.bonusAmount = bonus;
  if (selfSharePercent !== null) request.selfSharePercent = selfSharePercent;
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
    const y = map.get(year) ?? {
      year,
      payment: 0,
      bonusPayment: 0,
      principal: 0,
      interest: 0,
      balance: 0,
    };
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

export const ESTIMATE_NOTE =
  "試算結果は目安であり、実際の返済額・審査結果を保証するものではありません。";

const METHOD_LABEL: Record<RepaymentMethod, string> = {
  EQUAL_PAYMENT: "元利均等返済",
  EQUAL_PRINCIPAL: "元金均等返済",
};

/** 試算日の表記（例：2026年11月20日）。 */
export function formatDateJa(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 計算に使った借入条件の行（印刷・CSVで共通）。ボーナス・負担割合は使った場合だけ出す。
 * plain=true は CSV 用（金額は整数、単位の文字を付けない）、false は画面・印刷用。
 */
export function loanConditionRows(
  req: RepaymentRequest,
  date: string,
  plain: boolean,
): Array<[string, string | number]> {
  const rows: Array<[string, string | number]> = [
    ["借入額", plain ? req.principal : yen(req.principal)],
    [
      "金利（年率）",
      plain ? req.annualRatePercent : `${req.annualRatePercent}%`,
    ],
    ["返済期間", plain ? req.years : `${req.years}年`],
    ["返済方式", METHOD_LABEL[req.method]],
  ];
  if (req.bonusAmount !== undefined)
    rows.push([
      "ボーナス返済の借入額",
      plain ? req.bonusAmount : yen(req.bonusAmount),
    ]);
  if (req.selfSharePercent !== undefined)
    rows.push([
      "あなたの負担割合",
      plain ? req.selfSharePercent : `${req.selfSharePercent}%`,
    ]);
  rows.push(["試算日", date]);
  return rows;
}

type Q = string | string[] | undefined;

/** Initial form values from URL query (rate %, principal 万円, years). Invalid values are ignored. */
export function initialFromQuery(q: {
  rate?: Q;
  principal?: Q;
  years?: Q;
}): Partial<FormValues> {
  const out: Partial<FormValues> = {};
  const dec = (v: Q) =>
    typeof v === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(v) ? v : null;
  const rate = dec(q.rate);
  if (rate !== null && Number(rate) <= 20) out.rate = rate;
  const principal = dec(q.principal);
  if (
    principal !== null &&
    Number(principal) >= 1 &&
    Number(principal) <= 100000
  )
    out.principalMan = principal;
  const years =
    typeof q.years === "string" && /^\d{1,2}$/.test(q.years)
      ? Number(q.years)
      : null;
  if (years !== null && years >= 1 && years <= 50) out.years = String(years);
  return out;
}

/** 二人で借りる設定の初期値（URLクエリ）。pair=1 または share=1〜99 で有効。share は あなたの負担割合。 */
export function pairInitialFromQuery(q: { pair?: Q; share?: Q }): PairOptions {
  const share =
    typeof q.share === "string" && /^\d{1,2}$/.test(q.share)
      ? Number(q.share)
      : null;
  if (share !== null && share >= 1 && share <= 99)
    return { enabled: true, selfPercent: String(share) };
  if (q.pair === "1") return { enabled: true, selfPercent: "50" };
  return initialPair;
}

export const AGE_MIN = 18;
export const AGE_MAX = 80;

/** 現在の年齢の入力。空欄は未入力（null）、範囲外・小数は無効（null）。 */
export function parseAge(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= AGE_MIN && n <= AGE_MAX ? n : null;
}

/** 年齢入力のエラー文。空欄・有効値はエラーなし。 */
export function ageError(s: string): string | undefined {
  if (s.trim() === "" || parseAge(s) !== null) return undefined;
  return `現在の年齢は${AGE_MIN}〜${AGE_MAX}の整数で入力してください。`;
}

/** 完済時の年齢の目安（現在の年齢 + 返済期間）。 */
export function payoffAge(age: number, years: number): number {
  return age + years;
}

/** 差分の表記（B−A）。0は符号なし、正は「+」、負は「−」。 */
export function signedDiff(n: number, unit: string): string {
  if (n === 0) return `0${unit}`;
  const sign = n > 0 ? "+" : "−";
  return `${sign}${Math.abs(n).toLocaleString("ja-JP")}${unit}`;
}

export type PlanSummary = {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  years: number;
  /** 計算に使った金利（%）。結果を出したリクエストの値を入れる。 */
  annualRatePercent: number;
  method: RepaymentMethod;
};

export type CompareRow = { label: string; a: string; b: string; diff: string };

/** 金利の差（B−A・%）。小数の誤差を丸めてから符号付きで表す。 */
function rateDiff(a: number, b: number): string {
  const d = Math.round((b - a) * 1e6) / 1e6;
  if (d === 0) return "0%";
  const sign = d > 0 ? "+" : "−";
  return `${sign}${Math.abs(d).toLocaleString("ja-JP", { maximumFractionDigits: 6 })}%`;
}

/**
 * プランA・Bの比較行（金利・返済方式・毎月の返済額（初回）・総返済額・利息総額・返済期間）。差は B−A。
 * 返済方式は数値でないので差は「—」。
 */
export function compareRows(a: PlanSummary, b: PlanSummary): CompareRow[] {
  return [
    {
      label: "金利（年率）",
      a: `${a.annualRatePercent}%`,
      b: `${b.annualRatePercent}%`,
      diff: rateDiff(a.annualRatePercent, b.annualRatePercent),
    },
    {
      label: "返済方式",
      a: METHOD_LABEL[a.method],
      b: METHOD_LABEL[b.method],
      diff: "—",
    },
    {
      label: "毎月の返済額（初回）",
      a: yen(a.monthlyPayment),
      b: yen(b.monthlyPayment),
      diff: signedDiff(b.monthlyPayment - a.monthlyPayment, "円"),
    },
    {
      label: "総返済額",
      a: yen(a.totalPayment),
      b: yen(b.totalPayment),
      diff: signedDiff(b.totalPayment - a.totalPayment, "円"),
    },
    {
      label: "利息総額",
      a: yen(a.totalInterest),
      b: yen(b.totalInterest),
      diff: signedDiff(b.totalInterest - a.totalInterest, "円"),
    },
    {
      label: "返済期間",
      a: `${a.years}年`,
      b: `${b.years}年`,
      diff: signedDiff(b.years - a.years, "年"),
    },
  ];
}
