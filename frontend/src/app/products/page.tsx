import Link from "next/link";
import { fetchProducts, type ProductPage } from "@/lib/api/products";
import {
  PAGE_SIZE,
  RATE_TYPE_OPTIONS,
  SORT_OPTIONS,
  formatDate,
  formatRate,
  isStale,
  listHref,
  parsePage,
  parseRateType,
  parseSort,
  rateTypeLabel,
  refinanceHref,
  simulateHref,
} from "@/lib/products";
import { Disclaimer, SampleNotice, StaleBadge } from "@/components/products/Notices";
import SourceLink from "@/components/products/SourceLink";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "金融機関・商品比較",
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const rateType = parseRateType(sp.rateType);
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);

  let data: ProductPage | null = null;
  try {
    data = await fetchProducts({ rateType, sort, page, size: PAGE_SIZE });
  } catch {
    data = null;
  }
  const sortLabel = SORT_OPTIONS.find((s) => s.value === sort)?.label;

  return (
    <main className="wide">
      <p>
        <Link href="/">← トップへ戻る</Link>
      </p>
      <h1>金融機関・商品比較</h1>
      <SampleNotice />
      <p className="lead">金利タイプで絞り込み、並び順を選んで商品を見比べられます。</p>

      <div className="filters">
        <nav aria-labelledby="f-type">
          <h2 id="f-type" className="filter-title">金利タイプ</h2>
          <ul className="chips">
            {RATE_TYPE_OPTIONS.map((o) => {
              const active = o.value === rateType;
              return (
                <li key={o.label}>
                  <Link
                    href={listHref({ rateType: o.value, sort, page: 0 })}
                    aria-current={active ? "true" : undefined}
                    className={active ? "chip active" : "chip"}
                  >
                    {o.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <nav aria-labelledby="f-sort">
          <h2 id="f-sort" className="filter-title">並び順</h2>
          <ul className="chips">
            {SORT_OPTIONS.map((o) => {
              const active = o.value === sort;
              return (
                <li key={o.value}>
                  <Link
                    href={listHref({ rateType, sort: o.value, page: 0 })}
                    aria-current={active ? "true" : undefined}
                    className={active ? "chip active" : "chip"}
                  >
                    {o.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {!data ? (
        <div className="alert" role="alert">
          <p>商品情報を取得できませんでした。時間をおいて再度お試しください。</p>
          <Link href={listHref({ rateType, sort, page })} className="btn-link">
            再読み込み
          </Link>
        </div>
      ) : (
        <section aria-labelledby="result-title">
          <h2 id="result-title" className="result-title">
            商品一覧
            <span className="result-meta">
              {data.totalElements}件・{sortLabel}
            </span>
          </h2>
          {data.items.length === 0 ? (
            <p className="empty">
              {data.totalElements > 0 ? "このページに表示する商品がありません。" : "条件に合う商品がありません。"}
              <Link href={listHref({ rateType, sort, page: 0 })}>最初のページへ</Link>
            </p>
          ) : (
            <ul className="product-list">
              {data.items.map((p) => (
                <li key={p.id} className="product-card">
                  <div className="product-head">
                    <p className="inst">{p.institutionName}</p>
                    <h3>
                      <Link href={`/products/${p.id}`}>{p.productName}</Link>
                    </h3>
                    <p className="type">{rateTypeLabel(p)}</p>
                  </div>
                  <div className="product-rate">
                    <p className="rate">
                      <span className="rate-label">金利（年率）</span>
                      <strong>{formatRate(p.annualRatePercent)}</strong>
                    </p>
                    <p className="meta">{`金利更新日: ${formatDate(p.rateEffectiveFrom)}`}</p>
                    {isStale(p.rateEffectiveFrom) && <StaleBadge />}
                    <p className="meta">
                      <SourceLink url={p.rateSourceUrl} />
                    </p>
                  </div>
                  <p className="product-actions">
                    <Link href={`/products/${p.id}`}>詳細を見る</Link>
                    <Link href={simulateHref(p.annualRatePercent)}>この金利で返済額を試算する</Link>
                    <Link href={refinanceHref(p.annualRatePercent)}>この金利で借り換えを試算する</Link>
                  </p>
                </li>
              ))}
            </ul>
          )}

          {data.totalPages > 1 && (
            <nav className="pager" aria-label="ページ送り">
              {data.page > 0 ? (
                <Link href={listHref({ rateType, sort, page: data.page - 1 })} rel="prev">
                  ← 前のページ
                </Link>
              ) : (
                <span className="disabled" aria-hidden="true">← 前のページ</span>
              )}
              <span aria-live="polite">
                {data.page + 1} / {data.totalPages} ページ
              </span>
              {data.page + 1 < data.totalPages ? (
                <Link href={listHref({ rateType, sort, page: data.page + 1 })} rel="next">
                  次のページ →
                </Link>
              ) : (
                <span className="disabled" aria-hidden="true">次のページ →</span>
              )}
            </nav>
          )}
        </section>
      )}
      <Disclaimer />
    </main>
  );
}
