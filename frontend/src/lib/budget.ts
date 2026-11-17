import type { BudgetRequest } from "./api/budget";

export type BudgetForm = {
  downMan: string;
  monthlyMan: string;
  rate: string;
  years: string;
  closingRate: string;
  incomeMan: string; // optional: "" = not entered
};

export type BudgetErrors = Partial<Record<keyof BudgetForm, string>>;

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const toYen = (man: number) => Math.round(man * 10000);

export function validateBudget(v: BudgetForm): { request: BudgetRequest | null; errors: BudgetErrors } {
  const errors: BudgetErrors = {};

  const downMan = num(v.downMan);
  const down = toYen(downMan);
  if (!Number.isFinite(downMan)) errors.downMan = "頭金を入力してください（なければ0）。";
  else if (down < 0 || down > 1_000_000_000) errors.downMan = "頭金は0円以上10億円以下で入力してください。";

  const monMan = num(v.monthlyMan);
  const monthly = toYen(monMan);
  if (!Number.isFinite(monMan)) errors.monthlyMan = "希望する毎月の返済額を入力してください。";
  else if (monthly < 1 || monthly > 10_000_000)
    errors.monthlyMan = "毎月の返済額は1円以上1,000万円以下で入力してください。";

  const rate = num(v.rate);
  if (!Number.isFinite(rate)) errors.rate = "金利を入力してください。";
  else if (rate < 0 || rate > 20) errors.rate = "金利は0%以上20%以下で入力してください。";

  const years = num(v.years);
  if (!Number.isFinite(years)) errors.years = "返済期間を入力してください。";
  else if (!Number.isInteger(years) || years < 1 || years > 50)
    errors.years = "返済期間は1〜50年の整数で入力してください。";

  const cr = num(v.closingRate);
  if (!Number.isFinite(cr)) errors.closingRate = "諸費用の割合を入力してください。";
  else if (cr < 0 || cr > 30) errors.closingRate = "諸費用の割合は0%以上30%以下で入力してください。";

  let income: number | undefined;
  if (v.incomeMan.trim() !== "") {
    const incMan = num(v.incomeMan);
    income = toYen(incMan);
    if (!Number.isFinite(incMan) || income < 1 || income > 1_000_000_000)
      errors.incomeMan = "年収は10億円以下で、1円以上になるよう入力してください。";
  }

  if (Object.keys(errors).length > 0) return { request: null, errors };
  const request: BudgetRequest = {
    downPayment: down,
    desiredMonthlyPayment: monthly,
    annualRatePercent: rate,
    years,
    closingCostRatePercent: cr,
  };
  if (income !== undefined) request.annualIncome = income;
  return { request, errors };
}

type Q = string | string[] | undefined;

/** Initial form values from ?rate= (0..20) and ?years= (1..50). Invalid values are ignored. */
export function budgetInitialFromQuery(q: { rate?: Q; years?: Q }): Partial<BudgetForm> {
  const out: Partial<BudgetForm> = {};
  const r = q.rate;
  if (typeof r === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(r) && Number(r) <= 20) out.rate = r;
  const y = q.years;
  if (typeof y === "string" && /^\d{1,2}$/.test(y) && Number(y) >= 1 && Number(y) <= 50) out.years = y;
  return out;
}

/** 円 → 「1,234万円」 (floors to 万円). */
export function manLabel(yenAmount: number): string {
  return `${Math.floor(yenAmount / 10000).toLocaleString("ja-JP")}万円`;
}

/** Share (0..100) of a part in a whole, for bar widths. */
export function sharePercent(part: number, whole: number): number {
  if (!(whole > 0) || !(part > 0)) return 0;
  return Math.min(100, (part / whole) * 100);
}

export { simulationHref } from "./eligibility";
