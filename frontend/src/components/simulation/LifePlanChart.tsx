import type { LifePlanSummary, LifePlanYear } from "@/lib/api/lifePlan";
import { manApprox } from "@/lib/lifePlan";

const W = 640;
const H = 280;
const M = { t: 16, r: 14, b: 32, l: 88 };
const iw = W - M.l - M.r;
const ih = H - M.t - M.b;

const man = (n: number) => `${Math.round(n / 10000).toLocaleString("ja-JP")}万`;

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

function ticksFor(lo: number, hi: number) {
  const step = niceStep((Math.max(hi, 1) - lo) / 4);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.ceil(hi / step) * step || step;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(v);
  return { yMin, yMax, ticks };
}

function xLabelEvery(n: number) {
  return n <= 12 ? 1 : n <= 30 ? 5 : 10;
}

/** 貯蓄（年末残高）の推移。ゼロより下の部分は、斜線の模様で区別する。 */
export function SavingsChart({ years, summary }: { years: LifePlanYear[]; summary: LifePlanSummary }) {
  if (years.length === 0) return null;
  const vals = years.map((r) => r.savingsClosing);
  const { yMin, yMax, ticks } = ticksFor(Math.min(0, ...vals), Math.max(...vals));
  const n = years.length;
  const x = (i: number) => M.l + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = (v: number) => M.t + ih * (1 - (v - yMin) / (yMax - yMin));
  const y0 = y(0);
  const line = years.map((r, i) => `${x(i)},${y(r.savingsClosing)}`).join(" ");
  const area = `M${x(0)},${y0} L${years.map((r, i) => `${x(i)},${y(r.savingsClosing)}`).join(" L")} L${x(n - 1)},${y0} Z`;
  const every = xLabelEvery(n);
  const minIdx = years.findIndex((r) => r.age === summary.minSavingsAge);
  const last = years[n - 1];
  const hasNegative = vals.some((v) => v < 0);

  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="lp-s-t lp-s-d" className="chart lp-chart">
        <title id="lp-s-t">貯蓄の推移のグラフ</title>
        <desc id="lp-s-d">
          {years[0].age}歳から{last.age}歳までの、年末の貯蓄の推移を示す折れ線グラフです。{last.age}歳の時点の貯蓄は
          {manApprox(last.savingsClosing)}です。最も少なくなるのは{summary.minSavingsAge}歳で、{manApprox(summary.minSavings)}です。
          {summary.firstShortfallAge !== null ? `${summary.firstShortfallAge}歳の時点で、貯蓄がマイナスになります。` : "期間中、貯蓄はマイナスになりません。"}
          詳しい数値は下の表で確認できます。
        </desc>
        <defs>
          <clipPath id="lp-above">
            <rect x={M.l} y={M.t} width={iw} height={Math.max(0, y0 - M.t)} />
          </clipPath>
          <clipPath id="lp-below">
            <rect x={M.l} y={y0} width={iw} height={Math.max(0, M.t + ih - y0)} />
          </clipPath>
          <pattern id="lp-neg" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="#fbe9cf" />
            <rect width="2.5" height="7" fill="#c9741a" />
          </pattern>
        </defs>
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
            (n <= 12 ? true : r.age % every === 0) ? (
              <text key={r.age} x={x(i)} y={H - 8} textAnchor="middle">
                {r.age}歳
              </text>
            ) : null,
          )}
        </g>
        <path d={area} fill="#0b7a75" fillOpacity={0.16} clipPath="url(#lp-above)" />
        <path d={area} fill="url(#lp-neg)" clipPath="url(#lp-below)" />
        {yMin < 0 && <line x1={M.l} x2={W - M.r} y1={y0} y2={y0} className="chart-zero" />}
        <polyline fill="none" stroke="#0b7a75" strokeWidth={2.5} strokeLinejoin="round" points={line} />
        {minIdx >= 0 && (
          <g>
            <circle cx={x(minIdx)} cy={y(summary.minSavings)} r={6} fill="#fff" stroke="#0a2f55" strokeWidth={2} />
          </g>
        )}
      </svg>
      <ul className="rs-legend">
        <li>
          <svg width="30" height="12" aria-hidden="true">
            <line x1="1" x2="29" y1="6" y2="6" stroke="#0b7a75" strokeWidth="2.5" />
          </svg>
          貯蓄（年末の残高）
        </li>
        {hasNegative && (
          <li>
            <span className="sw lp-sw-neg" aria-hidden="true" />
            ゼロより下（マイナス）の部分
          </li>
        )}
        <li>
          <svg width="16" height="16" aria-hidden="true">
            <circle cx="8" cy="8" r="5" fill="#fff" stroke="#0a2f55" strokeWidth="2" />
          </svg>
          最も少なくなる時点
        </li>
      </ul>
    </figure>
  );
}

