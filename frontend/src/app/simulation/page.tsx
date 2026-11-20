import Simulator from "@/components/simulation/Simulator";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";
import { initialFromQuery, pairInitialFromQuery } from "@/lib/simulation";

const TITLE = "返済シミュレーター";
const DESCRIPTION =
  "借入金額・金利・返済期間を入力して、住宅ローンの毎月の返済額と総返済額の目安を試算できます。返済方式（元利均等返済・元金均等返済）を切り替えて確認できます。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/simulation" });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <main className="wide">
      <JsonLd
        data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/simulation" })}
      />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/simulation" }]} />
      <h1>返済シミュレーター</h1>
      <p className="lead">借入金額・金利・返済期間を入力すると、毎月の返済額と総返済額の目安を表示します。</p>
      <Simulator
        initialValues={initialFromQuery(sp)}
        initialPair={pairInitialFromQuery(sp)}
      />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          入力した借入金額・金利（年率）・返済期間から、毎月の返済額と総返済額の目安を計算します。返済方式は、毎月の返済額がほぼ一定になる元利均等返済と、毎月返す元金が一定で返済額が徐々に減っていく元金均等返済から選べます。ボーナス返済を設定した場合は、年2回（6か月ごと）の返済として、通常分とボーナス分を別々のローンとして計算し、合わせて表示します。各回の金額は円未満を四捨五入し、最終回で残高がちょうど0円になるよう調整しています。諸費用や金利の変動は含めていません。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>元利均等返済と元金均等返済は何が違いますか？</summary>
            <p>元利均等返済は毎月の返済額がほぼ一定です。元金均等返済は毎月返す元金が一定のため、返済額は最初が大きく、だんだん小さくなります。</p>
          </details>
          <details>
            <summary>ボーナス返済の金額はどう入力しますか？</summary>
            <p>借入金額のうち、ボーナス月に返済する分の借入額を入力します。その分は年2回に分けて返済するものとして計算します。</p>
          </details>
        </div>
      </section>
    </main>
  );
}
