import type { RateScenarioResult } from "@/lib/api/rate-scenario";
import { risePointLabel } from "@/lib/rate-scenario";

const W = 640;
const H = 300;
const M = { t: 14, r: 16, b: 30, l: 64 };
const iw = W - M.l - M.r;
const ih = H - M.t - M.b;

// Distinguishable by color and by dash pattern.
export const SERIES_STYLES = [
  { color: "#455668", dash: undefined },
  { color: "#0f5a96", dash: undefined },
  { color: "#0b7a75", dash: "7 4" },
  { color: "#e0902b", dash: "2 3" },
  { color: "#8a3ab9", dash: "10 3 2 3" },
  { color: "#b00020", dash: "4 4" },
] as const;

export function seriesName(r: RateScenarioResult, isBaseline: boolean): string {
  return isBaseline ? "現在の金利のまま" : `金利${risePointLabel(r.risePoints)}%`;
}

const man = (n: number) => `${(n / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万`;

export default function RateScenarioChart({
  baseline,
  scenarios,
  riseAfterYears,
}: {
  baseline: RateScenarioResult;
  scenarios: RateScenarioResult[];
  riseAfterYears: number;
}) {
  const all = [baseline, ...scenarios];
  const n = baseline.monthlyPayments.length;
  if (n === 0) return null;
  const values = all.flatMap((s) => s.monthlyPayments);
  const rawLo = Math.min(...values);
  const rawHi = Math.max(...values);
  const pad = (rawHi - rawLo) * 0.08 || rawHi * 0.05 || 1;
  const lo = Math.max(0, rawLo - pad);
  const hi = rawHi + pad;
  const x = (i: number) => M.l + (iw * i) / Math.max(n - 1, 1);
  const y = (v: number) => M.t + ih * (1 - (v - lo) / (hi - lo));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + (hi - lo) * t);
  const totalYears = n / 12;
  const step = totalYears <= 10 ? 1 : totalYears <= 20 ? 5 : 10;
  const xs: number[] = [];
  for (let yr = 0; yr * 12 <= n; yr += step) xs.push(yr);
  const rx = x(riseAfterYears * 12);
  const right = rx > W * 0.7;

  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="rs-t rs-d" className="chart">
        <title id="rs-t">金利上昇シナリオ別の毎月の返済額の推移</title>
        <desc id="rs-d">
          毎月の返済額の推移を、{all.map((s, i) => seriesName(s, i === 0)).join("、")}の線で比べたグラフです。金利は返済開始から{riseAfterYears}年後に一度だけ上昇する想定です。
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
            <text key={yr} x={x(Math.min(yr * 12, n - 1))} y={H - 8} textAnchor="middle">
              {yr}年
            </text>
          ))}
        </g>
        <line x1={rx} x2={rx} y1={M.t} y2={M.t + ih} className="chart-be-line" />
        <text x={rx + (right ? -8 : 8)} y={M.t + 12} textAnchor={right ? "end" : "start"} className="chart-be-label">
          金利上昇
        </text>
        {all.map((s, i) => {
          const st = SERIES_STYLES[Math.min(i, SERIES_STYLES.length - 1)];
          return (
            <polyline
              key={i}
              points={s.monthlyPayments.map((v, k) => `${x(k)},${y(v)}`).join(" ")}
              fill="none"
              stroke={st.color}
              strokeWidth={i === 0 ? 3 : 2.25}
              strokeDasharray={st.dash}
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <ul className="rs-legend" aria-label="凡例">
        {all.map((s, i) => {
          const st = SERIES_STYLES[Math.min(i, SERIES_STYLES.length - 1)];
          return (
            <li key={i}>
              <svg width="30" height="10" aria-hidden="true">
                <line x1="0" x2="30" y1="5" y2="5" stroke={st.color} strokeWidth="3" strokeDasharray={st.dash} />
              </svg>
              {seriesName(s, i === 0)}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
