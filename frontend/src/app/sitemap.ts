import type { MetadataRoute } from "next";
import { fetchProducts } from "@/lib/api/products";
import { SAMPLE_DATA_NOINDEX } from "@/lib/products";
import { absUrl } from "@/lib/site";

// Built per request so the product list is never frozen at build time (and the build never needs the API).
export const dynamic = "force-dynamic";

const SITEMAP_FETCH_TIMEOUT_MS = 3000;
const PAGE_SIZE = 100; // backend maximum for `size`
const MAX_PAGES = 20;

// Returns [] on any failure so the sitemap degrades to static pages.
async function fetchProductIds(): Promise<number[]> {
  const ids: number[] = [];
  try {
    let page = 0;
    let totalPages = 1;
    do {
      const res = await fetchProducts(
        { sort: "NAME_ASC", page, size: PAGE_SIZE },
        SITEMAP_FETCH_TIMEOUT_MS,
      );
      ids.push(...res.items.map((i) => i.id));
      totalPages = res.totalPages;
      page++;
    } while (page < totalPages && page < MAX_PAGES);
    return ids;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absUrl("/simulation"), changeFrequency: "monthly", priority: 0.8 },
    { url: absUrl("/refinance"), changeFrequency: "monthly", priority: 0.8 },
    { url: absUrl("/eligibility"), changeFrequency: "monthly", priority: 0.8 },
    { url: absUrl("/budget"), changeFrequency: "monthly", priority: 0.8 },
    { url: absUrl("/prepayment"), changeFrequency: "monthly", priority: 0.8 },
    { url: absUrl("/tax-deduction"), changeFrequency: "monthly", priority: 0.8 },
    { url: absUrl("/rate-scenario"), changeFrequency: "monthly", priority: 0.8 },
  ];

  // Sample (fictional) product pages are noindex, so they stay out of the sitemap.
  // Flip SAMPLE_DATA_NOINDEX to false to include /products and product detail pages.
  if (!SAMPLE_DATA_NOINDEX) {
    entries.push({ url: absUrl("/products"), changeFrequency: "daily", priority: 0.9 });
    const ids = await fetchProductIds();
    for (const id of ids) {
      entries.push({ url: absUrl(`/products/${id}`), changeFrequency: "daily", priority: 0.7 });
    }
  }

  return entries;
}
