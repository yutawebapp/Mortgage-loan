import Budget from "@/components/simulation/Budget";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";

const TITLE = "購入予算の逆算";
const DESCRIPTION =
  "毎月の返済額と頭金から、購入できる物件価格の目安を調べられる簡易的な試算ツールです。諸費用の割合も指定できます。結果は目安であり、借入可否を保証するものではありません。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/budget" });

export default function Page() {
  return (
    <main className="wide">
      <JsonLd data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/budget" })} />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/budget" }]} />
      <h1>購入予算の逆算</h1>
      <p className="lead">
        毎月の返済額と頭金から、買える物件価格の目安を調べます。借入額に頭金を足した予算の合計から、諸費用を除いた金額を物件価格として表示します。
      </p>
      <Budget />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          借入額は、希望する毎月の返済額を元利均等返済で支払う場合に借りられる金額を逆算し、1万円未満を切り捨てて求めます。予算の合計は「借入額＋頭金」です。物件価格は、予算の合計を「1＋諸費用の割合」で割り、1万円未満を切り捨てて求めます。諸費用は、予算の合計の中から支払う前提です。年収を入力した場合は、年間返済額（毎月の返済額×12）を年収で割った返済負担率も表示します。実際の購入では、物件の種類や条件によって諸費用や税金、購入後の維持費が変わるため、結果は目安です。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>諸費用には何が含まれますか？</summary>
            <p>
              登記費用、仲介手数料、保証料、各種税などが含まれます。物件価格の1割前後かかることが多いとされますが、物件の種類や条件で大きく変わります。
            </p>
          </details>
          <details>
            <summary>借入額が物件価格を上回ることはありますか？</summary>
            <p>
              頭金が少なく諸費用の割合が大きい場合などに、借入額が物件価格を上回る計算になることがあります。諸費用まで借り入れできるかは金融機関や商品によって異なるため、事前の確認が必要です。
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
