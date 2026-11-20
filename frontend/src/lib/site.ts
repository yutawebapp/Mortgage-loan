// Site-wide constants and the public site URL.
// NEXT_PUBLIC_SITE_URL is inlined at build time, so it must be set when `next build` runs
// (see frontend/Dockerfile ARG and the frontend build args in docker-compose.yml).

export const SITE_NAME = "住宅ローン比較・シミュレーション";
export const SITE_DESCRIPTION =
  "住宅ローンの返済シミュレーション、金融機関・商品の金利比較、借り換え診断、繰上げ返済・金利上昇の試算、金利タイプ（変動・固定）の比較、住宅ローン控除の目安、住居費の総額の目安、賃貸と購入の支出の比較、ライフプラン（貯蓄の推移）の目安、借入可能額の目安を確認できます。";
export const SITE_LOCALE = "ja_JP";

const DEFAULT_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(raw: string | undefined): string {
  const candidate = raw?.trim() || DEFAULT_SITE_URL;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return DEFAULT_SITE_URL;
    return u.href.replace(/\/+$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

/** Public origin without trailing slash, e.g. https://example.com */
export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/**
 * True only for a public https origin. Local/dev values (localhost, 127.0.0.1, 0.0.0.0, ::1,
 * *.local, *.localhost) or http are treated as NOT production: a build that forgot to set
 * NEXT_PUBLIC_SITE_URL would otherwise emit localhost canonicals and sitemap entries.
 * When false, robots.txt disallows everything and every page is noindex (safe default for
 * local dev and CI).
 */
export function isProductionSiteUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") return false;
  if (host.endsWith(".local") || host.endsWith(".localhost")) return false;
  return true;
}

/** Absolute URL for a root-relative path such as "/simulation". */
export function absUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
