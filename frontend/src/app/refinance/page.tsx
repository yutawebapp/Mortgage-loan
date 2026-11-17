import Link from "next/link";
import Refinancer from "@/components/simulation/Refinancer";
import { refinanceInitialFromQuery } from "@/lib/refinance";

export const metadata = {
  title: "借り換え診断",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <main className="wide">
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
