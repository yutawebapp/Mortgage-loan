import { describe, expect, it } from "vitest";
import {
  type PrepaymentForm,
  monthSpanLabel,
  prepaymentInitialFromQuery,
  toPrepaymentMonth,
  validatePrepayment,
} from "./prepayment";

const base: PrepaymentForm = {
  principalMan: "3000",
  rate: "1.2",
  years: "35",
  method: "EQUAL_PAYMENT",
  afterYears: "5",
  afterMonths: "0",
  prepayMan: "300",
  type: "SHORTEN_TERM",
};
const w = (o: Partial<PrepaymentForm>): PrepaymentForm => ({ ...base, ...o });

describe("validatePrepayment", () => {
  it("maps the form to the request (万円→円, 年+か月→月数)", () => {
    const { request, errors } = validatePrepayment(w({ afterYears: "5", afterMonths: "3" }));
    expect(errors).toEqual({});
    expect(request).toEqual({
      principal: 30_000_000,
      annualRatePercent: 1.2,
      years: 35,
      method: "EQUAL_PAYMENT",
      prepaymentAfterMonth: 63,
      prepaymentAmount: 3_000_000,
      prepaymentType: "SHORTEN_TERM",
    });
  });

  it("timing lower bound: 0年0か月 is rejected, 0年1か月 is accepted", () => {
    expect(validatePrepayment(w({ afterYears: "0", afterMonths: "0" })).errors.afterMonths).toBeDefined();
    expect(validatePrepayment(w({ afterYears: "0", afterMonths: "1" })).request?.prepaymentAfterMonth).toBe(1);
  });

  it("timing upper bound is years*12 − 1", () => {
    // 35年 = 420か月 → 最大 419 = 34年11か月
    expect(validatePrepayment(w({ afterYears: "34", afterMonths: "11" })).request?.prepaymentAfterMonth).toBe(419);
    expect(validatePrepayment(w({ afterYears: "35", afterMonths: "0" })).errors.afterMonths).toBeDefined();
    const short = w({ years: "1", afterYears: "0", afterMonths: "11" });
    expect(validatePrepayment(short).request?.prepaymentAfterMonth).toBe(11);
    expect(validatePrepayment({ ...short, afterMonths: "12" }).errors.afterMonths).toBeDefined();
  });

  it("timing follows the current years value (cross-field)", () => {
    const f = w({ years: "10", afterYears: "10", afterMonths: "0" });
    expect(validatePrepayment(f).errors.afterMonths).toContain("返済期間内");
    expect(validatePrepayment({ ...f, years: "11" }).errors).toEqual({});
  });

  it("rejects non-integer / out-of-range parts", () => {
    expect(validatePrepayment(w({ afterYears: "1.5" })).errors.afterYears).toBeDefined();
    expect(validatePrepayment(w({ afterYears: "-1" })).errors.afterYears).toBeDefined();
    expect(validatePrepayment(w({ afterMonths: "12" })).errors.afterMonths).toBeDefined();
    expect(validatePrepayment(w({ afterMonths: "0.5" })).errors.afterMonths).toBeDefined();
    expect(validatePrepayment(w({ afterYears: "" })).errors.afterYears).toBeDefined();
  });

  it("prepayment amount: 1円 ok, 0 and 10億円超 rejected", () => {
    expect(validatePrepayment(w({ prepayMan: "0.0001" })).request?.prepaymentAmount).toBe(1);
    expect(validatePrepayment(w({ prepayMan: "0" })).errors.prepayMan).toBeDefined();
    expect(validatePrepayment(w({ prepayMan: "100000" })).errors.prepayMan).toBeUndefined();
    expect(validatePrepayment(w({ prepayMan: "100000.0001" })).errors.prepayMan).toBeDefined();
    expect(validatePrepayment(w({ prepayMan: "" })).errors.prepayMan).toBeDefined();
  });

  it("principal, rate and years boundaries", () => {
    expect(validatePrepayment(w({ principalMan: "100000" })).errors.principalMan).toBeUndefined();
    expect(validatePrepayment(w({ principalMan: "100001" })).errors.principalMan).toBeDefined();
    expect(validatePrepayment(w({ rate: "0" })).errors.rate).toBeUndefined();
    expect(validatePrepayment(w({ rate: "20" })).errors.rate).toBeUndefined();
    expect(validatePrepayment(w({ rate: "20.1" })).errors.rate).toBeDefined();
    expect(validatePrepayment(w({ years: "50", afterYears: "49", afterMonths: "11" })).errors).toEqual({});
    expect(validatePrepayment(w({ years: "51" })).errors.years).toBeDefined();
    expect(validatePrepayment(w({ years: "0" })).errors.years).toBeDefined();
  });

  it("returns no request when invalid", () => {
    expect(validatePrepayment(w({ rate: "" })).request).toBeNull();
  });
});

describe("toPrepaymentMonth / monthSpanLabel", () => {
  it("combines years and months", () => {
    expect(toPrepaymentMonth(0, 1)).toBe(1);
    expect(toPrepaymentMonth(34, 11)).toBe(419);
  });
  it("formats ◯年◯か月, omitting zero parts", () => {
    expect(monthSpanLabel(0)).toBe("0か月");
    expect(monthSpanLabel(5)).toBe("5か月");
    expect(monthSpanLabel(12)).toBe("1年");
    expect(monthSpanLabel(63)).toBe("5年3か月");
    expect(monthSpanLabel(419)).toBe("34年11か月");
  });
});

describe("prepaymentInitialFromQuery", () => {
  it("accepts valid values", () => {
    expect(prepaymentInitialFromQuery({ rate: "1.5", principal: "4000", years: "30" })).toEqual({
      rate: "1.5",
      principalMan: "4000",
      years: "30",
    });
  });
  it("ignores invalid and out-of-range values", () => {
    expect(prepaymentInitialFromQuery({ rate: "21", principal: "0", years: "51" })).toEqual({});
    expect(prepaymentInitialFromQuery({ rate: ["1"], principal: "abc", years: "0" })).toEqual({});
    expect(prepaymentInitialFromQuery({ principal: "100001" })).toEqual({});
  });
});
