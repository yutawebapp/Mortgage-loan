import { describe, expect, it } from "vitest";
import {
  type BudgetForm,
  budgetInitialFromQuery,
  manLabel,
  sharePercent,
  simulationHref,
  validateBudget,
} from "./budget";

const base: BudgetForm = {
  downMan: "500",
  monthlyMan: "10",
  rate: "1.2",
  years: "35",
  closingRate: "10",
  incomeMan: "",
};
const w = (o: Partial<BudgetForm>): BudgetForm => ({ ...base, ...o });

describe("validateBudget", () => {
  it("不正な数値は必須欄・任意欄ともAPIへ送らない", () => {
    for (const value of ["0x10", "1e3", "Infinity", "1.2.3", "--1", " ", "."]) {
      expect(validateBudget(w({ monthlyMan: value })).request).toBeNull();
      expect(validateBudget(w({ incomeMan: value })).request).toBeNull();
    }
    expect(validateBudget(w({ incomeMan: "" })).request).not.toBeNull();
  });
  it("maps defaults to the request shape and omits annualIncome when blank", () => {
    const { request, errors } = validateBudget(base);
    expect(errors).toEqual({});
    expect(request).toEqual({
      downPayment: 5_000_000,
      desiredMonthlyPayment: 100_000,
      annualRatePercent: 1.2,
      years: 35,
      closingCostRatePercent: 10,
    });
    expect(request).not.toHaveProperty("annualIncome");
  });

  it("converts decimal 万円 and includes income when entered", () => {
    const { request } = validateBudget(w({ monthlyMan: "8.5", incomeMan: "600" }));
    expect(request?.desiredMonthlyPayment).toBe(85_000);
    expect(request?.annualIncome).toBe(6_000_000);
  });

  it("down payment allows 0, rejects negative, blank and > 10億円", () => {
    expect(validateBudget(w({ downMan: "0" })).request?.downPayment).toBe(0);
    expect(validateBudget(w({ downMan: "100000" })).errors.downMan).toBeUndefined();
    expect(validateBudget(w({ downMan: "100000.0001" })).errors.downMan).toBeDefined();
    expect(validateBudget(w({ downMan: "-1" })).errors.downMan).toBeDefined();
    expect(validateBudget(w({ downMan: "" })).errors.downMan).toBeDefined();
  });

  it("monthly payment: 1円..1000万円", () => {
    expect(validateBudget(w({ monthlyMan: "0.0001" })).request?.desiredMonthlyPayment).toBe(1);
    expect(validateBudget(w({ monthlyMan: "0" })).errors.monthlyMan).toBeDefined();
    expect(validateBudget(w({ monthlyMan: "0.00004" })).errors.monthlyMan).toBeDefined();
    expect(validateBudget(w({ monthlyMan: "1000" })).errors.monthlyMan).toBeUndefined();
    expect(validateBudget(w({ monthlyMan: "1000.0001" })).errors.monthlyMan).toBeDefined();
  });

  it("rate 0..20", () => {
    expect(validateBudget(w({ rate: "0" })).errors.rate).toBeUndefined();
    expect(validateBudget(w({ rate: "20" })).errors.rate).toBeUndefined();
    expect(validateBudget(w({ rate: "20.01" })).errors.rate).toBeDefined();
    expect(validateBudget(w({ rate: "-0.1" })).errors.rate).toBeDefined();
  });

  it("years integer 1..50", () => {
    expect(validateBudget(w({ years: "1" })).errors.years).toBeUndefined();
    expect(validateBudget(w({ years: "50" })).errors.years).toBeUndefined();
    expect(validateBudget(w({ years: "0" })).errors.years).toBeDefined();
    expect(validateBudget(w({ years: "51" })).errors.years).toBeDefined();
    expect(validateBudget(w({ years: "2.5" })).errors.years).toBeDefined();
  });

  it("closing cost rate 0..30", () => {
    expect(validateBudget(w({ closingRate: "0" })).request?.closingCostRatePercent).toBe(0);
    expect(validateBudget(w({ closingRate: "30" })).errors.closingRate).toBeUndefined();
    expect(validateBudget(w({ closingRate: "30.1" })).errors.closingRate).toBeDefined();
    expect(validateBudget(w({ closingRate: "-1" })).errors.closingRate).toBeDefined();
    expect(validateBudget(w({ closingRate: "" })).errors.closingRate).toBeDefined();
  });

  it("optional income: blank ok, 0 and > 10億円 rejected", () => {
    expect(validateBudget(w({ incomeMan: "" })).errors.incomeMan).toBeUndefined();
    expect(validateBudget(w({ incomeMan: "  " })).errors.incomeMan).toBeDefined();
    expect(validateBudget(w({ incomeMan: "0" })).errors.incomeMan).toBeDefined();
    expect(validateBudget(w({ incomeMan: "100000" })).errors.incomeMan).toBeUndefined();
    expect(validateBudget(w({ incomeMan: "100000.0001" })).errors.incomeMan).toBeDefined();
  });

  it("returns no request when any field is invalid", () => {
    expect(validateBudget(w({ rate: "abc" })).request).toBeNull();
  });
});

describe("budgetInitialFromQuery", () => {
  it("accepts valid values and ignores invalid ones", () => {
    expect(budgetInitialFromQuery({ rate: "1.5", years: "30" })).toEqual({ rate: "1.5", years: "30" });
    expect(budgetInitialFromQuery({ rate: "20.1", years: "51" })).toEqual({});
    expect(budgetInitialFromQuery({ rate: "-1", years: "0" })).toEqual({});
    expect(budgetInitialFromQuery({ rate: ["1"], years: undefined })).toEqual({});
  });
});

describe("helpers", () => {
  it("manLabel floors to 万円 with separators", () => {
    expect(manLabel(45_670_000)).toBe("4,567万円");
    expect(manLabel(0)).toBe("0万円");
  });

  it("sharePercent is clamped and safe for zero", () => {
    expect(sharePercent(25, 100)).toBe(25);
    expect(sharePercent(5, 0)).toBe(0);
    expect(sharePercent(0, 100)).toBe(0);
    expect(sharePercent(200, 100)).toBe(100);
  });

  it("simulationHref omits principal outside 1..100000万円", () => {
    expect(simulationHref(35_000_000, 1.2, 35)).toBe("/simulation?principal=3500&rate=1.2&years=35");
    expect(simulationHref(0, 1.2, 35)).toBe("/simulation?rate=1.2&years=35");
    expect(simulationHref(1_000_010_000, 1.2, 35)).toBe("/simulation?rate=1.2&years=35");
  });
});
