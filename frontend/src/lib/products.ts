import type { ProductSort, ProductSummary, RateType } from "./api/products";

export const RATE_TYPE_OPTIONS: { value: RateType | undefined; param: string | null; label: string }[] = [
  { value: undefined, param: null, label: "すべて" },
  { value: "VARIABLE", param: "VARIABLE", label: "変動" },
  { value: "FIXED_FULL", param: "FIXED_FULL", label: "全期間固定" },
  { value: "FIXED_PERIOD", param: "FIXED_PERIOD", label: "固定期間選択型" },
];

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "RATE_ASC", label: "金利が低い順" },
  { value: "RATE_DESC", label: "金利が高い順" },
  { value: "NAME_ASC", label: "金融機関名順" },
];

export const PAGE_SIZE = 20;

export function parseRateType(v: string | string[] | undefined): RateType | undefined {
  return v === "VARIABLE" || v === "FIXED_FULL" || v === "FIXED_PERIOD" ? v : undefined;
}

export function parseSort(v: string | string[] | undefined): ProductSort {
  return v === "RATE_DESC" || v === "NAME_ASC" ? v : "RATE_ASC";
}

export function parsePage(v: string | string[] | undefined): number {
  if (typeof v !== "string" || !/^\d{1,6}$/.test(v)) return 0;
  return Number(v);
}

export function listHref(q: { rateType?: RateType; sort: ProductSort; page: number }): string {
  const p = new URLSearchParams();
  if (q.rateType) p.set("rateType", q.rateType);
  if (q.sort !== "RATE_ASC") p.set("sort", q.sort);
  if (q.page > 0) p.set("page", String(q.page));
  const s = p.toString();
  return s ? `/products?${s}` : "/products";
}

export function rateTypeLabel(p: Pick<ProductSummary, "rateType" | "fixedPeriodYears">): string {
  switch (p.rateType) {
    case "VARIABLE":
      return "変動";
    case "FIXED_FULL":
      return "全期間固定";
    case "FIXED_PERIOD":
      return p.fixedPeriodYears ? `固定期間選択型（${p.fixedPeriodYears}年）` : "固定期間選択型";
  }
}

export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : iso;
}

export const STALE_DAYS = 30;

export function isStale(iso: string, now: number = Date.now()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return false;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return (now - t) / 86_400_000 > STALE_DAYS;
}

export const formatRate = (n: number) => `${n.toFixed(3).replace(/\.?0+$/, "")}%`;

export function safeUrl(u: string): string | null {
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:" ? x.href : null;
  } catch {
    return null;
  }
}

export const simulateHref = (rate: number) => `/simulation?rate=${encodeURIComponent(String(rate))}`;

export const SAMPLE_NOTICE =
  "この画面の金融機関名・商品名・金利などは、開発用のサンプル（架空）データです。実在の金融機関の情報ではありません。";
/**
 * The product data shown on /products and /products/[id] is FICTIONAL sample data.
 * While true, those pages are served with `noindex,follow` and left out of sitemap.xml.
 * MUST be flipped to false only once the pages show real, verified product data
 * (and SAMPLE_NOTICE is updated accordingly).
 */
export const SAMPLE_DATA_NOINDEX = true;
export const DISCLAIMER =
  "掲載の金利は目安であり、適用金利・審査結果を保証するものではありません。最新情報は各金融機関の公式情報をご確認ください。";

export const refinanceHref = (rate: number) => `/refinance?rate=${encodeURIComponent(String(rate))}`;
