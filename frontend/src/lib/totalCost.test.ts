import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOUSING_MONTHLY_YEN,
  DEFAULT_HOUSING_TAX_YEARLY_YEN,
  TOTAL_COST_OWNERSHIP_PRESETS,
} from "./defaults";
import {
  applyOwnershipPreset,
  type TotalCostForm,
  approxManLabel,
  assumptionMessages,
  derivedLoan,
  estimateClosingCost,
  estimatePropertyTax,
  noteMessages,
  sharePercent,
  simulationHref,
  totalCostInitialFromQuery,
  updateTotalCostInput,
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
  propertyTax: "120000",
  insurance: "40000",
};
const w = (o: Partial<TotalCostForm>): TotalCostForm => ({ ...base, ...o });

describe("ownership cost presets", () => {
  it("defines the unchanged house defaults and the apartment estimates in yen", () => {
    expect(TOTAL_COST_OWNERSHIP_PRESETS.house).toEqual({
      managementFee: 0, repairReserve: 17_000, insurance: 40_000,
    });
    expect(TOTAL_COST_OWNERSHIP_PRESETS.apartment).toEqual({
      managementFee: 12_000, repairReserve: 18_000, insurance: 20_000,
    });
    expect(DEFAULT_HOUSING_MONTHLY_YEN).toBe(17_000);
    expect(DEFAULT_HOUSING_TAX_YEARLY_YEN).toBe(240_000);
  });

  it("replaces all four edited fields in either direction without changing other conditions", () => {
    const edited = w({ rate: "2.3", priceMan: "5000", managementFee: "9", repairReserve: "", propertyTax: "123", insurance: "456" });
    const apartment = applyOwnershipPreset(edited, "apartment");
    expect(apartment).toEqual({ ...edited, managementFee: "12000", repairReserve: "18000", propertyTax: "150000", insurance: "20000" });
    expect(edited.managementFee).toBe("9");
    expect(applyOwnershipPreset(apartment, "house")).toEqual({ ...edited, managementFee: "0", repairReserve: "17000", propertyTax: "150000", insurance: "40000" });
    expect(applyOwnershipPreset(w({ priceMan: "", propertyTax: "123" }), "house").propertyTax).toBe("123");
  });
});

describe("price-linked property tax", () => {
  it("rounds the 0.3% estimate to the nearest 1,000 yen, with halves up", () => {
    expect(estimatePropertyTax("4000")).toBe("120000");
    expect(estimatePropertyTax("4016.6")).toBe("120000");
    expect(estimatePropertyTax("4016.6667")).toBe("121000");
    expect(estimatePropertyTax("50")).toBe("2000");
    for (const invalid of ["", "abc", "0", "-1", "100001", "Infinity"]) expect(estimatePropertyTax(invalid)).toBeNull();
  });

  it("follows valid price changes until manually edited, including an edit equal to the default", () => {
    let state = { form: base, taxFollowsPrice: true };
    state = updateTotalCostInput(state, { priceMan: "5000" });
    expect(state.form.propertyTax).toBe("150000");
    state = updateTotalCostInput(state, { priceMan: "" });
    expect(state.form.propertyTax).toBe("150000");
    state = updateTotalCostInput(state, { propertyTax: "150000" });
    state = updateTotalCostInput(state, { priceMan: "6000" });
    expect(state.form.propertyTax).toBe("150000");
    state = { form: applyOwnershipPreset(state.form, "apartment"), taxFollowsPrice: true };
    expect(state.form.propertyTax).toBe("180000");
    expect(updateTotalCostInput(state, { priceMan: "7000" }).form.propertyTax).toBe("210000");
  });

  it("prioritizes URL tax, including zero, and uses URL price when tax is absent", () => {
    const state = { form: base, taxFollowsPrice: true };
    expect(updateTotalCostInput(state, { priceMan: "5000" }).form.propertyTax).toBe("150000");
    const fromUrl = updateTotalCostInput(state, { priceMan: "5000", propertyTax: "0" });
    expect(fromUrl.form.propertyTax).toBe("0");
    expect(updateTotalCostInput(fromUrl, { priceMan: "6000" }).form.propertyTax).toBe("0");
  });
});

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
      annualPropertyTax: 120_000,
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