const OUT_SERIES = [
  { key: "livingCost", label: "生活費", fill: "#0f5a96" },
  { key: "loanPayment", label: "住宅ローン返済", fill: "url(#lp-p-loan)", sw: "lp-sw-loan" },
  { key: "housingCost", label: "住居費（管理費など）", fill: "url(#lp-p-house)", sw: "lp-sw-house" },
  { key: "educationCost", label: "教育費", fill: "url(#lp-p-edu)", sw: "lp-sw-edu" },
] as const;

/** 1年あたりの支出の内訳（積み上げ棒グラフ）。 */
export function OutflowChart({ years }: { years: LifePlanYear[] }) {
  if (years.length === 0) return null;
  const totals = years.map((r) => r.livingCost + r.loanPayment + r.housingCost + r.educationCost);
  const { yMax, ticks } = ticksFor(0, Math.max(...totals));
  const n = years.length;
  const slot = iw / n;
  const bw = Math.max(2, slot * 0.78);
  const y = (v: number) => M.t + ih * (1 - v / yMax);
  const every = xLabelEvery(n);
  const first = years[0];
  const last = years[n - 1];

  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="lp-o-t lp-o-d" className="chart lp-chart">
        <title id="lp-o-t">1年あたりの支出の内訳のグラフ</title>
        <desc id="lp-o-d">
          {first.age}歳から{last.age}歳までの、1年あたりの支出を、生活費・住宅ローン返済・住居費・教育費に分けて示した積み上げ棒グラフです。
          {first.age}歳の支出の合計は{manApprox(totals[0])}、{last.age}歳は{manApprox(totals[n - 1])}です。
        </desc>
        <defs>
          <pattern id="lp-p-loan" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#cfe0f1" />
            <rect width="3" height="8" fill="#0a2f55" />
          </pattern>
          <pattern id="lp-p-house" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#e2f4f2" />
            <circle cx="4" cy="4" r="1.8" fill="#0b7a75" />
          </pattern>
          <pattern id="lp-p-edu" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width="8" height="8" fill="#fbe9cf" />
            <rect width="3" height="8" fill="#e0902b" />
          </pattern>
        </defs>
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
            (n <= 12 ? true : r.age % every === 0) ? (
              <text key={r.age} x={M.l + slot * i + slot / 2} y={H - 8} textAnchor="middle">
                {r.age}歳
              </text>
            ) : null,
          )}
        </g>
        {years.map((r, i) => {
          const bx = M.l + slot * i + (slot - bw) / 2;
          let acc = 0;
          return (
            <g key={r.age}>
              <title>{`${r.age}歳：生活費 ${r.livingCost.toLocaleString("ja-JP")}円、住宅ローン返済 ${r.loanPayment.toLocaleString("ja-JP")}円、住居費 ${r.housingCost.toLocaleString("ja-JP")}円、教育費 ${r.educationCost.toLocaleString("ja-JP")}円`}</title>
              {OUT_SERIES.map((s) => {
                const v = r[s.key];
                if (v <= 0) return null;
                const top = y(acc + v);
                const h = y(acc) - top;
                acc += v;
                return <rect key={s.key} x={bx} y={top} width={bw} height={h} fill={s.fill} />;
              })}
            </g>
          );
        })}
      </svg>
      <ul className="rs-legend">
        {OUT_SERIES.map((s) => (
          <li key={s.key}>
            <span className={`sw ${"sw" in s ? s.sw : "lp-sw-living"}`} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
    </figure>
  );
}
