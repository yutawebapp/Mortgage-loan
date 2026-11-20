/**
 * 共通の借入条件（ツールをまたいで引き継ぐ条件）。純粋ロジックのみ（DOM・ストレージに触れない）。
 *
 * 【パターン】（実際に使っている形）
 * - 共通キーは3つ: principalMan（借入金額・万円）/ rate（金利・%）/ years（返済期間・年）。
 *   値はフォームと同じ文字列で持つ。範囲外・不正な値は黙って捨てる（例外は投げない）。
 * - URLクエリのキーは既存の `?principal&rate&years`（principal = principalMan）。
 * - 受け取り側: 各ツールの `xxxInitialFromQuery`（lib/*.ts）が読む。URLの値は
 *   useUrlInitialValues（マウント後）、保存値は useSharedConditions がマウント後に適用する。
 *   優先順位は URLクエリ > 保存値 > ツールの既定値。
 * - 渡す側: `hrefWith(path, c, extra)` でリンク、`buildShareUrl` で共有URL（ShareLinkButton）を作る。
 *   渡すのは SHARED_QUERY_KEYS_BY_PATH に登録された遷移先が読むキーだけ。
 *   意味が違うキー（例: /total-cost の principal は物件価格）は extra で明示的に渡す。
 * - 受け取り側は acceptFor(path, c) で、そのページが受け取るキー・範囲に絞ってから使う（保存値の復元も同じ）。
 *   下限が違う値（/rate-scenario・/rate-types の年数は2年以上）もここで落とす。
 * - 新しい遷移先を接続するときは、SHARED_QUERY_KEYS_BY_PATH に1行足し、契約テストに受け取りパーサを登録する。
 */

export const SHARED_KEYS = ["principalMan", "rate", "years"] as const;
export type SharedKey = (typeof SHARED_KEYS)[number];
export type SharedConditions = Partial<Record<SharedKey, string>>;

/** URLクエリのキー名（既存ツールの xxxInitialFromQuery と揃える）。 */
export const QUERY_KEY: Record<SharedKey, string> = {
  principalMan: "principal",
  rate: "rate",
  years: "years",
};

/** 保存先キー。内容の形式を変えたら v を上げる。 */
export const STORAGE_KEY = "mortgage-loan.sharedConditions.v1";

/** 各ツールの入力範囲のうち、最も厳しい共通範囲（既存の xxxInitialFromQuery / validate に合わせる）。 */
export const SHARED_RANGES: Record<SharedKey, { min: number; max: number; integer: boolean }> = {
  principalMan: { min: 1, max: 100000, integer: false }, // 1万円〜10億円
  rate: { min: 0, max: 20, integer: false },
  years: { min: 1, max: 50, integer: true },
};

const DECIMAL = /^\d{1,9}(\.\d{1,6})?$/;
const YEARS = /^\d{1,2}$/;

export function isSharedKey(key: string): key is SharedKey {
  return (SHARED_KEYS as readonly string[]).includes(key);
}

/** 1つの値を検証して正規化する。不正なら undefined。 */
export function normalizeSharedValue(key: SharedKey, raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim();
  const range = SHARED_RANGES[key];
  if (range.integer) {
    if (!YEARS.test(s)) return undefined;
    const n = Number(s);
    return n >= range.min && n <= range.max ? String(n) : undefined;
  }
  if (!DECIMAL.test(s)) return undefined;
  const n = Number(s);
  return n >= range.min && n <= range.max ? s : undefined;
}

