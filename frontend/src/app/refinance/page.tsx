import Refinancer from "@/components/simulation/Refinancer";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";

const TITLE = "借り換え診断";
const DESCRIPTION =
  "現在のローンと借り換え後の条件を入力すると、毎月の返済額・総支払額の違いと、諸費用を取り戻せる時期の目安を試算できます。借り換えを検討する際の参考にご利用ください。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/refinance" });

export default function Page() {
  return (
    <main className="wide">
      <JsonLd
        data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/refinance" })}
      />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: TITLE, path: "/refinance" }]} />
      <h1>借り換え診断</h1>
      <p className="lead">
        現在のローンと借り換え後の条件を入力すると、毎月の返済額・総支払額の違いと、諸費用を取り戻せる時期の目安を表示します。
      </p>
      <Refinancer />
      <section className="about" aria-labelledby="about-h">
        <h2 id="about-h">この試算について</h2>
        <p>
          現在のローンと借り換え後のローンについて、それぞれの返済額を計算して比較します。借り換えにかかる諸費用は、借り換え後のローンには含めず、手元から先に支払うものとして扱います。損益分岐点は、累計の差額（現在のローンの返済累計 − 借り換え後のローンの返済累計 − 諸費用）が、初めて0円以上になる月です。この月以降は、諸費用を払っても現在のローンを続けるより支払いが少ない見込みになります。金利は一定として計算しており、将来の金利の変動や税金の控除などは含めていません。
        </p>
        <div className="faq">
          <h3>よくある質問</h3>
          <details>
            <summary>損益分岐点とは何ですか？</summary>
            <p>返済額が減った分の累計が、借り換えにかかった諸費用に追いつく時期の目安です。その時期より前に完済や再度の借り換えをすると、費用を取り戻せない場合があります。</p>
          </details>
          <details>
            <summary>諸費用には何を入力しますか？</summary>
            <p>事務手数料、保証料、登記費用など、借り換えのために支払う費用の合計を入力します。金額は金融機関の見積もりなどでご確認ください。</p>
          </details>
        </div>
      </section>
    </main>
  );
}
