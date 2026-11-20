import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SeoModule = typeof import("./seo");
type SiteModule = typeof import("./site");

const SITE = "https://example.com";

// site.ts reads NEXT_PUBLIC_SITE_URL once at module load, so each test loads fresh copies.
async function load(siteUrl: string | undefined): Promise<{ seo: SeoModule; site: SiteModule }> {
  vi.resetModules();
  if (siteUrl === undefined) vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  else vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
  const site = await import("./site");
  const seo = await import("./seo");
  return { seo, site };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

beforeEach(() => {
  vi.resetModules();
});

describe("pageMetadata", () => {
  it("builds title template, canonical and og url from the site origin and clean path", async () => {
    const { seo } = await load(`${SITE}/`);
    const m = seo.pageMetadata({ title: "返済シミュレーター", description: "説明", path: "/simulation" });
    expect(m.title).toBe("返済シミュレーター");
    expect(m.description).toBe("説明");
    expect(m.alternates?.canonical).toBe(`${SITE}/simulation`);
    expect(m.openGraph).toMatchObject({
      type: "website",
      locale: "ja_JP",
      url: `${SITE}/simulation`,
      title: "返済シミュレーター | 住宅ローン比較・シミュレーション",
      description: "説明",
    });
    expect(m.twitter).toMatchObject({ card: "summary", title: "返済シミュレーター | 住宅ローン比較・シミュレーション" });
  });

  it("is indexable by default (index: true, follow: true)", async () => {
    const { seo } = await load(SITE);
    const m = seo.pageMetadata({ title: "t", description: "d", path: "/" });
    expect(m.robots).toEqual({ index: true, follow: true });
  });

  it("noindex: robots index=false but follow stays true", async () => {
    const { seo } = await load(SITE);
    const m = seo.pageMetadata({ title: "t", description: "d", path: "/products", noindex: true });
    expect(m.robots).toEqual({ index: false, follow: true });
  });

  it("non-production origin (localhost): forces index=false and follow=false even if indexable", async () => {
    const { seo } = await load("http://localhost:3000");
    expect(seo.pageMetadata({ title: "t", description: "d", path: "/" }).robots).toEqual({ index: false, follow: false });
    expect(seo.pageMetadata({ title: "t", description: "d", path: "/", noindex: true }).robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it("robotsDirectives: production honours the page noindex flag; non-production is always noindex", async () => {
    const { seo } = await load(SITE);
    expect(seo.robotsDirectives(false, SITE)).toEqual({ index: true, follow: true });
    expect(seo.robotsDirectives(true, SITE)).toEqual({ index: false, follow: true });
    expect(seo.robotsDirectives(false, "http://localhost:3000")).toEqual({ index: false, follow: false });
    expect(seo.robotsDirectives(true, "http://localhost:3000")).toEqual({ index: false, follow: false });
  });

  it("absoluteTitle uses the title as-is for both <title> and og:title", async () => {
    const { seo } = await load(SITE);
    const m = seo.pageMetadata({ title: "独自タイトル", description: "d", path: "/", absoluteTitle: true });
    expect(m.title).toEqual({ absolute: "独自タイトル" });
    expect(m.openGraph).toMatchObject({ title: "独自タイトル" });
    expect(m.twitter).toMatchObject({ title: "独自タイトル" });
  });
});

describe("breadcrumbJsonLd", () => {
  it("emits a BreadcrumbList with 1-based positions and absolute item URLs", async () => {
    const { seo } = await load(SITE);
    const ld = seo.breadcrumbJsonLd([
      seo.HOME_CRUMB,
      { name: "商品", path: "/products" },
      { name: "詳細", path: "/products/1" },
    ]);
    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "商品", item: `${SITE}/products` },
        { "@type": "ListItem", position: 3, name: "詳細", item: `${SITE}/products/1` },
      ],
    });
  });

  it("returns an empty itemListElement for no crumbs", async () => {
    const { seo } = await load(SITE);
    expect(seo.breadcrumbJsonLd([]).itemListElement).toEqual([]);
  });
});

describe("other JSON-LD builders", () => {
  it("webSiteJsonLd points at the site root", async () => {
    const { seo } = await load(SITE);
    expect(seo.webSiteJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "住宅ローン比較・シミュレーション",
      url: `${SITE}/`,
      inLanguage: "ja",
    });
  });

  it("webApplicationJsonLd is a free (price 0 JPY) FinanceApplication", async () => {
    const { seo } = await load(SITE);
    const ld = seo.webApplicationJsonLd({ name: "返済シミュレーター", description: "d", path: "/simulation" });
    expect(ld).toMatchObject({
      "@type": "WebApplication",
      name: "返済シミュレーター",
      url: `${SITE}/simulation`,
      applicationCategory: "FinanceApplication",
      offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
    });
  });
});

describe("site URL normalization (site.ts)", () => {
  it("strips trailing slashes from NEXT_PUBLIC_SITE_URL", async () => {
    const { site } = await load("https://example.com///");
    expect(site.SITE_URL).toBe("https://example.com");
    expect(site.absUrl("/simulation")).toBe("https://example.com/simulation");
  });

  it("falls back to localhost when unset or blank", async () => {
    expect((await load(undefined)).site.SITE_URL).toBe("http://localhost:3000");
    expect((await load("   ")).site.SITE_URL).toBe("http://localhost:3000");
  });

  it("falls back to localhost for non-http(s) or invalid URLs", async () => {
    expect((await load("javascript:alert(1)")).site.SITE_URL).toBe("http://localhost:3000");
    expect((await load("not a url")).site.SITE_URL).toBe("http://localhost:3000");
    expect((await load("ftp://example.com")).site.SITE_URL).toBe("http://localhost:3000");
  });

  it("keeps a path prefix when one is configured", async () => {
    const { site } = await load("https://example.com/app/");
    expect(site.SITE_URL).toBe("https://example.com/app");
  });
});
