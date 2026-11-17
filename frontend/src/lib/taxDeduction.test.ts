import { describe, expect, it } from "vitest";
import {
  type TaxDeductionForm,
  dateLabel,
  ineligibleMessage,
  isHttpUrl,
  isUnderTenYears,
  legacyExceptionKind,
  manOrYen,
  simulationHref,
  taxDeductionInitialFromQuery,
  validateTaxDeduction,
} from "./taxDeduction";

const base: TaxDeductionForm = {
  housingType: "NEW",
  energyClass: "ENERGY_STANDARD",
  moveInYear: "2026",
  moveInMonth: "4",
  childcare: false,
  floorAreaOver50: true,
  legacyException: false,
  principalMan: "3000",
  rate: "1.2",
  years: "35",
  method: "EQUAL_PAYMENT",
  incomeMan: "600",
  socialInsuranceRate: "15",
};
const w = (o: Partial<TaxDeductionForm>): TaxDeductionForm => ({ ...base, ...o });

describe("validateTaxDeduction", () => {
  it("maps defaults to the request shape", () => {
    const { request, errors } = validateTaxDeduction(base);
    expect(errors).toEqual({});
    expect(request).toEqual({
      housingType: "NEW",
      energyClass: "ENERGY_STANDARD",
      moveInYear: 2026,
      moveInMonth: 4,
      childcareHousehold: false,
      floorAreaOver50: true,
      legacyException: false,
      principal: 30_000_000,
      annualRatePercent: 1.2,
      years: 35,
      method: "EQUAL_PAYMENT",
      annualIncome: 6_000_000,
      socialInsuranceRatePercent: 15,
    });
  });

  it("principal and income: 1円..10億円, blank rejected", () => {
    expect(validateTaxDeduction(w({ principalMan: "0" })).errors.principalMan).toBeDefined();
    expect(validateTaxDeduction(w({ principalMan: "100000" })).errors.principalMan).toBeUndefined();
    expect(validateTaxDeduction(w({ principalMan: "100000.0001" })).errors.principalMan).toBeDefined();
    expect(validateTaxDeduction(w({ principalMan: "" })).errors.principalMan).toBeDefined();
    expect(validateTaxDeduction(w({ incomeMan: "0" })).errors.incomeMan).toBeDefined();
    expect(validateTaxDeduction(w({ incomeMan: "0.0001" })).request?.annualIncome).toBe(1);
    expect(validateTaxDeduction(w({ incomeMan: "100001" })).errors.incomeMan).toBeDefined();
    expect(validateTaxDeduction(w({ incomeMan: "" })).errors.incomeMan).toBeDefined();
  });

  it("rate 0..20, years integer 1..50", () => {
    expect(validateTaxDeduction(w({ rate: "0" })).errors.rate).toBeUndefined();
    expect(validateTaxDeduction(w({ rate: "20.01" })).errors.rate).toBeDefined();
    expect(validateTaxDeduction(w({ years: "0" })).errors.years).toBeDefined();
    expect(validateTaxDeduction(w({ years: "50" })).errors.years).toBeUndefined();
    expect(validateTaxDeduction(w({ years: "51" })).errors.years).toBeDefined();
    expect(validateTaxDeduction(w({ years: "10.5" })).errors.years).toBeDefined();
  });

  it("social insurance rate 0..30", () => {
    expect(validateTaxDeduction(w({ socialInsuranceRate: "0" })).errors.socialInsuranceRate).toBeUndefined();
    expect(validateTaxDeduction(w({ socialInsuranceRate: "30" })).errors.socialInsuranceRate).toBeUndefined();
    expect(validateTaxDeduction(w({ socialInsuranceRate: "30.1" })).errors.socialInsuranceRate).toBeDefined();
    expect(validateTaxDeduction(w({ socialInsuranceRate: "-1" })).errors.socialInsuranceRate).toBeDefined();
    expect(validateTaxDeduction(w({ socialInsuranceRate: "" })).errors.socialInsuranceRate).toBeDefined();
  });

  it("move-in year 2026..2030 and month 1..12", () => {
    expect(validateTaxDeduction(w({ moveInYear: "2025" })).errors.moveInYear).toBeDefined();
    expect(validateTaxDeduction(w({ moveInYear: "2030" })).errors.moveInYear).toBeUndefined();
    expect(validateTaxDeduction(w({ moveInYear: "2031" })).errors.moveInYear).toBeDefined();
    expect(validateTaxDeduction(w({ moveInMonth: "0" })).errors.moveInMonth).toBeDefined();
    expect(validateTaxDeduction(w({ moveInMonth: "12" })).errors.moveInMonth).toBeUndefined();
    expect(validateTaxDeduction(w({ moveInMonth: "13" })).errors.moveInMonth).toBeDefined();
  });

  it("returns no request when any field is invalid", () => {
    expect(validateTaxDeduction(w({ rate: "x" })).request).toBeNull();
  });
});

