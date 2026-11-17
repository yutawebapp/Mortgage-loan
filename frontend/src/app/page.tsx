import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata, webSiteJsonLd } from "@/lib/seo";
import { TOOLS } from "@/lib/nav";
import { SITE_NAME } from "@/lib/site";

export const metadata = pageMetadata({
  title: `${SITE_NAME}｜返済シミュレーション・金利比較・借り換え診断・繰上げ返済`,
  absoluteTitle: true,
  description:
    "住宅ローンの返済額をシミュレーションできる返済シミュレーター、金融機関・商品の金利を比較できる一覧、借り換えの効果を試算する借り換え診断、年収から借入可能額の目安を確認できる審査目安、毎月の返済額から購入できる物件価格の目安を調べる購入予算の逆算、繰上げ返済の効果を試算する繰上げ返済シミュレーター、金利が上昇した場合の返済額を比べる金利上昇シミュレーションを、まとめて利用できます。",
  path: "/",
});

export default function Home() {
  return (
    <main>
      <JsonLd data={webSiteJsonLd()} />
      <div className="hero">
        <h1>住宅ローン比較・シミュレーション</h1>
        <p className="home-intro">
          住宅ローンの返済額の試算、金融機関・商品の金利の確認、借り換えの効果の試算、借入可能額の目安の確認、購入予算の目安の試算、繰上げ返済や金利上昇による返済額の変化の試算ができます。いずれも一般の方向けの簡易的なツールで、結果は目安です。
        </p>
      </div>
      <section aria-labelledby="tools-h">
        <h2 id="tools-h">ツール一覧</h2>
        <ul className="tool-cards">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <h3>
                <Link href={t.href}>{t.label}</Link>
              </h3>
              <p>{t.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
