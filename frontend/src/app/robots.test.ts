import { describe, expect, it } from "vitest";
import { buildRobots } from "./robots";

describe("buildRobots", () => {
  it("production: allows the site and the public simulation API, disallows other /api/, advertises sitemap", () => {
    expect(buildRobots("https://example.com")).toEqual({
      rules: {
        userAgent: "*",
        allow: ["/", "/api/v1/simulations/"],
        disallow: "/api/",
      },
      sitemap: "https://example.com/sitemap.xml",
    });
  });

  it("production with a path prefix keeps the prefix in the sitemap URL", () => {
    expect(buildRobots("https://example.com/app").sitemap).toBe("https://example.com/app/sitemap.xml");
  });

  it("non-production (localhost): disallows everything and emits no sitemap", () => {
    const r = buildRobots("http://localhost:3000");
    expect(r).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(r).not.toHaveProperty("sitemap");
  });
});
