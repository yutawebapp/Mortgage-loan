import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { ABOUT_PAGE, PRIVACY_PAGE } from "@/lib/nav";
import { LAST_UPDATED, OPERATOR_CONTACT, formatLastUpdated } from "@/lib/operator";
import { HOME_CRUMB, pageMetadata } from "@/lib/seo";
import { SITE_NAME, absUrl } from "@/lib/site";

const TITLE = "プライバシーポリシー";
const DESCRIPTION =
  "住宅ローン試算ツールで入力した値の扱い、ブラウザに保存する借入条件、共有リンクの仕組み、Cookie・アクセス解析の有無について説明します。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PRIVACY_PAGE.href });

const webPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  url: absUrl(PRIVACY_PAGE.href),
  inLanguage: "ja",
};

export default function Page() {
  const updated = formatLastUpdated(LAST_UPDATED);

  return (
    <main className="wide">
      <JsonLd data={webPageLd} />
      <Breadcrumb crumbs={[HOME_CRUMB, { name: PRIVACY_PAGE.label, path: PRIVACY_PAGE.href }]} />
      <h1>{TITLE}</h1>
      <p className="lead">
        このサイトで入力された情報の扱いについて説明します。サイトの仕組みは <Link href={ABOUT_PAGE.href}>{ABOUT_PAGE.label}</Link>にもまとめています。
      </p>

      <section className="about" aria-labelledby="pp-input">
        <h2 id="pp-input">試算の入力値について</h2>
        <p>
          試算ツールに入力された値（借入額、金利、返済期間、年収、物件価格などの数値）は、試算を行うためにこのサイトのサーバー（API）へ送信されます。
        </p>
        <p>
          入力された値を、データベースに保存する処理はありません。また、アプリケーションが入力値をログに出力することもありません。試算が終わると、入力値はサーバー上に残りません。
        </p>
      </section>

      <section className="about" aria-labelledby="pp-local">
        <h2 id="pp-local">ブラウザに保存する借入条件</h2>
        <p>
          借入額・金利・返済期間の3項目は、利用者がご自身で入力・変更したものに限り、お使いのブラウザの保存領域（localStorage）に保存します。次回以降のツールの初期値として使うためです。
        </p>
        <ul>
          <li>保存先はお使いの端末のブラウザだけです。サーバーには送信しません。</li>
          <li>保存した条件は、各ツールの画面にある「保存した条件を消す」の操作でいつでも消せます。</li>
          <li>年収などの他の入力値は保存しません。</li>
        </ul>
      </section>

      <section className="about" aria-labelledby="pp-share">
        <h2 id="pp-share">条件のリンク（共有URL）</h2>
        <p>
          「この条件のリンクをコピー」などの操作で作るURLには、入力した値（借入額・金利・返済期間、物件価格など、そのツールの主な入力）がそのまま含まれます。このURLを他の人に送ると、その値も相手に伝わります。
        </p>
      </section>

      <section className="about" aria-labelledby="pp-cookie">
        <h2 id="pp-cookie">Cookie・アクセス解析・広告</h2>
        <p>
          現在、このサイトはアプリとしてCookieを設定していません。また、アクセス解析のツールや広告の配信タグは導入していません。
        </p>
        <p>
          今後、これらを導入する場合は、導入前にこのページの内容を更新し、利用目的と仕組みを明記します。
        </p>
      </section>

      <section className="about" aria-labelledby="pp-other">
        <h2 id="pp-other">その他</h2>
        <p>
          出典などのリンクから外部のサイトへ移動した場合、その先での情報の扱いは、移動先のサイトの方針に従います。
        </p>
        <p>
          アカウント登録の機能はありません。
        </p>
        {OPERATOR_CONTACT && (
          <p>
            このポリシーに関するお問い合わせは、<Link href={ABOUT_PAGE.href}>運営者情報</Link>に記載の連絡先までお寄せください。
          </p>
        )}
        <p>
          このポリシーの内容を変更する場合は、このページに掲載し、下の最終更新日を更新します。
        </p>
        {updated && <p>最終更新日: {updated}</p>}
      </section>
    </main>
  );
}
