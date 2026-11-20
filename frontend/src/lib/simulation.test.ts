import { describe, expect, it } from "vitest";
import type { ScheduleRow } from "./api/simulation";
import {
  type FormValues,
  type PairOptions,
  aggregateByYear,
  formatDateJa,
  ageError,
  compareRows,
  initialFromQuery,
  loanConditionRows,
  initialPair,
  pairInitialFromQuery,
  parseAge,
  payoffAge,
  signedDiff,
  validate,
  yen,
} from "./simulation";

const base: FormValues = {
  principalMan: "3000",
  rate: "1.5",
  years: "35",
  method: "EQUAL_PAYMENT",
  useBonus: false,
  bonusMan: "",
};
const withOverrides = (o: Partial<FormValues>): FormValues => ({
  ...base,
  ...o,
});

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
    expect(
      validate(withOverrides({ principalMan: "0.0001" })).request?.principal,
    ).toBe(1);
    expect(
      validate(withOverrides({ principalMan: "100000" })).request?.principal,
    ).toBe(1_000_000_000);
  });

  it("rejects principal just below 1円 and just above 10億円", () => {
    // 0.00004万円 = 0.4円 -> rounds to 0
    expect(
      validate(withOverrides({ principalMan: "0.00004" })).errors.principalMan,
    ).toBeDefined();
    expect(
      validate(withOverrides({ principalMan: "0" })).errors.principalMan,
    ).toBeDefined();
    expect(
      validate(withOverrides({ principalMan: "-1" })).errors.principalMan,
    ).toBeDefined();
    expect(
      validate(withOverrides({ principalMan: "100000.0001" })).errors
        .principalMan,
    ).toBeDefined();
  });

  it("rounds principal to the nearest yen", () => {
    // 1.23456789万円 = 12345.6789円 -> 12346円
    expect(
      validate(withOverrides({ principalMan: "1.23456789" })).request
        ?.principal,
    ).toBe(12346);
  });

  it("rate: accepts 0 and 20, rejects below 0 and above 20", () => {
    expect(validate(withOverrides({ rate: "0" })).errors.rate).toBeUndefined();
    expect(validate(withOverrides({ rate: "20" })).errors.rate).toBeUndefined();
    expect(
      validate(withOverrides({ rate: "-0.01" })).errors.rate,
    ).toBeDefined();
    expect(
      validate(withOverrides({ rate: "20.01" })).errors.rate,
    ).toBeDefined();
  });

  it("years: accepts 1 and 50, rejects 0, 51, and non-integers", () => {
    expect(
      validate(withOverrides({ years: "1" })).errors.years,
    ).toBeUndefined();
    expect(
      validate(withOverrides({ years: "50" })).errors.years,
    ).toBeUndefined();
    expect(validate(withOverrides({ years: "0" })).errors.years).toBeDefined();
    expect(validate(withOverrides({ years: "51" })).errors.years).toBeDefined();
    expect(
      validate(withOverrides({ years: "30.5" })).errors.years,
    ).toBeDefined();
  });

  it("empty, whitespace-only, and non-numeric strings produce 'required' errors", () => {
    const r = validate(
      withOverrides({ principalMan: "  ", rate: "", years: "abc" }),
    );
    expect(r.request).toBeNull();
    expect(r.errors.principalMan).toBe("借入金額を入力してください。");
    expect(r.errors.rate).toBe("金利を入力してください。");
    expect(r.errors.years).toBe("返済期間を入力してください。");
  });

  it("bonus is ignored entirely when useBonus is off", () => {
    const { request, errors } = validate(
      withOverrides({ useBonus: false, bonusMan: "99999999" }),
    );
    expect(errors).toEqual({});
    expect(request).not.toHaveProperty("bonusAmount");
  });

  it("bonus is included in yen when useBonus is on", () => {
    const { request } = validate(
      withOverrides({ useBonus: true, bonusMan: "500" }),
    );
    expect(request?.bonusAmount).toBe(5_000_000);
  });

  it("bonus equal to principal is allowed; greater than principal is rejected", () => {
    expect(
      validate(withOverrides({ useBonus: true, bonusMan: "3000" })).errors
        .bonusMan,
    ).toBeUndefined();
    const over = validate(
      withOverrides({ useBonus: true, bonusMan: "3000.0001" }),
    );
    expect(over.request).toBeNull();
    expect(over.errors.bonusMan).toBe(
      "ボーナス返済分は借入金額以下にしてください。",
    );
  });

  it("bonus of 0 is valid; negative and empty bonus are rejected when on", () => {
    expect(
      validate(withOverrides({ useBonus: true, bonusMan: "0" })).request
        ?.bonusAmount,
    ).toBe(0);
    expect(
      validate(withOverrides({ useBonus: true, bonusMan: "-1" })).errors
        .bonusMan,
    ).toBe("0円以上で入力してください。");
    expect(
      validate(withOverrides({ useBonus: true, bonusMan: "" })).errors.bonusMan,
    ).toBe("ボーナス返済分の借入額を入力してください。");
  });

  it("skips the bonus-vs-principal comparison when principal itself is invalid", () => {
    const r = validate(
      withOverrides({ principalMan: "", useBonus: true, bonusMan: "100" }),
    );
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
      row(1, {
        payment: 100,
        bonusPayment: 10,
        principal: 60,
        interest: 40,
        balance: 940,
      }),
      row(2, {
        payment: 100,
        bonusPayment: 0,
        principal: 61,
        interest: 39,
        balance: 879,
      }),
      row(12, {
        payment: 90,
        bonusPayment: 5,
        principal: 70,
        interest: 20,
        balance: 500,
      }),
    ];
    expect(aggregateByYear(rows)).toEqual([
      {
        year: 1,
        payment: 290,
        bonusPayment: 15,
        principal: 191,
        interest: 99,
        balance: 500,
      },
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
    expect(
      initialFromQuery({ rate: "1.25", principal: "3000", years: "35" }),
    ).toEqual({
      rate: "1.25",
      principalMan: "3000",
      years: "35",
    });
  });

  it("accepts boundary values", () => {
    expect(
      initialFromQuery({ rate: "20", principal: "1", years: "1" }),
    ).toEqual({
      rate: "20",
      principalMan: "1",
      years: "1",
    });
    expect(
      initialFromQuery({ principal: "100000", years: "50", rate: "0" }),
    ).toEqual({
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
    expect(
      initialFromQuery({
        rate: ["1", "2"],
        principal: ["3000"],
        years: ["35"],
      }),
    ).toEqual({});
    expect(initialFromQuery({})).toEqual({});
  });
});

describe("validate (pair share)", () => {
  const on = (selfPercent: string): PairOptions => ({
    enabled: true,
    selfPercent,
  });

  it("does not send selfSharePercent when pair is off (default)", () => {
    const { request } = validate(base);
    expect(request).not.toHaveProperty("selfSharePercent");
    expect(
      validate(base, { enabled: false, selfPercent: "30" }).request,
    ).not.toHaveProperty("selfSharePercent");
    expect(initialPair.enabled).toBe(false);
  });

  it("sends selfSharePercent as an integer when pair is on", () => {
    const { request, errors } = validate(base, on("50"));
    expect(errors).toEqual({});
    expect(request?.selfSharePercent).toBe(50);
  });

  it("accepts 1 and 99, rejects 0, 100, and non-integers", () => {
    expect(validate(base, on("1")).errors.selfSharePercent).toBeUndefined();
    expect(validate(base, on("99")).errors.selfSharePercent).toBeUndefined();
    expect(validate(base, on("0")).errors.selfSharePercent).toBeDefined();
    expect(validate(base, on("100")).errors.selfSharePercent).toBeDefined();
    expect(validate(base, on("33.5")).errors.selfSharePercent).toBeDefined();
    expect(validate(base, on("")).errors.selfSharePercent).toBe(
      "あなたの負担割合を入力してください。",
    );
    expect(validate(base, on("0")).request).toBeNull();
  });

  it("ignores an invalid share while pair is off", () => {
    const { errors } = validate(base, { enabled: false, selfPercent: "abc" });
    expect(errors).toEqual({});
  });
});

describe("formatDateJa", () => {
  it("formats without zero padding (YYYY年M月D日)", () => {
    expect(formatDateJa(new Date(2026, 10, 20))).toBe("2026年11月20日");
    expect(formatDateJa(new Date(2026, 0, 5))).toBe("2026年1月5日");
  });
});

describe("loanConditionRows", () => {
  const req = {
    principal: 30_000_000,
    annualRatePercent: 1.2,
    years: 35,
    method: "EQUAL_PAYMENT" as const,
  };

  it("CSV (plain) rows for a plain loan: no bonus or pair rows", () => {
    expect(loanConditionRows(req, "2026年11月20日", true)).toEqual([
      ["借入額", 30000000],
      ["金利（年率）", 1.2],
      ["返済期間", 35],
      ["返済方式", "元利均等返済"],
      ["試算日", "2026年11月20日"],
    ]);
  });

  it("display rows add units and include bonus and pair share only when used", () => {
    const rows = loanConditionRows(
      {
        ...req,
        method: "EQUAL_PRINCIPAL",
        bonusAmount: 5_000_000,
        selfSharePercent: 40,
      },
      "2026年11月20日",
      false,
    );
    expect(rows).toEqual([
      ["借入額", "30,000,000円"],
      ["金利（年率）", "1.2%"],
      ["返済期間", "35年"],
      ["返済方式", "元金均等返済"],
      ["ボーナス返済の借入額", "5,000,000円"],
      ["あなたの負担割合", "40%"],
      ["試算日", "2026年11月20日"],
    ]);
  });
});

describe("pairInitialFromQuery", () => {
  it("is off when no pair params are given", () => {
    expect(pairInitialFromQuery({})).toEqual({ enabled: false, selfPercent: "50" });
  });
  it("pair=1 turns the toggle on with 50%", () => {
    expect(pairInitialFromQuery({ pair: "1" })).toEqual({ enabled: true, selfPercent: "50" });
  });
  it("share=<1..99> turns the toggle on and sets the self share", () => {
    expect(pairInitialFromQuery({ share: "40" })).toEqual({ enabled: true, selfPercent: "40" });
    expect(pairInitialFromQuery({ pair: "1", share: "70" })).toEqual({ enabled: true, selfPercent: "70" });
    expect(pairInitialFromQuery({ share: "1" }).selfPercent).toBe("1");
    expect(pairInitialFromQuery({ share: "99" }).selfPercent).toBe("99");
  });
  it("ignores invalid values", () => {
    for (const share of ["0", "100", "-5", "4.5", "abc", "", "1000"]) {
      expect(pairInitialFromQuery({ share })).toEqual(initialPair);
    }
    expect(pairInitialFromQuery({ pair: "true" })).toEqual(initialPair);
    expect(pairInitialFromQuery({ pair: ["1", "1"] })).toEqual(initialPair);
  });
  it("invalid share with pair=1 falls back to 50%", () => {
    expect(pairInitialFromQuery({ pair: "1", share: "0" })).toEqual({ enabled: true, selfPercent: "50" });
  });
});

describe("payoff age helpers", () => {
  it("parseAge accepts integers 18..80 and treats blank as off", () => {
    expect(parseAge("")).toBeNull();
    expect(parseAge("  ")).toBeNull();
    expect(parseAge("18")).toBe(18);
    expect(parseAge("80")).toBe(80);
    expect(parseAge("17")).toBeNull();
    expect(parseAge("81")).toBeNull();
    expect(parseAge("30.5")).toBeNull();
  });
  it("ageError is empty for blank or valid, and a message otherwise", () => {
    expect(ageError("")).toBeUndefined();
    expect(ageError("35")).toBeUndefined();
    expect(ageError("81")).toBeDefined();
    expect(ageError("x")).toBeDefined();
  });
  it("payoffAge is age plus years", () => {
    expect(payoffAge(35, 35)).toBe(70);
    expect(payoffAge(18, 50)).toBe(68);
  });
});

describe("signedDiff / compareRows", () => {
  it("formats differences with explicit sign and no judgment words", () => {
    expect(signedDiff(1234, "円")).toBe("+1,234円");
    expect(signedDiff(-500, "円")).toBe("−500円");
    expect(signedDiff(0, "年")).toBe("0年");
  });
  it("compares B minus A for each row", () => {
    const a = { monthlyPayment: 100000, totalPayment: 42000000, totalInterest: 12000000, years: 35 };
    const b = { monthlyPayment: 110000, totalPayment: 39600000, totalInterest: 9600000, years: 30 };
    expect(compareRows(a, b)).toEqual([
      { label: "毎月の返済額（初回）", a: "100,000円", b: "110,000円", diff: "+10,000円" },
      { label: "総返済額", a: "42,000,000円", b: "39,600,000円", diff: "−2,400,000円" },
      { label: "利息総額", a: "12,000,000円", b: "9,600,000円", diff: "−2,400,000円" },
      { label: "返済期間", a: "35年", b: "30年", diff: "−5年" },
    ]);
  });
});
