import TotalCost from "@/components/simulation/TotalCost";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";
import { totalCostInitialFromQuery } from "@/lib/totalCost";

const TITLE = "住居費の総額シミュレーター";
const DESCRIPTION =
  "頭金・諸費用・毎月の管理費・固定資産税などを含めた、住まいにかかる費用の総額と月平均の目安を調べられる簡易的な試算ツールです。結果は目安であり、実際の費用を保証するものではありません。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/total-cost" });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <main className="wide">
      <JsonLd data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/total-cost" })} />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/total-cost" }]} />
      <h1>{TITLE}</h1>
      <p className="lead">
        ローンの返済額だけでなく、頭金・諸費用・管理費・修繕積立金・税金・保険料まで含めて、住まいにかかる費用の総額と月平均の目安を調べます。
      </p>
      <TotalCost initialValues={totalCostInitialFromQuery(sp)} />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          借入額は「物件価格 ＋ 諸費用 − 頭金」で計算します。諸費用は、頭金と借入額を合わせた予算の中から支払う前提です。ローンの返済額は、この借入額・金利・返済期間・返済方式から計算し、ボーナス返済や繰上げ返済は含めていません。管理費・修繕積立金・固定資産税・都市計画税・保険料は、入力した金額が毎年同じ金額で続くものとして計算します。
        </p>
        <p>
          総額は「頭金 ＋ ローンの返済額の合計 ＋ 返済期間中の保有コスト」です。月平均は、総額を返済期間の月数で割った金額で、頭金も含まれます。ローンの完済後にかかる費用、売却したときの価格、住宅ローン控除などは含まれません。結果は目安です。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>諸費用とは何ですか？</summary>
            <p>
              物件の価格とは別にかかる費用の総称で、登記費用、仲介手数料、ローンの保証料や手数料、各種の税金などが含まれます。金額は物件の種類や契約内容によって大きく異なるため、ここでは物件価格に対する割合で入力します。実際の金額は、不動産会社や金融機関の見積もりでご確認ください。
            </p>
          </details>
          <details>
            <summary>修繕積立金とは何ですか？</summary>
            <p>
              マンションなどで、将来の大規模な修繕に備えて、毎月管理組合に積み立てる費用です。金額は建物や修繕の計画によって異なり、将来見直されることもあります。戸建ての場合は、修繕の費用を自分で準備しておく必要があります。
            </p>
          </details>
          <details>
            <summary>固定資産税・都市計画税はどこで確認できますか？</summary>
            <p>
              毎年、市区町村（東京23区は都）から届く納税通知書で確認できます。購入前は、物件の資料や不動産会社に、おおよその年額を確認するとよいでしょう。新築住宅などで、一定期間の軽減措置が適用される場合があり、その期間が終わると金額が変わることがあります。
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
