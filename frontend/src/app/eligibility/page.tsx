import Link from "next/link";
import Eligibility from "@/components/simulation/Eligibility";
import { eligibilityInitialFromQuery } from "@/lib/eligibility";

export const metadata = {
  title: "借入可能額/審査目安",
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
      <h1>借入可能額/審査目安</h1>
      <p className="lead">
        年収や他の借入の返済額から、住宅ローンの借入可能額の目安を表示します。金融機関が返済能力を確認する際の考え方を参考にした簡易的な試算です。
      </p>
      <Eligibility initialValues={eligibilityInitialFromQuery(sp)} />
    </main>
  );
}