/** 不正な値・未知のキーを除いた共通条件を返す。 */
export function sanitizeShared(raw: unknown): SharedConditions {
  const out: SharedConditions = {};
  if (typeof raw !== "object" || raw === null) return out;
  const obj = raw as Record<string, unknown>;
  for (const k of SHARED_KEYS) {
    const v = normalizeSharedValue(k, obj[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** 共通条件 → URLSearchParams（有効な値のみ）。 */
export function toSearchParams(c: SharedConditions): URLSearchParams {
  const p = new URLSearchParams();
  const clean = sanitizeShared(c);
  for (const k of SHARED_KEYS) {
    const v = clean[k];
    if (v !== undefined) p.set(QUERY_KEY[k], v);
  }
  return p;
}

/** 保存用の JSON 文字列。 */
export function encodeStored(c: SharedConditions): string {
  return JSON.stringify(sanitizeShared(c));
}

/** 保存値（JSON 文字列 or null）を読む。壊れていれば空。 */
export function decodeStored(raw: string | null): SharedConditions {
  if (raw === null) return {};
  try {
    return sanitizeShared(JSON.parse(raw));
  } catch {
    return {};
  }
}

/**
 * 遷移先（受け取るページ）の受け取り条件に合わせて絞る。
 * - 受け取るキーだけ残す（SHARED_QUERY_KEYS_BY_PATH。未登録のパスは何も残さない）。
 * - SHARED_RANGES は全ツール共通の最も広い範囲なので、遷移先が年数の下限を別に持つ場合（TARGET_YEARS_MIN）はここで落とす。
 *   落とした項目は遷移先の既定値になる。
 * フォームへの保存値の適用（useSharedConditions の accept）と、リンク（hrefWith）の両方で使う。
 */
const TARGET_YEARS_MIN: Record<string, number> = {
  "/rate-scenario": 2,
  "/rate-types": 2,
};

export function acceptFor(path: string, c: SharedConditions): SharedConditions {
  const allowed = SHARED_QUERY_KEYS_BY_PATH[path] ?? [];
  const clean = sanitizeShared(c);
  const out: SharedConditions = {};
  for (const k of allowed) {
    if (clean[k] !== undefined) out[k] = clean[k];
  }
  const min = TARGET_YEARS_MIN[path];
  if (min !== undefined && out.years !== undefined && Number(out.years) < min) delete out.years;
  return out;
}

/**
 * 遷移先ごとに渡してよい共通キー（その遷移先の xxxInitialFromQuery が読むキー）。
 * 未登録のパスには何も渡さない。新しい遷移先を接続するときはここに1行足す。
 */
export const SHARED_QUERY_KEYS_BY_PATH: Record<string, readonly SharedKey[]> = {
  "/simulation": ["principalMan", "rate", "years"],
  "/prepayment": ["principalMan", "rate", "years"],
  "/rate-scenario": ["principalMan", "rate", "years"],
  // /total-cost の principal は物件価格（priceMan）として読まれるため、借入額（principalMan）は渡さない。
  "/total-cost": ["rate", "years"],
  // /rent-vs-buy も principal を物件価格として読むため、rate/years のみ。物件価格は呼び出し側の extra で渡す。
  "/rent-vs-buy": ["rate", "years"],
  // eligibility は principal を読まない
  "/eligibility": ["rate", "years"],
  "/tax-deduction": ["principalMan", "rate", "years"],
  "/life-plan": ["principalMan", "rate", "years"],
  // /budget は受け取るだけ（リンクは出さない）。保存値の復元で使う。
  "/budget": ["rate", "years"],
  // rate-types は金利が4つ（変動・固定期間・固定後・全期間固定）あるため rate は渡さない
  "/rate-types": ["principalMan", "years"],
};

/** 遷移先ツールへのリンク（相対パス）。対象外のキーや受け取れない値は含めない。extra は呼び出し側の任意クエリ。 */
export function hrefWith(path: string, c: SharedConditions, extra?: Record<string, string>): string {
  const clean = acceptFor(path, c);
  const p = new URLSearchParams();
  for (const k of SHARED_KEYS) {
    const v = clean[k];
    if (v !== undefined) p.set(QUERY_KEY[k], v);
  }
  if (extra) for (const [k, v] of Object.entries(extra)) p.set(k, v);
  const qs = p.toString();
  return qs ? `${path}?${qs}` : path;
}

/** 共有リンク（絶対URL）。ShareLinkButton 用。hrefWith と同じ規則で作る。 */
export function buildShareUrl(
  origin: string,
  pathname: string,
  c: SharedConditions,
  extra?: Record<string, string>,
): string {
  return `${origin}${hrefWith(pathname, c, extra)}`;
}
