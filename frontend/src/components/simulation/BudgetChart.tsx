import { manLabel, sharePercent } from "@/lib/budget";

const W = 640;
const BAR_X = 0;
const BAR_H = 34;

type Seg = { label: string; value: number; fill: string };

function Bar({ y, segs, total }: { y: number; segs: Seg[]; total: number }) {
  const widths = segs.map((s) => (W * sharePercent(s.value, total)) / 100);
  return (
    <g>
      {segs.map((s, i) => {
        const x = BAR_X + widths.slice(0, i).reduce((a, b) => a + b, 0);
        return (
          <rect key={s.label} x={x} y={y} width={widths[i]} height={BAR_H} fill={s.fill} stroke="#fff" strokeWidth={widths[i] > 0 ? 2 : 0} />
        );
      })}
    </g>
  );
}

export default function BudgetChart({
  propertyPrice,
  closingCosts,
  loan,
  downPayment,
  totalBudget,
}: {
  propertyPrice: number;
  closingCosts: number;
  loan: number;
  downPayment: number;
  totalBudget: number;
}) {
  if (totalBudget <= 0) return null;
  const items1 = [
    { key: "pp", label: "物件価格", value: propertyPrice, fill: "url(#bd-solid)" },
    { key: "cc", label: "諸費用", value: closingCosts, fill: "url(#bd-hatch)" },
  ];
  const items2 = [
    { key: "ln", label: "借入額", value: loan, fill: "url(#bd-solid-t)" },
    { key: "dp", label: "頭金", value: downPayment, fill: "url(#bd-dots)" },
  ];
  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} 132`} role="img" aria-labelledby="bd-t bd-d" className="chart">
        <title id="bd-t">予算の内訳</title>
        <desc id="bd-d">
          予算の合計{manLabel(totalBudget)}の内訳です。上の棒は物件価格{manLabel(propertyPrice)}と諸費用{manLabel(closingCosts)}、下の棒は借入額{manLabel(loan)}と頭金{manLabel(downPayment)}を表します。
        </desc>
        <defs>
          <pattern id="bd-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#fbe9cf" />
            <rect width="3" height="8" fill="#e0902b" />
          </pattern>
          <pattern id="bd-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#e2f4f2" />
            <circle cx="4" cy="4" r="1.8" fill="#0b7a75" />
          </pattern>
          <pattern id="bd-solid" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#0f5a96" />
          </pattern>
          <pattern id="bd-solid-t" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#0a2f55" />
          </pattern>
        </defs>
        <text x="0" y="14" fontSize="13" fill="#455668">予算の合計の内訳（物件価格＋諸費用）</text>
        <Bar y={20} segs={items1} total={totalBudget} />
        <text x="0" y="82" fontSize="13" fill="#455668">予算の合計の内訳（借入額＋頭金）</text>
        <Bar y={88} segs={items2} total={totalBudget} />
      </svg>
      <ul className="rs-legend">
        <li><span className="sw bd-sw-pp" aria-hidden="true" />物件価格 {manLabel(propertyPrice)}</li>
        <li><span className="sw bd-sw-cc" aria-hidden="true" />諸費用 {manLabel(closingCosts)}</li>
        <li><span className="sw bd-sw-ln" aria-hidden="true" />借入額 {manLabel(loan)}</li>
        <li><span className="sw bd-sw-dp" aria-hidden="true" />頭金 {manLabel(downPayment)}</li>
      </ul>
    </figure>
  );
}
