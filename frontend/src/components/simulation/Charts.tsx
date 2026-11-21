import type { ScheduleRow } from "@/lib/api/simulation";
import type { YearRow } from "@/lib/simulation";
import { yen } from "@/lib/simulation";

const W = 640;
const H = 260;
const M = { t: 12, r: 12, b: 28, l: 56 };
const iw = W - M.l - M.r;
const ih = H - M.t - M.b;

const man = (n: number) => `${Math.round(n / 10000).toLocaleString("ja-JP")}万`;

function Axis({ max, years }: { max: number; years: number }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const step = years <= 10 ? 1 : years <= 20 ? 5 : 10;
  const xs: number[] = [];
  for (let y = 0; y <= years; y += step) xs.push(y);
  return (
    <g className="chart-axis">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={M.t + ih * (1 - t)} y2={M.t + ih * (1 - t)} />
          <text x={M.l - 6} y={M.t + ih * (1 - t) + 4} textAnchor="end">
            {man(max * t)}
          </text>
        </g>
      ))}
      {xs.map((y) => (
        <text key={y} x={M.l + (iw * y) / years} y={H - 8} textAnchor="middle">
          {y}年
        </text>
      ))}
    </g>
  );
}

export function BalanceChart({ schedule, principal, years }: { schedule: ScheduleRow[]; principal: number; years: number }) {
  const n = schedule.length;
  const max = Math.max(principal, 1);
  const x = (m: number) => M.l + (iw * m) / n;
  const y = (b: number) => M.t + ih * (1 - b / max);
  const pts = [`${x(0)},${y(principal)}`, ...schedule.map((r) => `${x(r.month)},${y(r.balance)}`)];
  const area = `${pts.join(" ")} ${x(n)},${y(0)} ${x(0)},${y(0)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="bal-t bal-d" className="chart">
      <title id="bal-t">残高推移グラフ</title>
      <desc id="bal-d">
        借入開始時 {yen(principal)} の残高が、{years}年後に0円になるまでの推移を示します。
      </desc>
      <Axis max={max} years={years} />
      <polygon points={area} className="chart-area" />
      <polyline points={pts.join(" ")} className="chart-line" fill="none" />
    </svg>
  );
}

export function YearlyChart({ rows }: { rows: YearRow[] }) {
  const max = Math.max(...rows.map((r) => r.principal + r.interest), 1);
  const bw = iw / rows.length;
  const y = (v: number) => M.t + ih * (1 - v / max);
  const labelEvery = rows.length <= 10 ? 1 : rows.length <= 20 ? 5 : 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="yr-t yr-d" className="chart">
      <title id="yr-t">年ごとの返済額の内訳グラフ</title>
      <desc id="yr-d">年ごとの返済額を元金と利息に分けた積み上げ棒グラフです。詳しい数値は下の返済表で確認できます。</desc>
      <g className="chart-axis">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={M.t + ih * (1 - t)} y2={M.t + ih * (1 - t)} />
            <text x={M.l - 6} y={M.t + ih * (1 - t) + 4} textAnchor="end">
              {man(max * t)}
            </text>
          </g>
        ))}
        {rows.map((r, i) =>
          r.year % labelEvery === 0 || r.year === 1 ? (
            <text key={r.year} x={M.l + bw * (i + 0.5)} y={H - 8} textAnchor="middle">
              {r.year}年
            </text>
          ) : null,
        )}
      </g>
      {rows.map((r, i) => {
        const gap = Math.min(2, bw * 0.15);
        const x = M.l + bw * i + gap / 2;
        return (
          <g key={r.year}>
            <title>{`${r.year}年目 元金 ${yen(r.principal)} / 利息 ${yen(r.interest)}`}</title>
            <rect x={x} width={bw - gap} y={y(r.principal)} height={ih * (r.principal / max)} className="bar-principal" />
            <rect
              x={x}
              width={bw - gap}
              y={y(r.principal + r.interest)}
              height={ih * (r.interest / max)}
              className="bar-interest"
            />
          </g>
        );
      })}
    </svg>
  );
}