describe("legacyExceptionKind / legacyException in the request", () => {
  it("shows only for new homes with その他, or 省エネ基準適合 from 2028", () => {
    expect(legacyExceptionKind(w({ energyClass: "OTHER" }))).toBe("OTHER");
    expect(legacyExceptionKind(w({ energyClass: "ENERGY_STANDARD", moveInYear: "2027" }))).toBeNull();
    expect(legacyExceptionKind(w({ energyClass: "ENERGY_STANDARD", moveInYear: "2028" }))).toBe("ENERGY_STANDARD_2028");
    expect(legacyExceptionKind(w({ energyClass: "ZEH", moveInYear: "2030" }))).toBeNull();
    expect(legacyExceptionKind(w({ energyClass: "CERTIFIED" }))).toBeNull();
    expect(legacyExceptionKind(w({ housingType: "USED", energyClass: "OTHER" }))).toBeNull();
    expect(legacyExceptionKind(w({ housingType: "RESALE", energyClass: "ENERGY_STANDARD", moveInYear: "2029" }))).toBeNull();
  });

  it("is sent as true only while the checkbox is visible and checked", () => {
    expect(validateTaxDeduction(w({ energyClass: "OTHER", legacyException: true })).request?.legacyException).toBe(true);
    // stale checked state is not sent once the checkbox is hidden
    expect(validateTaxDeduction(w({ energyClass: "ZEH", legacyException: true })).request?.legacyException).toBe(false);
    expect(validateTaxDeduction(w({ housingType: "USED", energyClass: "OTHER", legacyException: true })).request?.legacyException).toBe(false);
    expect(
      validateTaxDeduction(w({ energyClass: "ENERGY_STANDARD", moveInYear: "2027", legacyException: true })).request?.legacyException,
    ).toBe(false);
  });
});

describe("isUnderTenYears", () => {
  it("is true for 1..9 only", () => {
    expect(isUnderTenYears("9")).toBe(true);
    expect(isUnderTenYears("10")).toBe(false);
    expect(isUnderTenYears("")).toBe(false);
    expect(isUnderTenYears("0")).toBe(false);
  });
});

describe("taxDeductionInitialFromQuery", () => {
  it("accepts valid values and ignores invalid ones", () => {
    expect(taxDeductionInitialFromQuery({ principal: "4500", rate: "0.8", years: "30" })).toEqual({
      principalMan: "4500",
      rate: "0.8",
      years: "30",
    });
    expect(taxDeductionInitialFromQuery({ principal: "0", rate: "21", years: "51" })).toEqual({});
    expect(taxDeductionInitialFromQuery({ principal: "100001", rate: "abc", years: "1.5" })).toEqual({});
    expect(taxDeductionInitialFromQuery({ principal: ["1", "2"], rate: undefined })).toEqual({});
  });
});

describe("ineligibleMessage", () => {
  it("maps known codes and falls back for unknown or missing ones", () => {
    expect(ineligibleMessage("NOT_ELIGIBLE_BY_RULE")).toContain("対象外となる可能性");
    expect(ineligibleMessage("TERM_UNDER_10_YEARS")).toContain("10年未満");
    expect(ineligibleMessage("AREA_40S_INCOME_OVER_LIMIT")).toContain("40㎡台");
    expect(ineligibleMessage("INCOME_OVER_20M")).toContain("2,000万円");
    const generic = ineligibleMessage("SOMETHING_NEW");
    expect(generic).toContain("対象外となる可能性");
    expect(ineligibleMessage(null)).toBe(generic);
  });
});

describe("formatting helpers", () => {
  it("manOrYen", () => {
    expect(manOrYen(1_234_500)).toBe("123.45万円");
    expect(manOrYen(3_000_000)).toBe("300万円");
    expect(manOrYen(0)).toBe("0万円");
    expect(manOrYen(5_000)).toBe("5,000円");
  });
  it("dateLabel", () => {
    expect(dateLabel("2026-04-01")).toBe("2026年4月1日");
    expect(dateLabel("unknown")).toBe("unknown");
  });
  it("isHttpUrl", () => {
    expect(isHttpUrl("https://www.nta.go.jp/")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });
  it("simulationHref reuses the shared helper (principal in 万円)", () => {
    expect(simulationHref(30_000_000, 1.2, 35)).toBe("/simulation?principal=3000&rate=1.2&years=35");
  });
});
