import { describe, expect, it } from "vitest";
import { formatLastUpdated, operatorRows } from "./operator";

describe("operatorRows", () => {
  it("hides every row whose value is null", () => {
    expect(operatorRows({ name: null, address: null, contact: null })).toEqual([]);
  });

  it("shows only the filled rows, in a fixed order", () => {
    expect(operatorRows({ name: "テスト運営", address: null, contact: "a@example.com" })).toEqual([
      { label: "運営者", value: "テスト運営" },
      { label: "お問い合わせ", value: "a@example.com" },
    ]);
  });

  it("treats blank or whitespace-only values as not filled", () => {
    expect(operatorRows({ name: "   ", address: "", contact: "\n" })).toEqual([]);
  });
});

describe("formatLastUpdated", () => {
  it("formats YYYY-MM-DD in Japanese", () => {
    expect(formatLastUpdated("2026-11-17")).toBe("2026年11月17日");
  });

  it("returns null when unset or malformed", () => {
    expect(formatLastUpdated(null)).toBeNull();
    expect(formatLastUpdated("2026/11/17")).toBeNull();
  });
});
