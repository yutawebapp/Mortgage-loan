import { describe, expect, it } from "vitest";
import { queryRecordFromSearch } from "./urlQuery";
import { budgetInitialFromQuery } from "./budget";

describe("queryRecordFromSearch", () => {
  it("returns an empty record for an empty search", () => {
    expect(queryRecordFromSearch("")).toEqual({});
  });

  it("accepts a leading ? and keeps single values as strings", () => {
    expect(queryRecordFromSearch("?principal=3000&rate=1.2")).toEqual({ principal: "3000", rate: "1.2" });
  });

  it("keeps repeated keys as arrays, like Next searchParams", () => {
    expect(queryRecordFromSearch("?rate=1&rate=2&years=35")).toEqual({ rate: ["1", "2"], years: "35" });
  });

  it("decodes percent-encoded and plus-encoded values", () => {
    expect(queryRecordFromSearch("?pair=%31&share=2+5")).toEqual({ pair: "1", share: "2 5" });
  });

  it("treats __proto__ as an ordinary key without polluting the prototype", () => {
    const q = queryRecordFromSearch("?__proto__=x&rate=1");
    expect(Object.getPrototypeOf(q)).toBe(Object.prototype);
    expect(q.rate).toBe("1");
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it("feeds the existing xxxInitialFromQuery parsers without changes", () => {
    const q = queryRecordFromSearch("?rate=0.8&years=30&rate=0.9");
    // 同じキーが複数回のときは配列になり、既存パーサは無効値として捨てる
    expect(budgetInitialFromQuery(q)).toEqual({ years: "30" });
    expect(budgetInitialFromQuery(queryRecordFromSearch("?rate=0.8&years=30"))).toEqual({
      rate: "0.8",
      years: "30",
    });
  });
});
