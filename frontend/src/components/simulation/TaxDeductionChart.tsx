import type { TaxDeductionYear } from "@/lib/api/taxDeduction";
import { manOrYen } from "@/lib/taxDeduction";

const W = 640;
const H = 280;
const M = { t: 14, r: 12, b: 34, l: 52 };
const iw = W - M.l - M.r;
const ih = H - M.t - M.b;

function niceMax(v: number): number {
  if (v <= 0) return 10000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

/**
 * 年ごとの控除額の積み上げ棒グラフ。
 * 所得税から控除（無地）／住民税から控除（ドット）／控除しきれない額（斜線）を、色と模様で区別する。
 */
export default function TaxDeductionChart({ rows }: { rows: TaxDeductionYear[] }) {
  if (rows.length === 0) return null;
  const maxV = niceMax(Math.max(...rows.map((r) => r.incomeTaxCredit + r.residentTaxCredit + r.unclaimed)));
  const y = (v: number) => M.t + ih * (1 - v / maxV);
  const slot = iw / rows.length;
  const bw = Math.min(40, slot * 0.64);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => maxV * t);
  const sum = rows.reduce((a, r) => a + r.totalDeduction, 0);
  const unclaimedSum = rows.reduce((a, r) => a + r.unclaimed, 0);

  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="td-t td-d" className="chart">
        <title id="td-t">年ごとの住宅ローン控除額の内訳のグラフ</title>
        <desc id="td-d">
          入居後{rows.length}年間の、年ごとの控除額の内訳です。棒は、所得税から控除される額、住民税から控除される額、控除しきれない額を積み上げています。控除額の合計は約{manOrYen(sum)}、控除しきれない額の合計は約{manOrYen(unclaimedSum)}です。
        </desc>
        <defs>
          <pattern id="td-dots" width="7" height="7" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill="#e2f4f2" />
            <circle cx="3.5" cy="3.5" r="1.7" fill="#0b7a75" />
          </pattern>
          <pattern id="td-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#fbe9cf" />
            <rect width="3" height="8" fill="#e0902b" />
          </pattern>
        </defs>
        <g className="chart-axis">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} />
              <text x={M.l - 6} y={y(v) + 4} textAnchor="end">
                {Math.round(v / 10000).toLocaleString("ja-JP")}万
              </text>
            </g>
          ))}
          {rows.map((r, i) => (
            <text key={r.year} x={M.l + slot * (i + 0.5)} y={H - 10} textAnchor="middle">
              {r.ordinal}年目
            </text>
          ))}
        </g>
        {rows.map((r, i) => {
          const x = M.l + slot * (i + 0.5) - bw / 2;
          const segs = [
            { v: r.incomeTaxCredit, fill: "#0f5a96" },
            { v: r.residentTaxCredit, fill: "url(#td-dots)", stroke: "#0b7a75" },
            { v: r.unclaimed, fill: "url(#td-hatch)", stroke: "#e0902b" },
          ];
          let acc = 0;
          return (
            <g key={r.year}>
              <title>{`入居後${r.ordinal}年目（${r.year}年）：所得税から${r.incomeTaxCredit.toLocaleString("ja-JP")}円、住民税から${r.residentTaxCredit.toLocaleString("ja-JP")}円、控除しきれない額${r.unclaimed.toLocaleString("ja-JP")}円`}</title>
              {segs.map((s, k) => {
                const top = acc + s.v;
                const rect =
                  s.v > 0 ? (
                    <rect key={k} x={x} y={y(top)} width={bw} height={y(acc) - y(top)} fill={s.fill} stroke={s.stroke ?? "#fff"} strokeWidth={s.stroke ? 1 : 0.5} />
                  ) : null;
                acc = top;
                return rect;
              })}
            </g>
          );
        })}
      </svg>
      <ul className="rs-legend">
        <li>
          <span className="sw td-sw-it" aria-hidden="true" />
          所得税から控除
        </li>
        <li>
          <span className="sw td-sw-rt" aria-hidden="true" />
          住民税から控除
        </li>
        <li>
          <span className="sw td-sw-un" aria-hidden="true" />
          控除しきれない額
        </li>
      </ul>
    </figure>
  );
}
