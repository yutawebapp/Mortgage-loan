"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculateRentVsBuy,
  type RentVsBuyRequest,
  type RentVsBuyResponse,
} from "@/lib/api/rentVsBuy";
import {
  ADVANCED_KEYS,
  crossoverLabel,
  crossoverSentences,
  manSigned,
  ratePercentLabel,
  rentVsBuyAssumptionMessages,
  rentVsBuyNoteMessages,
  validateRentVsBuy,
  yenSigned,
  type RentVsBuyForm,
} from "@/lib/rentVsBuy";
import { yen } from "@/lib/simulation";
import { acceptFor, hrefWith, sanitizeShared, type SharedConditions } from "@/lib/sharedConditions";
import { derivedLoan } from "@/lib/totalCost";
import { useSharedConditions } from "@/lib/useSharedConditions";
import {
  STEP_MAN_LARGE,
  STEP_MONTHS,
  STEP_PERCENT,
  STEP_RATE,
  STEP_YEN_MONTHLY,
  STEP_YEN_YEARLY,
} from "@/lib/inputSteps";
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
import RentVsBuyChart from "./RentVsBuyChart";
import ShareLinkButton from "./ShareLinkButton";
import NextSteps, { type NextStep } from "./NextSteps";
import SavedConditionsNotice from "./SavedConditionsNotice";
import { totalCostInitialFromQuery } from "@/lib/totalCost";
import { useUrlInitialValues } from "@/lib/useUrlInitialValues";

type Outcome = { key: string; data?: RentVsBuyResponse; error?: string; req: RentVsBuyRequest };

const initial: RentVsBuyForm = {
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
  rent: "130000",
  rentGrowth: "0",
  renewalMonths: "0",
  renewalInterval: "2",
  rentInitial: "0",
  horizon: "35",
  assetChange: "0",
  saleCost: "0",
};

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400) return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

type FieldKey = keyof Omit<RentVsBuyForm, "method">;

