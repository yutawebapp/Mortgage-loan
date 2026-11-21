import Link from "next/link";
import RentVsBuy from "@/components/simulation/RentVsBuy";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";

const TITLE = "マイホームと賃貸の比較シミュレーター";
const DESCRIPTION =
  "物件価格・頭金・ローンの条件と、賃貸の家賃を入力して、マイホームと賃貸の累計の支出が年ごとにどう変わるかを調べられる簡易的な試算ツールです。どちらが良いかを示すものではなく、結果は入力した前提によって変わります。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/rent-vs-buy" });

export default function Page() {
  return (
    <main className="wide">
      <JsonLd data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/rent-vs-buy" })} />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/rent-vs-buy" }]} />
      <h1>{TITLE}</h1>
      <p className="lead">
        購入した場合と賃貸の場合について、支出の合計が年ごとにどう積み重なるかを並べて確認できます。どちらが良いかを決めるものではなく、入力した前提での推移を示すものです。
      </p>
      <RentVsBuy />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          購入の借入額は「物件価格 ＋ 諸費用 − 頭金」で計算します。諸費用は、頭金と借入額を合わせた予算の中から支払う前提です。年末のローン残高は、借入額・金利・返済期間・返済方式から返済額を計算して求めています。ボーナス返済や繰上げ返済は含めていません。
        </p>
        <p>
          購入の累計支出は「頭金 ＋ ローンの返済額の合計 ＋ 保有コスト（管理費・修繕積立金・税金・保険料）」です。実質負担は「累計支出 −（想定の物件価値 ×（1 − 売却費用の割合）− ローン残高）」で、その時点で売却したと仮定した場合の、手元に残る額を差し引いたものです。賃貸の累計支出は「初期費用 ＋ 家賃 ＋ 更新料」です。
        </p>
        <p>
          家賃の上昇率と物件価値の変化率は、毎年同じ割合で変わるものとして計算します。購入と賃貸の支出の差を運用した場合の収益や、住宅ローン控除は含まれません。結果は目安で、将来を予測するものではありません。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>購入と賃貸は、どちらが得ですか？</summary>
            <p>
              物件の価値の変化、家賃の変動、金利、住む期間などの前提によって変わります。この試算は、入力した前提での支出の推移を示すもので、どちらが良いかという結論を示すものではありません。前提を変えて、結果がどのくらい変わるかをご確認ください。
            </p>
          </details>
          <details>
            <summary>実質負担とは何ですか？</summary>
            <p>
              購入では、支払った累計の金額のほかに、物件という資産が残ります。実質負担は、累計支出から、その時点で売却したと仮定したときに手元に残る額（想定の物件価値から売却費用とローン残高を引いた額）を差し引いた金額です。物件価値が大きく下がると増え、上がるとマイナスになることもあります。実際に売却できる価格を保証するものではありません。
            </p>
          </details>
          <details>
            <summary>物件価値の変化率は、どのように設定すればよいですか？</summary>
            <p>
              将来の物件価値は予測できません。1つの値で判断せず、0%のほか、プラスやマイナスの値も入れて、複数のケースで結果を確認してください。画面の「物件価値の変化率が違う場合」の表も参考にしてください。
            </p>
          </details>
        </div>
        <p>
          関連するツール：<Link href="/total-cost">住居費の総額シミュレーター</Link>、
          <Link href="/tax-deduction">住宅ローン控除シミュレーター</Link>、<Link href="/simulation">返済シミュレーター</Link>
        </p>
      </section>
    </main>
  );
}
