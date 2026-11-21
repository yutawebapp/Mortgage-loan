"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculateRateTypes,
  type RateTypesRequest,
  type RateTypesResponse,
} from "@/lib/api/rateTypes";
import {
  RATE_TYPES_DEFAULTS,
  caseName,
  noteTexts,
  rateLabel,
  rateScenarioHref,
  signedMan,
  switchLabel,
  validateRateTypes,
  type RateTypesForm,
} from "@/lib/rateTypes";
import { simulationHref } from "@/lib/eligibility";
import { yen } from "@/lib/simulation";
import { acceptFor, sanitizeShared, type SharedConditions } from "@/lib/sharedConditions";
import { useSharedConditions } from "@/lib/useSharedConditions";
import SavedConditionsNotice from "./SavedConditionsNotice";
import { STEP_MAN_LARGE, STEP_RATE, STEP_RATE_RISE } from "@/lib/inputSteps";
import { NumberField } from "./NumberField";
import RateTypesChart, { CaseSwatch, STYLES } from "./RateTypesChart";
import { rateTypesInitialFromQuery } from "@/lib/rateTypes";
import { useUrlInitialValues } from "@/lib/useUrlInitialValues";

type Outcome = { key: string; data?: RateTypesResponse; error?: string };
type NumKey = Exclude<keyof RateTypesForm, "method">;

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400) return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

const n = (v: number) => v.toLocaleString("ja-JP");

