import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata, webSiteJsonLd } from "@/lib/seo";
import { NAV_GROUPS, navGroupTools, TOOLS } from "@/lib/nav";
import { SITE_NAME } from "@/lib/site";

export const metadata = pageMetadata({
  title: `${SITE_NAME}｜返済シミュレーション・金利比較・借り換え診断・繰上げ返済`,
  absoluteTitle: true,
  description:
    "住宅ローンの返済額をシミュレーションできる返済シミュレーター、金融機関・商品の金利を比較できる一覧、借り換えの効果を試算する借り換え診断、年収から借入可能額の目安を確認できる審査目安、毎月の返済額から購入できる物件価格の目安を調べる購入予算の逆算、繰上げ返済の効果を試算する繰上げ返済シミュレーター、住宅ローン控除の控除額の目安を調べる住宅ローン控除シミュレーター、住まいにかかる費用の総額の目安を調べる住居費の総額シミュレーター、賃貸と購入の支出の推移を並べて確認できる賃貸と購入の比較シミュレーター、金利が上昇した場合の返済額を比べる金利上昇シミュレーション、変動金利・固定期間選択型・全期間固定を仮の金利で比べる金利タイプの比較を、まとめて利用できます。",
  path: "/",
});

const descriptionOf = (href: string) => TOOLS.find((t) => t.href === href)?.description;

export default function Home() {
  return (
    <main>
      <JsonLd data={webSiteJsonLd()} />
      <div className="hero">
        <h1>住宅ローン比較・シミュレーション</h1>
        <p className="home-intro">
          住宅ローンの返済額の試算、金融機関・商品の金利の確認、借り換えの効果の試算、借入可能額の目安の確認、購入予算の目安の試算、住宅ローン控除の控除額の目安の試算、住居費の総額の目安の試算、賃貸と購入の支出の推移の確認、繰上げ返済や金利上昇による返済額の変化の試算、金利タイプごとの返済額の比較ができます。いずれも一般の方向けの簡易的なツールで、結果は目安です。
        </p>
      </div>
      <section aria-labelledby="tools-h">
        <h2 id="tools-h">ツール一覧</h2>
        {NAV_GROUPS.map((g, i) => (
          <section className="tool-group" key={g.label} aria-labelledby={`tool-group-${i}`}>
            <h3 id={`tool-group-${i}`}>{g.label}</h3>
            <p className="tool-group-intro">{g.intro}</p>
            <ul className="tool-cards">
              {navGroupTools(g.hrefs).map((t) => (
                <li key={t.href}>
                  <h4>
                    <Link href={t.href}>{t.label}</Link>
                  </h4>
                  <p>{descriptionOf(t.href)}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </main>
  );
}
