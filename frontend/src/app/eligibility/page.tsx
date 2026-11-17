import Link from "next/link";
import Eligibility from "@/components/simulation/Eligibility";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";
import { eligibilityInitialFromQuery } from "@/lib/eligibility";

const TITLE = "借入可能額/審査目安";
const DESCRIPTION =
  "年収や他の借入の返済額から、住宅ローンの借入可能額の目安を確認できる簡易的な試算ツールです。金融機関が返済能力を確認する際の考え方を参考にしていますが、審査結果を保証するものではありません。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/eligibility" });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <main className="wide">
      <JsonLd
        data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/eligibility" })}
      />
      <JsonLd data={breadcrumbJsonLd([HOME_CRUMB, { name: TITLE, path: "/eligibility" }])} />
      <p>
        <Link href="/">← トップへ戻る</Link>
      </p>
      <h1>借入可能額/審査目安</h1>
      <p className="lead">
        年収や他の借入の返済額から、住宅ローンの借入可能額の目安を表示します。金融機関が返済能力を確認する際の考え方を参考にした簡易的な試算です。
      </p>
      <Eligibility initialValues={eligibilityInitialFromQuery(sp)} />
    </main>
  );
}
