import type { TotalCostYear } from "@/lib/api/totalCost";
import { approxManLabel } from "@/lib/totalCost";

const W = 640;
const H = 280;
const M = { t: 14, r: 12, b: 30, l: 60 };
const iw = W - M.l - M.r;
const ih = H - M.t - M.b;

const man = (n: number) => `${Math.round(n / 10000).toLocaleString("ja-JP")}万`;

/** 年ごとの支払い（ローン返済額＋保有コスト）の積み上げ棒グラフ。 */
export default function TotalCostChart({ years }: { years: TotalCostYear[] }) {
  if (years.length === 0) return null;
  const maxV = Math.max(...years.map((r) => r.loanPayment + r.ownershipCost), 1);
  const step = maxV / 4;
  const yTicks = [0, 1, 2, 3, 4].map((i) => step * i);
  const top = maxV;
  const y = (v: number) => M.t + ih * (1 - v / top);
  const slot = iw / years.length;
  const bw = Math.max(2, slot * 0.72);
  const xLabelEvery = years.length <= 12 ? 1 : years.length <= 25 ? 5 : 10;
  const first = years[0];
  const last = years[years.length - 1];

  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="tc-t tc-d" className="chart">
        <title id="tc-t">年ごとの支払いの内訳のグラフ</title>
        <desc id="tc-d">
          返済期間の{years.length}年間について、1年あたりの支払いをローン返済額と保有コストに分けて示した積み上げ棒グラフです。
          1年目はローン返済額が{approxManLabel(first.loanPayment)}、保有コストが{approxManLabel(first.ownershipCost)}、
          最終年（{last.year}年目）はローン返済額が{approxManLabel(last.loanPayment)}、保有コストが{approxManLabel(last.ownershipCost)}です。
          詳しい数値は下の表で確認できます。
        </desc>
        <defs>
          <pattern id="tc-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#fbe9cf" />
            <rect width="3" height="8" fill="#e0902b" />
          </pattern>
        </defs>
        <g className="chart-axis">
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} />
              <text x={M.l - 6} y={y(v) + 4} textAnchor="end">
                {man(v)}
              </text>
            </g>
          ))}
          {years.map((r, i) =>
            r.year % xLabelEvery === 0 || i === 0 ? (
              <text key={r.year} x={M.l + slot * i + slot / 2} y={H - 8} textAnchor="middle">
                {r.year}年
              </text>
            ) : null,
          )}
        </g>
        {years.map((r, i) => {
          const x = M.l + slot * i + (slot - bw) / 2;
          const hLoan = ih * (r.loanPayment / top);
          const hOwn = ih * (r.ownershipCost / top);
          return (
            <g key={r.year}>
              <title>{`${r.year}年目：ローン返済額 ${r.loanPayment.toLocaleString("ja-JP")}円、保有コスト ${r.ownershipCost.toLocaleString("ja-JP")}円`}</title>
              <rect x={x} y={M.t + ih - hLoan} width={bw} height={hLoan} fill="#0f5a96" />
              <rect x={x} y={M.t + ih - hLoan - hOwn} width={bw} height={hOwn} fill="url(#tc-hatch)" />
            </g>
          );
        })}
      </svg>
      <ul className="rs-legend">
        <li><span className="sw tc-sw-loan" aria-hidden="true" />ローン返済額</li>
        <li><span className="sw tc-sw-own" aria-hidden="true" />保有コスト</li>
      </ul>
    </figure>
  );
}
