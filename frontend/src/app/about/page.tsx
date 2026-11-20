import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { ABOUT_PAGE, PRIVACY_PAGE, TOOLS } from "@/lib/nav";
import { LAST_UPDATED, formatLastUpdated, operatorRows } from "@/lib/operator";
import { HOME_CRUMB, pageMetadata } from "@/lib/seo";
import { SITE_NAME, absUrl } from "@/lib/site";

const TITLE = "このサイトについて";
const DESCRIPTION =
  "一般の個人の方向けの住宅ローン試算ツールの概要、運営者情報、計算の考え方、データの出典と更新について説明します。試算結果は目安で、融資や金利を保証するものではありません。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: ABOUT_PAGE.href });

// WebPage の JSON-LD。BreadcrumbList は Breadcrumb コンポーネントが同じ配列から出す。
const webPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  url: absUrl(ABOUT_PAGE.href),
  inLanguage: "ja",
};

export default function Page() {
  const rows = operatorRows();
  const updated = formatLastUpdated(LAST_UPDATED);

  return (
    <main className="wide">
      <JsonLd data={webPageLd} />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: ABOUT_PAGE.label, path: ABOUT_PAGE.href }]} />
      <h1>{TITLE}</h1>
      <p className="lead">
        一般の個人の方が住宅ローンの返済額などを事前に調べるための、試算ツールをまとめたサイトです。
      </p>

      <section className="about" aria-labelledby="about-purpose">
        <h2 id="about-purpose">このサイトの目的</h2>
        <p>
          借入額・金利・返済期間などを入力すると、毎月の返済額や総返済額、借入可能額の目安などを確認できます。住宅ローンを検討するときの、比べる材料や考える順番を整理するための道具です。
        </p>
        <p>
          試算結果は入力した条件を前提にした目安であり、融資の審査結果・承認・実際の金利や返済額を保証するものではありません。最終的な条件は、各金融機関の公式情報や窓口でご確認ください。
        </p>
        <h3>提供しているツール</h3>
        <ul>
          {TOOLS.map((t) => (
            <li key={t.href}>
              <Link href={t.href}>{t.label}</Link>
            </li>
          ))}
        </ul>
      </section>

      {rows.length > 0 && (
        <section className="about" aria-labelledby="about-operator">
          <h2 id="about-operator">運営者情報</h2>
          <dl>
            {rows.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="about" aria-labelledby="about-method">
        <h2 id="about-method">計算の考え方</h2>
        <h3>返済方式</h3>
        <ul>
          <li>元利均等返済: 毎月の返済額（元金と利息の合計）が期間中ほぼ一定になる方式です。</li>
          <li>元金均等返済: 毎月の元金の返済額が一定で、利息は残高に応じて減っていく方式です。初めの返済額が多くなります。</li>
        </ul>
        <h3>金利と端数</h3>
        <p>
          金利は入力された値で期間中一定と仮定して計算します（金利上昇のシミュレーションは、別に上昇幅を指定して試算します）。計算の途中の金額は円未満を四捨五入し、最終回で残高を精算して端数を調整します。
        </p>
        <h3>ボーナス払い</h3>
        <p>
          ボーナス払いは簡易的なモデルです。毎月払う分と、年2回のボーナス月に払う分を別々のローンとして計算し、ボーナス月の返済額を合算します。実際の金融機関の取扱いや、ボーナスの支給月・支給額の決め方とは異なることがあります。
        </p>
        <h3>借入可能額・審査の目安</h3>
        <p>
          借入可能額は、年収に対する返済負担率の上限と審査金利の仮の値をもとに逆算した目安です。返済負担率の上限や審査金利は、目安として定めた仮の値であり、実際の審査基準は金融機関ごとに異なります。
        </p>
        <h3>住宅ローン控除</h3>
        <p>
          控除額は、入居年・住宅の区分・借入残高・年収などから、制度の決まりに沿って計算した目安です。税額の推計には、簡易的な仮の前提（独身・扶養なしなど）を置いています。実際の控除額は、確定申告の内容や個別の事情によって変わります。
        </p>
      </section>

      <section className="about" aria-labelledby="about-data">
        <h2 id="about-data">データの出典と更新</h2>
        <p>
          住宅ローン控除などの制度や税の数値は、国税庁・国土交通省などの公式情報で原文を確認してから登録しています。住宅ローン控除の結果には、出典のリンクと確認日を表示します。制度や税の改正があった場合は、登録内容を更新します。
        </p>
        <p>
          金融機関・商品の金利などのデータは、現在は開発用のサンプル（架空）データです。実在の金融機関の情報ではありません。詳しくは{" "}
          <Link href="/products">金融機関・商品比較</Link>の画面の注記をご覧ください。
        </p>
        {updated && <p>最終更新日: {updated}</p>}
      </section>

      <section className="about" aria-labelledby="about-disclaimer">
        <h2 id="about-disclaimer">免責事項</h2>
        <p>
          このサイトの試算結果は、入力された条件を前提にした目安です。融資の可否・審査結果・金利・実際の返済額・税金の額を保証するものではありません。このサイトの情報を利用したことによって生じた損害について、運営者は責任を負いかねます。ご判断は、金融機関の公式情報や窓口、税務署などの公式情報をご確認のうえで行ってください。
        </p>
        <p>
          個人情報の取り扱いについては、<Link href={PRIVACY_PAGE.href}>{PRIVACY_PAGE.label}</Link>をご覧ください。
        </p>
      </section>

      <section className="about" aria-labelledby="about-history">
        <h2 id="about-history">変更履歴</h2>
        <ul>
          <li>住宅ローン控除の制度データについて、公式情報の出典と確認日を登録（確認日 2026年11月17日）。</li>
        </ul>
        <p>ツールの追加・変更の履歴は、ここに順次追記します。</p>
      </section>
    </main>
  );
}