export default function RentVsBuy() {
  const [form, setForm] = useState<RentVsBuyForm>(initial);
  // 共通条件は金利・返済期間のみ。このツールの principal は物件価格なので、借入額（principalMan）は受け取らない・渡さない。
  const sharedNow = sanitizeShared({ rate: form.rate, years: form.years });
  const { markEdited, clearSaved, restored, hasSaved } = useSharedConditions({
    current: sharedNow,
    apply: (patch) => setForm((f) => ({ ...f, rate: patch.rate ?? f.rate, years: patch.years ?? f.years })),
    accept: (c) => acceptFor("/rent-vs-buy", c),
  });
  // URLクエリの値はマウント後に一度だけ適用する（URL > 保存値 > 既定値）
  useUrlInitialValues(totalCostInitialFromQuery, (patch) => setForm((f) => ({ ...f, ...patch })));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retry, setRetry] = useState(0);
  const [advOpen, setAdvOpen] = useState(false);

  const { request, errors, loanEstimate } = useMemo(() => validateRentVsBuy(form), [form]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: RentVsBuyRequest = request;
    const timer = setTimeout(() => {
      calculateRentVsBuy(body, ctrl.signal)
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

  const set = <K extends keyof RentVsBuyForm>(k: K, v: RentVsBuyForm[K]) => {
    markEdited(k);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: FieldKey) => (touched[k] || outcome ? errors[k] : undefined);

  const advancedError = ADVANCED_KEYS.some((k) => !!err(k));
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

  function field(
    id: FieldKey,
    label: string,
    unit: string,
    opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal" | "text"; min?: number },
  ) {
    return (
      <NumberField
        id={`rvb-${id}`}
        label={label}
        unit={unit}
        value={form[id]}
        onChange={(v) => set(id, v)}
        onBlur={blur(id)}
        step={opts.step}
        hint={opts.hint}
        error={err(id)}
        inputMode={opts.inputMode}
        min={opts.min}
      />
    );
  }

  const last = data ? data.years[data.years.length - 1] : null;
  const sentences = data && shown ? crossoverSentences(data.summary, shown.horizonYears) : null;
  const notes = data ? rentVsBuyNoteMessages(data.notes) : [];
  const assumptions = data ? rentVsBuyAssumptionMessages(data.notes) : [];

  // 次に調べる: 購入の借入額（物件価格 ＋ 諸費用 − 頭金）を、ライフプランの借入額として渡す
  const shownLoan =
    shown && shown.closingCostRatePercent !== undefined
      ? derivedLoan(shown.propertyPrice, shown.downPayment, shown.closingCostRatePercent)
      : null;
  const loanManStr = shownLoan !== null && shownLoan >= 10000 ? String(shownLoan / 10000) : null;
  const priceManStr = shown ? String(shown.propertyPrice / 10000) : null;
  const nextSteps: NextStep[] = loanManStr
    ? [
        {
          href: hrefWith("/life-plan", sharedShown, { principal: loanManStr }),
          label: "ライフプランで貯蓄の推移を試算",
          hint: "ローン返済・教育費などを含めた貯蓄推移の目安",
        },
      ]
    : [];

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="マイホームと賃貸の条件">
        <fieldset className="fs-group">
          <legend>購入の条件</legend>
          {field("priceMan", "物件価格", "万円", { step: STEP_MAN_LARGE })}
          {field("downMan", "頭金", "万円", { step: STEP_MAN_LARGE })}
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
          {field("rate", "金利（年率）", "%", { step: STEP_RATE, hint: "返済期間中は同じ金利として計算" })}
          {field("years", "返済期間", "年", { step: "1", inputMode: "numeric" })}
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

        <fieldset className="fs-group">
          <legend>賃貸の条件</legend>
          {field("rent", "家賃（月額）", "円", {
            step: STEP_YEN_MONTHLY,
            inputMode: "numeric",
            hint: "管理費・共益費を含む",
          })}
        </fieldset>

        <fieldset className="fs-group">
          <legend>比較の設定</legend>
          {field("horizon", "比べる期間", "年", {
            step: "1",
            inputMode: "numeric",
            hint: "返済期間より長くても可",
          })}
        </fieldset>

        <details
          className="advanced"
          open={advOpen || advancedError}
          onToggle={(e) => setAdvOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary>詳細設定（諸費用・家賃の変化・物件価値など）</summary>

          <fieldset className="fs-group">
            <legend>購入の詳細</legend>
            {field("closingRate", "諸費用の割合（物件価格に対して）", "%", {
              step: STEP_PERCENT,
              hint: "仮置き。物件・条件で大きく変わります",
            })}
            <fieldset className="field">
              <legend>返済方式</legend>
              <label className="radio">
                <input
                  type="radio"
                  name="rvb-method"
                  checked={form.method === "EQUAL_PAYMENT"}
                  onChange={() => set("method", "EQUAL_PAYMENT")}
                />
                元利均等返済
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="rvb-method"
                  checked={form.method === "EQUAL_PRINCIPAL"}
                  onChange={() => set("method", "EQUAL_PRINCIPAL")}
                />
                元金均等返済
              </label>
            </fieldset>
          </fieldset>

          <fieldset className="fs-group">
            <legend>賃貸の詳細</legend>
            {field("rentGrowth", "家賃の年間上昇率", "%", {
              step: STEP_PERCENT,
              hint: "0なら変わらない想定",
            })}
            {field("renewalMonths", "更新料（家賃の何か月分）", "か月", {
              step: STEP_MONTHS,
            })}
            {field("renewalInterval", "更新の間隔", "年", {
              step: "1",
              inputMode: "numeric",
            })}
            {field("rentInitial", "入居時の初期費用", "円", {
              step: STEP_YEN_YEARLY,
              inputMode: "numeric",
              hint: "敷金・礼金・仲介手数料・引っ越し費用など",
            })}
          </fieldset>

          <fieldset className="fs-group">
            <legend>比べる条件の詳細</legend>
            {field("assetChange", "物件価値の年間変化率", "%", {
              step: STEP_PERCENT,
              min: -10,
              inputMode: "text",
              hint: "マイナスは値下がり。仮の値で、実際は大きく変わります",
            })}
            {field("saleCost", "売却時にかかる費用の割合", "%", {
              step: STEP_PERCENT,
              hint: "仲介手数料など。物件価値に対する割合",
            })}
          </fieldset>
        </details>
        <SavedConditionsNotice restored={restored} hasSaved={hasSaved} onClear={clearSaved} />
      </form>

      <section className="results" aria-labelledby="rvb-result-h" aria-busy={loading}>
        <h2 id="rvb-result-h">試算結果</h2>
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

        {data && shown && last && sentences && (
          <div className={stale ? "stale" : undefined}>
            <div className="verdict">
              <p className="hint">{shown.horizonYears}年間の支出の比較</p>
              <p className="rvb-headline">{sentences.cumulative}</p>
              <p className="rvb-headline sub">{sentences.net}</p>
              <p className="hint">
                入力した前提（物件価値・家賃の変動など）で変わります。将来を予測するものではありません。
              </p>
            </div>

            <h3>{shown.horizonYears}年目の時点の目安</h3>
            <div className="rvb-cards">
              <section className="rvb-card" aria-label="購入">
                <h4>購入</h4>
                <dl>
                  <dt>累計支出</dt>
                  <dd className="big">約{manSigned(data.summary.purchaseCumulativeAtEnd)}</dd>
                  <dt>実質負担（物件価値とローン残高を考慮）</dt>
                  <dd className="big">約{manSigned(data.summary.purchaseNetAtEnd)}</dd>
                  <dt>年末のローン残高</dt>
                  <dd>{yen(last.loanBalance)}</dd>
                  <dt>想定の物件価値</dt>
                  <dd>{yen(last.assetValue)}</dd>
                </dl>
              </section>
              <section className="rvb-card" aria-label="賃貸">
                <h4>賃貸</h4>
                <dl>
                  <dt>累計支出</dt>
                  <dd className="big">約{manSigned(data.summary.rentCumulativeAtEnd)}</dd>
                  <dt>最終年の1年間の支出</dt>
                  <dd>{yen(last.rentYearOutlay)}</dd>
                </dl>
                <p className="hint">初期費用・家賃・更新料の合計</p>
              </section>
            </div>
            <p className="hint">
              購入の累計支出は頭金・ローン返済額・保有コストの合計。実質負担は、累計支出から「その時点で売却した場合に残る額（物件価値 − 売却費用 − ローン残高）」を引いた額で、マイナスになることもあります。
            </p>

            <h3>支出の推移</h3>
            <RentVsBuyChart years={data.years} summary={data.summary} />

            {data.sensitivity.length > 0 && (
              <>
                <h3>物件価値の変化率が違う場合</h3>
                <div className="table-wrap plain" tabIndex={0} role="region" aria-label="物件価値の変化率ごとの比較表">
                  <table className="compare rvb-sens">
                    <caption className="sr-only">物件価値の年間変化率ごとの、購入の実質負担と賃貸の累計支出の比較</caption>
                    <thead>
                      <tr>
                        <th scope="col">年間変化率</th>
                        <th scope="col">実質負担が賃貸の累計支出を下回り始める年</th>
                        <th scope="col">{shown.horizonYears}年目の購入の実質負担</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sensitivity.map((s) => (
                        <tr key={s.assetChangeRatePercent}>
                          <th scope="row">
                            {ratePercentLabel(s.assetChangeRatePercent)}
                            {s.assetChangeRatePercent === (shown.assetChangeRatePercent ?? 0) && (
                              <span className="rvb-cur">（入力値）</span>
                            )}
                          </th>
                          <td>{crossoverLabel(s.crossoverYearNet)}</td>
                          <td>約{manSigned(s.purchaseNetAtEnd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <details className="advanced">
              <summary>年ごとの数値の表を見る（{data.years.length}年分）</summary>
              <div className="table-wrap" tabIndex={0} role="region" aria-label="年ごとの数値の表（横にスクロールできます）">
                <table className="compare tc-year-table">
                  <caption className="sr-only">年ごとの購入と賃貸の支出（円）</caption>
                  <thead>
                    <tr>
                      <th scope="col">年</th>
                      <th scope="col">購入の年間支出</th>
                      <th scope="col">購入の累計支出</th>
                      <th scope="col">ローン残高</th>
                      <th scope="col">想定の物件価値</th>
                      <th scope="col">購入の実質負担</th>
                      <th scope="col">賃貸の年間支出</th>
                      <th scope="col">賃貸の累計支出</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.years.map((r) => (
                      <tr key={r.year}>
                        <th scope="row">{r.year}年目</th>
                        <td>{yen(r.purchaseYearOutlay)}</td>
                        <td>{yen(r.purchaseCumulative)}</td>
                        <td>{yen(r.loanBalance)}</td>
                        <td>{yen(r.assetValue)}</td>
                        <td>{yenSigned(r.purchaseNetCost)}</td>
                        <td>{yen(r.rentYearOutlay)}</td>
                        <td>{yen(r.rentCumulative)}</td>
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

            <p className="cta cta-row">
              <Link className="btn-link" href="/total-cost">
                住居費の総額を調べる
              </Link>
              <Link className="btn-link secondary" href="/tax-deduction">
                住宅ローン控除を調べる
              </Link>
            </p>
            <NextSteps items={nextSteps} />
          </div>
        )}

        {shown && priceManStr && (
          <div className="result-actions">
            <ShareLinkButton
              conditions={sharedShown}
              extra={{ principal: priceManStr }}
              label="主な条件（物件価格・金利・期間）のリンクをコピー"
            />
          </div>
        )}

        <p className="disclaimer">
          目安です。実際の費用は物件・地域・契約内容や将来の状況により異なります。
        </p>
      </section>
    </div>
  );
}
