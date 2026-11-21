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
  validateTotalCost,
  type TotalCostForm,
} from "@/lib/totalCost";
import { yen } from "@/lib/simulation";
import { acceptFor, hrefWith, sanitizeShared, totalCostExtraFromQuery, type SharedConditions } from "@/lib/sharedConditions";
import { useSharedConditions } from "@/lib/useSharedConditions";
import TotalCostChart from "./TotalCostChart";
import { STEP_MAN_LARGE, STEP_PERCENT, STEP_RATE, STEP_YEN_MONTHLY, STEP_YEN_YEARLY } from "@/lib/inputSteps";
import { NumberField } from "./NumberField";
import {
  DEFAULT_CLOSING_RATE,
  DEFAULT_DOWN_MAN,
  DEFAULT_INSURANCE_YEARLY_YEN,
  DEFAULT_MANAGEMENT_FEE_MONTHLY_YEN,
  DEFAULT_METHOD,
  DEFAULT_PRICE_MAN,
  DEFAULT_PROPERTY_TAX_YEARLY_YEN,
  DEFAULT_RATE,
  DEFAULT_REPAIR_RESERVE_MONTHLY_YEN,
  DEFAULT_YEARS,
} from "@/lib/defaults";
import ShareLinkButton from "./ShareLinkButton";
import NextSteps, { type NextStep } from "./NextSteps";
import SavedConditionsNotice from "./SavedConditionsNotice";
import { totalCostInitialFromQuery } from "@/lib/totalCost";
import { useUrlInitialValues } from "@/lib/useUrlInitialValues";

type Outcome = { key: string; data?: TotalCostResponse; error?: string; req: TotalCostRequest };

const initial: TotalCostForm = {
  priceMan: DEFAULT_PRICE_MAN,
  downMan: DEFAULT_DOWN_MAN,
  closingRate: DEFAULT_CLOSING_RATE,
  rate: DEFAULT_RATE,
  years: DEFAULT_YEARS,
  method: DEFAULT_METHOD,
  managementFee: String(DEFAULT_MANAGEMENT_FEE_MONTHLY_YEN),
  repairReserve: String(DEFAULT_REPAIR_RESERVE_MONTHLY_YEN),
  propertyTax: String(DEFAULT_PROPERTY_TAX_YEARLY_YEN),
  insurance: String(DEFAULT_INSURANCE_YEARLY_YEN),
};

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400) return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

type FieldKey = keyof Omit<TotalCostForm, "method">;

