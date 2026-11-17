import type { Metadata } from "next";
import { SITE_LOCALE, SITE_NAME, absUrl } from "./site";

export type Crumb = { name: string; path: string };

export function pageMetadata(opts: {
  title: string;
  description: string;
  /** Clean path without query string; used for canonical and og:url. */
  path: string;
  noindex?: boolean;
  /** Use the title as-is (no "| サイト名" template suffix). */
  absoluteTitle?: boolean;
}): Metadata {
  const { title, description, path, noindex = false, absoluteTitle = false } = opts;
  const ogTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  const url = absUrl(path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    robots: { index: !noindex, follow: true },
    openGraph: {
      type: "website",
      locale: SITE_LOCALE,
      siteName: SITE_NAME,
      title: ogTitle,
      description,
      url,
    },
    twitter: { card: "summary", title: ogTitle, description },
  };
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absUrl(c.path),
    })),
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absUrl("/"),
    inLanguage: "ja",
  };
}

export function webApplicationJsonLd(opts: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: opts.name,
    description: opts.description,
    url: absUrl(opts.path),
    applicationCategory: "FinanceApplication",
    inLanguage: "ja",
    offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
  };
}

export const HOME_CRUMB: Crumb = { name: "ホーム", path: "/" };
