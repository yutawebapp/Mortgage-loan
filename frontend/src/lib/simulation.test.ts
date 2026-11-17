import { describe, expect, it } from "vitest";
import type { ScheduleRow } from "./api/simulation";
import { type FormValues, aggregateByYear, initialFromQuery, validate, yen } from "./simulation";

const base: FormValues = {
  principalMan: "3000",
  rate: "1.5",
  years: "35",
  method: "EQUAL_PAYMENT",
  useBonus: false,
  bonusMan: "",
};
const withOverrides = (o: Partial<FormValues>): FormValues => ({ ...base, ...o });

describe("validate (simulation)", () => {
  it("converts 万円 to yen and builds a request for valid input", () => {
    const { request, errors } = validate(base);
    expect(errors).toEqual({});
    expect(request).toEqual({
      principal: 30_000_000,
      annualRatePercent: 1.5,
      years: 35,
      method: "EQUAL_PAYMENT",
    });
  });

  it("accepts the principal boundaries 1円 (0.0001万円) and 10億円 (100000万円)", () => {
    expect(validate(withOverrides({ principalMan: "0.0001" })).request?.principal).toBe(1);
    expect(validate(withOverrides({ principalMan: "100000" })).request?.principal).toBe(1_000_000_000);
  });

  it("rejects principal just below 1円 and just above 10億円", () => {
    // 0.00004万円 = 0.4円 -> rounds to 0
    expect(validate(withOverrides({ principalMan: "0.00004" })).errors.principalMan).toBeDefined();
    expect(validate(withOverrides({ principalMan: "0" })).errors.principalMan).toBeDefined();
    expect(validate(withOverrides({ principalMan: "-1" })).errors.principalMan).toBeDefined();
    expect(validate(withOverrides({ principalMan: "100000.0001" })).errors.principalMan).toBeDefined();
  });

  it("rounds principal to the nearest yen", () => {
    // 1.23456789万円 = 12345.6789円 -> 12346円
    expect(validate(withOverrides({ principalMan: "1.23456789" })).request?.principal).toBe(12346);
  });

  it("rate: accepts 0 and 20, rejects below 0 and above 20", () => {
    expect(validate(withOverrides({ rate: "0" })).errors.rate).toBeUndefined();
    expect(validate(withOverrides({ rate: "20" })).errors.rate).toBeUndefined();
    expect(validate(withOverrides({ rate: "-0.01" })).errors.rate).toBeDefined();
    expect(validate(withOverrides({ rate: "20.01" })).errors.rate).toBeDefined();
  });

  it("years: accepts 1 and 50, rejects 0, 51, and non-integers", () => {
    expect(validate(withOverrides({ years: "1" })).errors.years).toBeUndefined();
    expect(validate(withOverrides({ years: "50" })).errors.years).toBeUndefined();
    expect(validate(withOverrides({ years: "0" })).errors.years).toBeDefined();
    expect(validate(withOverrides({ years: "51" })).errors.years).toBeDefined();
    expect(validate(withOverrides({ years: "30.5" })).errors.years).toBeDefined();
  });

  it("empty, whitespace-only, and non-numeric strings produce 'required' errors", () => {
    const r = validate(withOverrides({ principalMan: "  ", rate: "", years: "abc" }));
    expect(r.request).toBeNull();
    expect(r.errors.principalMan).toBe("借入金額を入力してください。");
    expect(r.errors.rate).toBe("金利を入力してください。");
    expect(r.errors.years).toBe("返済期間を入力してください。");
  });

  it("bonus is ignored entirely when useBonus is off", () => {
    const { request, errors } = validate(withOverrides({ useBonus: false, bonusMan: "99999999" }));
    expect(errors).toEqual({});
    expect(request).not.toHaveProperty("bonusAmount");
  });

  it("bonus is included in yen when useBonus is on", () => {
    const { request } = validate(withOverrides({ useBonus: true, bonusMan: "500" }));
    expect(request?.bonusAmount).toBe(5_000_000);
  });

  it("bonus equal to principal is allowed; greater than principal is rejected", () => {
    expect(validate(withOverrides({ useBonus: true, bonusMan: "3000" })).errors.bonusMan).toBeUndefined();
    const over = validate(withOverrides({ useBonus: true, bonusMan: "3000.0001" }));
    expect(over.request).toBeNull();
    expect(over.errors.bonusMan).toBe("ボーナス返済分は借入金額以下にしてください。");
  });

  it("bonus of 0 is valid; negative and empty bonus are rejected when on", () => {
    expect(validate(withOverrides({ useBonus: true, bonusMan: "0" })).request?.bonusAmount).toBe(0);
    expect(validate(withOverrides({ useBonus: true, bonusMan: "-1" })).errors.bonusMan).toBe(
      "0円以上で入力してください。",
    );
    expect(validate(withOverrides({ useBonus: true, bonusMan: "" })).errors.bonusMan).toBe(
      "ボーナス返済分の借入額を入力してください。",
    );
  });

  it("skips the bonus-vs-principal comparison when principal itself is invalid", () => {
    const r = validate(withOverrides({ principalMan: "", useBonus: true, bonusMan: "100" }));
    expect(r.errors.principalMan).toBeDefined();
    expect(r.errors.bonusMan).toBeUndefined();
  });
});