export default function TotalCost() {
  const [form, setForm] = useState<TotalCostForm>(initial);
  // 共通条件は金利・返済期間のみ。このツールの principal は物件価格なので、借入額（principalMan）は受け取らない・渡さない。
  const sharedNow = sanitizeShared({ rate: form.rate, years: form.years });
  const { markEdited, clearSaved, restored, hasSaved } = useSharedConditions({
    current: sharedNow,
    apply: (patch) => setForm((f) => ({ ...f, rate: patch.rate ?? f.rate, years: patch.years ?? f.years })),
    accept: (c) => acceptFor("/total-cost", c),
  });
  // URLクエリの値はマウント後に一度だけ適用する（URL > 保存値 > 既定値）
  useUrlInitialValues(totalCostInitialFromQuery, (patch) => setForm((f) => ({ ...f, ...patch })));
  useUrlInitialValues(totalCostExtraFromQuery, (patch) => setForm((f) => ({ ...f, ...patch })));
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
        .then((data) => setOutcome({ key, data, req: body }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setOutcome({ key, error: errorMessage(e), req: body });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // request is fully captured by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = <K extends keyof TotalCostForm>(k: K, v: TotalCostForm[K]) => {
    markEdited(k);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: FieldKey) => (touched[k] || outcome ? errors[k] : undefined);

  const noLoan = loanEstimate !== null && loanEstimate <= 0 && Object.keys(errors).length === 0;
  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  // 表示する結果・次に調べるリンク・共有リンクは、すべて同じ request（snap.req）から作る（フォームの現在値は使わない）
  const snap = request ? (current?.data ? current : outcome) : null;
  const data = snap?.data;
  const shown = data && snap?.req ? snap.req : null;
  const stale = !!data && loading;
  const sharedShown: SharedConditions = shown
    ? sanitizeShared({ rate: String(shown.annualRatePercent), years: String(shown.years) })
    : {};

  // 次に調べる（price は 物件価格・万円、loan は 借入額・万円。遷移先の principal が読む意味に合わせて渡す）
  const priceManStr = shown ? String(shown.propertyPrice / 10000) : null;
  const loanManStr = data && data.loanPrincipal >= 10000 ? String(data.loanPrincipal / 10000) : null;
  const nextSteps: NextStep[] = [];
  if (priceManStr && shown && shown.propertyPrice >= 10000 && sharedShown.rate && sharedShown.years)
    nextSteps.push({
      href: hrefWith("/rent-vs-buy", sharedShown, { principal: priceManStr }),
      label: "マイホームと賃貸の支出を比べる",
      hint: "物件価格・金利・期間を引き継ぎます。その他の条件は別途確認してください。",
    });
  if (loanManStr && sharedShown.rate && sharedShown.years)
    nextSteps.push({
      href: hrefWith("/tax-deduction", sharedShown, { principal: loanManStr }),
      label: "住宅ローン控除の目安を調べる",
      hint: "この借入額・金利・期間での控除額の目安",
    });

  function field(
    id: FieldKey,
    label: string,
    unit: string,
    opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal" },
  ) {
    return (
      <NumberField
        id={id}
        label={label}
        unit={unit}
        value={form[id]}
        onChange={(v) => set(id, v)}
        onBlur={blur(id)}
        step={opts.step}
        hint={opts.hint}
        error={err(id)}
        inputMode={opts.inputMode}
      />
    );
  }

  const notes = data ? noteMessages(data.notes) : [];
  const assumptions = data ? assumptionMessages(data.notes) : [];

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="住居費の条件">
        <fieldset className="fs-group">
          <legend>購入の条件</legend>
          {field("priceMan", "物件価格", "万円", { step: STEP_MAN_LARGE })}
          {field("downMan", "頭金", "万円", { step: STEP_MAN_LARGE, hint: "諸費用を現金で払う分も含めます" })}
          {field("closingRate", "諸費用の割合（物件価格に対して）", "%", {
            step: STEP_PERCENT,
            hint: "仮置き。物件・条件で大きく変わります",
          })}
          {loanEstimate !== null && (
            <p className="info-msg" role="note">
              {loanEstimate > 0 ? (
                <>
                  借入額の目安：<strong>{yen(loanEstimate)}</strong>
                </>
              ) : (
                "頭金で物件価格と諸費用をまかなえるため、借入はない計算です。"
              )}
            </p>
          )}
        </fieldset>

        <fieldset className="fs-group">
          <legend>ローンの条件</legend>
          {field("rate", "金利（年率）", "%", { step: STEP_RATE, hint: "返済期間中は同じ金利として計算" })}
          {field("years", "返済期間", "年", { step: "1", inputMode: "numeric" })}
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
          </fieldset>
        </fieldset>

        <fieldset className="fs-group">
          <legend>住んでからかかる費用（保有コスト）</legend>
          {field("managementFee", "管理費（月額）", "円", {
            step: STEP_YEN_MONTHLY,
            inputMode: "numeric",
            hint: "初期値は戸建ての目安。マンションは管理費・修繕積立金を入力",
          })}
          {field("repairReserve", "修繕・メンテナンス費（月額）", "円", {
            step: STEP_YEN_MONTHLY,
            inputMode: "numeric",
          })}
          {field("propertyTax", "固定資産税・都市計画税（年額）", "円", {
            step: STEP_YEN_YEARLY,
            inputMode: "numeric",
          })}
          {field("insurance", "火災・地震保険料（年額）", "円", {
            step: STEP_YEN_YEARLY,
            inputMode: "numeric",
            hint: "数年分まとめて払う場合は1年あたりに換算",
          })}
        </fieldset>
        <SavedConditionsNotice restored={restored} hasSaved={hasSaved} onClear={clearSaved} />
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
            頭金が物件価格と諸費用の合計以上のため、試算の対象外です。
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
              <p className="hint">{yen(data.totals.grandTotal)}</p>
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
              月平均は総額を{shown.years * 12}か月で割った値（頭金を含む）。
              {shown.method === "EQUAL_PAYMENT"
                ? ` 毎月のローン返済額は${yen(data.totals.firstMonthLoanPayment)}。`
                : ` 1回目のローン返済額は${yen(data.totals.firstMonthLoanPayment)}（以降は減少）。`}
            </p>

            <h3>総額の内訳</h3>
            <Breakdown data={data} />

            <h3>年ごとの支払い</h3>
            <TotalCostChart years={data.years} />
            <p className="hint">頭金は含みません。</p>

            <details className="advanced">
              <summary>年ごとの表（{data.years.length}年分・累計は頭金を含む）</summary>
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
            </ul>

            {loanManStr && sharedShown.rate && sharedShown.years && <><p className="cta cta-row">
              <Link className="btn-link" href={hrefWith("/simulation", { principalMan: String(data.loanPrincipal / 10000), rate: String(shown.annualRatePercent), years: String(shown.years) }, { method: shown.method })}>
                この条件で返済額を詳しく試算する
              </Link>
            </p>
            <p className="hint">返済額の試算には借入額・金利・期間・返済方式を引き継ぎます。</p></>}
            <NextSteps items={nextSteps} />
          </div>
        )}

        {shown && priceManStr && shown.propertyPrice >= 10000 && sharedShown.rate && sharedShown.years && (
          <div className="result-actions">
            <ShareLinkButton
              conditions={sharedShown}
              extra={{ principal: priceManStr, down: String(shown.downPayment / 10000), closing: String(shown.closingCostRatePercent ?? 0), method: shown.method, management: String(shown.monthlyManagementFee ?? 0), repair: String(shown.monthlyRepairReserve ?? 0), tax: String(shown.annualPropertyTax ?? 0), insurance: String(shown.annualInsurance ?? 0) }}
              label="この条件のリンクをコピー"
            />
            <p className="hint">物件価格・頭金・諸費用率・金利・期間・返済方式・保有コストを共有します。</p>
          </div>
        )}

        <p className="disclaimer">
          目安です。実際の費用は物件・地域・契約内容により異なります。
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
