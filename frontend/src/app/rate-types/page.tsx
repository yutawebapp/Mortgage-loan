import RateTypes from "@/components/simulation/RateTypes";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";
import { rateTypesInitialFromQuery } from "@/lib/rateTypes";

const TITLE = "金利タイプの比較";
const DESCRIPTION =
  "変動金利・固定期間選択型・全期間固定を、同じ借入条件で並べて比べられる簡易的な試算ツールです。金利は入力した仮の値で、将来の金利を予測するものではなく、結果は目安です。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/rate-types" });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <main className="wide">
      <JsonLd data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/rate-types" })} />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/rate-types" }]} />
      <h1>{TITLE}</h1>
      <p className="lead">
        変動金利・固定期間選択型・全期間固定を、同じ借入条件で並べて、毎月の返済額や総返済額がどう変わるかを確認できます。金利は仮の値を自分で入力します。
      </p>
      <RateTypes initialValues={rateTypesInitialFromQuery(sp)} />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          各ケースとも、入力した借入条件から返済額を計算します。ボーナス返済や繰上げ返済は含みません。変動金利（上昇する場合）と固定期間選択型は、金利が変わる時期に、その時点の残高と残りの期間で返済額を計算し直します。全期間固定と、変動金利で金利が変わらない場合は、金利が一定のままです。端数は円未満を四捨五入します。金利は入力した仮の値で、実際の金利の動きを予測するものではなく、結果は目安です。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>変動金利・固定期間選択型・全期間固定とは何ですか？</summary>
            <p>
              変動金利は、市場の金利の動きにあわせて、借入中に金利が見直される金利タイプです。固定期間選択型は、決めた期間だけ金利が固定され、期間が終わるとその時点の条件で金利が決まるタイプです。全期間固定は、借入期間の全体で金利が変わらないタイプです。商品によって内容が異なるため、詳しくは金融機関にご確認ください。
            </p>
          </details>
          <details>
            <summary>固定期間が終わったらどうなりますか？</summary>
            <p>
              一般に、固定期間が終わると、あらためて金利タイプ（変動金利、再度の固定など）を選ぶか、あらかじめ決められた条件の金利になります。終了後の金利は、そのときの金利水準や契約内容によるため、この試算では入力した仮の金利で計算しています。
            </p>
          </details>
          <details>
            <summary>5年ルール・125%ルールとは何ですか？</summary>
            <p>
              一部の変動金利型で、返済額の見直しに上限などのルールが設けられている場合があります（商品によって異なります）。この試算ではこれらのルールを反映していません。
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
