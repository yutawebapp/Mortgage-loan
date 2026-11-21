import { describe, expect, it } from "vitest";
import {
  QUERY_KEY,
  SHARED_QUERY_KEYS_BY_PATH,
  acceptFor,
  buildShareUrl,
  decodeStored,
  encodeStored,
  hrefWith,
  isSharedKey,
  normalizeSharedValue,
  sanitizeShared,
  toSearchParams,
  simulationExtraFromQuery,
  totalCostExtraFromQuery,
  type SharedKey,
} from "./sharedConditions";
import { budgetInitialFromQuery } from "./budget";
import { eligibilityInitialFromQuery } from "./eligibility";
import { lifePlanInitialFromQuery } from "./lifePlan";
import { prepaymentInitialFromQuery } from "./prepayment";
import { rateScenarioInitialFromQuery } from "./rate-scenario";
import { rateTypesInitialFromQuery } from "./rateTypes";
import { initialFromQuery as simulationInitialFromQuery } from "./simulation";
import { taxDeductionInitialFromQuery } from "./taxDeduction";
import { totalCostInitialFromQuery } from "./totalCost";
import { refinanceInitialFromQuery } from "./refinance";
import { pairInitialFromQuery } from "./simulation";

describe("normalizeSharedValue", () => {
  it("accepts values inside the shared ranges", () => {
    expect(normalizeSharedValue("principalMan", "3000")).toBe("3000");
    expect(normalizeSharedValue("principalMan", "100000")).toBe("100000");
    expect(normalizeSharedValue("rate", "0")).toBe("0");
    expect(normalizeSharedValue("rate", "20")).toBe("20");
    expect(normalizeSharedValue("rate", "1.25")).toBe("1.25");
    expect(normalizeSharedValue("years", "35")).toBe("35");
  });

  it("rejects out-of-range, malformed, and non-string values", () => {
    expect(normalizeSharedValue("principalMan", "0")).toBeUndefined();
    expect(normalizeSharedValue("principalMan", "100001")).toBeUndefined();
    expect(normalizeSharedValue("rate", "20.1")).toBeUndefined();
    expect(normalizeSharedValue("rate", "-1")).toBeUndefined();
    expect(normalizeSharedValue("rate", "1e2")).toBeUndefined();
    expect(normalizeSharedValue("years", "0")).toBeUndefined();
    expect(normalizeSharedValue("years", "51")).toBeUndefined();
    expect(normalizeSharedValue("years", "3.5")).toBeUndefined();
    expect(normalizeSharedValue("years", "")).toBeUndefined();
    expect(normalizeSharedValue("years", 35)).toBeUndefined();
    expect(normalizeSharedValue("rate", undefined)).toBeUndefined();
  });

  it("normalizes years with leading zeros", () => {
    expect(normalizeSharedValue("years", "05")).toBe("5");
  });
});

describe("toSearchParams / hrefWith / buildShareUrl", () => {
  const c = { principalMan: "3000", rate: "1.2", years: "35" };

  it("serializes valid values with the URL query keys", () => {
    expect(toSearchParams(c).toString()).toBe("principal=3000&rate=1.2&years=35");
    expect(toSearchParams({ rate: "bad", years: "30" }).toString()).toBe("years=30");
  });

  it("builds a share URL on the current path", () => {
    expect(buildShareUrl("https://ex.test", "/simulation", c)).toBe(
      "https://ex.test/simulation?principal=3000&rate=1.2&years=35",
    );
    expect(buildShareUrl("https://ex.test", "/simulation", {})).toBe("https://ex.test/simulation");
  });

  it("hrefWith carries only keys the target understands", () => {
    expect(hrefWith("/prepayment", c)).toBe("/prepayment?principal=3000&rate=1.2&years=35");
    expect(hrefWith("/eligibility", c)).toBe("/eligibility?rate=1.2&years=35");
    expect(hrefWith("/unknown-tool", c)).toBe("/unknown-tool");
    expect(hrefWith("/prepayment", {}, { from: "sim" })).toBe("/prepayment?from=sim");
  });
});

