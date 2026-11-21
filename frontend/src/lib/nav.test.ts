import { describe, expect, it } from "vitest";
import { LEGAL_LINKS, NAV_GROUPS, TOOLS, isActivePath, navGroupTools } from "./nav";

describe("NAV_GROUPS", () => {
  it("contains every tool exactly once and no unknown href", () => {
    const all = NAV_GROUPS.flatMap((g) => [...g.hrefs]).sort();
    expect(all).toEqual(TOOLS.map((t) => t.href).sort());
    expect(new Set(all).size).toBe(all.length);
  });

  it("has short, unique group labels and no empty group", () => {
    const labels = NAV_GROUPS.map((g) => g.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const g of NAV_GROUPS) {
      expect(g.label.length).toBeLessThanOrEqual(7);
      expect(g.hrefs.length).toBeGreaterThan(0);
    }
  });

  it("navGroupTools resolves labels and drops unknown hrefs", () => {
    expect(navGroupTools(["/budget", "/nope"])).toEqual([{ href: "/budget", label: "購入予算の逆算" }]);
  });

  it("offers one public entry for both rate comparisons", () => {
    const all = NAV_GROUPS.flatMap((g) => [...g.hrefs]);
    expect(all).toContain("/rate-scenario");
    expect(all).not.toContain("/rate-types");
    expect(navGroupTools(["/rate-scenario"])).toEqual([{ href: "/rate-scenario", label: "金利を比べる" }]);
  });
});

describe("isActivePath", () => {
  it("matches the page and its sub paths only", () => {
    expect(isActivePath("/products", "/products")).toBe(true);
    expect(isActivePath("/products/abc", "/products")).toBe(true);
    expect(isActivePath("/products-x", "/products")).toBe(false);
  });
});

describe("LEGAL_LINKS", () => {
  it("links to the about and privacy pages only", () => {
    expect(LEGAL_LINKS.map((l) => l.href)).toEqual(["/about", "/privacy"]);
  });

  it("does not add the legal pages to the tools list", () => {
    expect(TOOLS.map((t) => t.href)).not.toContain("/about");
    expect(TOOLS.map((t) => t.href)).not.toContain("/privacy");
  });
});
