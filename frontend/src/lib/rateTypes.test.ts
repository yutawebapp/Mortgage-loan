import { describe, expect, it } from "vitest";
import {
  RATE_TYPES_DEFAULTS,
  type RateTypesForm,
  caseName,
  noteTexts,
  rateLabel,
  rateScenarioHref,
  rateTypesInitialFromQuery,
  signedMan,
  switchLabel,
  validateRateTypes,
} from "./rateTypes";

const w = (o: Partial<RateTypesForm>): RateTypesForm => ({ ...RATE_TYPES_DEFAULTS, ...o });
const errs = (o: Partial<RateTypesForm>) => validateRateTypes(w(o)).errors;

describe("validateRateTypes", () => {
  it("maps the defaults to the request", () => {
    const { request, errors } = validateRateTypes(RATE_TYPES_DEFAULTS);
    expect(errors).toEqual({});
    expect(request).toEqual({
      principal: 30_000_000,
      years: 35,
      method: "EQUAL_PAYMENT",
      variableRatePercent: 0.7,
      variableRiseAfterYears: 5,
      variableRisePoints: 1,
      fixedPeriodYears: 10,
      fixedPeriodRatePercent: 1.4,
      fixedPeriodAfterRatePercent: 2,
      fullFixedRatePercent: 1.8,
    });
  });

  it("passes the repayment method through", () => {
    expect(validateRateTypes(w({ method: "EQUAL_PRINCIPAL" })).request?.method).toBe("EQUAL_PRINCIPAL");
  });

  it("checks the principal bounds (1 yen .. 1 billion yen)", () => {
    expect(errs({ principalMan: "" }).principalMan).toBeDefined();
    expect(errs({ principalMan: "abc" }).principalMan).toBeDefined();
    expect(errs({ principalMan: "0" }).principalMan).toBeDefined();
    expect(errs({ principalMan: "-1" }).principalMan).toBeDefined();
    expect(errs({ principalMan: "100000" }).principalMan).toBeUndefined();
    expect(errs({ principalMan: "100001" }).principalMan).toBeDefined();
    expect(validateRateTypes(w({ principalMan: "100000" })).request?.principal).toBe(1_000_000_000);
  });

  it("checks the years bounds (2..50, integer)", () => {
    expect(errs({ years: "" }).years).toBeDefined();
    expect(errs({ years: "1" }).years).toBeDefined();
    expect(errs({ years: "2", variableRiseAfter: "1", fixedPeriodYears: "1" }).years).toBeUndefined();
    expect(errs({ years: "50" }).years).toBeUndefined();
    expect(errs({ years: "51" }).years).toBeDefined();
    expect(errs({ years: "35.5" }).years).toBeDefined();
  });

  it("checks each rate is 0..20", () => {
    for (const k of ["variableRate", "fixedPeriodRate", "fixedPeriodAfterRate", "fullFixedRate"] as const) {
      expect(errs({ [k]: "" })[k]).toBeDefined();
      expect(errs({ [k]: "-0.1" })[k]).toBeDefined();
      expect(errs({ [k]: "20.1" })[k]).toBeDefined();
      expect(errs({ [k]: "0" })[k]).toBeUndefined();
      if (k !== "variableRate") expect(errs({ [k]: "20" })[k]).toBeUndefined();
    }
    expect(errs({ variableRate: "20", variableRisePoints: "0.1" }).variableRate).toBeUndefined();
  });

  it("limits the rise time to 1..years-1 (integer)", () => {
    expect(errs({ variableRiseAfter: "" }).variableRiseAfter).toBeDefined();
    expect(errs({ variableRiseAfter: "0" }).variableRiseAfter).toBeDefined();
    expect(errs({ variableRiseAfter: "1" }).variableRiseAfter).toBeUndefined();
    expect(errs({ variableRiseAfter: "2.5" }).variableRiseAfter).toBeDefined();
    expect(errs({ years: "20", variableRiseAfter: "19" }).variableRiseAfter).toBeUndefined();
    expect(errs({ years: "20", variableRiseAfter: "20" }).variableRiseAfter).toBeDefined();
    expect(errs({ years: "20", variableRiseAfter: "20" }).variableRiseAfter).toContain("20年");
  });

  it("limits the fixed period to 1..years-1 (integer)", () => {
    expect(errs({ fixedPeriodYears: "" }).fixedPeriodYears).toBeDefined();
    expect(errs({ fixedPeriodYears: "0" }).fixedPeriodYears).toBeDefined();
    expect(errs({ fixedPeriodYears: "1" }).fixedPeriodYears).toBeUndefined();
    expect(errs({ fixedPeriodYears: "2.5" }).fixedPeriodYears).toBeDefined();
    expect(errs({ years: "20", fixedPeriodYears: "19" }).fixedPeriodYears).toBeUndefined();
    expect(errs({ years: "20", fixedPeriodYears: "20" }).fixedPeriodYears).toBeDefined();
  });

  it("skips the cross-check when the years themselves are invalid", () => {
    const e = errs({ years: "", variableRiseAfter: "5", fixedPeriodYears: "10" });
    expect(e.years).toBeDefined();
    expect(e.variableRiseAfter).toBeUndefined();
    expect(e.fixedPeriodYears).toBeUndefined();
  });

  it("requires a rise of more than 0 and at most 10 points", () => {
    expect(errs({ variableRisePoints: "" }).variableRisePoints).toBeDefined();
    expect(errs({ variableRisePoints: "0" }).variableRisePoints).toBeDefined();
    expect(errs({ variableRisePoints: "-1" }).variableRisePoints).toBeDefined();
    expect(errs({ variableRisePoints: "0.1" }).variableRisePoints).toBeUndefined();
    expect(errs({ variableRisePoints: "10" }).variableRisePoints).toBeUndefined();
    expect(errs({ variableRisePoints: "10.1" }).variableRisePoints).toBeDefined();
  });

  it("keeps variable rate + rise at or below 20%", () => {
    expect(errs({ variableRate: "15", variableRisePoints: "5" }).variableRisePoints).toBeUndefined();
    expect(errs({ variableRate: "15", variableRisePoints: "5.1" }).variableRisePoints).toBeDefined();
    expect(errs({ variableRate: "19.9", variableRisePoints: "0.1" }).variableRisePoints).toBeUndefined();
    expect(errs({ variableRate: "20", variableRisePoints: "0.1" }).variableRisePoints).toBeDefined();
  });

  it("returns no request when there are errors, and a request when none", () => {
    expect(validateRateTypes(w({ fullFixedRate: "" })).request).toBeNull();
    expect(validateRateTypes(w({})).request).not.toBeNull();
  });
});