describe("storage encode/decode", () => {
  it("round-trips only valid values", () => {
    const raw = encodeStored({ principalMan: "3000", rate: "x", years: "35" });
    expect(raw).toBe('{"principalMan":"3000","years":"35"}');
    expect(decodeStored(raw)).toEqual({ principalMan: "3000", years: "35" });
  });

  it("treats missing or broken storage as empty", () => {
    expect(decodeStored(null)).toEqual({});
    expect(decodeStored("{not json")).toEqual({});
    expect(decodeStored('"str"')).toEqual({});
    expect(decodeStored("[1,2]")).toEqual({});
  });

  it("sanitizeShared ignores unknown keys", () => {
    expect(sanitizeShared({ principalMan: "1", foo: "2" })).toEqual({ principalMan: "1" });
  });
});

describe("hrefWith for the simulation tool lane (prepayment / rate-scenario / rate-types / refinance)", () => {
  const c = { principalMan: "3000", rate: "1.2", years: "35" };

  it("prepayment and rate-scenario receive principal, rate and years", () => {
    expect(hrefWith("/prepayment", c)).toBe("/prepayment?principal=3000&rate=1.2&years=35");
    expect(hrefWith("/rate-scenario", c)).toBe("/rate-scenario?principal=3000&rate=1.2&years=35");
  });

  it("rate-types receives only principal and years (rate is one of four rates there)", () => {
    expect(hrefWith("/rate-types", c)).toBe("/rate-types?principal=3000&years=35");
    expect(hrefWith("/rate-types", { rate: "1.2" })).toBe("/rate-types");
  });

  it("refinance receives no shared key (rate means 借り換え後の金利)", () => {
    expect(hrefWith("/refinance", c)).toBe("/refinance");
  });
});

describe("tool wiring: principal meaning per target (物件価格 vs 借入額)", () => {
  const c = { principalMan: "3000", rate: "1.2", years: "35" };

  it("/total-cost and /rent-vs-buy never receive the shared 借入額 as principal", () => {
    expect(hrefWith("/total-cost", c)).toBe("/total-cost?rate=1.2&years=35");
    expect(hrefWith("/rent-vs-buy", c)).toBe("/rent-vs-buy?rate=1.2&years=35");
  });

  it("a caller may pass the price explicitly as extra principal (物件価格)", () => {
    expect(hrefWith("/total-cost", c, { principal: "4000" })).toBe("/total-cost?rate=1.2&years=35&principal=4000");
    expect(hrefWith("/rent-vs-buy", c, { principal: "4000" })).toBe("/rent-vs-buy?rate=1.2&years=35&principal=4000");
  });

  it("/tax-deduction and /life-plan receive the shared 借入額", () => {
    expect(hrefWith("/tax-deduction", c)).toBe("/tax-deduction?principal=3000&rate=1.2&years=35");
    expect(hrefWith("/life-plan", c)).toBe("/life-plan?principal=3000&rate=1.2&years=35");
  });
});

describe("per-target range (acceptFor / hrefWith)", () => {
  it("rate-scenario and rate-types need at least 2 years, so a 1-year value is not carried", () => {
    expect(hrefWith("/rate-scenario", { years: "1", rate: "1.2" })).toBe("/rate-scenario?rate=1.2");
    expect(hrefWith("/rate-types", { years: "1", principalMan: "3000" })).toBe("/rate-types?principal=3000");
    expect(acceptFor("/rate-scenario", { years: "1" })).toEqual({});
    expect(acceptFor("/prepayment", { years: "1" })).toEqual({ years: "1" });
  });

  it("acceptFor keeps only the keys the target reads", () => {
    expect(acceptFor("/rate-types", { principalMan: "3000", rate: "1.2", years: "35" })).toEqual({
      principalMan: "3000",
      years: "35",
    });
    expect(acceptFor("/total-cost", { principalMan: "3000", rate: "1.2" })).toEqual({ rate: "1.2" });
    expect(acceptFor("/unknown", { rate: "1.2" })).toEqual({});
  });
});

