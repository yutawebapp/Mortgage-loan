import Eligibility from "@/components/simulation/Eligibility";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";

const TITLE = "借入可能額/審査目安";
const DESCRIPTION =
  "年収や他の借入の返済額から、住宅ローンの借入可能額の目安を確認できる簡易的な試算ツールです。金融機関が返済能力を確認する際の考え方を参考にしていますが、審査結果を保証するものではありません。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/eligibility" });

export default function Page() {
  return (
    <main className="wide">
      <JsonLd
        data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/eligibility" })}
      />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/eligibility" }]} />
      <h1>借入可能額/審査目安</h1>
      <p className="lead">
        年収や他の借入の返済額から、住宅ローンの借入可能額の目安を表示します。金融機関が返済能力を確認する際の考え方を参考にした簡易的な試算です。
      </p>
      <Eligibility />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          年収に対する年間返済額の割合（返済負担率）に上限を置き、そこから他の借入の年間返済額を引いて、住宅ローンに充てられる返済額を求めます。返済負担率の上限は、年収400万円未満で30%、400万円以上で35%を目安としています。審査金利は既定で3.5%とし、この金利で元利均等返済をした場合に、返済可能額の範囲に収まる借入額を逆算します。借入可能額は1万円未満を切り捨てて表示します。実際の審査では、勤務先や勤続年数、他の借入の状況など多くの条件が確認されるため、結果は目安です。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>返済負担率とは何ですか？</summary>
            <p>年収に対する、年間のローン返済額の割合です。住宅ローン以外の借入の返済額も含めて考えます。</p>
          </details>
          <details>
            <summary>審査金利は実際の金利と同じですか？</summary>
            <p>同じとは限りません。審査では実際の適用金利とは別に、やや高めの金利で返済能力を確認する場合があります。この試算でも、入力欄で審査金利を変更できます。</p>
          </details>
        </div>
      </section>
    </main>
  );
}
