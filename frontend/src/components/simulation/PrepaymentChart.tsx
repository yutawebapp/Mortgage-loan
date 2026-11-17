import type { PrepaymentScheduleRow } from "@/lib/api/prepayment";
import { monthSpanLabel } from "@/lib/prepayment";
import { yen } from "@/lib/simulation";

const W = 640;
const H = 280;
const M = { t: 14, r: 16, b: 30, l: 60 };
const iw = W - M.l - M.r;
const ih = H - M.t - M.b;

const man = (n: number) => `${Math.round(n / 10000).toLocaleString("ja-JP")}万`;

/**
 * 繰上げ返済後の残高の推移。横軸は繰上げなしの返済期間（baselineMonths）まで取り、
 * 繰上げ返済の時期を縦線で示す。繰上げなしの残高は描かない。
 */
export default function PrepaymentChart({
  schedule,
  principal,
  baselineMonths,
  prepaymentMonth,
}: {
  schedule: PrepaymentScheduleRow[];
  principal: number;
  baselineMonths: number;
  prepaymentMonth: number;
}) {
  if (schedule.length === 0) return null;
  const maxMonth = Math.max(baselineMonths, schedule[schedule.length - 1].month, 1);
  const x = (m: number) => M.l + (iw * m) / maxMonth;
  const y = (v: number) => M.t + ih * (1 - v / (principal || 1));
  const pts = [{ month: 0, balance: principal }, ...schedule];
  const line = pts.map((p) => `${x(p.month)},${y(p.balance)}`).join(" ");
  const area = `${x(0)},${y(0)} ${line} ${x(pts[pts.length - 1].month)},${y(0)}`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => principal * t);
  const totalYears = maxMonth / 12;
  const step = totalYears <= 10 ? 1 : totalYears <= 20 ? 5 : 10;
  const xs: number[] = [];
  for (let yr = 0; yr * 12 <= maxMonth; yr += step) xs.push(yr);
  const px = x(prepaymentMonth);
  const right = px > W * 0.7;
  const endMonth = schedule[schedule.length - 1].month;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="pp-t pp-d" className="chart">
      <title id="pp-t">繰上げ返済後のローン残高の推移のグラフ</title>
      <desc id="pp-d">
        繰上げ返済をした場合の、ローン残高の推移です。横軸は繰上げ返済をしない場合の返済期間（{monthSpanLabel(maxMonth)}）までで、
        繰上げ返済は返済開始から{monthSpanLabel(prepaymentMonth)}後に行います。残高は{monthSpanLabel(endMonth)}後に{yen(schedule[schedule.length - 1].balance)}になります。
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
      <polygon points={area} className="chart-area" />
      <polyline points={line} className="chart-line" fill="none" />
      <g>
        <title>{`繰上げ返済の時期：返済開始から${monthSpanLabel(prepaymentMonth)}後`}</title>
        <line x1={px} x2={px} y1={M.t} y2={M.t + ih} className="chart-be-line" />
        <text x={px + (right ? -8 : 8)} y={M.t + 12} textAnchor={right ? "end" : "start"} className="chart-be-label">
          繰上げ返済
        </text>
      </g>
    </svg>
  );
}
