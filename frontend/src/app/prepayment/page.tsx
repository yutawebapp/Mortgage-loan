import Prepayer from "@/components/simulation/Prepayer";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";
import { prepaymentInitialFromQuery } from "@/lib/prepayment";

const TITLE = "繰上げ返済シミュレーター";
const DESCRIPTION =
  "借入金額・金利・返済期間と、繰上げ返済をする時期・金額から、期間短縮型・返済額軽減型それぞれの利息の軽減額や短縮される期間の目安を試算できます。金融機関の手数料などは含まれず、結果は目安です。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/prepayment" });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <main className="wide">
      <JsonLd data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/prepayment" })} />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/prepayment" }]} />
      <h1>{TITLE}</h1>
      <p className="lead">
        繰上げ返済をする時期と金額を入力すると、支払う利息がどのくらい少なくなるか、返済期間がどのくらい短くなるかの目安を表示します。
      </p>
      <Prepayer initialValues={prepaymentInitialFromQuery(sp)} />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          繰上げ返済は、指定した返済回の支払いが終わった直後に行うものとして計算します。期間短縮型は、毎月の返済額を変えずに、繰上げ返済で減った元金の分だけ完済の時期を早めます。返済額軽減型は、返済期間を変えずに、繰上げ返済後の残高と残りの期間で毎月の返済額を計算し直します。金利は繰上げ返済の前後で変わらないものとし、端数は円未満を四捨五入します。繰上げ返済の手数料は含めていません。結果は目安です。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>期間短縮型と返済額軽減型は何が違いますか？</summary>
            <p>
              期間短縮型は毎月の返済額を変えずに完済の時期を早める方法、返済額軽減型は返済期間を変えずに毎月の返済額を下げる方法です。一般に、同じ金額を繰上げ返済した場合、期間短縮型のほうが利息の軽減額は大きくなる傾向があります。どちらが合うかは、家計の状況によって異なります。
            </p>
          </details>
          <details>
            <summary>総返済額に繰上げ返済額は含まれますか？</summary>
            <p>
              含まれません。「繰上げあり」の総返済額は、繰上げ返済額とは別に、毎月支払う金額の合計です。繰上げ返済額は別に支払う金額として表示しています。
            </p>
          </details>
          <details>
            <summary>繰上げ返済の手数料はかかりますか？</summary>
            <p>
              金融機関や手続きの方法によって異なります。この試算には含まれていないため、実際の条件は、お借入れの金融機関にご確認ください。
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
