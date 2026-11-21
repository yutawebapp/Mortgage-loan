import type { RateTypeCase } from "@/lib/api/rateTypes";
import { caseName } from "@/lib/rateTypes";

const W = 640;
const H = 300;
const M = { t: 14, r: 16, b: 30, l: 64 };
const iw = W - M.l - M.r;
const ih = H - M.t - M.b;

// 色・線の模様・点の形で区別する（色だけに頼らない）。
export const STYLES = [
  { color: "#0f5a96", dash: undefined, shape: "circle" },
  { color: "#8a3ab9", dash: "7 4", shape: "square" },
  { color: "#0b7a75", dash: "2 3", shape: "triangle" },
  { color: "#455668", dash: "10 3 2 3", shape: "diamond" },
] as const;

type Shape = (typeof STYLES)[number]["shape"];

function Marker({ shape, x, y, color }: { shape: Shape; x: number; y: number; color: string }) {
  const p = { fill: "#fff", stroke: color, strokeWidth: 2 };
  if (shape === "circle") return <circle cx={x} cy={y} r={4} {...p} />;
  if (shape === "square") return <rect x={x - 3.5} y={y - 3.5} width={7} height={7} {...p} />;
  if (shape === "triangle") return <polygon points={`${x},${y - 5} ${x + 4.5},${y + 3.5} ${x - 4.5},${y + 3.5}`} {...p} />;
  return <polygon points={`${x},${y - 5} ${x + 5},${y} ${x},${y + 5} ${x - 5},${y}`} {...p} />;
}

/** グラフの線と同じ色・模様・点の形の見本（凡例・カード用）。 */
export function CaseSwatch({ index }: { index: number }) {
  const st = STYLES[Math.min(index, STYLES.length - 1)];
  return (
    <svg width="34" height="12" aria-hidden="true" focusable="false">
      <line x1="0" x2="34" y1="6" y2="6" stroke={st.color} strokeWidth="3" strokeDasharray={st.dash} />
      <Marker shape={st.shape} x={17} y={6} color={st.color} />
    </svg>
  );
}

const man = (n: number) => `${(n / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万`;

export default function RateTypesChart({ cases }: { cases: RateTypeCase[] }) {
  const n = Math.max(0, ...cases.map((c) => c.yearlyPayments.length));
  if (n === 0) return null;
  const values = cases.flatMap((c) => c.yearlyPayments);
  const rawLo = Math.min(...values);
  const rawHi = Math.max(...values);
  const pad = (rawHi - rawLo) * 0.08 || rawHi * 0.05 || 1;
  const lo = Math.max(0, rawLo - pad);
  const hi = rawHi + pad;
  const x = (i: number) => M.l + (iw * i) / Math.max(n - 1, 1);
  const y = (v: number) => M.t + ih * (1 - (v - lo) / (hi - lo));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + (hi - lo) * t);
  const tickStep = n <= 10 ? 1 : n <= 20 ? 5 : 10;
  const xs: number[] = [];
  for (let yr = tickStep === 1 ? 1 : tickStep; yr <= n; yr += tickStep) xs.push(yr);
  if (tickStep > 1) xs.unshift(1);
  const markEvery = Math.max(1, Math.round(n / 7));

  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="rt-t rt-d" className="chart">
        <title id="rt-t">金利タイプ別の年間返済額の推移</title>
        <desc id="rt-d">
          返済開始から{n}年間の年間返済額の推移を、{cases.map(caseName).join("、")}の4本の線で比べたグラフです。金利は入力した仮の値です。
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
            <text key={yr} x={x(yr - 1)} y={H - 8} textAnchor="middle">
              {yr}年目
            </text>
          ))}
        </g>
        {cases.map((c, i) => {
          const st = STYLES[Math.min(i, STYLES.length - 1)];
          return (
            <g key={c.type}>
              <polyline
                points={c.yearlyPayments.map((v, k) => `${x(k)},${y(v)}`).join(" ")}
                fill="none"
                stroke={st.color}
                strokeWidth={2.25}
                strokeDasharray={st.dash}
                strokeLinejoin="round"
              />
              {c.yearlyPayments.map((v, k) =>
                k % markEvery === 0 ? <Marker key={k} shape={st.shape} x={x(k)} y={y(v)} color={st.color} /> : null,
              )}
            </g>
          );
        })}
      </svg>
      <ul className="rs-legend" aria-label="凡例">
        {cases.map((c, i) => {
          const st = STYLES[Math.min(i, STYLES.length - 1)];
          return (
            <li key={c.type}>
              <svg width="34" height="12" aria-hidden="true">
                <line x1="0" x2="34" y1="6" y2="6" stroke={st.color} strokeWidth="3" strokeDasharray={st.dash} />
                <Marker shape={st.shape} x={17} y={6} color={st.color} />
              </svg>
              {caseName(c)}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
