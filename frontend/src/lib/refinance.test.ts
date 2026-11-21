import { describe, expect, it } from "vitest";
import { DEFAULT_REFINANCE_COSTS_MAN } from "./defaults";
import {
  type RefinanceForm,
  diffPhrase,
  monthsLabel,
  refinanceInitialFromQuery,
  validateRefinance,
} from "./refinance";

const base: RefinanceForm = {
  balanceMan: "2000",
  currentRate: "2",
  remainingYears: "30",
  newRate: "1",
  newYears: "30",
  method: "EQUAL_PAYMENT",
  costsMan: "10",
};
const withOverrides = (o: Partial<RefinanceForm>): RefinanceForm => ({ ...base, ...o });

describe("validateRefinance", () => {
  it("converts 万円 to yen and maps fields into a request", () => {
    const { request, errors } = validateRefinance(base);
    expect(errors).toEqual({});
    expect(request).toEqual({
      remainingBalance: 20_000_000,
      currentAnnualRatePercent: 2,
      remainingYears: 30,
      newAnnualRatePercent: 1,
      newYears: 30,
      method: "EQUAL_PAYMENT",
      refinanceCosts: 100_000,
    });
  });

  it("balance boundaries: 1円 ok, 10億円 ok, 10億円超 rejected", () => {
    expect(validateRefinance(withOverrides({ balanceMan: "0.0001" })).request?.remainingBalance).toBe(1);
    expect(validateRefinance(withOverrides({ balanceMan: "100000" })).request?.remainingBalance).toBe(
      1_000_000_000,
    );
    expect(validateRefinance(withOverrides({ balanceMan: "100000.0001" })).errors.balanceMan).toBeDefined();
    expect(validateRefinance(withOverrides({ balanceMan: "0.00004" })).errors.balanceMan).toBeDefined();
  });

  it("rates (current and new) accept 0..20 and use labelled messages", () => {
    expect(validateRefinance(withOverrides({ currentRate: "0", newRate: "20" })).errors).toEqual({});
    const r = validateRefinance(withOverrides({ currentRate: "21", newRate: "-1" }));
    expect(r.errors.currentRate).toBe("現在の金利は0%以上20%以下で入力してください。");
    expect(r.errors.newRate).toBe("借り換え後の金利は0%以上20%以下で入力してください。");
  });

  it("years (remaining and new) must be integers 1..50", () => {
    expect(validateRefinance(withOverrides({ remainingYears: "1", newYears: "50" })).errors).toEqual({});
    const r = validateRefinance(withOverrides({ remainingYears: "0", newYears: "30.5" }));
    expect(r.errors.remainingYears).toBe("現在ローンの残り期間は1〜50年の整数で入力してください。");
    expect(r.errors.newYears).toBe("借り換え後の返済期間は1〜50年の整数で入力してください。");
  });

  it("costs accept 0 and 1億円, reject negative and above 1億円", () => {
    expect(validateRefinance(withOverrides({ costsMan: "0" })).request?.refinanceCosts).toBe(0);
    expect(validateRefinance(withOverrides({ costsMan: "10000" })).request?.refinanceCosts).toBe(100_000_000);
    expect(validateRefinance(withOverrides({ costsMan: "10000.0001" })).errors.costsMan).toBeDefined();
    expect(validateRefinance(withOverrides({ costsMan: "-0.0001" })).errors.costsMan).toBeDefined();
  });

  it("empty strings produce required-field messages and no request", () => {
    const r = validateRefinance(withOverrides({ balanceMan: "", costsMan: "" }));
    expect(r.request).toBeNull();
    expect(r.errors.balanceMan).toBe("現在の残債を入力してください。");
    expect(r.errors.costsMan).toBe("借り換え諸費用を入力してください（なければ0）。");
  });
});

describe("default refinance closing costs", () => {
  it("defaults to 75万円 (about 2.5% of the 3,000万円 default balance)", () => {
    expect(DEFAULT_REFINANCE_COSTS_MAN).toBe("75");
    expect(validateRefinance(withOverrides({ costsMan: DEFAULT_REFINANCE_COSTS_MAN })).request?.refinanceCosts).toBe(
      750_000,
    );
    expect(Number(DEFAULT_REFINANCE_COSTS_MAN) / 3000).toBeCloseTo(0.025, 10);
  });
});

describe("refinanceInitialFromQuery", () => {
  it("takes current rate and method separately from the new rate", () => {
    expect(refinanceInitialFromQuery({ rate: "0.8", currentRate: "1.2", method: "EQUAL_PRINCIPAL" })).toEqual({ newRate: "0.8", currentRate: "1.2", method: "EQUAL_PRINCIPAL" });
    expect(refinanceInitialFromQuery({ currentRate: "20.1", method: "bad" })).toEqual({});
    expect(refinanceInitialFromQuery({ currentRate: ["1"], method: ["EQUAL_PAYMENT"] })).toEqual({});
  });
  it("takes a valid ?rate= as newRate", () => {
    expect(refinanceInitialFromQuery({ rate: "0.75" })).toEqual({ newRate: "0.75" });
    expect(refinanceInitialFromQuery({ rate: "20" })).toEqual({ newRate: "20" });
  });

  it("ignores out-of-range, malformed, repeated, and missing values", () => {
    expect(refinanceInitialFromQuery({ rate: "20.1" })).toEqual({});
    expect(refinanceInitialFromQuery({ rate: "-1" })).toEqual({});
    expect(refinanceInitialFromQuery({ rate: "1.2345678" })).toEqual({});
    expect(refinanceInitialFromQuery({ rate: ["1"] })).toEqual({});
    expect(refinanceInitialFromQuery({})).toEqual({});
  });
});

describe("monthsLabel", () => {
  it("shows only months under one year", () => {
    expect(monthsLabel(0)).toBe("0か月目");
    expect(monthsLabel(5)).toBe("5か月目");
  });

  it("shows years and months from 12 onward", () => {
    expect(monthsLabel(12)).toBe("1年0か月目");
    expect(monthsLabel(14)).toBe("1年2か月目");
    expect(monthsLabel(121)).toBe("10年1か月目");
  });
});

describe("diffPhrase", () => {
  it("is neutral for zero", () => {
    expect(diffPhrase(0)).toBe("差はありません");
  });

  it("positive means smaller, negative means larger, using absolute yen", () => {
    expect(diffPhrase(1000)).toBe("約1,000円少なくなる");
    expect(diffPhrase(-1000)).toBe("約1,000円多くなる");
    expect(diffPhrase(-12345)).toBe("約12,345円多くなる");
  });
});
