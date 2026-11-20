import { describe, expect, it } from "vitest";
import {
  type EligibilityForm,
  eligibilityInitialFromQuery,
  manLabel,
  simulationHref,
  validateEligibility,
  eligibilityModeNote,
  eligibilityNoteTexts,
} from "./eligibility";

const base: EligibilityForm = {
  incomeMan: "600",
  otherMan: "12",
  rate: "1.2",
  years: "35",
  screeningRate: "3.5",
  mode: "SINGLE",
  partnerIncomeMan: "300",
  partnerOtherMan: "0",
  partnerCountPercent: "50",
};
const withOverrides = (o: Partial<EligibilityForm>): EligibilityForm => ({ ...base, ...o });

describe("validateEligibility", () => {
  it("converts 万円 to yen and maps to the request shape", () => {
    const { request, errors } = validateEligibility(base);
    expect(errors).toEqual({});
    expect(request).toEqual({
      annualIncome: 6_000_000,
      otherAnnualRepayments: 120_000,
      annualRatePercent: 1.2,
      years: 35,
      screeningRatePercent: 3.5,
      mode: "SINGLE",
    });
  });

  it("income boundaries: 1円 ok, 10億円 ok, above rejected", () => {
    expect(validateEligibility(withOverrides({ incomeMan: "0.0001" })).request?.annualIncome).toBe(1);
    expect(validateEligibility(withOverrides({ incomeMan: "100000" })).request?.annualIncome).toBe(1_000_000_000);
    expect(validateEligibility(withOverrides({ incomeMan: "100000.0001" })).errors.incomeMan).toBeDefined();
    expect(validateEligibility(withOverrides({ incomeMan: "0.00004" })).errors.incomeMan).toBeDefined();
  });

  it("other repayments allow 0 (なければ0) and reject negative", () => {
    expect(validateEligibility(withOverrides({ otherMan: "0" })).request?.otherAnnualRepayments).toBe(0);
    expect(validateEligibility(withOverrides({ otherMan: "-1" })).errors.otherMan).toBe(
      "他の借入の年間返済額は0円以上10億円以下で入力してください。",
    );
    expect(validateEligibility(withOverrides({ otherMan: "100000" })).errors.otherMan).toBeUndefined();
    expect(validateEligibility(withOverrides({ otherMan: "100000.0001" })).errors.otherMan).toBeDefined();
  });

  it("rate and screeningRate accept 0..20 with distinct labels", () => {
    expect(validateEligibility(withOverrides({ rate: "0", screeningRate: "20" })).errors).toEqual({});
    const r = validateEligibility(withOverrides({ rate: "20.5", screeningRate: "-0.1" }));
    expect(r.errors.rate).toBe("借入予定の金利は0%以上20%以下で入力してください。");
    expect(r.errors.screeningRate).toBe("審査金利は0%以上20%以下で入力してください。");
  });

  it("years must be integers 1..50", () => {
    expect(validateEligibility(withOverrides({ years: "1" })).errors.years).toBeUndefined();
    expect(validateEligibility(withOverrides({ years: "50" })).errors.years).toBeUndefined();
    expect(validateEligibility(withOverrides({ years: "0" })).errors.years).toBeDefined();
    expect(validateEligibility(withOverrides({ years: "51" })).errors.years).toBeDefined();
    expect(validateEligibility(withOverrides({ years: "2.5" })).errors.years).toBeDefined();
  });

  it("empty input yields errors and no request", () => {
    const r = validateEligibility(withOverrides({ incomeMan: "", years: "" }));
    expect(r.request).toBeNull();
    expect(r.errors.incomeMan).toBe("年収（額面）を入力してください。");
    expect(r.errors.years).toBe("返済期間を入力してください。");
  });
});

describe("eligibilityInitialFromQuery", () => {
  it("accepts valid rate and years as strings", () => {
    expect(eligibilityInitialFromQuery({ rate: "1.5", years: "35" })).toEqual({ rate: "1.5", years: "35" });
    expect(eligibilityInitialFromQuery({ rate: "0", years: "1" })).toEqual({ rate: "0", years: "1" });
    expect(eligibilityInitialFromQuery({ rate: "20", years: "50" })).toEqual({ rate: "20", years: "50" });
  });

  it("ignores out-of-range and malformed values independently", () => {
    expect(eligibilityInitialFromQuery({ rate: "21", years: "35" })).toEqual({ years: "35" });
    expect(eligibilityInitialFromQuery({ rate: "1.5", years: "51" })).toEqual({ rate: "1.5" });
    expect(eligibilityInitialFromQuery({ years: "0" })).toEqual({});
    expect(eligibilityInitialFromQuery({ years: "100" })).toEqual({});
    expect(eligibilityInitialFromQuery({ rate: "abc" })).toEqual({});
    expect(eligibilityInitialFromQuery({ rate: ["1", "2"], years: ["3"] })).toEqual({});
    expect(eligibilityInitialFromQuery({})).toEqual({});
  });
});

describe("manLabel", () => {
  it("floors yen to 万円 with thousands separators", () => {
    expect(manLabel(12_340_000)).toBe("1,234万円");
    expect(manLabel(0)).toBe("0万円");
    expect(manLabel(123_456_789)).toBe("12,345万円");
  });
});

