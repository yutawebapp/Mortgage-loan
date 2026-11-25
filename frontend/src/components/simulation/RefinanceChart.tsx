import type { CumulativeSavingPoint } from "@/lib/api/refinance";
import { monthsLabel } from "@/lib/refinance";
import { yen } from "@/lib/simulation";

const W = 640;
const H = 280;
const M = { t: 14, r: 16, b: 30, l: 60 };
const iw = W - M.l - M.r;
const ih = H - M.t - M.b;

const man = (n: number) => `${Math.round(n / 10000).toLocaleString("ja-JP")}万`;

export default function RefinanceChart({
  points,
  breakEvenMonth,
}: {
  points: CumulativeSavingPoint[];
  breakEvenMonth: number | null;
}) {
  if (points.length === 0) return null;
  const maxMonth = Math.max(...points.map((p) => p.month), 1);
  const lo = Math.min(0, ...points.map((p) => p.net));
  const hi = Math.max(0, ...points.map((p) => p.net));
  const span = hi - lo || 1;
  const x = (m: number) => M.l + (iw * m) / maxMonth;
  const y = (v: number) => M.t + ih * (1 - (v - lo) / span);
  const line = points.map((p) => `${x(p.month)},${y(p.net)}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + span * t);
  const totalYears = maxMonth / 12;
  const step = totalYears <= 10 ? 1 : totalYears <= 20 ? 5 : 10;
  const xs: number[] = [];
  for (let yr = 0; yr * 12 <= maxMonth; yr += step) xs.push(yr);
  const be = breakEvenMonth !== null ? points.find((p) => p.month === breakEvenMonth) : undefined;
  const beY = be ? y(be.net) : y(0);
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="rf-t rf-d" className="chart">
      <title id="rf-t">借り換えによる累計の差額のグラフ</title>
      <desc id="rf-d">
        借り換え諸費用を含めた、現在のまま返済する場合との現金支出の差の累計です。残債は含みません。0円より上は借り換えの方がそれまでの支出が少なく、下は多い状態を表します。
        {breakEvenMonth !== null
          ? `${monthsLabel(breakEvenMonth)}に初めて0円以上になります。`
          : "返済期間中は0円以上になりません。"}
        完済までの総額差（現在のまま − 借り換え後）は{yen(last.net)}です。
      </desc>
      <g className="chart-axis">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end">
              {man(v)}
            </text>
          </g>
        ))}
        {xs.map((yr) => (
          <text key={yr} x={x(yr * 12)} y={H - 8} textAnchor="middle">
            {yr}年
          </text>
        ))}
      </g>
      <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} className="chart-zero" />
      <text x={W - M.r} y={y(0) - 5} textAnchor="end" className="chart-zero-label">
        差額 0円
      </text>
      <polyline points={line} className="chart-line" fill="none" />
      {breakEvenMonth !== null && (
        <g>
          <title>{`累計支出が初めて同額以下：${monthsLabel(breakEvenMonth)}`}</title>
          <line x1={x(breakEvenMonth)} x2={x(breakEvenMonth)} y1={M.t} y2={M.t + ih} className="chart-be-line" />
          <circle cx={x(breakEvenMonth)} cy={beY} r={5} className="chart-be-dot" />
          <text
            x={x(breakEvenMonth) + (x(breakEvenMonth) > W * 0.7 ? -8 : 8)}
            y={M.t + 12}
            textAnchor={x(breakEvenMonth) > W * 0.7 ? "end" : "start"}
            className="chart-be-label"
          >
            累計支出が同額以下
          </text>
        </g>
      )}
    </svg>
  );
}
