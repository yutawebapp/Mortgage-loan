// The tools, shared by the header, footer and home page.
export const TOOLS = [
  {
    href: "/simulation",
    label: "返済シミュレーター",
    description: "借入金額・金利・返済期間から、毎月の返済額と総返済額の目安を試算します。",
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
    href: "/rent-vs-buy",
    label: "マイホームと賃貸の比較シミュレーター",
    description: "購入した場合と賃貸の場合の、支出の合計が年ごとにどう積み重なるかを、入力した前提で並べて確認できます。",
  },
  {
    href: "/life-plan",
    label: "ライフプランシミュレーター",
    description: "毎年の収入・生活費・住宅ローン・お子さんの教育費から、貯蓄がどう推移するかの目安を確認できます。",
  },
  {
    href: "/rate-scenario",
    label: "金利を比べる",
    description: "金利の据え置き・上昇幅や固定タイプによる返済額の違いを、仮の条件で比べられます。",
  },
] as const;

type ToolHref = (typeof TOOLS)[number]["href"];

// ヘッダーのメニューのまとめ方。使う目的が近いツールを1つのプルダウンにまとめる。
// ツールが1つだけのグループは、プルダウンにせず、そのままリンクで表示する。
export const NAV_GROUPS: readonly { label: string; intro: string; hrefs: readonly ToolHref[] }[] = [
  { label: "購入を考える", intro: "購入予算から返済額、住居費の順に目安を確認します。", hrefs: ["/budget", "/simulation", "/total-cost"] },
  { label: "返済を見直す", intro: "借り換えや繰上げ返済の効果を試算します。", hrefs: ["/refinance", "/prepayment"] },
  { label: "金利・控除", intro: "金利の影響や住宅ローン控除の目安を確認します。", hrefs: ["/rate-scenario", "/tax-deduction"] },
  { label: "さらに調べる", intro: "購入予算の参考や家計の見通しを確認します。", hrefs: ["/eligibility", "/rent-vs-buy", "/life-plan"] },
];

// サイト情報のページ（フッターと、各ページのパンくずで使う）。
export const ABOUT_PAGE = { href: "/about", label: "このサイトについて" } as const;
export const PRIVACY_PAGE = { href: "/privacy", label: "プライバシーポリシー" } as const;
export const LEGAL_LINKS = [ABOUT_PAGE, PRIVACY_PAGE] as const;

export type NavTool = { href: string; label: string };

/** グループごとに、表示するツール（href と名前）を並べる。 */
export function navGroupTools(hrefs: readonly string[]): NavTool[] {
  return hrefs.flatMap((h) => {
    const t = TOOLS.find((x) => x.href === h);
    return t ? [{ href: t.href, label: t.label }] : [];
  });
}

/** 現在のパスがそのツールのページ（配下を含む）か。 */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
