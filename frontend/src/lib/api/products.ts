export type RateType = "VARIABLE" | "FIXED_FULL" | "FIXED_PERIOD";
export type ProductSort = "RATE_ASC" | "RATE_DESC" | "NAME_ASC";

export type ProductSummary = {
  id: number;
  institutionName: string;
  productName: string;
  rateType: RateType;
  fixedPeriodYears: number | null;
  annualRatePercent: number;
  rateEffectiveFrom: string; // YYYY-MM-DD
  rateSourceUrl: string;
};

export type ProductPage = {
  items: ProductSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ProductFee = {
  feeType: string;
  label: string;
  amount: number | null; // yen
  ratePercent: number | null;
};

export type RateHistoryEntry = {
  annualRatePercent: number;
  effectiveFrom: string; // YYYY-MM-DD
  sourceUrl: string;
};

export type ProductDetail = ProductSummary & {
  fees: ProductFee[];
  rateHistory: RateHistoryEntry[]; // newest first
};

export type ProductListQuery = {
  rateType?: RateType;
  sort: ProductSort;
  page: number;
  size: number;
};

export class ProductApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Server-side only: the browser rewrite in next.config.ts is not available here.
const baseUrl = () => process.env.API_BASE_URL ?? "http://localhost:8080";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new ProductApiError(`status ${res.status}`, res.status);
  return (await res.json()) as T;
}

export function fetchProducts(q: ProductListQuery): Promise<ProductPage> {
  const p = new URLSearchParams();
  if (q.rateType) p.set("rateType", q.rateType);
  p.set("sort", q.sort);
  p.set("page", String(q.page));
  p.set("size", String(q.size));
  return getJson<ProductPage>(`/api/v1/products?${p.toString()}`);
}

export function fetchProduct(id: number): Promise<ProductDetail> {
  return getJson<ProductDetail>(`/api/v1/products/${id}`);
}
