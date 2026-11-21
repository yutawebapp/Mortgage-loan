import { describe, expect, it } from "vitest";
import { isProductionSiteUrl } from "./site";

describe("isProductionSiteUrl", () => {
  it("accepts public https origins", () => {
    expect(isProductionSiteUrl("https://example.com")).toBe(true);
    expect(isProductionSiteUrl("https://mortgage.example.jp/app")).toBe(true);
  });

  it("rejects localhost-like hosts even over https", () => {
    for (const u of [
      "https://localhost",
      "https://localhost:3000",
      "https://127.0.0.1",
      "https://0.0.0.0",
      "https://[::1]",
      "https://printer.local",
      "https://app.localhost",
    ]) {
      expect(isProductionSiteUrl(u), u).toBe(false);
    }
  });

  it("rejects http (non-TLS) origins", () => {
    expect(isProductionSiteUrl("http://example.com")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isProductionSiteUrl("not a url")).toBe(false);
    expect(isProductionSiteUrl("")).toBe(false);
  });
});
