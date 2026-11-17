import TaxDeduction from "@/components/simulation/TaxDeduction";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";
import { taxDeductionInitialFromQuery } from "@/lib/taxDeduction";

const TITLE = "住宅ローン控除シミュレーター";
const DESCRIPTION =
  "入居年・住宅の性能・借入条件・年収から、住宅ローン控除の控除額と実質負担の目安を調べられる簡易的な試算ツールです。結果は目安であり、実際の控除額を保証するものではありません。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/tax-deduction" });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <main className="wide">
      <JsonLd data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/tax-deduction" })} />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/tax-deduction" }]} />
      <h1>住宅ローン控除シミュレーター</h1>
      <p className="lead">
        入居年・住宅の性能・借入条件・年収から、控除額と実質負担の目安を調べます。年収から税額を簡易的に推計するため、結果は目安としてご覧ください。
      </p>
      <TaxDeduction initialValues={taxDeductionInitialFromQuery(sp)} />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          年末の借入残高は、入力した借入条件から返済計算を行って求めます。繰上げ返済やボーナス返済は含まれていません。
        </p>
        <p>
          控除額は、「年末残高」と「借入限度額」のうち小さい方に控除率0.7%をかけ、100円未満を切り捨てて求めます。
        </p>
        <p>
          控除は、まず所得税から差し引き、引ききれない額を翌年度の住民税から差し引きます。住民税から差し引ける額には上限があります。
        </p>
        <p>
          税額は、年収から簡易的に推計しています。独身で扶養親族がいないと仮定し、社会保険料は年収に対する割合で仮定しています。
        </p>
        <p>
          入居年と住宅の区分に応じた借入限度額と控除期間は、データとして管理しています。結果には、出典と確認日を表示します。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>控除しきれない場合はどうなりますか？</summary>
            <p>
              所得税から引ききれない額は、翌年度の住民税から差し引かれます。住民税側にも上限があり、それでも差し引けない額は、控除されません。このツールでは、その額を「控除しきれない額」として表示しています。
            </p>
          </details>
          <details>
            <summary>子育て世帯・若者夫婦世帯とは何ですか？</summary>
            <p>
              19歳未満の扶養親族がいる世帯、または夫婦のいずれかが40歳未満の世帯です。入居年の12月31日時点で判定します。該当する場合は、借入限度額が上乗せされることがあります。該当するかどうかは、国土交通省や税務署の案内などでご確認ください。
            </p>
          </details>
          <details>
            <summary>手続きはどのようにしますか？</summary>
            <p>
              1年目は、確定申告で手続きします。会社員の方は、2年目以降は、勤務先に必要な書類を提出して年末調整で手続きするのが一般的です。必要な書類や手順は、税務署等でご確認ください。
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