export default function RateTypes({ initialValues }: { initialValues?: Partial<RateTypesForm> }) {
  const [form, setForm] = useState<RateTypesForm>({ ...RATE_TYPES_DEFAULTS, ...initialValues });
  // 共通条件は借入金額と返済期間のみ（金利は4つあるため共通化しない）。年は2年以上のみ適用する。
  const sharedNow: SharedConditions = sanitizeShared({ principalMan: form.principalMan, years: form.years });
  const { markEdited, clearSaved, restored, hasSaved } = useSharedConditions({
    current: sharedNow,
    apply: (patch) =>
      setForm((f) => ({
        ...f,
        ...(patch.principalMan !== undefined ? { principalMan: patch.principalMan } : {}),
        ...(patch.years !== undefined && Number(patch.years) >= 2 ? { years: patch.years } : {}),
      })),
    accept: (c) => acceptFor("/rate-types", c),
  });
  // URLクエリの値はマウント後に一度だけ適用する（URL > 保存値 > 既定値）
  useUrlInitialValues(rateTypesInitialFromQuery, (patch) => setForm((f) => ({ ...f, ...patch })));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retry, setRetry] = useState(0);

  const { request, errors } = useMemo(() => validateRateTypes(form), [form]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: RateTypesRequest = request;
    const timer = setTimeout(() => {
      calculateRateTypes(body, ctrl.signal)
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

  const set = <K extends keyof RateTypesForm>(k: K, v: RateTypesForm[K]) => {
    markEdited(k);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: NumKey) => (touched[k] || outcome ? errors[k] : undefined);

  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  const data = current?.data ?? (request ? outcome?.data : undefined);
  const stale = !!data && loading;
  const notes = data ? noteTexts(data.notes) : [];
  const cases = data?.cases ?? [];
  const maxTotal = Math.max(0, ...cases.map((c) => c.totalPayment));

  function field(
    id: NumKey,
    label: string,
    unit: string,
    opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal"; pre?: string },
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
        pre={opts.pre}
      />
    );
  }

  const rateHint = "0〜20%";

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="金利タイプ比較の条件">
        <fieldset className="fs-group">
          <legend>共通の借入条件</legend>
          {field("principalMan", "借入金額", "万円", { step: STEP_MAN_LARGE })}
          {field("years", "返済期間", "年", { step: "1", inputMode: "numeric", hint: "2〜50年" })}
          <fieldset className="field">
            <legend>返済方式</legend>
            <label className="radio">
              <input
                type="radio"
                name="rt-method"
                checked={form.method === "EQUAL_PAYMENT"}
                onChange={() => set("method", "EQUAL_PAYMENT")}
              />
              元利均等返済
            </label>
            <label className="radio">
              <input
                type="radio"
                name="rt-method"
                checked={form.method === "EQUAL_PRINCIPAL"}
                onChange={() => set("method", "EQUAL_PRINCIPAL")}
              />
              元金均等返済
            </label>
          </fieldset>
        </fieldset>

        <fieldset className="fs-group">
          <legend>変動金利</legend>
          {field("variableRate", "仮の金利（年率）", "%", { step: STEP_RATE, hint: rateHint })}
          {field("variableRiseAfter", "金利が上昇する時期", "年後", {
            step: "1",
            inputMode: "numeric",
            pre: "返済開始から",
            hint: "1年以上・返済期間より前。一度だけ上がる想定",
          })}
          {field("variableRisePoints", "金利の上昇幅", "ポイント", {
            step: STEP_RATE_RISE,
            pre: "+",
            hint: "0より大きく10以下（例：+1.0で1.2%→2.2%）",
          })}
        </fieldset>

        <fieldset className="fs-group">
          <legend>固定期間選択型</legend>
          {field("fixedPeriodYears", "固定期間", "年", {
            step: "1",
            inputMode: "numeric",
            hint: "1年以上・返済期間より短く",
          })}
          {field("fixedPeriodRate", "固定期間中の仮の金利（年率）", "%", { step: STEP_RATE, hint: rateHint })}
          {field("fixedPeriodAfterRate", "固定期間終了後の仮の金利（年率）", "%", {
            step: STEP_RATE,
            hint: "将来の水準による仮の値",
          })}
        </fieldset>

        <fieldset className="fs-group">
          <legend>全期間固定</legend>
          {field("fullFixedRate", "仮の金利（年率）", "%", { step: STEP_RATE, hint: rateHint })}
        </fieldset>
        <SavedConditionsNotice restored={restored} hasSaved={hasSaved} onClear={clearSaved} />
      </form>

      <section className="results" aria-labelledby="result-h" aria-busy={loading}>
        <h2 id="result-h">試算結果</h2>
        <p className="note" role="note">
          金利はすべて比較用の仮の値です（初期値も実際の金利ではありません）。タイプの優劣を示すものではありません。
        </p>
        <div aria-live="polite" role="status" className="status">
          {!request && "入力内容に誤りがあります。左（上）のエラーを確認してください。"}
          {request && loading && "計算しています…"}
          {request && !loading && current?.data && "計算結果を更新しました。"}
        </div>

        {current?.error && (
          <div className="alert" role="alert">
            <p>{current.error}</p>
            <button type="button" onClick={() => setRetry((r) => r + 1)}>
              再計算する
            </button>
          </div>
        )}

        {data && request && cases.length > 0 && (
          <div className={stale ? "stale" : undefined}>
            <h3>4つのケースの比較</h3>
            <ul className="rt-cards" aria-label="金利タイプ別の試算結果">
              {cases.map((c, i) => {
                const st = STYLES[Math.min(i, STYLES.length - 1)];
                const share = maxTotal > 0 ? Math.max(2, (c.totalPayment / maxTotal) * 100) : 0;
                return (
                  <li key={c.type} className="rt-card">
                    <h4>
                      <CaseSwatch index={i} />
                      {caseName(c)}
                    </h4>
                    <p className="rt-sub">
                      金利 {rateLabel(c)}
                      {c.switchAfterYears !== null && `（${switchLabel(c)}に切り替え）`}
                    </p>
                    <p className="rt-label">毎月の返済額{c.monthlyPaymentAfterSwitch !== null && "（最初 → 切り替え直後）"}</p>
                    <p className="rt-big">
                      {n(c.firstMonthlyPayment)}円
                      {c.monthlyPaymentAfterSwitch !== null && ` → ${n(c.monthlyPaymentAfterSwitch)}円`}
                    </p>
                    <p className="rt-label">総返済額</p>
                    <p className="rt-big">{yen(c.totalPayment)}</p>
                    <div className="rt-bar" aria-hidden="true">
                      <span style={{ width: `${share}%`, background: st.color }} />
                    </div>
                    <dl className="rt-meta">
                      <div>
                        <dt>利息の合計</dt>
                        <dd>{yen(c.totalInterest)}</dd>
                      </div>
                      <div>
                        <dt>全期間固定との総返済額の差</dt>
                        <dd>{c.type === "FULL_FIXED" ? "（比べる基準）" : signedMan(c.totalPaymentDiffFromFullFixed)}</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
            <p className="hint">
              バーは総返済額が最大のケースを100%とした長さです。差は全期間固定が基準で、＋が多く、−が少ない場合です。仮の金利によって変わります。
              {request.method === "EQUAL_PRINCIPAL" &&
                "元金均等返済では、切り替え直後の金額が最初より小さく表示されることがあります。"}
            </p>

            <h3>年間返済額の推移</h3>
            <RateTypesChart cases={cases} />
            <details className="chart-data">
              <summary>グラフの数値を表で見る</summary>
              <div className="table-wrap" tabIndex={0} role="region" aria-label="年間返済額の表（横にスクロールできます）">
                <table className="compare">
                  <caption className="sr-only">年ごとの返済額（年間）</caption>
                  <thead>
                    <tr>
                      <th scope="col">年</th>
                      {cases.map((c) => (
                        <th scope="col" key={c.type}>
                          {caseName(c)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cases[0].yearlyPayments.map((_, i) => (
                      <tr key={i}>
                        <th scope="row">{i + 1}年目</th>
                        {cases.map((c) => (
                          <td key={c.type}>{c.yearlyPayments[i] === undefined ? "―" : yen(c.yearlyPayments[i])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            {notes.length > 0 && (
              <>
                <h3>前提と含まれないもの</h3>
                <ul className="notes">
                  {notes.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </>
            )}

            <div className="cta-row">
              <Link className="btn-link" href={rateScenarioHref(request.principal, request.variableRatePercent, request.years)}>
                変動金利が複数回上がる場合を詳しく見る
              </Link>
              <Link
                className="btn-link secondary"
                href={simulationHref(request.principal, request.fullFixedRatePercent, request.years)}
              >
                返済シミュレーターで詳しく見る
              </Link>
            </div>
          </div>
        )}

        <p className="disclaimer">
          試算結果は目安です。実際の返済額は金融機関・契約内容で異なります。
        </p>
      </section>
    </div>
  );
}
