import { ApiError, type ProblemDetail, type RepaymentMethod } from "./simulation";

export { ApiError };

export type SchoolPlan = "ALL_PUBLIC" | "PRIVATE_HIGH" | "PRIVATE_JUNIOR_AND_HIGH" | "ALL_PRIVATE";
export type UniversityPlan = "NONE" | "NATIONAL" | "PRIVATE";

export type LifePlanChild = {
  /** 0..21。その年度に通う学年に対応する年齢（4月1日時点）。 */
  age: number;
  schoolPlan: SchoolPlan;
  university: UniversityPlan;
};

export type LifePlanRequest = {
  currentAge: number;
  retireAge?: number;
  pensionStartAge?: number;
  lifeEndAge?: number;
  annualTakeHomeIncome: number;
  incomeGrowthPercent?: number;
  retirementAnnualIncome?: number;
  monthlyLivingCost: number;
  retirementMonthlyLivingCost: number;
  savings: number;
  savingsReturnPercent?: number;
  upfrontPayment?: number;
  /** 0 は借入なし。0 より大きいときは、金利・返済期間が必要。 */
  loanPrincipal?: number;
  annualRatePercent?: number;
  years?: number;
  method?: RepaymentMethod;
  monthlyHousingCost?: number;
  annualHousingTax?: number;
  children?: LifePlanChild[];
};

export type LifePlanYear = {
  age: number;
  income: number;
  livingCost: number;
  loanPayment: number;
  loanBalance: number;
  housingCost: number;
  educationCost: number;
  /** マイナスになることがある。 */
  netCashFlow: number;
  /** マイナスになることがある。 */
  savingsClosing: number;
};

export type LifePlanSummary = {
  firstShortfallAge: number | null;
  minSavings: number;
  minSavingsAge: number;
  savingsAtRetirement: number;
  savingsAtEnd: number;
  loanPayoffAge: number | null;
  totalEducationCost: number;
  peakEducationCost: number | null;
  peakEducationAge: number | null;
  totalLoanPayment: number;
};

export type LifePlanSource = { label: string; url: string; verifiedOn: string };

export type LifePlanResponse = {
  years: LifePlanYear[];
  summary: LifePlanSummary;
  sources: LifePlanSource[];
  /** TODAYS_YEN_NO_INFLATION, INCOME_AND_COSTS_ARE_USER_INPUTS, EDUCATION_AVERAGES_NOT_INDIVIDUAL, UNIVERSITY_TUITION_ONLY, SIMPLIFIED_EVEN_YEARLY_MODEL, AGES_ARE_SCHOOL_YEAR_AGES, PENSION_AMOUNT_IS_USER_INPUT など。 */
  notes: string[];
};

export async function calculateLifePlan(body: LifePlanRequest, signal?: AbortSignal): Promise<LifePlanResponse> {
  const res = await fetch("/api/v1/simulations/life-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const p = (await res.json()) as ProblemDetail;
      detail = p.detail ?? p.title ?? "";
    } catch {
      /* ignore non-JSON body */
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as LifePlanResponse;
}