describe("aggregateByYear", () => {
  const row = (month: number, p: Partial<ScheduleRow> = {}): ScheduleRow => ({
    month,
    payment: 100,
    bonusPayment: 0,
    principal: 60,
    interest: 40,
    balance: 1000 - month * 60,
    ...p,
  });

  it("groups months 1..12 into year 1, 13..24 into year 2 (ceil(month/12))", () => {
    const rows = [row(1), row(12), row(13), row(24), row(25)];
    const years = aggregateByYear(rows).map((y) => y.year);
    expect(years).toEqual([1, 2, 3]);
  });

  it("sums flow values and takes the last month's balance per year", () => {
    const rows = [
      row(1, { payment: 100, bonusPayment: 10, principal: 60, interest: 40, balance: 940 }),
      row(2, { payment: 100, bonusPayment: 0, principal: 61, interest: 39, balance: 879 }),
      row(12, { payment: 90, bonusPayment: 5, principal: 70, interest: 20, balance: 500 }),
    ];
    expect(aggregateByYear(rows)).toEqual([
      { year: 1, payment: 290, bonusPayment: 15, principal: 191, interest: 99, balance: 500 },
    ]);
  });

  it("preserves input order of years and returns [] for empty input", () => {
    expect(aggregateByYear([])).toEqual([]);
    const out = aggregateByYear([row(13), row(1)]);
    expect(out.map((y) => y.year)).toEqual([2, 1]);
  });
});

describe("yen", () => {
  it("formats with thousands separators and 円 suffix", () => {
    expect(yen(0)).toBe("0円");
    expect(yen(1234)).toBe("1,234円");
    expect(yen(30_000_000)).toBe("30,000,000円");
  });
});

describe("initialFromQuery (simulation)", () => {
  it("accepts valid values and stringifies years", () => {
    expect(initialFromQuery({ rate: "1.25", principal: "3000", years: "35" })).toEqual({
      rate: "1.25",
      principalMan: "3000",
      years: "35",
    });
  });

  it("accepts boundary values", () => {
    expect(initialFromQuery({ rate: "20", principal: "1", years: "1" })).toEqual({
      rate: "20",
      principalMan: "1",
      years: "1",
    });
    expect(initialFromQuery({ principal: "100000", years: "50", rate: "0" })).toEqual({
      rate: "0",
      principalMan: "100000",
      years: "50",
    });
  });

  it("ignores out-of-range and malformed values", () => {
    expect(initialFromQuery({ rate: "20.000001" })).toEqual({});
    expect(initialFromQuery({ rate: "-1" })).toEqual({});
    expect(initialFromQuery({ principal: "0" })).toEqual({});
    expect(initialFromQuery({ principal: "100001" })).toEqual({});
    expect(initialFromQuery({ principal: "0.5" })).toEqual({});
    expect(initialFromQuery({ years: "0" })).toEqual({});
    expect(initialFromQuery({ years: "51" })).toEqual({});
    expect(initialFromQuery({ years: "100" })).toEqual({});
    expect(initialFromQuery({ years: "3.5" })).toEqual({});
  });

  it("ignores repeated query params (string[]) and missing values", () => {
    expect(initialFromQuery({ rate: ["1", "2"], principal: ["3000"], years: ["35"] })).toEqual({});
    expect(initialFromQuery({})).toEqual({});
  });
});
