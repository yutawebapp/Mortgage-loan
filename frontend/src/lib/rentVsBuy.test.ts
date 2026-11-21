import { describe, expect, it } from "vitest";
import {
  ADVANCED_KEYS,
  type RentVsBuyForm,
  crossoverLabel,
  crossoverSentences,
  manSigned,
  ratePercentLabel,
  rentVsBuyAssumptionMessages,
  rentVsBuyNoteMessages,
  validateRentVsBuy,
  yenSigned,
} from "./rentVsBuy";

const base: RentVsBuyForm = {
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
  rent: "130000",
  rentGrowth: "0",
  renewalMonths: "0",
  renewalInterval: "2",
  rentInitial: "0",
  horizon: "35",
  assetChange: "0",
  saleCost: "0",
};
const w = (o: Partial<RentVsBuyForm>): RentVsBuyForm => ({ ...base, ...o });
const errs = (o: Partial<RentVsBuyForm>) => validateRentVsBuy(w(o)).errors;

describe("validateRentVsBuy", () => {
  it("maps defaults to the request shape and derives the loan", () => {
    const { request, errors, loanEstimate } = validateRentVsBuy(base);
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
      monthlyRent: 130_000,
      rentGrowthPercent: 0,
      renewalFeeMonths: 0,
      renewalIntervalYears: 2,
      rentInitialCost: 0,
      horizonYears: 35,
      assetChangeRatePercent: 0,
      saleCostRatePercent: 0,
    });
  });

  it("no request (and no error) when the down payment covers everything", () => {
    const r = validateRentVsBuy(w({ downMan: "4400" }));
    expect(r.request).toBeNull();
    expect(r.errors).toEqual({});
    expect(r.loanEstimate).toBe(0);
  });

  it("asset change allows negatives down to -10 and up to 10", () => {
    expect(validateRentVsBuy(w({ assetChange: "-10" })).request?.assetChangeRatePercent).toBe(-10);
    expect(validateRentVsBuy(w({ assetChange: "10" })).request?.assetChangeRatePercent).toBe(10);
    expect(errs({ assetChange: "-10.1" }).assetChange).toBeDefined();
    expect(errs({ assetChange: "10.1" }).assetChange).toBeDefined();
  });

  it("rent: 1..10,000,000 yen integer, required", () => {
    expect(errs({ rent: "" }).rent).toBeDefined();
    expect(errs({ rent: "0" }).rent).toBeDefined();
    expect(errs({ rent: "1" }).rent).toBeUndefined();
    expect(errs({ rent: "10000000" }).rent).toBeUndefined();
    expect(errs({ rent: "10000001" }).rent).toBeDefined();
    expect(errs({ rent: "130000.5" }).rent).toBeDefined();
  });

  it("rent growth 0..10, renewal months 0..6, interval 1..5 integer", () => {
    expect(errs({ rentGrowth: "10" }).rentGrowth).toBeUndefined();
    expect(errs({ rentGrowth: "10.1" }).rentGrowth).toBeDefined();
    expect(errs({ rentGrowth: "-1" }).rentGrowth).toBeDefined();
    expect(errs({ renewalMonths: "6" }).renewalMonths).toBeUndefined();
    expect(errs({ renewalMonths: "6.5" }).renewalMonths).toBeDefined();
    expect(errs({ renewalInterval: "5" }).renewalInterval).toBeUndefined();
    expect(errs({ renewalInterval: "0" }).renewalInterval).toBeDefined();
    expect(errs({ renewalInterval: "2.5" }).renewalInterval).toBeDefined();
    expect(errs({ renewalInterval: "" }).renewalInterval).toBeDefined();
  });

  it("initial cost 0..100,000,000, blank treated as 0", () => {
    expect(validateRentVsBuy(w({ rentInitial: "" })).request?.rentInitialCost).toBe(0);
    expect(errs({ rentInitial: "100000001" }).rentInitial).toBeDefined();
    expect(errs({ rentInitial: "-1" }).rentInitial).toBeDefined();
  });

  it("horizon 1..50 integer; sale cost 0..10", () => {
    expect(errs({ horizon: "50" }).horizon).toBeUndefined();
    expect(errs({ horizon: "51" }).horizon).toBeDefined();
    expect(errs({ horizon: "0" }).horizon).toBeDefined();
    expect(errs({ horizon: "" }).horizon).toBeDefined();
    expect(errs({ saleCost: "10" }).saleCost).toBeUndefined();
    expect(errs({ saleCost: "10.1" }).saleCost).toBeDefined();
  });

  it("shared purchase fields keep the /total-cost limits", () => {
    expect(errs({ priceMan: "0" }).priceMan).toBeDefined();
    expect(errs({ closingRate: "30.1" }).closingRate).toBeDefined();
    expect(errs({ rate: "20.1" }).rate).toBeDefined();
    expect(errs({ years: "51" }).years).toBeDefined();
    expect(errs({ managementFee: "1000001" }).managementFee).toBeDefined();
    expect(errs({ propertyTax: "10000001" }).propertyTax).toBeDefined();
  });

  it("ADVANCED_KEYS only lists collapsed fields", () => {
    for (const k of ["priceMan", "downMan", "rate", "years", "rent", "horizon", "managementFee", "repairReserve", "propertyTax", "insurance"]) {
      expect(ADVANCED_KEYS).not.toContain(k);
    }
    expect(ADVANCED_KEYS).toContain("assetChange");
  });
});

