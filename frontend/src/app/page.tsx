import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata, webSiteJsonLd } from "@/lib/seo";
import { NAV_GROUPS, navGroupTools, TOOLS } from "@/lib/nav";
import { SITE_NAME } from "@/lib/site";

export const metadata = pageMetadata({
  title: `${SITE_NAME}｜購入予算・返済額・住居費のシミュレーション`,
  absoluteTitle: true,
  description:
    "購入予算から住宅ローンの返済額、住居費の総額まで目安を試算。借り換えや繰上げ返済、金利の変化も確認できます。",
  path: "/",
});

const descriptionOf = (href: string) => TOOLS.find((t) => t.href === href)?.description;

export default function Home() {
  return (
    <main>
      <JsonLd data={webSiteJsonLd()} />
      <div className="hero">
        <h1>住宅ローン・住居費のシミュレーション</h1>
        <p className="home-intro">
          購入予算から返済額、住居費の総額まで順に確認できます。借り換えや繰上げ返済、金利の変化も試算できます。いずれも簡易的なツールで、結果は目安です。
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
