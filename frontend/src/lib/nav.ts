// The four tools, shared by the header, footer and home page.
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
] as const;