describe("formatting and wording", () => {
  it("signed money", () => {
    expect(yenSigned(-1234)).toBe("−1,234円");
    expect(yenSigned(1234)).toBe("1,234円");
    expect(manSigned(-12_345_678)).toBe("−1,235万円");
    expect(manSigned(-100)).toBe("0万円");
    expect(manSigned(52_000_000)).toBe("5,200万円");
  });

  it("rate labels", () => {
    expect(ratePercentLabel(0)).toBe("±0%");
    expect(ratePercentLabel(1)).toBe("+1%");
    expect(ratePercentLabel(-1.5)).toBe("−1.5%");
  });

  it("crossover sentences state the condition and never rank the options", () => {
    const s = {
      crossoverYearCumulative: 22,
      crossoverYearNet: null,
      purchaseCumulativeAtEnd: 0,
      purchaseNetAtEnd: 0,
      rentCumulativeAtEnd: 0,
    };
    const a = crossoverSentences(s, 35);
    expect(a.cumulative).toContain("22年目");
    expect(a.cumulative).toContain("入力した条件では");
    expect(a.net).toContain("35年の間");
    const b = crossoverSentences({ ...s, crossoverYearCumulative: null, crossoverYearNet: 9 }, 30);
    expect(b.cumulative).toContain("30年の間");
    expect(b.cumulative).toContain("下回りません");
    expect(b.net).toContain("9年目");
    for (const t of [a.cumulative, a.net, b.cumulative, b.net]) {
      expect(t).not.toMatch(/得|有利|おすすめ|最安|必ず|確実/);
    }
  });

  it("crossoverLabel", () => {
    expect(crossoverLabel(null)).toBe("期間内にはなし");
    expect(crossoverLabel(12)).toBe("12年目");
  });
});

describe("note messages", () => {
  it("maps known codes in order and ignores unknown ones", () => {
    const t = rentVsBuyNoteMessages(["ASSET_VALUE_IS_ASSUMPTION", "UNKNOWN", "TAX_DEDUCTION_NOT_INCLUDED", "toString"]);
    expect(t).toHaveLength(2);
    expect(rentVsBuyNoteMessages([])).toEqual([]);
  });

  it("closing cost note is an assumption, not an exclusion", () => {
    expect(rentVsBuyAssumptionMessages(["CLOSING_COSTS_FINANCED_FROM_BUDGET"])).toHaveLength(1);
    expect(rentVsBuyNoteMessages(["CLOSING_COSTS_FINANCED_FROM_BUDGET"])).toEqual([]);
  });

  it("none of the copy uses ranking words", () => {
    const all = rentVsBuyNoteMessages([
      "ASSET_VALUE_IS_ASSUMPTION",
      "NO_INVESTMENT_RETURN_ON_DIFFERENCE",
      "TAX_DEDUCTION_NOT_INCLUDED",
      "SAME_HOME_CONDITIONS_NOT_ASSURED",
      "OWNERSHIP_COSTS_CONTINUE_AFTER_LOAN",
    ]);
    expect(all).toHaveLength(5);
    for (const t of all) expect(t).not.toMatch(/得|有利|おすすめ|最安|必ず|確実/);
  });
});