describe("share link (ShareLinkButton) round-trip", () => {
  const queryOf = (url: string) => Object.fromEntries(new URL(url).searchParams.entries());

  it("total-cost share link carries the price as principal and round-trips through its parser", () => {
    const url = buildShareUrl("https://ex.test", "/total-cost", { rate: "1.2", years: "35" }, { principal: "4000" });
    expect(url).toBe("https://ex.test/total-cost?rate=1.2&years=35&principal=4000");
    const parsed = totalCostInitialFromQuery(queryOf(url));
    expect(parsed).toEqual({ priceMan: "4000", rate: "1.2", years: "35" });
  });

  it("rent-vs-buy share link carries the price as principal and round-trips through its parser", () => {
    const url = buildShareUrl("https://ex.test", "/rent-vs-buy", { rate: "0.8", years: "30" }, { principal: "3500" });
    expect(totalCostInitialFromQuery(queryOf(url))).toEqual({ priceMan: "3500", rate: "0.8", years: "30" });
  });

  it("a share link on /total-cost never carries the 借入額 as principal", () => {
    const url = buildShareUrl("https://ex.test", "/total-cost", { principalMan: "3000", rate: "1.2" });
    expect(url).toBe("https://ex.test/total-cost?rate=1.2");
  });
});

describe("URL-only condition round trips", () => {
  const queryOf = (url: string) => Object.fromEntries(new URL(url, "https://ex.test").searchParams.entries());
  it("rate comparison switches preserve valid loan terms and the variable rate in both directions", () => {
    const fromScenario = queryOf(hrefWith("/rate-types", { principalMan: "3000.1234", rate: "1.25", years: "35" }, { variableRate: "1.25", method: "EQUAL_PRINCIPAL" }));
    expect(rateTypesInitialFromQuery(fromScenario)).toEqual({ principalMan: "3000.1234", variableRate: "1.25", years: "35", method: "EQUAL_PRINCIPAL" });
    const fromTypes = queryOf(hrefWith("/rate-scenario", { principalMan: "3000.1234", rate: "1.25", years: "35" }, { method: "EQUAL_PRINCIPAL" }));
    expect(rateScenarioInitialFromQuery(fromTypes)).toEqual({ principalMan: "3000.1234", rate: "1.25", years: "35", method: "EQUAL_PRINCIPAL" });
    expect(rateTypesInitialFromQuery({ variableRate: "-1", method: "bad" })).toEqual({});
    expect(rateScenarioInitialFromQuery({ method: ["EQUAL_PAYMENT"] })).toEqual({});
  });
  it("budget to total cost carries the result price and matching purchase conditions", () => {
    const q = queryOf(hrefWith("/total-cost", { rate: "1.2", years: "35" }, { principal: "4000.1234", down: "500", closing: "8" }));
    expect(totalCostInitialFromQuery(q)).toEqual({ priceMan: "4000.1234", rate: "1.2", years: "35" });
    expect(totalCostExtraFromQuery(q)).toEqual({ downMan: "500", closingRate: "8" });
  });
  it("simulation shares method, bonus including zero, and pair share", () => {
    const q = queryOf(buildShareUrl("https://ex.test", "/simulation", { principalMan: "4000", rate: "1", years: "35" }, { method: "EQUAL_PRINCIPAL", bonus: "0", share: "60" }));
    expect(simulationInitialFromQuery(q)).toEqual({ principalMan: "4000", rate: "1", years: "35" });
    expect(simulationExtraFromQuery(q)).toEqual({ method: "EQUAL_PRINCIPAL", useBonus: true, bonusMan: "0" });
    expect(pairInitialFromQuery(q)).toEqual({ enabled: true, selfPercent: "60" });
  });
  it("total cost shares all cost and loan inputs", () => {
    const q = queryOf(buildShareUrl("https://ex.test", "/total-cost", { rate: "1", years: "30" }, { principal: "4000", down: "400", closing: "10", method: "EQUAL_PRINCIPAL", management: "0", repair: "17000", tax: "200000", insurance: "40000" }));
    expect(totalCostInitialFromQuery(q)).toEqual({ priceMan: "4000", rate: "1", years: "30" });
    expect(totalCostExtraFromQuery(q)).toEqual({ downMan: "400", closingRate: "10", method: "EQUAL_PRINCIPAL", managementFee: "0", repairReserve: "17000", propertyTax: "200000", insurance: "40000" });
  });
  it("ignores malformed or out-of-range URL-only fields", () => {
    expect(simulationExtraFromQuery({ method: "bad", bonus: "-1" })).toEqual({});
    expect(totalCostExtraFromQuery({ down: "100001", closing: "30.1", method: ["EQUAL_PAYMENT"], tax: "1.5", insurance: "10000001" })).toEqual({});
  });
  it("prepayment to refinance passes current rate and method, never principal or years", () => {
    const q = queryOf(hrefWith("/refinance", { principalMan: "4000", rate: "1.2", years: "35" }, { currentRate: "1.2", method: "EQUAL_PRINCIPAL" }));
    expect(q).toEqual({ currentRate: "1.2", method: "EQUAL_PRINCIPAL" });
    expect(refinanceInitialFromQuery(q)).toEqual({ currentRate: "1.2", method: "EQUAL_PRINCIPAL" });
  });
});

