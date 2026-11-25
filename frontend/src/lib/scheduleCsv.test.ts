import { describe, expect, it } from "vitest";
import {
  buildScheduleCsv,
  escapeCsvField,
  scheduleCsvFilename,
} from "./scheduleCsv";

const BOM = "\uFEFF";

describe("escapeCsvField", () => {
  it("leaves plain values and numbers as-is", () => {
    expect(escapeCsvField("1年目")).toBe("1年目");
    expect(escapeCsvField(1234567)).toBe("1234567");
  });

  it("quotes values with comma, quote, or newline and doubles quotes", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("buildScheduleCsv", () => {
  const yearRows = [
    {
      period: 1,
      payment: 1200000,
      bonusPayment: 0,
      principal: 300000,
      interest: 900000,
      balance: 29700000,
    },
    {
      period: 2,
      payment: 1200000,
      bonusPayment: 0,
      principal: 310000,
      interest: 890000,
      balance: 29390000,
    },
  ];

  it("year view without bonus: BOM, CRLF, Japanese headers, plain integers", () => {
    const csv = buildScheduleCsv(yearRows, {
      unit: "year",
      hasBonus: false,
      meta: [],
    });
    expect(csv).toBe(
      `${BOM}年,返済額,元金,利息,残高\r\n` +
        "1年目,1200000,300000,900000,29700000\r\n" +
        "2年目,1200000,310000,890000,29390000\r\n",
    );
  });

  it("includes the bonus column only when hasBonus is true", () => {
    const rows = [
      {
        period: 1,
        payment: 1500000,
        bonusPayment: 300000,
        principal: 400000,
        interest: 900000,
        balance: 29600000,
      },
    ];
    const csv = buildScheduleCsv(rows, {
      unit: "year",
      hasBonus: true,
      meta: [],
    });
    expect(csv).toBe(
      `${BOM}年,返済額,うちボーナス,元金,利息,残高\r\n` +
        "1年目,1500000,300000,400000,900000,29600000\r\n",
    );
  });

  it("month view uses 回 header and 回 labels", () => {
    const rows = [
      {
        period: 1,
        payment: 100000,
        bonusPayment: 0,
        principal: 50000,
        interest: 50000,
        balance: 9950000,
      },
      {
        period: 12,
        payment: 100000,
        bonusPayment: 0,
        principal: 51000,
        interest: 49000,
        balance: 9000000,
      },
    ];
    const csv = buildScheduleCsv(rows, {
      unit: "month",
      hasBonus: false,
      meta: [],
    });
    expect(csv).toBe(
      `${BOM}回,返済額,元金,利息,残高\r\n` +
        "1回,100000,50000,50000,9950000\r\n" +
        "12回,100000,51000,49000,9000000\r\n",
    );
  });

  it("header only when there are no rows", () => {
    expect(
      buildScheduleCsv([], { unit: "year", hasBonus: false, meta: [] }),
    ).toBe(`${BOM}年,返済額,元金,利息,残高\r\n`);
  });
});

describe("buildScheduleCsv with conditions block", () => {
  it("puts 項目,値 rows, a blank line, then the table", () => {
    const rows = [
      {
        period: 1,
        payment: 1200000,
        bonusPayment: 0,
        principal: 300000,
        interest: 900000,
        balance: 29700000,
      },
    ];
    const csv = buildScheduleCsv(rows, {
      unit: "year",
      hasBonus: false,
      meta: [
        ["借入額", 30000000],
        ["金利（年率）", 1.2],
        ["試算日", "2026年11月20日"],
      ],
    });
    expect(csv).toBe(
      `${BOM}項目,値\r\n` +
        "借入額,30000000\r\n" +
        "金利（年率）,1.2\r\n" +
        "試算日,2026年11月20日\r\n" +
        "\r\n" +
        "年,返済額,元金,利息,残高\r\n" +
        "1年目,1200000,300000,900000,29700000\r\n",
    );
  });

  it("quotes a meta value that contains a comma", () => {
    const csv = buildScheduleCsv([], {
      unit: "year",
      hasBonus: false,
      meta: [["注記", "a,b"]],
    });
    expect(csv).toBe(
      `${BOM}項目,値\r\n注記,"a,b"\r\n\r\n年,返済額,元金,利息,残高\r\n`,
    );
  });
});

describe("scheduleCsvFilename", () => {
  it("returns the Japanese filename per unit", () => {
    expect(scheduleCsvFilename("year")).toBe("返済予定表_年別.csv");
    expect(scheduleCsvFilename("month")).toBe("返済予定表_月別.csv");
  });
});
