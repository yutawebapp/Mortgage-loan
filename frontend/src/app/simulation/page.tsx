import Link from "next/link";
import Simulator from "@/components/simulation/Simulator";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";
import { initialFromQuery } from "@/lib/simulation";

const TITLE = "返済シミュレーター";
const DESCRIPTION =
  "借入金額・金利・返済期間を入力して、住宅ローンの毎月の返済額と総返済額の目安を試算できます。返済方式（元利均等返済・元金均等返済）を切り替えて確認できます。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/simulation" });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <main className="wide">
      <JsonLd
        data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/simulation" })}
      />
      <JsonLd data={breadcrumbJsonLd([HOME_CRUMB, { name: TITLE, path: "/simulation" }])} />
      <p>
        <Link href="/">← トップへ戻る</Link>
      </p>
      <h1>返済シミュレーター</h1>
      <p className="lead">借入金額・金利・返済期間を入力すると、毎月の返済額と総返済額の目安を表示します。</p>
      <Simulator initialValues={initialFromQuery(sp)} />
    </main>
  );
}
