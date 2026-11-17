import Link from "next/link";
import Refinancer from "@/components/simulation/Refinancer";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, HOME_CRUMB, pageMetadata, webApplicationJsonLd } from "@/lib/seo";
import { refinanceInitialFromQuery } from "@/lib/refinance";

const TITLE = "借り換え診断";
const DESCRIPTION =
  "現在のローンと借り換え後の条件を入力すると、毎月の返済額・総支払額の違いと、諸費用を取り戻せる時期の目安を試算できます。借り換えを検討する際の参考にご利用ください。";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/refinance" });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <main className="wide">
      <JsonLd
        data={webApplicationJsonLd({ name: TITLE, description: DESCRIPTION, path: "/refinance" })}
      />
      <JsonLd data={breadcrumbJsonLd([HOME_CRUMB, { name: TITLE, path: "/refinance" }])} />
      <p>
        <Link href="/">← トップへ戻る</Link>
      </p>
      <h1>借り換え診断</h1>
      <p className="lead">
        現在のローンと借り換え後の条件を入力すると、毎月の返済額・総支払額の違いと、諸費用を取り戻せる時期の目安を表示します。
      </p>
      <Refinancer initialValues={refinanceInitialFromQuery(sp)} />
    </main>
  );
}
