import Link from "next/link";
import Simulator from "@/components/simulation/Simulator";
import { initialFromQuery } from "@/lib/simulation";

export const metadata = {
  title: "返済シミュレーター",
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
      <h1>返済シミュレーター</h1>
      <p className="lead">借入金額・金利・返済期間を入力すると、毎月の返済額と総返済額の目安を表示します。</p>
      <Simulator initialValues={initialFromQuery(sp)} />
    </main>
  );
}
