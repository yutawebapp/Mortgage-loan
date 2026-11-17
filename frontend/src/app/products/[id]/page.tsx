import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductApiError, fetchProduct, type ProductDetail } from "@/lib/api/products";
import { formatDate, formatRate, isStale, rateTypeLabel, refinanceHref, simulateHref } from "@/lib/products";
import { Disclaimer, SampleNotice, StaleBadge } from "@/components/products/Notices";
import SourceLink from "@/components/products/SourceLink";
import { yen } from "@/lib/simulation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "商品詳細",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) notFound();

  let p: ProductDetail | null = null;
  try {
    p = await fetchProduct(Number(id));
  } catch (e) {
    if (e instanceof ProductApiError && (e.status === 404 || e.status === 400)) notFound();
    p = null;
  }

  return (
    <main className="wide">
      <p>
        <Link href="/products">← 商品一覧へ戻る</Link>
      </p>
      {!p ? (
        <>
          <h1>商品詳細</h1>
          <SampleNotice />
          <div className="alert" role="alert">
            <p>商品情報を取得できませんでした。時間をおいて再度お試しください。</p>
            <Link href={`/products/${id}`} className="btn-link">再読み込み</Link>
          </div>
          <Disclaimer />
        </>
      ) : (
        <>
          <p className="inst">{p.institutionName}</p>
          <h1 className="detail-title">{p.productName}</h1>
          <SampleNotice />

          <section className="card" aria-labelledby="rate-h">
            <h2 id="rate-h">現在の金利</h2>
            <dl className="info">
              <div><dt>金利タイプ</dt><dd>{rateTypeLabel(p)}</dd></div>
              <div><dt>金利（年率）</dt><dd className="big">{formatRate(p.annualRatePercent)}</dd></div>
              <div><dt>金利更新日</dt><dd>{formatDate(p.rateEffectiveFrom)}</dd></div>
              <div><dt>出典</dt><dd><SourceLink url={p.rateSourceUrl} /></dd></div>
            </dl>
            {isStale(p.rateEffectiveFrom) && <p><StaleBadge /></p>}
            <p>
              <Link className="btn-link" href={simulateHref(p.annualRatePercent)}>
                この金利で返済額を試算する
              </Link>
              {" "}
              <Link className="btn-link" href={refinanceHref(p.annualRatePercent)}>
                この金利で借り換えを試算する
              </Link>
            </p>
          </section>

          <section className="card" aria-labelledby="fee-h">
            <h2 id="fee-h">手数料</h2>
            {p.fees.length === 0 ? (
              <p className="empty">手数料の情報はありません。</p>
            ) : (
              <div className="table-wrap plain">
                <table>
                  <caption className="sr-only">手数料一覧</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="left">種類</th>
                      <th scope="col">金額・割合</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.fees.map((f, i) => (
                      <tr key={`${f.feeType}-${i}`}>
                        <th scope="row">{f.label}</th>
                        <td>
                          {f.amount != null
                            ? yen(f.amount)
                            : f.ratePercent != null
                              ? `${f.ratePercent}%`
                              : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="hist-h">
            <h2 id="hist-h">金利履歴</h2>
            {p.rateHistory.length === 0 ? (
              <p className="empty">金利履歴はありません。</p>
            ) : (
              <div className="table-wrap plain">
                <table>
                  <caption className="sr-only">金利履歴（新しい順）</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="left">適用開始日</th>
                      <th scope="col">金利（年率）</th>
                      <th scope="col">出典</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.rateHistory.map((h, i) => (
                      <tr key={`${h.effectiveFrom}-${i}`}>
                        <th scope="row">{formatDate(h.effectiveFrom)}</th>
                        <td>{formatRate(h.annualRatePercent)}</td>
                        <td><SourceLink url={h.sourceUrl} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <Disclaimer />
        </>
      )}
    </main>
  );
}
