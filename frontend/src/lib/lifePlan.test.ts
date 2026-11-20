import { describe, expect, it } from "vitest";
import {
  ADVANCED_KEYS,
  type LifePlanForm,
  lifePlanNoteMessages,
  manApprox,
  newChild,
  shortfallSentence,
  validateLifePlan,
  yenSigned,
} from "./lifePlan";

const base: LifePlanForm = {
  age: "35",
  takeHomeMan: "600",
  livingMan: "20",
  savingsMan: "500",
  loanMan: "4000",
  rate: "1.2",
  years: "35",
  children: [],
  retireAge: "65",
  pensionAge: "65",
  retireIncomeMan: "240",
  retireLivingMan: "22",
  growth: "0",
  returnRate: "0",
  endAge: "95",
  upfrontMan: "0",
  method: "EQUAL_PAYMENT",
  housingMonthly: "25000",
  housingTaxYearly: "120000",
};
const w = (o: Partial<LifePlanForm>): LifePlanForm => ({ ...base, ...o });
const errs = (o: Partial<LifePlanForm>) => validateLifePlan(w(o)).errors;

describe("validateLifePlan", () => {
  it("maps defaults to the request shape (万円 → 円)", () => {
    const { request, errors } = validateLifePlan(base);
    expect(errors).toEqual({});
    expect(request).toEqual({
      currentAge: 35,
      retireAge: 65,
      pensionStartAge: 65,
      lifeEndAge: 95,
      annualTakeHomeIncome: 6_000_000,
      incomeGrowthPercent: 0,
      retirementAnnualIncome: 2_400_000,
      monthlyLivingCost: 200_000,
      retirementMonthlyLivingCost: 220_000,
      savings: 5_000_000,
      savingsReturnPercent: 0,
      upfrontPayment: 0,
      loanPrincipal: 40_000_000,
      annualRatePercent: 1.2,
      years: 35,
      method: "EQUAL_PAYMENT",
      monthlyHousingCost: 25_000,
      annualHousingTax: 120_000,
    });
  });

  it("loan 0 means no loan: rate/years are not sent or validated", () => {
    const r = validateLifePlan(w({ loanMan: "0", rate: "abc", years: "" }));
    expect(r.errors).toEqual({});
    expect(r.request?.loanPrincipal).toBe(0);
    expect(r.request).not.toHaveProperty("annualRatePercent");
    expect(r.request).not.toHaveProperty("years");
    expect(r.request).not.toHaveProperty("method");
  });

  it("housing costs are sent even when there is no loan (renter / owner without a loan)", () => {
    const r = validateLifePlan(w({ loanMan: "0", housingMonthly: "130000", housingTaxYearly: "50000" }));
    expect(r.errors).toEqual({});
    expect(r.request?.monthlyHousingCost).toBe(130_000);
    expect(r.request?.annualHousingTax).toBe(50_000);
    expect(errs({ loanMan: "0", housingMonthly: "10000001" }).housingMonthly).toBeDefined();
  });

  it("loan > 0 requires valid rate (0..20) and years (1..50 integer)", () => {
    expect(errs({ rate: "" }).rate).toBeDefined();
    expect(errs({ rate: "20.1" }).rate).toBeDefined();
    expect(errs({ rate: "20" }).rate).toBeUndefined();
    expect(errs({ years: "51" }).years).toBeDefined();
    expect(errs({ years: "0" }).years).toBeDefined();
    expect(errs({ years: "35.5" }).years).toBeDefined();
  });

  it("age ranges and ordering: 18..70, retire > age ≤ 80, end > retire ≤ 100, pension 50..80", () => {
    expect(errs({ age: "17" }).age).toBeDefined();
    expect(errs({ age: "71" }).age).toBeDefined();
    expect(errs({ age: "18" }).age).toBeUndefined();
    expect(errs({ retireAge: "35" }).retireAge).toBeDefined();
    expect(errs({ retireAge: "36" }).retireAge).toBeUndefined();
    expect(errs({ retireAge: "81" }).retireAge).toBeDefined();
    expect(errs({ endAge: "65" }).endAge).toBeDefined();
    expect(errs({ endAge: "101" }).endAge).toBeDefined();
    expect(errs({ endAge: "100" }).endAge).toBeUndefined();
    expect(errs({ pensionAge: "49" }).pensionAge).toBeDefined();
    expect(errs({ pensionAge: "80" }).pensionAge).toBeUndefined();
    expect(errs({ pensionAge: "81" }).pensionAge).toBeDefined();
  });

  it("money fields: blank rejected, negatives and over-limit rejected", () => {
    expect(errs({ takeHomeMan: "" }).takeHomeMan).toBeDefined();
    expect(errs({ takeHomeMan: "-1" }).takeHomeMan).toBeDefined();
    expect(errs({ takeHomeMan: "100000" }).takeHomeMan).toBeUndefined();
    expect(errs({ takeHomeMan: "100001" }).takeHomeMan).toBeDefined();
    expect(errs({ livingMan: "1000" }).livingMan).toBeUndefined();
    expect(errs({ livingMan: "1001" }).livingMan).toBeDefined();
    expect(errs({ savingsMan: "1000000" }).savingsMan).toBeUndefined();
    expect(errs({ savingsMan: "1000001" }).savingsMan).toBeDefined();
  });

  it("rates: growth 0..5, return 0..10", () => {
    expect(errs({ growth: "5" }).growth).toBeUndefined();
    expect(errs({ growth: "5.1" }).growth).toBeDefined();
    expect(errs({ returnRate: "10" }).returnRate).toBeUndefined();
    expect(errs({ returnRate: "10.1" }).returnRate).toBeDefined();
    expect(errs({ returnRate: "-1" }).returnRate).toBeDefined();
  });

  it("housing costs: 0..10,000,000 integer yen", () => {
    expect(errs({ housingMonthly: "10000001" }).housingMonthly).toBeDefined();
    expect(errs({ housingTaxYearly: "10000000" }).housingTaxYearly).toBeUndefined();
    expect(errs({ housingMonthly: "1.5" }).housingMonthly).toBeDefined();
    expect(validateLifePlan(w({ housingMonthly: "" })).request?.monthlyHousingCost).toBe(0);
  });

  it("children are sent as given and validated (age 0..21 integer)", () => {
    const c = { ...newChild(), age: "10", schoolPlan: "PRIVATE_HIGH" as const, university: "PRIVATE" as const };
    const r = validateLifePlan(w({ children: [c] }));
    expect(r.request?.children).toEqual([{ age: 10, schoolPlan: "PRIVATE_HIGH", university: "PRIVATE" }]);
    expect(validateLifePlan(w({ children: [] })).request).not.toHaveProperty("children");
    const bad = validateLifePlan(w({ children: [{ ...c, age: "22" }, c, { ...c, age: "" }] }));
    expect(bad.request).toBeNull();
    expect(bad.errors.children?.[0].age).toBeDefined();
    expect(bad.errors.children?.[1].age).toBeUndefined();
    expect(bad.errors.children?.[2].age).toBeDefined();
    expect(validateLifePlan(w({ children: [{ ...c, age: "0" }, { ...c, age: "21" }] })).errors).toEqual({});
  });

  it("ADVANCED_KEYS lists only collapsed fields", () => {
    for (const k of ["age", "takeHomeMan", "livingMan", "savingsMan", "loanMan", "rate", "years"]) {
      expect(ADVANCED_KEYS).not.toContain(k);
    }
    expect(ADVANCED_KEYS).toContain("retireAge");
  });
});

