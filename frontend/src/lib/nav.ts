// The tools, shared by the header, footer and home page.
export const TOOLS = [
  {
    href: "/simulation",
    label: "返済シミュレーター",
    description: "借入金額・金利・返済期間から、毎月の返済額と総返済額の目安を試算します。",
  },
  {
    href: "/products",
    label: "金融機関・商品比較",
    description: "金利タイプや並び順で絞り込み、金融機関・商品の金利と金利更新日を見比べられます。",
  },
  {
    href: "/refinance",
    label: "借り換え診断",
    description: "現在のローンと借り換え後の返済額を比べ、諸費用を取り戻せる時期の目安を試算します。",
  },
  {
    href: "/eligibility",
    label: "借入可能額/審査目安",
    description: "年収や他の借入の返済額から、借入可能額の目安を確認できます。",
  },
  {
    href: "/budget",
    label: "購入予算の逆算",
    description: "毎月の返済額と頭金から、購入できる物件価格の目安を調べられます。",
  },
  {
    href: "/prepayment",
    label: "繰上げ返済シミュレーター",
    description: "繰上げ返済をする時期と金額から、利息の軽減額や短縮される期間の目安を試算します。",
  },
  {
    href: "/tax-deduction",
    label: "住宅ローン控除シミュレーター",
    description: "入居年・住宅の性能・借入条件・年収から、住宅ローン控除の控除額と実質負担の目安を調べられます。",
  },
  {
    href: "/total-cost",
    label: "住居費の総額シミュレーター",
    description: "頭金・諸費用・管理費・固定資産税などを含めた、住まいにかかる費用の総額と月平均の目安を調べられます。",
  },
  {
    href: "/rate-scenario",
    label: "金利上昇シミュレーション",
    description: "変動金利で金利が上昇した場合の、毎月の返済額と総返済額の変化を上昇幅ごとに比べられます。",
  },
  {
    href: "/rate-types",
    label: "金利タイプの比較",
    description: "変動金利・固定期間選択型・全期間固定を、同じ借入条件で並べて、返済額の違いを仮の金利で比べられます。",
  },
] as const;
