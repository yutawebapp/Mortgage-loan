import type { EligibilityRequest } from "./api/eligibility";

export type EligibilityForm = {
  incomeMan: string;
  otherMan: string;
  rate: string;
  years: string;
  screeningRate: string;
};

export type EligibilityErrors = Partial<Record<keyof EligibilityForm, string>>;

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const toYen = (man: number) => Math.round(man * 10000);

export function validateEligibility(v: EligibilityForm): {
  request: EligibilityRequest | null;
  errors: EligibilityErrors;
} {
  const errors: EligibilityErrors = {};

  const incMan = num(v.incomeMan);
  const income = toYen(incMan);
  if (!Number.isFinite(incMan)) errors.incomeMan = "年収（額面）を入力してください。";
  else if (income < 1 || income > 1_000_000_000)
    errors.incomeMan = "年収は10億円以下で、1円以上になるよう入力してください。";

  const othMan = num(v.otherMan);
  const other = toYen(othMan);
  if (!Number.isFinite(othMan)) errors.otherMan = "他の借入の年間返済額を入力してください（なければ0）。";
  else if (other < 0 || other > 1_000_000_000)
    errors.otherMan = "他の借入の年間返済額は0円以上10億円以下で入力してください。";

  const rateCheck = (s: string, label: string) => {
    const r = num(s);
    if (!Number.isFinite(r)) return `${label}を入力してください。`;
    if (r < 0 || r > 20) return `${label}は0%以上20%以下で入力してください。`;
    return undefined;
  };
  const e1 = rateCheck(v.rate, "借入予定の金利");
  if (e1) errors.rate = e1;
  const e2 = rateCheck(v.screeningRate, "審査金利");
  if (e2) errors.screeningRate = e2;

  const years = num(v.years);
  if (!Number.isFinite(years)) errors.years = "返済期間を入力してください。";
  else if (!Number.isInteger(years) || years < 1 || years > 50)
    errors.years = "返済期間は1〜50年の整数で入力してください。";

  if (Object.keys(errors).length > 0) return { request: null, errors };
  return {
    request: {
      annualIncome: income,
      otherAnnualRepayments: other,
      annualRatePercent: num(v.rate),
      years,
      screeningRatePercent: num(v.screeningRate),
    },
    errors,
  };
}

type Q = string | string[] | undefined;

/** Initial form values from ?rate= (0..20) and ?years= (1..50). Invalid values are ignored. */
export function eligibilityInitialFromQuery(q: { rate?: Q; years?: Q }): Partial<EligibilityForm> {
  const out: Partial<EligibilityForm> = {};
  const r = q.rate;
  if (typeof r === "string" && /^\d{1,9}(\.\d{1,6})?$/.test(r) && Number(r) <= 20) out.rate = r;
  const y = q.years;
  if (typeof y === "string" && /^\d{1,2}$/.test(y) && Number(y) >= 1 && Number(y) <= 50) out.years = y;
  return out;
}

/** 円 → 「約1,234万円」 (value is a multiple of 10,000 yen from the API). */
export function manLabel(yenAmount: number): string {
  return `${Math.floor(yenAmount / 10000).toLocaleString("ja-JP")}万円`;
}

/** Link to the simulator. principal is omitted when outside the simulator's accepted range. */
export function simulationHref(maxPrincipalYen: number, rate: number, years: number): string {
  const p = new URLSearchParams();
  const man = Math.floor(maxPrincipalYen / 10000);
  if (man >= 1 && man <= 100000) p.set("principal", String(man));
  p.set("rate", String(rate));
  p.set("years", String(years));
  return `/simulation?${p.toString()}`;
}
