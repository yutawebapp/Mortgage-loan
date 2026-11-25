import { expect, test } from "@playwright/test";
import type { BudgetRequest, BudgetResponse } from "../src/lib/api/budget";
import type { RepaymentRequest, RepaymentResponse, ScheduleRow, PairBreakdown, PairPerson } from "../src/lib/api/simulation";
import type { RefinanceRequest, RefinanceResponse, LoanSummary, CumulativeSavingPoint } from "../src/lib/api/refinance";
import type { RateScenarioRequest, RateScenarioResponse, RateScenarioResult } from "../src/lib/api/rate-scenario";
import type { TaxDeductionRequest, TaxDeductionResponse, TaxDeductionRule, TaxDeductionYear, TaxDeductionTotals, TaxDeductionAssumptions, TaxDeductionPerson } from "../src/lib/api/taxDeduction";

// The mapped type requires a validator for every handwritten field and checks its value type.
// Runtime assertions check actual JSON, including nested array members; extra server fields are harmless.
type Validator<T> = (value: unknown, path: string) => value is T;
type Shape<T> = { [K in keyof T]-?: Validator<T[K]> };
const number: Validator<number> = (v, p): v is number => { expect(typeof v, p).toBe("number"); return true; };
const string: Validator<string> = (v, p): v is string => { expect(typeof v, p).toBe("string"); return true; };
const boolean: Validator<boolean> = (v, p): v is boolean => { expect(typeof v, p).toBe("boolean"); return true; };
function oneOf<T extends string>(...values: T[]): Validator<T> {
  return (v, p): v is T => { expect(values, p).toContain(v); return true; };
}
function nullable<T>(inner: Validator<T>): Validator<T | null> {
  return (v, p): v is T | null => v === null || inner(v, p);
}
function array<T>(inner: Validator<T>): Validator<T[]> {
  return (v, p): v is T[] => {
    expect(Array.isArray(v), p).toBe(true);
    (v as unknown[]).forEach((item, i) => inner(item, `${p}[${i}]`));
    return true;
  };
}
function object<T>(shape: Shape<T>): Validator<T> {
  return (v, p): v is T => {
    expect(v !== null && typeof v === "object" && !Array.isArray(v), p).toBe(true);
    const record = v as Record<string, unknown>;
    for (const [key, validate] of Object.entries(shape) as [string, Validator<unknown>][]) {
      expect(record, `${p}.${key}`).toHaveProperty(key);
      validate(record[key], `${p}.${key}`);
    }
    return true;
  };
}

