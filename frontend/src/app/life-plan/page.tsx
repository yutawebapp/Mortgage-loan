import Link from "next/link";
import LifePlan from "@/components/simulation/LifePlan";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";

const TITLE = "ライフプランシミュレーター";
const DESCRIPTION =
  "毎年の収入・生活費・住宅ローン・お子さんの教育費から、貯蓄が年齢とともにどう推移するかの目安を確認できる簡易的な試算ツールです。金額は現在の価値で、結果は入力した前提によって変わります。将来を予測するものではありません。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/life-plan" });

export default function Page() {
  return (
    <main className="wide">
      <JsonLd data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/life-plan" })} />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/life-plan" }]} />
      <h1>{TITLE}</h1>
      <p className="lead">
        毎年の収入・生活費・住宅ローン・お子さんの教育費から、貯蓄が年齢とともにどう推移するかの目安を確認します。金額はすべて現在の価値で、物価の上昇は考慮していません。
      </p>
      <LifePlan />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          年ごとに「年初の貯蓄 ＋ 利息 ＋ その年の収支 ＝ 年末の貯蓄」を計算します。利息は、貯蓄がプラスのときだけ、入力した運用利回りで計算します。その年の収支は、収入から、生活費・住宅ローンの返済額・住居費・教育費を引いた金額です。
        </p>
        <p>
          収入は、退職年齢まで、入力した手取り年収に年間上昇率を反映して計算します。年金などの収入は、受け取りを始める年齢から、入力した年間収入を加えます。住宅ローンの返済額は、借入額・金利・返済期間・返済方式から返済計算で求めます。住居費（賃貸の家賃、持ち家の管理費・修繕積立金・税・保険など）は、住宅ローンがない場合も含めて、入力した金額を毎年加えます。教育費は、全国平均の年額を、お子さんの年齢に当てはめて加えます。大学は4年間として計算します。
        </p>
        <p>
          金額はすべて現在の価値で、物価の上昇、収入や支出の変化、税や社会保険の変更、病気や介護などの臨時の出費は含まれません。結果は目安で、将来を予測するものではありません。
        </p>
        <h3>制度・数値の出典</h3>
        <ul>
          <li>
            文部科学省「令和5年度 子供の学習費調査」 表2 学年（年齢）別の学習費総額（
            <a href="https://www.mext.go.jp/content/20260116-mxt_chousa01-000039333_3.pdf" rel="noopener noreferrer">PDF</a>
            、確認日 2026-11-19）
          </li>
          <li>
            国立大学の標準額（文部科学省 国立大学等の授業料その他の費用に関する省令）（
            <a href="https://www.mext.go.jp/content/20251226-mxt_sigakujo-000046463_4.pdf" rel="noopener noreferrer">PDF</a>
            、確認日 2026-11-19）
          </li>
          <li>
            文部科学省「私立大学等の令和7年度入学者に係る学生納付金等調査結果」（
            <a href="https://www.mext.go.jp/a_menu/koutou/shinkou/07021403/1412031_00006.htm" rel="noopener noreferrer">ページ</a>
            、確認日 2026-11-19）
          </li>
        </ul>
        <p>
          数値は表示した確認日時点の公開情報にもとづく目安です。制度改正や年度更新で変わることがあります。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>教育費の目安は、どのように出していますか？</summary>
            <p>
              幼稚園から高校までは、文部科学省の<a href="https://www.mext.go.jp/content/20260116-mxt_chousa01-000039333_3.pdf" rel="noopener noreferrer">「令和5年度 子供の学習費調査」</a>にある、公立・私立の学年別の平均額を使っています。大学は、学費の標準額や平均額を使っています。いずれも全国平均で、実際の費用は学校や地域、習い事などによって大きく異なります。
            </p>
          </details>
          <details>
            <summary>年金額は、どのように入力すればよいですか？</summary>
            <p>
              「退職後の年間収入」に、年金などを合わせた1年間の受け取り額を入力します。見込み額は、毎年誕生月に届く「ねんきん定期便」や、日本年金機構の「ねんきんネット」などでご確認ください。ここでは入力された金額をそのまま使い、年金額を計算するものではありません。
            </p>
          </details>
          <details>
            <summary>結果がマイナスになった場合は、どうすればよいですか？</summary>
            <p>
              収入・生活費・借入額・退職年齢などの条件を変えて、結果がどう変わるかをご確認ください。この試算は簡易的なものです。個別の状況については、金融機関や、ファイナンシャルプランナーなどの専門家に相談することもできます。
            </p>
          </details>
        </div>
        <p>
          関連するツール：<Link href="/total-cost">住居費の総額シミュレーター</Link>、
          <Link href="/rent-vs-buy">マイホームと賃貸の比較シミュレーター</Link>、<Link href="/simulation">返済シミュレーター</Link>
        </p>
      </section>
    </main>
  );
}
