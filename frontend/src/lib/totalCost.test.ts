import { describe, expect, it } from "vitest";
import {
  type TotalCostForm,
  approxManLabel,
  assumptionMessages,
  derivedLoan,
  estimateClosingCost,
  noteMessages,
  sharePercent,
  simulationHref,
  totalCostInitialFromQuery,
  validateTotalCost,
} from "./totalCost";

const base: TotalCostForm = {
  priceMan: "4000",
  downMan: "400",
  closingRate: "10",
  rate: "1.2",
  years: "35",
  method: "EQUAL_PAYMENT",
  managementFee: "0",
  repairReserve: "17000",
  propertyTax: "200000",
  insurance: "40000",
};
const w = (o: Partial<TotalCostForm>): TotalCostForm => ({ ...base, ...o });

describe("validateTotalCost", () => {
  it("maps defaults to the request shape", () => {
    const { request, errors, loanEstimate } = validateTotalCost(base);
    expect(errors).toEqual({});
    expect(loanEstimate).toBe(40_000_000);
    expect(request).toEqual({
      propertyPrice: 40_000_000,
      downPayment: 4_000_000,
      closingCostRatePercent: 10,
      annualRatePercent: 1.2,
      years: 35,
      method: "EQUAL_PAYMENT",
      monthlyManagementFee: 0,
      monthlyRepairReserve: 17_000,
      annualPropertyTax: 200_000,
      annualInsurance: 40_000,
    });
  });

  it("treats blank ownership costs as 0 and passes entered values in yen", () => {
    const { request } = validateTotalCost(
      w({ managementFee: "", repairReserve: "12000", propertyTax: "150000", insurance: "30000" }),
    );
    expect(request?.monthlyManagementFee).toBe(0);
    expect(request?.monthlyRepairReserve).toBe(12000);
    expect(request?.annualPropertyTax).toBe(150000);
    expect(request?.annualInsurance).toBe(30000);
  });

  it("rejects out-of-range or non-integer ownership costs", () => {
    expect(validateTotalCost(w({ managementFee: "1000001" })).errors.managementFee).toBeDefined();
    expect(validateTotalCost(w({ managementFee: "1000000" })).errors.managementFee).toBeUndefined();
    expect(validateTotalCost(w({ repairReserve: "-1" })).errors.repairReserve).toBeDefined();
    expect(validateTotalCost(w({ repairReserve: "-1" })).errors.repairReserve).toContain("修繕・メンテナンス費");
    expect(validateTotalCost(w({ propertyTax: "10000001" })).errors.propertyTax).toBeDefined();
    expect(validateTotalCost(w({ insurance: "100.5" })).errors.insurance).toBeDefined();
  });

  it("validates price, down payment, closing rate, rate and years", () => {
    expect(validateTotalCost(w({ priceMan: "" })).errors.priceMan).toBeDefined();
    expect(validateTotalCost(w({ priceMan: "100001" })).errors.priceMan).toBeDefined();
    expect(validateTotalCost(w({ downMan: "-1" })).errors.downMan).toBeDefined();
    expect(validateTotalCost(w({ closingRate: "30.1" })).errors.closingRate).toBeDefined();
    expect(validateTotalCost(w({ closingRate: "30" })).errors.closingRate).toBeUndefined();
    expect(validateTotalCost(w({ rate: "20.1" })).errors.rate).toBeDefined();
    expect(validateTotalCost(w({ years: "0" })).errors.years).toBeDefined();
    expect(validateTotalCost(w({ years: "51" })).errors.years).toBeDefined();
    expect(validateTotalCost(w({ years: "35.5" })).errors.years).toBeDefined();
  });

  it("returns no request when the down payment covers everything, without errors", () => {
    const r = validateTotalCost(w({ downMan: "4400" }));
    expect(r.errors).toEqual({});
    expect(r.request).toBeNull();
    expect(r.loanEstimate).toBe(0);
    expect(validateTotalCost(w({ downMan: "5000" })).loanEstimate).toBe(-6_000_000);
  });

  it("has no loan estimate while price/down/closing inputs are invalid", () => {
    expect(validateTotalCost(w({ priceMan: "" })).loanEstimate).toBeNull();
  });
});

describe("loan estimate helpers", () => {
  it("computes closing cost and loan from yen amounts", () => {
    expect(estimateClosingCost(40_000_000, 10)).toBe(4_000_000);
    expect(estimateClosingCost(33_333_333, 7)).toBe(2_333_333);
    expect(derivedLoan(40_000_000, 4_000_000, 10)).toBe(40_000_000);
  });
});

describe("display helpers", () => {
  it("approxManLabel rounds to 万円", () => {
    expect(approxManLabel(52_345_678)).toBe("5,235万円");
    expect(approxManLabel(0)).toBe("0万円");
  });

  it("sharePercent is safe for zero and negative", () => {
    expect(sharePercent(25, 100)).toBe(25);
    expect(sharePercent(0, 100)).toBe(0);
    expect(sharePercent(5, 0)).toBe(0);
  });

  it("noteMessages maps known codes in order and drops unknown ones", () => {
    const m = noteMessages(["NO_RESALE_VALUE", "SOMETHING_NEW", "TAX_DEDUCTION_NOT_INCLUDED", "toString"]);
    expect(m).toHaveLength(2);
    expect(m[0]).toContain("売却");
    expect(m[1]).toContain("住宅ローン控除");
    expect(noteMessages([])).toEqual([]);
  });

  it("assumptionMessages maps the closing-cost assumption separately from exclusions", () => {
    const codes = ["CLOSING_COSTS_FINANCED_FROM_BUDGET", "NO_RESALE_VALUE", "UNKNOWN"];
    const a = assumptionMessages(codes);
    expect(a).toHaveLength(1);
    expect(a[0]).toContain("予算の中から");
    expect(noteMessages(codes)).toHaveLength(1);
    expect(noteMessages(codes)[0]).not.toContain("予算の中から");
    expect(assumptionMessages(["toString"])).toEqual([]);
  });

  it("simulationHref reuses the shared helper (principal in 万円)", () => {
    expect(simulationHref(40_000_000, 1.2, 35)).toBe("/simulation?principal=4000&rate=1.2&years=35");
  });
});

describe("totalCostInitialFromQuery", () => {
  it("accepts valid values", () => {
    expect(totalCostInitialFromQuery({ principal: "5000", rate: "0.8", years: "30" })).toEqual({
      priceMan: "5000",
      rate: "0.8",
      years: "30",
    });
  });
  it("ignores invalid values", () => {
    expect(totalCostInitialFromQuery({ principal: "0", rate: "25", years: "99" })).toEqual({});
    expect(totalCostInitialFromQuery({ principal: "abc", rate: ["1"], years: "1.5" })).toEqual({});
  });
});