const schedule = object<ScheduleRow>({ month: number, payment: number, bonusPayment: number, principal: number, interest: number, balance: number });
const person = object<PairPerson>({ principal: number, bonusAmount: number, monthlyPayment: number, bonusPayment: number, totalPayment: number, totalInterest: number });
const pair = object<PairBreakdown>({ self: person, partner: person, notes: array(string) });
const repayment = object<RepaymentResponse>({ monthlyPayment: number, bonusPayment: number, totalPayment: number, totalInterest: number, schedule: array(schedule), pairBreakdown: nullable(pair) });
const budget = object<BudgetResponse>({ maxPropertyPrice: number, maxLoanAmount: number, downPayment: number, totalBudget: number, closingCosts: number, closingCostRatePercent: number, monthlyPayment: number, loanExceedsPrice: boolean, burdenRatioPercent: nullable(number) });
const loan = object<LoanSummary>({ monthlyPayment: number, totalPayment: number, totalInterest: number });
const point = object<CumulativeSavingPoint>({ month: number, net: number });
const refinance = object<RefinanceResponse>({ current: loan, refinanced: loan, refinanceCosts: number, monthlySaving: number, totalSaving: number, breakEvenMonth: nullable(number), cumulativeSaving: array(point) });
const scenario = object<RateScenarioResult>({ risePoints: number, rateAfterPercent: number, monthlyPaymentBefore: number, monthlyPaymentAfter: number, monthlyPaymentIncrease: number, monthlyPaymentDifferenceVsBaseline: number, totalPayment: number, totalInterest: number, extraInterestVsBaseline: number, monthlyPayments: array(number) });
const rateScenario = object<RateScenarioResponse>({ baseline: scenario, scenarios: array(scenario) });
const year = object<TaxDeductionYear>({ year: number, ordinal: number, annualPayment: number, yearEndBalance: number, deductionBase: number, deductionCap: number, incomeTaxBefore: number, incomeTaxAfter: number, residentTaxEstimate: number, incomeTaxCredit: number, residentTaxCredit: number, totalDeduction: number, unclaimed: number });
const totals = object<TaxDeductionTotals>({ totalDeduction: number, totalUnclaimed: number, totalPayment: number, netCost: number, listedYears: number });
const rule = object<TaxDeductionRule>({ limitAmount: number, deductionYears: number, ratePercent: number, childcareApplied: boolean, conditionCode: string, sourceUrl: string, verifiedOn: string });
const assumptions = object<TaxDeductionAssumptions>({ annualIncome: number, socialInsuranceRatePercent: number, estimatedTotalIncome: number, estimatedIncomeTaxBase: number, residentCapPerYear: number, taxParameterVerifiedOn: string, taxParameterSources: array(string), notes: array(string) });
const taxPerson = object<TaxDeductionPerson>({ role: oneOf("A", "B"), principal: number, limitAmount: nullable(number), eligible: boolean, ineligibleReason: nullable(string), years: array(year), totals: nullable(totals) });
const tax = object<TaxDeductionResponse>({ mode: oneOf("SINGLE", "PAIR_LOAN", "JOINT_DEBT", "JOINT_GUARANTEE"), persons: nullable(array(taxPerson)), eligible: boolean, ineligibleReason: nullable(string), rule: nullable(rule), years: array(year), totals: nullable(totals), assumptions: nullable(assumptions) });

test("実APIレスポンスと手書き型の契約", async ({ request }) => {
  const loanRequest = { principal: 40000000, annualRatePercent: 1.2, years: 35, method: "EQUAL_PAYMENT" } as const;
  const taxRequest = { ...loanRequest, housingType: "NEW", energyClass: "ZEH", moveInYear: 2026, moveInMonth: 4, floorAreaCategory: "FROM_40_TO_UNDER_50", annualIncome: 6000000, mode: "PAIR_LOAN", partnerAnnualIncome: 12000000 } satisfies TaxDeductionRequest;
  const cases = [
    ["repayment", { ...loanRequest, selfSharePercent: 50 } satisfies RepaymentRequest, repayment],
    ["repayment", loanRequest satisfies RepaymentRequest, repayment],
    ["budget", { desiredMonthlyPayment: 117000, annualRatePercent: 1.2, years: 35 } satisfies BudgetRequest, budget],
    ["refinance", { remainingBalance: 30000000, currentAnnualRatePercent: 1.5, remainingYears: 30, newAnnualRatePercent: 1, newYears: 30, method: "EQUAL_PAYMENT" } satisfies RefinanceRequest, refinance],
    ["rate-scenarios", { ...loanRequest, riseAfterYears: 5, risePoints: [1] } satisfies RateScenarioRequest, rateScenario],
    ["tax-deduction", taxRequest, tax],
    ["tax-deduction", { ...taxRequest, floorAreaCategory: "UNDER_40" } satisfies TaxDeductionRequest, tax],
  ] as const;
  for (const [endpoint, body, validate] of cases) {
    const response = await request.post(`/api/v1/simulations/${endpoint}`, { data: body });
    expect(response.ok(), `${endpoint}: ${response.status()}`).toBe(true);
    const data = await response.json();
    validate(data, endpoint);
    if (endpoint === "repayment") expect(data.schedule.length).toBeGreaterThan(0);
    if (endpoint === "refinance") expect(data.cumulativeSaving.length).toBeGreaterThan(0);
    if (endpoint === "rate-scenarios") {
      expect(data.scenarios.length).toBeGreaterThan(0);
      expect(data.scenarios[0].monthlyPayments.length).toBeGreaterThan(0);
    }
    if (endpoint === "tax-deduction" && data.eligible) {
      expect(data.years.length).toBeGreaterThan(0);
      expect(data.persons.length).toBe(2);
      expect(data.persons[0].years.length).toBeGreaterThan(0);
    }
  }
});
