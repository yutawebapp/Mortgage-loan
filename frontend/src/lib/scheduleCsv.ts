// 返済表のCSV出力（画面に表示中の年次／月次の表と同じ列・ラベル）。純粋関数のみ。

export type ScheduleUnit = "year" | "month";

export type CsvRow = {
  /** 年次なら年（1始まり）、月次なら回（1始まり）。 */
  period: number;
  payment: number;
  bonusPayment: number;
  principal: number;
  interest: number;
  balance: number;
};

const BOM = "\uFEFF";
const EOL = "\r\n";

/** CSVの1フィールドをエスケープする（カンマ・改行・ダブルクォートを含む場合のみ引用符で囲む）。 */
export function escapeCsvField(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 返済表のCSV文字列を作る。UTF-8 BOM付き・CRLF区切り。金額は桁区切りなしの整数。
 * 列は画面の表と同じ（ボーナス列は hasBonus のときだけ）。
 */
export function buildScheduleCsv(
  rows: CsvRow[],
  opts: {
    unit: ScheduleUnit;
    hasBonus: boolean;
    /** 表の前に置く「項目,値」行（借入条件・試算日・注記）。空なら省く。 */
    meta: Array<[string, string | number]>;
  },
): string {
  const head = opts.unit === "year" ? "年" : "回";
  const header = [
    head,
    "返済額",
    ...(opts.hasBonus ? ["うちボーナス"] : []),
    "元金",
    "利息",
    "残高",
  ];
  const lines: (string | number)[][] = [];
  if (opts.meta.length > 0) {
    // 空配列 = 空行（項目,値ブロックと表の間）
    lines.push(["項目", "値"], ...opts.meta, []);
  }
  lines.push(header);
  for (const r of rows) {
    const label = opts.unit === "year" ? `${r.period}年目` : `${r.period}回`;
    lines.push([
      label,
      r.payment,
      ...(opts.hasBonus ? [r.bonusPayment] : []),
      r.principal,
      r.interest,
      r.balance,
    ]);
  }
  return (
    BOM + lines.map((l) => l.map(escapeCsvField).join(",")).join(EOL) + EOL
  );
}

export function scheduleCsvFilename(unit: ScheduleUnit): string {
  return unit === "year" ? "返済予定表_年別.csv" : "返済予定表_月別.csv";
}

/** CSV文字列をBlobにしてダウンロードさせる（ブラウザ専用）。 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
