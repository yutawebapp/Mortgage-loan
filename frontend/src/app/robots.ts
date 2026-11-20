import type { MetadataRoute } from "next";
import { SITE_URL, isProductionSiteUrl } from "@/lib/site";

/**
 * Pure builder so the rules can be tested. Indexable only for a production https origin;
 * otherwise everything is disallowed and no sitemap is advertised.
 * `siteUrl` is the normalized origin without trailing slash (see SITE_URL).
 * The more specific allow for the public simulation API wins over disallow "/api/".
 */
export function buildRobots(siteUrl: string): MetadataRoute.Robots {
  if (!isProductionSiteUrl(siteUrl)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/v1/simulations/"],
      disallow: "/api/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

// No `force-dynamic`: robots.ts is statically rendered at build time, so NEXT_PUBLIC_SITE_URL
// (inlined at build) is the value that applies, as with every other build-time SEO value.
export default function robots(): MetadataRoute.Robots {
  return buildRobots(SITE_URL);
}
