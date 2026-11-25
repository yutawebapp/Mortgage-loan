import { describe, expect, it } from "vitest";
import {
  type RateScenarioForm,
  collectRisePoints,
  rateScenarioInitialFromQuery,
  risePointLabel,
  signedYen,
  validateRateScenario,
} from "./rate-scenario";

const base: RateScenarioForm = {
  principalMan: "3000",
  rate: "0.5",
  years: "35",
  method: "EQUAL_PAYMENT",
  riseAfterYears: "5",
  presets: [0.5, 1, 2],
  custom: "",
};
const w = (o: Partial<RateScenarioForm>): RateScenarioForm => ({ ...base, ...o });

describe("validateRateScenario", () => {
  it("不正な任意上昇幅をAPIへ送らない", () => {
    for (const value of ["0x10", "1e3", "Infinity", "1.2.3", "--1", " ", "."]) {
      expect(validateRateScenario(w({ custom: value })).request).toBeNull();
    }
    expect(validateRateScenario(w({ custom: "" })).request).not.toBeNull();
  });
  it("maps the form to the request with the default three rise points", () => {
    const { request, errors } = validateRateScenario(base);
    expect(errors).toEqual({});
    expect(request).toEqual({
      principal: 30_000_000,
      annualRatePercent: 0.5,
      years: 35,
      method: "EQUAL_PAYMENT",
      riseAfterYears: 5,
      risePoints: [0.5, 1, 2],
    });
  });

  it("years min is 2", () => {
    expect(validateRateScenario(w({ years: "1", riseAfterYears: "1" })).errors.years).toBeDefined();
    expect(validateRateScenario(w({ years: "2", riseAfterYears: "1" })).errors).toEqual({});
    expect(validateRateScenario(w({ years: "51" })).errors.years).toBeDefined();
  });

  it("riseAfterYears must be 1..years−1", () => {
    expect(validateRateScenario(w({ riseAfterYears: "0" })).errors.riseAfterYears).toBeDefined();
    expect(validateRateScenario(w({ riseAfterYears: "34" })).errors).toEqual({});
    expect(validateRateScenario(w({ riseAfterYears: "35" })).errors.riseAfterYears).toContain("34年後");
    expect(validateRateScenario(w({ riseAfterYears: "2.5" })).errors.riseAfterYears).toBeDefined();
    expect(validateRateScenario(w({ riseAfterYears: "" })).errors.riseAfterYears).toBeDefined();
  });

  it("riseAfterYears follows the current years value (cross-field)", () => {
    const f = w({ years: "10", riseAfterYears: "10" });
    expect(validateRateScenario(f).errors.riseAfterYears).toBeDefined();
    expect(validateRateScenario({ ...f, years: "11" }).errors).toEqual({});
  });

  it("requires at least one rise point", () => {
    expect(validateRateScenario(w({ presets: [] })).errors.risePoints).toBe("上昇幅を1つ以上選んでください。");
    expect(validateRateScenario(w({ presets: [], custom: "1.5" })).request?.risePoints).toEqual([1.5]);
  });

  it("custom rise point: 0 < x <= 10", () => {
    expect(validateRateScenario(w({ custom: "0" })).errors.risePoints).toBeDefined();
    expect(validateRateScenario(w({ custom: "-1" })).errors.risePoints).toBeDefined();
    expect(validateRateScenario(w({ custom: "abc" })).errors.risePoints).toBeDefined();
    expect(validateRateScenario(w({ custom: "10.1" })).errors.risePoints).toBeDefined();
    expect(validateRateScenario(w({ rate: "5", custom: "10" })).request?.risePoints).toEqual([0.5, 1, 2, 10]);
  });

  it("start rate + rise must not exceed 20", () => {
    expect(validateRateScenario(w({ rate: "18", presets: [2] })).request?.risePoints).toEqual([2]);
    expect(validateRateScenario(w({ rate: "18.5", presets: [2] })).errors.risePoints).toContain("20%");
    expect(validateRateScenario(w({ rate: "19.5", presets: [0.5] })).errors).toEqual({});
  });

  it("de-duplicates a custom value equal to a preset, and sorts", () => {
    expect(validateRateScenario(w({ custom: "1" })).request?.risePoints).toEqual([0.5, 1, 2]);
    expect(validateRateScenario(w({ presets: [2, 0.5], custom: "1.5" })).request?.risePoints).toEqual([0.5, 1.5, 2]);
  });

  it("allows up to 5 rise points (never more from this UI) and flags >5", () => {
    expect(collectRisePoints([0.5, 1, 2], "3")).toHaveLength(4);
    const many = { ...base, presets: [0.5, 1, 2, 3, 4, 5] };
    expect(validateRateScenario(many).errors.risePoints).toContain("5つまで");
  });

  it("principal and rate boundaries", () => {
    expect(validateRateScenario(w({ principalMan: "0" })).errors.principalMan).toBeDefined();
    expect(validateRateScenario(w({ principalMan: "100001" })).errors.principalMan).toBeDefined();
    expect(validateRateScenario(w({ rate: "0" })).errors.rate).toBeUndefined();
    expect(validateRateScenario(w({ rate: "20.1" })).errors.rate).toBeDefined();
  });
});

describe("labels", () => {
  it("risePointLabel", () => {
    expect(risePointLabel(0.5)).toBe("+0.5");
    expect(risePointLabel(1)).toBe("+1");
    expect(risePointLabel(0.1 + 0.2)).toBe("+0.3");
  });
  it("signedYen", () => {
    expect(signedYen(0)).toBe("0円");
    expect(signedYen(12345)).toBe("+12,345円");
    expect(signedYen(-1000)).toBe("−1,000円");
  });
});

describe("rateScenarioInitialFromQuery", () => {
  it("accepts valid values; years min is 2", () => {
    expect(rateScenarioInitialFromQuery({ rate: "0.6", principal: "5000", years: "2" })).toEqual({
      rate: "0.6",
      principalMan: "5000",
      years: "2",
    });
  });
  it("ignores invalid values", () => {
    expect(rateScenarioInitialFromQuery({ rate: "20.1", principal: "0", years: "1" })).toEqual({});
    expect(rateScenarioInitialFromQuery({ years: "51" })).toEqual({});
    expect(rateScenarioInitialFromQuery({ rate: ["1"] })).toEqual({});
  });
});