describe("simulationHref", () => {
  it("includes principal in 万円 when inside 1..100000", () => {
    expect(simulationHref(30_000_000, 1.2, 35)).toBe("/simulation?principal=3000&rate=1.2&years=35");
  });

  it("omits principal when below 1万円 or above 100000万円", () => {
    expect(simulationHref(9_999, 1, 30)).toBe("/simulation?rate=1&years=30");
    expect(simulationHref(0, 1, 30)).toBe("/simulation?rate=1&years=30");
    expect(simulationHref(1_000_010_000, 1, 30)).toBe("/simulation?rate=1&years=30");
  });

  it("floors a sub-万円 remainder: 10億円+1円 becomes 100000万円 (still in range)", () => {
    expect(simulationHref(1_000_000_001, 1, 30)).toBe("/simulation?principal=100000&rate=1&years=30");
  });

  it("includes the boundary principals 1万円 and 10億円", () => {
    expect(simulationHref(10_000, 1, 30)).toBe("/simulation?principal=1&rate=1&years=30");
    expect(simulationHref(1_000_000_000, 1, 30)).toBe("/simulation?principal=100000&rate=1&years=30");
  });

  it("floors partial 万円 (e.g. 12,345,678円 -> 1234万円)", () => {
    expect(simulationHref(12_345_678, 1, 30)).toBe("/simulation?principal=1234&rate=1&years=30");
  });
});

describe("simulationHref pair flag", () => {
  it("adds pair=1 only for PAIR_LOAN and JOINT_DEBT (no ratio)", () => {
    expect(simulationHref(30_000_000, 1.2, 35, { mode: "PAIR_LOAN" })).toBe(
      "/simulation?principal=3000&rate=1.2&years=35&pair=1",
    );
    expect(simulationHref(30_000_000, 1.2, 35, { mode: "JOINT_DEBT" })).toBe(
      "/simulation?principal=3000&rate=1.2&years=35&pair=1",
    );
  });

  it("adds nothing for SINGLE and JOINT_GUARANTEE, and without opts", () => {
    expect(simulationHref(30_000_000, 1.2, 35, { mode: "SINGLE" })).toBe("/simulation?principal=3000&rate=1.2&years=35");
    expect(simulationHref(30_000_000, 1.2, 35, { mode: "JOINT_GUARANTEE" })).toBe(
      "/simulation?principal=3000&rate=1.2&years=35",
    );
    expect(simulationHref(30_000_000, 1.2, 35)).toBe("/simulation?principal=3000&rate=1.2&years=35");
  });
});

describe("two-person modes (eligibility)", () => {
  const two = (o: Partial<EligibilityForm>) => withOverrides({ mode: "JOINT_DEBT", partnerIncomeMan: "400", ...o });
  const guarantee = (pct: string) => validateEligibility(two({ mode: "JOINT_GUARANTEE", partnerCountPercent: pct }));

  it("sends partner fields for PAIR_LOAN / JOINT_DEBT without the percent", () => {
    for (const mode of ["PAIR_LOAN", "JOINT_DEBT"] as const) {
      const { request } = validateEligibility(two({ mode, partnerOtherMan: "24" }));
      expect(request).toMatchObject({ mode, partnerAnnualIncome: 4_000_000, partnerOtherAnnualRepayments: 240_000 });
      expect(request).not.toHaveProperty("partnerIncomeCountPercent");
    }
  });

  it("JOINT_GUARANTEE sends the count percent (integer 0..100)", () => {
    expect(guarantee("70").request?.partnerIncomeCountPercent).toBe(70);
    expect(guarantee("0").errors).toEqual({});
    expect(guarantee("100").errors).toEqual({});
    expect(guarantee("101").errors.partnerCountPercent).toBeDefined();
    expect(guarantee("50.5").errors.partnerCountPercent).toBeDefined();
  });

  it("partner income is required (1円..10億円) and other repayments 0..10億円", () => {
    expect(validateEligibility(two({ partnerIncomeMan: "" })).errors.partnerIncomeMan).toBeDefined();
    expect(validateEligibility(two({ partnerIncomeMan: "0" })).errors.partnerIncomeMan).toBeDefined();
    expect(validateEligibility(two({ partnerIncomeMan: "100000" })).errors.partnerIncomeMan).toBeUndefined();
    expect(validateEligibility(two({ partnerOtherMan: "-1" })).errors.partnerOtherMan).toBeDefined();
  });

  it("ignores partner fields for SINGLE", () => {
    const { request, errors } = validateEligibility(withOverrides({ partnerIncomeMan: "abc" }));
    expect(errors).toEqual({});
    expect(request).not.toHaveProperty("partnerAnnualIncome");
  });

  it("note helpers map known codes, ignore unknown", () => {
    expect(eligibilityNoteTexts(["INCOME_COMBINED_PROVISIONAL", "X"])).toHaveLength(1);
    expect(eligibilityNoteTexts(null)).toEqual([]);
    expect(eligibilityModeNote("SINGLE")).toBeNull();
    expect(eligibilityModeNote("PAIR_LOAN")).toContain("個別に審査");
  });
});
