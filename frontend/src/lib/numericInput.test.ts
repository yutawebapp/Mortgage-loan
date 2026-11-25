import { describe, expect, it } from "vitest";
import { normalizeNumericInput, parseNumericInput, stepNumericInput } from "./numericInput";

describe("normalizeNumericInput", () => {
  it("全角数字、記号、空白を変換する", () => {
    expect(normalizeNumericInput("　０１２３４５６７８９．。－ー−＋　")).toBe("0123456789..---+");
    expect(normalizeNumericInput("１２３．５")).toBe("123.5");
    expect(normalizeNumericInput("－０．５")).toBe("-0.5");
  });
  it("半角や変換できない文字をそのまま残す", () => {
    expect(normalizeNumericInput("+123.5-abc, あ")).toBe("+123.5-abc, あ");
    expect(normalizeNumericInput("")).toBe("");
  });
});

describe("parseNumericInput", () => {
  it("全角読点の桁区切り「3、000」は数値として解釈しない", () => {
    expect(normalizeNumericInput("3、000")).toBe("3、000");
    expect(parseNumericInput(normalizeNumericInput("3、000"))).toBeNaN();
  });
  it.each(["0x10", "0b10", "0o10", "1e3", "1E-3", "Infinity", "1.2.3", "--1", " ", "\t", "", ".", "+", "-", "1 ", " 1", "1,2"])("%j は数値として解釈しない", (value) => {
    expect(parseNumericInput(value)).toBeNaN();
  });
  it.each([["0", 0], ["+1.2", 1.2], ["-.5", -0.5], ["12.", 12], ["001", 1]] as const)("%s は十進数として解釈する", (value, expected) => {
    expect(parseNumericInput(value)).toBe(expected);
  });
});

describe("stepNumericInput", () => {
  it("小数誤差を除き増減する", () => {
    expect(stepNumericInput("0.1", "0.2", 0, undefined, 1)).toBe("0.3");
    expect(stepNumericInput("1.23", "0.1", 0, undefined, -1)).toBe("1.13");
    expect(stepNumericInput("0", "1e-3", 0, undefined, 1)).toBe("0.001");
    expect(stepNumericInput("0.009999999", "0.01", -10, undefined, -1)).toBe("-0.000000001");
  });
  it("上下限と空欄を扱う", () => {
    expect(stepNumericInput("0", 1, 0, undefined, -1)).toBe("0");
    expect(stepNumericInput("11", 1, 0, 11, 1)).toBe("11");
    expect(stepNumericInput("", 1, 0, undefined, 1)).toBe("1");
    expect(stepNumericInput("-1", 1, -2, undefined, -1)).toBe("-2");
  });
  it("不完全な値や不正なステップは変更しない", () => {
    for (const value of ["-", ".", "1あ", "1e3"]) expect(stepNumericInput(value, 1, 0, undefined, 1)).toBeNull();
    expect(stepNumericInput("1", 0, 0, undefined, 1)).toBeNull();
  });
});