/**
 * 契約テスト: SHARED_QUERY_KEYS_BY_PATH の各遷移先について、実際の受け取りパーサに値を通す。
 * 「パーサが受け取った値」と「リンクに載る値」が一致すること（受け取る値は同じ・拒否する値はリンクに載らない）を確認する。
 */
type Parser = (q: Record<string, string | undefined>) => object;

const PARSERS: Record<string, Parser> = {
  "/simulation": simulationInitialFromQuery,
  "/prepayment": prepaymentInitialFromQuery,
  "/rate-scenario": rateScenarioInitialFromQuery,
  "/total-cost": totalCostInitialFromQuery,
  "/rent-vs-buy": totalCostInitialFromQuery,
  "/eligibility": eligibilityInitialFromQuery,
  "/budget": budgetInitialFromQuery,
  "/tax-deduction": taxDeductionInitialFromQuery,
  "/life-plan": lifePlanInitialFromQuery,
  "/rate-types": rateTypesInitialFromQuery,
  "/refinance": refinanceInitialFromQuery,
};

/** 受け取りパーサを接続していない遷移先（あれば PARSERS に移す）。 */
const PENDING_PARSERS = new Set<string>();

/** 受け取りパーサの出力フィールド名（共通キー → フォーム上の名前）。 */
const FIELD_BY_PATH: Record<string, Partial<Record<SharedKey, string>>> = {
  "/life-plan": { principalMan: "loanMan" },
};

const SAMPLES: Record<SharedKey, string[]> = {
  principalMan: ["1", "3000", "3000.5", "100000", "100001", "0", "abc"],
  rate: ["0", "1.25", "20", "20.01", "-1", "x"],
  years: ["1", "2", "05", "35", "50", "51", "0", "3.5"],
};

describe("contract: every shared key a target reads round-trips through the target's own parser", () => {
  it("has a parser for every path in SHARED_QUERY_KEYS_BY_PATH (except the pending ones)", () => {
    const missing = Object.keys(SHARED_QUERY_KEYS_BY_PATH).filter((p) => !PARSERS[p] && !PENDING_PARSERS.has(p));
    expect(missing).toEqual([]);
    expect(Object.keys(PARSERS).filter((p) => !(p in SHARED_QUERY_KEYS_BY_PATH))).toEqual([]);
  });

  for (const path of Object.keys(PARSERS)) {
    for (const key of (SHARED_QUERY_KEYS_BY_PATH[path] ?? []).filter(isSharedKey)) {
      for (const raw of SAMPLES[key]) {
        it(`${path} ${QUERY_KEY[key]}=${raw}`, () => {
          const field = FIELD_BY_PATH[path]?.[key] ?? key;
          const parsed = (PARSERS[path]({ [QUERY_KEY[key]]: raw }) as Record<string, unknown>)[field];
          const normalized = normalizeSharedValue(key, raw);
          const carried = hrefWith(path, { [key]: raw }).includes(`${QUERY_KEY[key]}=`);

          // 受け取られた値は、共通の正規化結果と同じ（数値として）
          if (parsed !== undefined) {
            expect(normalized).toBeDefined();
            expect(Number(parsed)).toBe(Number(normalized));
          }
          // リンクに載る ⇔ パーサが受け取る（食い違いは「渡したのに無視される」または「黙って別の値になる」になる）
          expect(carried).toBe(parsed !== undefined);
        });
      }
    }
  }
});
