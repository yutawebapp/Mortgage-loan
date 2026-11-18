"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculateTotalCost,
  type TotalCostRequest,
  type TotalCostResponse,
} from "@/lib/api/totalCost";
import {
  approxManLabel,
  assumptionMessages,
  noteMessages,
  sharePercent,
  simulationHref,
  validateTotalCost,
  type TotalCostForm,
} from "@/lib/totalCost";
import { yen } from "@/lib/simulation";
import TotalCostChart from "./TotalCostChart";

type Outcome = { key: string; data?: TotalCostResponse; error?: string };

const initial: TotalCostForm = {
  priceMan: "4000",
  downMan: "400",
  closingRate: "10",
  rate: "1.2",
  years: "35",
  method: "EQUAL_PAYMENT",
  managementFee: "0",
  repairReserve: "0",
  propertyTax: "0",
  insurance: "0",
};

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400) return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

type FieldKey = keyof Omit<TotalCostForm, "method">;

export default function TotalCost({ initialValues }: { initialValues?: Partial<TotalCostForm> }) {
  const [form, setForm] = useState<TotalCostForm>({ ...initial, ...initialValues });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retry, setRetry] = useState(0);

  const { request, errors, loanEstimate } = useMemo(() => validateTotalCost(form), [form]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: TotalCostRequest = request;
    const timer = setTimeout(() => {
      calculateTotalCost(body, ctrl.signal)
        .then((data) => setOutcome({ key, data }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setOutcome({ key, error: errorMessage(e) });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // request is fully captured by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = <K extends keyof TotalCostForm>(k: K, v: TotalCostForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: FieldKey) => (touched[k] || outcome ? errors[k] : undefined);

  const noLoan = loanEstimate !== null && loanEstimate <= 0 && Object.keys(errors).length === 0;
  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  const data = request ? (current?.data ?? outcome?.data) : undefined;
  const stale = !!data && loading;
  const shown = data && request ? request : null;

  function field(
    id: FieldKey,
    label: string,
    unit: string,
    opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal" },
  ) {
    const e = err(id);
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <div className="input-row">
          <input
            id={id}
            type="number"
            inputMode={opts.inputMode ?? "decimal"}
            step={opts.step}
            min={0}
            value={form[id]}
            onChange={(ev) => set(id, ev.target.value)}
            onBlur={blur(id)}
            aria-invalid={e ? true : undefined}
            aria-describedby={`${id}-hint${e ? ` ${id}-err` : ""}`}
          />
          <span className="unit">{unit}</span>
        </div>
        {opts.hint ? (
          <p className="hint" id={`${id}-hint`}>
            {opts.hint}
          </p>
        ) : (
          <span id={`${id}-hint`} hidden />
        )}
        {e && (
          <p className="field-error" id={`${id}-err`}>
            {e}
          </p>
        )}
      </div>
    );
  }

  const notes = data ? noteMessages(data.notes) : [];
  const assumptions = data ? assumptionMessages(data.notes) : [];

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="住居費の条件">
        <fieldset className="fs-group">
          <legend>購入の条件</legend>
          {field("priceMan", "物件価格", "万円", { step: "any", hint: "例：4000万円 ＝ 40,000,000円" })}
          {field("downMan", "頭金", "万円", { step: "any", hint: "自己資金から支払う金額です。諸費用を現金で払う分も含めて入力してください。なければ0を入力してください。" })}
          {field("closingRate", "諸費用の割合（物件価格に対して）", "%", {
            step: "any",
            hint: "諸費用（登記費用・仲介手数料・保証料・各種税など）は、物件価格の1割前後かかることが多いとされます。物件の種類や条件で大きく変わります。0〜30%で入力できます。",
          })}
          {loanEstimate !== null && (
            <p className="info-msg" role="note">
              {loanEstimate > 0 ? (
                <>
                  借入額の目安：<strong>{yen(loanEstimate)}</strong>
                  （物件価格 ＋ 諸費用 − 頭金）
                </>
              ) : (
                "頭金で物件価格と諸費用をまかなえるため、住宅ローンの借入はない計算です。借入額が1円以上になるよう、頭金などを調整してください。"
              )}
            </p>
          )}
        </fieldset>

        <fieldset className="fs-group">
          <legend>ローンの条件</legend>
          {field("rate", "金利（年率）", "%", { step: "0.001", hint: "0〜20%で入力できます。返済期間中は同じ金利として計算します。" })}
          {field("years", "返済期間", "年", { step: "1", inputMode: "numeric", hint: "1〜50年の整数で入力できます。" })}
          <fieldset className="field">
            <legend>返済方式</legend>
            <label className="radio">
              <input
                type="radio"
                name="tc-method"
                checked={form.method === "EQUAL_PAYMENT"}
                onChange={() => set("method", "EQUAL_PAYMENT")}
              />
              元利均等返済
            </label>
            <label className="radio">
              <input
                type="radio"
                name="tc-method"
                checked={form.method === "EQUAL_PRINCIPAL"}
                onChange={() => set("method", "EQUAL_PRINCIPAL")}
              />
              元金均等返済
            </label>
            <p className="hint">
              {form.method === "EQUAL_PAYMENT"
                ? "毎月の返済額がほぼ一定になる方式です。"
                : "毎月返す元金が一定で、返済額は少しずつ減っていく方式です。"}
            </p>
          </fieldset>
        </fieldset>

        <fieldset className="fs-group">
          <legend>住んでからかかる費用（保有コスト）</legend>
          <p className="hint">
            わからない項目は0のままでも試算できます。戸建てでは管理費や修繕積立金がかからない場合もありますが、その場合は、将来の修繕の費用を自分で準備しておく必要があります。
          </p>
          {field("managementFee", "管理費（月額）", "円", { step: "1", inputMode: "numeric", hint: "マンションなどで毎月支払う費用です。" })}
          {field("repairReserve", "修繕積立金（月額）", "円", {
            step: "1",
            inputMode: "numeric",
            hint: "将来の大規模修繕に備えて毎月積み立てる費用です。",
          })}
          {field("propertyTax", "固定資産税・都市計画税（年額）", "円", {
            step: "1",
            inputMode: "numeric",
            hint: "毎年、自治体から納付書が届きます。金額がわからない場合は、物件の資料や不動産会社でご確認ください。",
          })}
          {field("insurance", "火災・地震保険料（年額）", "円", {
            step: "1",
            inputMode: "numeric",
            hint: "数年分をまとめて払う場合は、1年あたりの金額に直して入力してください。",
          })}
        </fieldset>
      </form>

      <section className="results" aria-labelledby="tc-result-h" aria-busy={loading}>
        <h2 id="tc-result-h">試算結果</h2>
        <div aria-live="polite" role="status" className="status">
          {!request && !noLoan && "入力内容に誤りがあります。左（上）のエラーを確認してください。"}
          {noLoan && "借入額が0円以下のため、試算は表示されません。"}
          {request && loading && "計算しています…"}
          {request && !loading && current?.data && "計算結果を更新しました。"}
        </div>

        {noLoan && (
          <p className="note" role="note">
            頭金の額が、物件価格と諸費用の合計以上になっています。住宅ローンを借りない場合は、このページの試算の対象外です。
          </p>
        )}

        {current?.error && (
          <div className="alert" role="alert">
            <p>{current.error}</p>
            <button type="button" onClick={() => setRetry((r) => r + 1)}>
              再計算する
            </button>
          </div>
        )}

        {data && shown && (
          <div className={stale ? "stale" : undefined}>
            <div className="verdict">
              <p className="hint">住まいにかかる費用の総額の目安</p>
              <p className="big">約{approxManLabel(data.totals.grandTotal)}</p>
              <p className="hint">
                {yen(data.totals.grandTotal)}（頭金 ＋ ローン返済額の合計 ＋ 返済期間中の保有コスト）
              </p>
            </div>

            <dl className="summary">
              <div>
                <dt>月平均の目安</dt>
                <dd className="big">約{yen(data.totals.monthlyAverage)}</dd>
              </div>
              <div>
                <dt>借入額</dt>
                <dd className="big">{yen(data.loanPrincipal)}</dd>
              </div>
            </dl>
            <p className="hint">
              月平均は、総額を返済期間（{shown.years}年＝{shown.years * 12}か月）で割った目安です。頭金も含まれます。
              {shown.method === "EQUAL_PAYMENT"
                ? ` 毎月のローン返済額は${yen(data.totals.firstMonthLoanPayment)}です。`
                : ` 1回目のローン返済額は${yen(data.totals.firstMonthLoanPayment)}で、その後は少しずつ減ります。`}
            </p>

            <h3>総額の内訳</h3>
            <Breakdown data={data} />

            <h3>年ごとの支払い</h3>
            <TotalCostChart years={data.years} />
            <p className="hint">1年あたりのローン返済額と保有コストを重ねたグラフです。頭金は含まれません。</p>

            <details className="advanced">
              <summary>年ごとの内訳の表を見る（{data.years.length}年分）</summary>
              <div className="table-wrap" tabIndex={0} role="region" aria-label="年ごとの内訳の表（横にスクロールできます）">
                <table className="compare tc-year-table">
                  <caption className="sr-only">年ごとのローン返済額・保有コスト・累計・年末残高</caption>
                  <thead>
                    <tr>
                      <th scope="col">年</th>
                      <th scope="col">ローン返済額</th>
                      <th scope="col">うち利息</th>
                      <th scope="col">保有コスト</th>
                      <th scope="col">年間合計</th>
                      <th scope="col">累計</th>
                      <th scope="col">年末残高</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.years.map((r) => (
                      <tr key={r.year}>
                        <th scope="row">{r.year}年目</th>
                        <td>{yen(r.loanPayment)}</td>
                        <td>{yen(r.interestPaid)}</td>
                        <td>{yen(r.ownershipCost)}</td>
                        <td>{yen(r.yearTotal)}</td>
                        <td>{yen(r.cumulativeOutlay)}</td>
                        <td>{yen(r.yearEndBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="hint">累計には、頭金が含まれています。</p>

            {assumptions.length > 0 && (
              <>
                <h3>この試算の前提</h3>
                <ul className="tc-excluded">
                  {assumptions.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </>
            )}

            <h3>この試算に含まれないもの</h3>
            <ul className="tc-excluded">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
              <li>
                住宅ローン控除の目安は、<Link href="/tax-deduction">住宅ローン控除シミュレーター</Link>で調べられます。
              </li>
            </ul>

            <p className="cta cta-row">
              <Link className="btn-link" href={simulationHref(data.loanPrincipal, shown.annualRatePercent, shown.years)}>
                この条件で返済額を詳しく試算する
              </Link>
              <Link className="btn-link secondary" href="/tax-deduction">
                住宅ローン控除を調べる
              </Link>
            </p>
          </div>
        )}

        <p className="disclaimer">
          試算結果は目安です。実際の費用は、物件・地域・契約内容によって異なります。
        </p>
      </section>
    </div>
  );
}

function Breakdown({ data }: { data: TotalCostResponse }) {
  const { initial: ini, totals: t } = data;
  const total = t.grandTotal;
  const principalPaid = Math.max(0, t.totalLoanPayment - t.totalInterest);
  const segs = [
    { key: "init", label: "頭金", value: ini.downPayment, cls: "tc-sw-init", fill: "url(#tc-b-dots)" },
    { key: "loan", label: "住宅ローンの返済額の合計", value: t.totalLoanPayment, cls: "tc-sw-loan", fill: "#0f5a96" },
    { key: "own", label: "保有コストの合計", value: t.totalOwnershipCost, cls: "tc-sw-own", fill: "url(#tc-b-hatch)" },
  ];
  const W = 640;
  const widths = segs.map((s) => (W * sharePercent(s.value, total)) / 100);
  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} 40`} role="img" aria-labelledby="tcb-t tcb-d" className="chart">
        <title id="tcb-t">総額の内訳</title>
        <desc id="tcb-d">
          総額{approxManLabel(total)}の内訳です。頭金{approxManLabel(ini.downPayment)}、住宅ローンの返済額の合計{approxManLabel(t.totalLoanPayment)}（うち利息{approxManLabel(t.totalInterest)}）、保有コストの合計{approxManLabel(t.totalOwnershipCost)}です。
        </desc>
        <defs>
          <pattern id="tc-b-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#fbe9cf" />
            <rect width="3" height="8" fill="#e0902b" />
          </pattern>
          <pattern id="tc-b-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#e2f4f2" />
            <circle cx="4" cy="4" r="1.8" fill="#0b7a75" />
          </pattern>
        </defs>
        {segs.map((s, i) => {
          const x = widths.slice(0, i).reduce((a, b) => a + b, 0);
          return (
            <rect key={s.key} x={x} y={2} width={widths[i]} height={34} fill={s.fill} stroke="#fff" strokeWidth={widths[i] > 0 ? 2 : 0} />
          );
        })}
      </svg>
      <ul className="tc-share">
        {segs.map((s) => (
          <li key={s.key}>
            <span className={`sw ${s.cls}`} aria-hidden="true" style={{ margin: 0, flex: "none" }} />
            <span className="tc-name">
              {s.label}
              {s.key === "loan" && (
                <span className="hint" style={{ display: "block", margin: 0 }}>
                  うち元金 {yen(principalPaid)}・利息 {yen(t.totalInterest)}
                </span>
              )}
              {s.key === "init" && (
                <span className="hint" style={{ display: "block", margin: 0 }}>
                  予算に含まれる諸費用の目安 {yen(ini.closingCost)}
                </span>
              )}
            </span>
            <span className="tc-val">
              {yen(s.value)}
              <span className="hint" style={{ display: "block", margin: 0, fontWeight: 400 }}>
                {sharePercent(s.value, total).toFixed(1)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
