// Site-wide constants and the public site URL.
// NEXT_PUBLIC_SITE_URL is inlined at build time, so it must be set when `next build` runs
// (see frontend/Dockerfile ARG and the frontend build args in docker-compose.yml).

export const SITE_NAME = "住宅ローン比較・シミュレーション";
export const SITE_DESCRIPTION =
  "住宅ローンの返済シミュレーション、金融機関・商品の金利比較、借り換え診断、借入可能額の目安を確認できます。";
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

/** Absolute URL for a root-relative path such as "/simulation". */
export function absUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
