import RateScenario from "@/components/simulation/RateScenario";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";

const TITLE = "金利上昇シミュレーション";
const DESCRIPTION =
  "変動金利型の住宅ローンで、金利が上昇した場合の毎月の返済額・総返済額の変化を、上昇幅ごとに比較できる簡易的な試算ツールです。実際の返済額の見直しルールは反映しておらず、結果は目安です。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/rate-scenario" });

export default function Page() {
  return (
    <main className="wide">
      <JsonLd data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/rate-scenario" })} />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/rate-scenario" }]} />
      <h1>{TITLE}</h1>
      <p className="lead">
        変動金利型のローンで、一定の時期に金利が上昇した場合に、毎月の返済額や総返済額がどのように変わるかを、上昇幅ごとに比べて確認できます。
      </p>
      <RateScenario />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          指定した時期に金利が一度だけ上昇し、その後は変わらないものとして計算します。上昇した時点のローン残高と残りの期間で、同じ返済方式のまま毎月の返済額を計算し直します。「現在の金利のまま」は、金利が上昇しない場合の試算で、各シナリオとの差を比べるための基準です。端数は円未満を四捨五入します。実際の金利の動きを予測するものではなく、結果は目安です。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>5年ルール・125%ルールとは何ですか？</summary>
            <p>
              変動金利型の住宅ローンで、金融機関によっては、返済額を見直す時期を5年ごとにする「5年ルール」や、見直しの際の返済額の上昇を直前の返済額の125%までに抑える「125%ルール」を設けています。内容や有無は金融機関によって異なるため、この試算には反映していません。
            </p>
          </details>
          <details>
            <summary>元金均等返済では、上昇後の返済額が減ることがありますか？</summary>
            <p>
              元金均等返済では、毎月の返済額が元金の減少にあわせて少しずつ減ります。そのため、金利が上昇しても、上昇した時点の返済額が上昇前の最初の返済額より小さくなる場合があります。
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