describe("formatting and wording", () => {
  it("manApprox / yenSigned", () => {
    expect(manApprox(52_000_000)).toBe("5,200万円");
    expect(manApprox(-12_345_678)).toBe("−1,235万円");
    expect(manApprox(-100)).toBe("0万円");
    expect(yenSigned(-1500)).toBe("−1,500円");
    expect(yenSigned(1500)).toBe("1,500円");
  });

  it("shortfall sentence states the condition and gives no verdict", () => {
    const s = {
      firstShortfallAge: 78,
      minSavings: 0,
      minSavingsAge: 90,
      savingsAtRetirement: 0,
      savingsAtEnd: 0,
      loanPayoffAge: null,
      totalEducationCost: 0,
      peakEducationCost: null,
      peakEducationAge: null,
      totalLoanPayment: 0,
    };
    const a = shortfallSentence(s, 95);
    expect(a).toContain("78歳");
    expect(a).toContain("入力した条件では");
    const b = shortfallSentence({ ...s, firstShortfallAge: null }, 95);
    expect(b).toContain("95歳までの間");
    expect(b).toContain("マイナスになりません");
    for (const t of [a, b]) expect(t).not.toMatch(/安心|問題なし|危険|必ず|確実|おすすめ|お得/);
  });

  it("note codes map in order; unknown (and prototype keys) are ignored", () => {
    const t = lifePlanNoteMessages(["TODAYS_YEN_NO_INFLATION", "ZZZ", "toString", "UNIVERSITY_TUITION_ONLY"]);
    expect(t).toHaveLength(2);
    expect(lifePlanNoteMessages([])).toEqual([]);
    const all = lifePlanNoteMessages([
      "TODAYS_YEN_NO_INFLATION",
      "INCOME_AND_COSTS_ARE_USER_INPUTS",
      "EDUCATION_AVERAGES_NOT_INDIVIDUAL",
      "UNIVERSITY_TUITION_ONLY",
      "SIMPLIFIED_EVEN_YEARLY_MODEL",
      "AGES_ARE_SCHOOL_YEAR_AGES",
      "PENSION_AMOUNT_IS_USER_INPUT",
    ]);
    expect(all).toHaveLength(7);
    for (const x of all) expect(x).not.toMatch(/安心|問題なし|危険|必ず|確実|おすすめ|お得/);
  });
});
