import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/site";

// Built per request so the sitemap URL follows NEXT_PUBLIC_SITE_URL and is never frozen at build time.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: absUrl("/sitemap.xml"),
  };
}
