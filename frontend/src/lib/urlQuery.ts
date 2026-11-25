/**
 * URLクエリ（window.location.search）を、既存の xxxInitialFromQuery が受け取る形に変換する。純粋ロジックのみ。
 *
 * 値の形は Next の searchParams と同じにする（同じキーが1回だけなら string、複数回なら string[]）。
 * そのため既存のパーサ（Q = string | string[] | undefined）をそのまま使える。
 */
export type QueryRecord = Record<string, string | string[] | undefined>;

export function queryRecordFromSearch(search: string): QueryRecord {
  const sp = new URLSearchParams(search);
  const entries: [string, string | string[]][] = [];
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    entries.push([key, all.length === 1 ? all[0] : all]);
  }
  // fromEntries は __proto__ などの名前を安全に通常のプロパティとして作る
  return Object.fromEntries(entries);
}