describe("rateTypesInitialFromQuery", () => {
  it("accepts valid principal and years", () => {
    expect(rateTypesInitialFromQuery({ principal: "4500", years: "30" })).toEqual({ principalMan: "4500", years: "30" });
    expect(rateTypesInitialFromQuery({ principal: "2500.5", years: "2" })).toEqual({ principalMan: "2500.5", years: "2" });
    expect(rateTypesInitialFromQuery({ principal: "100000", years: "50" })).toEqual({ principalMan: "100000", years: "50" });
  });
  it("ignores invalid values", () => {
    expect(rateTypesInitialFromQuery({ principal: "abc", years: "1" })).toEqual({});
    expect(rateTypesInitialFromQuery({ principal: "0", years: "51" })).toEqual({});
    expect(rateTypesInitialFromQuery({ principal: "100001", years: "3.5" })).toEqual({});
    expect(rateTypesInitialFromQuery({ principal: "-5", years: "-5" })).toEqual({});
    expect(rateTypesInitialFromQuery({ principal: ["1", "2"], years: undefined })).toEqual({});
    expect(rateTypesInitialFromQuery({})).toEqual({});
  });
  it("applies each parameter independently", () => {
    expect(rateTypesInitialFromQuery({ principal: "4000", years: "99" })).toEqual({ principalMan: "4000" });
  });
});

describe("rateScenarioHref", () => {
  it("builds a link with man-yen principal, rate and years", () => {
    expect(rateScenarioHref(30_000_000, 0.7, 35)).toBe("/rate-scenario?principal=3000&rate=0.7&years=35");
  });
  it("omits an out-of-range principal", () => {
    expect(rateScenarioHref(5_000, 1, 20)).toBe("/rate-scenario?rate=1&years=20");
  });
});

describe("labels", () => {
  it("names the cases", () => {
    expect(caseName({ type: "VARIABLE_FLAT" })).toBe("変動・金利が変わらない場合");
    expect(caseName({ type: "VARIABLE_RISE" })).toBe("変動・金利が上昇した場合");
    expect(caseName({ type: "FIXED_PERIOD" })).toBe("固定期間選択型");
    expect(caseName({ type: "FULL_FIXED" })).toBe("全期間固定");
  });
  it("shows rates before and after", () => {
    expect(rateLabel({ rateFirstPercent: 1.8, rateAfterPercent: null })).toBe("1.8%（一定）");
    expect(rateLabel({ rateFirstPercent: 0.7, rateAfterPercent: 1.7 })).toBe("0.7% → 1.7%");
    expect(rateLabel({ rateFirstPercent: 0.7, rateAfterPercent: 0.7 + 1 })).toBe("0.7% → 1.7%");
  });
  it("shows the switch time", () => {
    expect(switchLabel({ switchAfterYears: null })).toBe("なし");
    expect(switchLabel({ switchAfterYears: 5 })).toBe("返済開始から5年後");
  });
});

describe("signedMan", () => {
  it("formats signed differences in 万円", () => {
    expect(signedMan(1_234_567)).toBe("+123万円");
    expect(signedMan(-3_500_000)).toBe("−350万円");
    expect(signedMan(12_345_678)).toBe("+1,235万円");
  });
  it("shows zero and differences under 5,000円 (rounds to 0万円) in 円", () => {
    expect(signedMan(0)).toBe("0円");
    expect(signedMan(-4_000)).toBe("−4,000円");
    expect(signedMan(4_999)).toBe("+4,999円");
  });
  it("rounds 5,000円 and above to 1万円", () => {
    expect(signedMan(5_000)).toBe("+1万円");
    expect(signedMan(-14_999)).toBe("−1万円");
  });
});

describe("noteTexts", () => {
  it("maps known codes, drops unknown ones and duplicates", () => {
    const t = noteTexts(["RATES_ARE_USER_ASSUMPTIONS", "UNKNOWN", "FEES_AND_GUARANTEE_NOT_INCLUDED", "RATES_ARE_USER_ASSUMPTIONS"]);
    expect(t).toHaveLength(2);
    expect(t[0]).toContain("将来の金利を予測するものではありません");
    expect(t[1]).toContain("保証料");
  });
  it("maps the simplified-model code and mentions the 5/125 rules", () => {
    const t = noteTexts(["SIMPLIFIED_RATE_CHANGE_MODEL"]);
    expect(t).toHaveLength(1);
    expect(t[0]).toContain("5年ルール・125%ルール");
  });
  it("returns an empty list for no known codes", () => {
    expect(noteTexts(["X"])).toEqual([]);
    expect(noteTexts([])).toEqual([]);
  });
});
