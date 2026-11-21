import { describe, expect, it, vi } from "vitest";
import {
  PAGE_SIZE,
  STALE_DAYS,
  formatDate,
  formatRate,
  isStale,
  listHref,
  parsePage,
  parseRateType,
  parseSort,
  rateTypeLabel,
  refinanceHref,
  safeUrl,
  simulateHref,
} from "./products";

describe("formatRate", () => {
  it("renders the annual rate with a % sign and no trailing zeros", () => {
    expect(formatRate(1.5)).toBe("1.5%");
    expect(formatRate(1.25)).toBe("1.25%");
    expect(formatRate(0.875)).toBe("0.875%");
    expect(formatRate(3)).toBe("3%");
    expect(formatRate(0)).toBe("0%");
  });

  it("keeps at most three decimals (rounds beyond that)", () => {
    expect(formatRate(1.2344)).toBe("1.234%");
    expect(formatRate(1.2)).toBe("1.2%");
  });
});

describe("isStale (30-day rule)", () => {
  // Instant-based: the date is read as UTC midnight and stale once more than 30 * 24h have elapsed.
  const iso = "2026-04-01";
  const day = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
  const DAY_MS = 86_400_000;

  it("is not stale at exactly 30 days, stale 1ms later", () => {
    expect(STALE_DAYS).toBe(30);
    const t0 = day(2026, 4, 1);
    expect(isStale(iso, t0 + 30 * DAY_MS)).toBe(false);
    expect(isStale(iso, t0 + 30 * DAY_MS + 1)).toBe(true);
  });

  it("is not stale on the effective date itself", () => {
    expect(isStale(iso, day(2026, 4, 1))).toBe(false);
  });

  it("defaults `now` to the current time (fake timers)", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-05-02T00:00:00Z"));
      expect(isStale("2026-04-01")).toBe(true);
      vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));
      expect(isStale("2026-04-01")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns false for malformed dates", () => {
    expect(isStale("not-a-date", day(2030, 1, 1))).toBe(false);
  });
});

describe("formatDate", () => {
  it("formats YYYY-MM-DD as 年/月/日 without zero padding", () => {
    expect(formatDate("2026-04-01")).toBe("2026年4月1日");
    expect(formatDate("2026-12-31")).toBe("2026年12月31日");
  });

  it("returns the input unchanged when it is not ISO-like", () => {
    expect(formatDate("令和8年")).toBe("令和8年");
  });
});

describe("rateTypeLabel", () => {
  it("labels each rate type", () => {
    expect(rateTypeLabel({ rateType: "VARIABLE", fixedPeriodYears: null })).toBe("変動");
    expect(rateTypeLabel({ rateType: "FIXED_FULL", fixedPeriodYears: null })).toBe("全期間固定");
  });

  it("includes fixed period years for FIXED_PERIOD when present", () => {
    expect(rateTypeLabel({ rateType: "FIXED_PERIOD", fixedPeriodYears: 10 })).toBe("固定期間選択型（10年）");
    expect(rateTypeLabel({ rateType: "FIXED_PERIOD", fixedPeriodYears: null })).toBe("固定期間選択型");
  });
});

describe("list page query parsing", () => {
  it("parseRateType accepts only the three enum values", () => {
    expect(parseRateType("VARIABLE")).toBe("VARIABLE");
    expect(parseRateType("FIXED_FULL")).toBe("FIXED_FULL");
    expect(parseRateType("FIXED_PERIOD")).toBe("FIXED_PERIOD");
    expect(parseRateType("variable")).toBeUndefined();
    expect(parseRateType("")).toBeUndefined();
    expect(parseRateType(undefined)).toBeUndefined();
    expect(parseRateType(["VARIABLE"])).toBeUndefined();
  });

  it("parseSort defaults to RATE_ASC for anything not whitelisted", () => {
    expect(parseSort("RATE_DESC")).toBe("RATE_DESC");
    expect(parseSort("NAME_ASC")).toBe("NAME_ASC");
    expect(parseSort("RATE_ASC")).toBe("RATE_ASC");
    expect(parseSort("DROP TABLE")).toBe("RATE_ASC");
    expect(parseSort(undefined)).toBe("RATE_ASC");
    expect(parseSort(["NAME_ASC"])).toBe("RATE_ASC");
  });

  it("parsePage accepts 1..6 digit strings and defaults to 0", () => {
    expect(parsePage("0")).toBe(0);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("999999")).toBe(999999);
    expect(parsePage("1000000")).toBe(0);
    expect(parsePage("-1")).toBe(0);
    expect(parsePage("1.5")).toBe(0);
    expect(parsePage("abc")).toBe(0);
    expect(parsePage("")).toBe(0);
    expect(parsePage(undefined)).toBe(0);
    expect(parsePage(["2"])).toBe(0);
  });

  it("PAGE_SIZE is 20", () => {
    expect(PAGE_SIZE).toBe(20);
  });
});

describe("listHref", () => {
  it("returns the bare path when all params are defaults", () => {
    expect(listHref({ sort: "RATE_ASC", page: 0 })).toBe("/products");
  });

  it("omits defaults and includes only non-default params, in a stable order", () => {
    expect(listHref({ rateType: "VARIABLE", sort: "NAME_ASC", page: 2 })).toBe(
      "/products?rateType=VARIABLE&sort=NAME_ASC&page=2",
    );
    expect(listHref({ sort: "RATE_DESC", page: 0 })).toBe("/products?sort=RATE_DESC");
    expect(listHref({ sort: "RATE_ASC", page: 1 })).toBe("/products?page=1");
  });

  it("round-trips through the parsers", () => {
    const href = listHref({ rateType: "FIXED_FULL", sort: "RATE_DESC", page: 4 });
    const qs = new URL(href, "http://x").searchParams;
    expect(parseRateType(qs.get("rateType") ?? undefined)).toBe("FIXED_FULL");
    expect(parseSort(qs.get("sort") ?? undefined)).toBe("RATE_DESC");
    expect(parsePage(qs.get("page") ?? undefined)).toBe(4);
  });
});

describe("safeUrl", () => {
  it("passes http and https URLs through (normalized)", () => {
    expect(safeUrl("https://example.com/rates")).toBe("https://example.com/rates");
    expect(safeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects non-http(s) schemes and relative or invalid input", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl("ftp://example.com")).toBeNull();
    expect(safeUrl("/relative/path")).toBeNull();
    expect(safeUrl("not a url")).toBeNull();
    expect(safeUrl("")).toBeNull();
  });
});

describe("link builders", () => {
  it("simulateHref encodes the rate into the query string", () => {
    expect(simulateHref(1.25)).toBe("/simulation?rate=1.25");
    expect(simulateHref(0)).toBe("/simulation?rate=0");
  });

  it("refinanceHref encodes the rate into the query string", () => {
    expect(refinanceHref(0.5)).toBe("/refinance?rate=0.5");
    expect(refinanceHref(20)).toBe("/refinance?rate=20");
  });
});
