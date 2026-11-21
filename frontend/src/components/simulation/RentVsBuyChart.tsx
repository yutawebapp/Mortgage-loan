import type { RentVsBuySummary, RentVsBuyYear } from "@/lib/api/rentVsBuy";
import { manSigned } from "@/lib/rentVsBuy";

const W = 640;
const H = 300;
const M = { t: 16, r: 14, b: 32, l: 62 };
const iw = W - M.l - M.r;
const ih = H - M.t - M.b;

const man = (n: number) => `${Math.round(n / 10000).toLocaleString("ja-JP")}万`;

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

type SeriesKey = "purchaseCumulative" | "purchaseNetCost" | "rentCumulative";

// 色だけに頼らず、線の種類（実線・破線・点線）と点の形でも区別する。
const SERIES: { key: SeriesKey; label: string; color: string; dash?: string; marker: "circle" | "square" | "triangle" }[] = [
  { key: "purchaseCumulative", label: "購入の累計支出", color: "#0f5a96", marker: "circle" },
  { key: "purchaseNetCost", label: "購入の実質負担（物件価値を考慮）", color: "#0b7a75", dash: "7 4", marker: "square" },
  { key: "rentCumulative", label: "賃貸の累計支出", color: "#b8650a", dash: "2 3", marker: "triangle" },
];

function Marker({ kind, x, y, color }: { kind: "circle" | "square" | "triangle"; x: number; y: number; color: string }) {
  if (kind === "circle") return <circle cx={x} cy={y} r={3.5} fill="#fff" stroke={color} strokeWidth={2} />;
  if (kind === "square") return <rect x={x - 3.5} y={y - 3.5} width={7} height={7} fill="#fff" stroke={color} strokeWidth={2} />;
  return <path d={`M${x} ${y - 4.5} L${x + 4.5} ${y + 3.5} L${x - 4.5} ${y + 3.5} Z`} fill="#fff" stroke={color} strokeWidth={2} />;
}

/** 購入の累計支出・購入の実質負担・賃貸の累計支出の、年ごとの折れ線グラフ。 */
export default function RentVsBuyChart({ years, summary }: { years: RentVsBuyYear[]; summary: RentVsBuySummary }) {
  if (years.length === 0) return null;
  const all = years.flatMap((r) => [r.purchaseCumulative, r.purchaseNetCost, r.rentCumulative]);
  const lo = Math.min(0, ...all);
  const hi = Math.max(...all, 1);
  const step = niceStep((hi - lo) / 4);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(v);

  const n = years.length;
  const x = (i: number) => M.l + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = (v: number) => M.t + ih * (1 - (v - yMin) / (yMax - yMin));
  const xLabelEvery = n <= 12 ? 1 : n <= 25 ? 5 : 10;
  const markEvery = n <= 10 ? 1 : n <= 25 ? 5 : 10;
  const last = years[n - 1];

  const crossCum = summary.crossoverYearCumulative;
  const crossNet = summary.crossoverYearNet;
  const idxOf = (yr: number) => years.findIndex((r) => r.year === yr);

  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="rvb-t rvb-d" className="chart">
        <title id="rvb-t">購入と賃貸の支出の推移のグラフ</title>
        <desc id="rvb-d">
          {n}年間の、購入の累計支出、購入の実質負担、賃貸の累計支出の推移を示す折れ線グラフです。{n}年目の時点では、購入の累計支出が
          {manSigned(last.purchaseCumulative)}、購入の実質負担が{manSigned(last.purchaseNetCost)}、賃貸の累計支出が
          {manSigned(last.rentCumulative)}です。詳しい数値は下の表で確認できます。
        </desc>
        <g className="chart-axis">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} />
              <text x={M.l - 6} y={y(v) + 4} textAnchor="end">
                {man(v)}
              </text>
            </g>
          ))}
          {years.map((r, i) =>
            r.year % xLabelEvery === 0 || i === 0 ? (
              <text key={r.year} x={x(i)} y={H - 10} textAnchor="middle">
                {r.year}年
              </text>
            ) : null,
          )}
        </g>
        {yMin < 0 && <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} className="chart-zero" />}
        {SERIES.map((s) => (
          <g key={s.key}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeDasharray={s.dash}
              strokeLinejoin="round"
              points={years.map((r, i) => `${x(i)},${y(r[s.key])}`).join(" ")}
            />
            {years.map((r, i) =>
              (i + 1) % markEvery === 0 || i === n - 1 ? (
                <Marker key={r.year} kind={s.marker} x={x(i)} y={y(r[s.key])} color={s.color} />
              ) : null,
            )}
          </g>
        ))}
        {crossCum !== null && idxOf(crossCum) >= 0 && (
          <circle cx={x(idxOf(crossCum))} cy={y(years[idxOf(crossCum)].purchaseCumulative)} r={8} fill="none" stroke="#0f5a96" strokeWidth={1.5} />
        )}
        {crossNet !== null && idxOf(crossNet) >= 0 && (
          <circle cx={x(idxOf(crossNet))} cy={y(years[idxOf(crossNet)].purchaseNetCost)} r={8} fill="none" stroke="#0b7a75" strokeWidth={1.5} />
        )}
      </svg>
      <ul className="rs-legend">
        {SERIES.map((s) => (
          <li key={s.key}>
            <svg width="34" height="12" aria-hidden="true">
              <line x1="1" x2="33" y1="6" y2="6" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash} />
              <Marker kind={s.marker} x={17} y={6} color={s.color} />
            </svg>
            {s.label}
          </li>
        ))}
        {(crossCum !== null || crossNet !== null) && (
          <li>
            <svg width="16" height="16" aria-hidden="true">
              <circle cx="8" cy="8" r="6" fill="none" stroke="#555" strokeWidth="1.5" />
            </svg>
            賃貸の累計支出を初めて下回る年
          </li>
        )}
      </ul>
    </figure>
  );
}
