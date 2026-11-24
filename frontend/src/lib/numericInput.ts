/** 数値入力で使う全角文字だけを半角にする。その他の文字は検証に委ねる。 */
export function normalizeNumericInput(value: string): string {
  return value
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, ".")
    .replace(/[－ー−]/g, "-")
    .replace(/＋/g, "+")
    .replace(/　/g, "");
}

/** 入力値を十進数としてのみ解釈する。空欄や編集中の不完全な値は NaN。 */
export function parseNumericInput(value: string): number {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return NaN;
  return Number(value);
}

/** 矢印キーの増減。入力中の不完全な値は変更しない。 */
export function stepNumericInput(value: string, step: string | number, min: number | undefined, max: number | undefined, direction: 1 | -1): string | null {
  const increment = Number(step);
  if (!Number.isFinite(increment) || increment <= 0) return null;
  const current = value === "" ? 0 : parseNumericInput(value);
  if (!Number.isFinite(current)) return null;
  const decimals = Math.min(15, Math.max(decimalPlaces(value), decimalPlaces(String(step))));
  let next = Number((current + direction * increment).toFixed(decimals));
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  const result = String(next);
  // 小さな値を指数表記にすると入力検証で拒否されるため、十進表記を保つ。
  return /e-/i.test(result) ? next.toFixed(decimals).replace(/\.?0+$/, "") : result;
}

function decimalPlaces(value: string): number {
  const [coefficient, exponent = "0"] = value.toLowerCase().split("e");
  return Math.max(0, (coefficient.split(".")[1]?.length ?? 0) - Number(exponent));
}
